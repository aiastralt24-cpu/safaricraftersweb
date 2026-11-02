begin;
create table cms.notification_reconciliations(
 website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_id uuid not null,
 dispatch_id uuid not null references cms.notification_dispatches(id),provider_message_id uuid not null,
 evidence jsonb,receipt jsonb,created_at timestamptz not null default clock_timestamp(),
 primary key(website_id,actor_id,request_id),check((evidence is null)=(receipt is null))
);
alter table cms.notification_reconciliations enable row level security;
create function cms.notification_reconciliation_allowed(p_site uuid,p_actor uuid,p_lead uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.memberships m where m.website_id=p_site and m.user_id=p_actor and m.revoked_at is null and(m.expires_at is null or m.expires_at>now())
 and exists(select 1 from cms.permissions p where p.website_id=m.website_id and p.role_id=m.role_id and p.content_type='lead' and p.action='view' and(p.record_id is null or p.record_id=p_lead))
 and exists(select 1 from cms.permissions p where p.website_id=m.website_id and p.role_id=m.role_id and p.content_type='lead' and p.action='approve' and p.record_id is null));
$$;
create function cms.begin_notification_reconciliation(p_site uuid,p_lead uuid,p_job uuid,p_dispatch uuid,p_provider_id uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d cms.notification_dispatches;r cms.notification_reconciliations;
begin
 if p_provider_id is null or p_request is null then raise exception 'invalid_reconciliation_request';end if;
 if not cms.notification_reconciliation_allowed(p_site,auth.uid(),p_lead) then raise exception 'forbidden' using errcode='42501';end if;
 perform 1 from cms.lead_notification_jobs where website_id=p_site and lead_id=p_lead and id=p_job for update;
 if not found or not cms.notification_reconciliation_allowed(p_site,auth.uid(),p_lead) then raise exception 'forbidden' using errcode='42501';end if;
 select * into d from cms.notification_dispatches where website_id=p_site and job_id=p_job and id=p_dispatch;
 if not found then raise exception 'notification_dispatch_unavailable';end if;
 if d.provider_message_id is not null and d.provider_message_id<>p_provider_id then raise exception 'notification_receipt_conflict';end if;
 insert into cms.notification_reconciliations(website_id,actor_id,request_id,dispatch_id,provider_message_id) values(p_site,auth.uid(),p_request,p_dispatch,p_provider_id) on conflict do nothing;
 select * into r from cms.notification_reconciliations where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if r.dispatch_id<>p_dispatch or r.provider_message_id<>p_provider_id then raise exception 'idempotency_key_reused';end if;
 return jsonb_build_object('websiteId',p_site,'leadId',p_lead,'jobId',p_job,'actorId',auth.uid(),'requestId',p_request,'dispatchId',d.id,'providerMessageId',p_provider_id,'firstAttemptAt',d.first_attempt_at,'message',d.message,'receipt',r.receipt);
end $$;
create function cms.record_notification_reconciliation(p_site uuid,p_actor uuid,p_request uuid,p_message jsonb,p_evidence jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r cms.notification_reconciliations;d cms.notification_dispatches;j cms.lead_notification_jobs;proof_time timestamptz;observed timestamptz;result_receipt jsonb;
begin
 select * into r from cms.notification_reconciliations where website_id=p_site and actor_id=p_actor and request_id=p_request;
 if not found then raise exception 'reconciliation_request_unavailable';end if;
 select * into d from cms.notification_dispatches where website_id=p_site and id=r.dispatch_id;
 select * into j from cms.lead_notification_jobs where website_id=p_site and id=d.job_id for update;
 if not found or not cms.notification_reconciliation_allowed(p_site,p_actor,j.lead_id) then raise exception 'forbidden' using errcode='42501';end if;
 select * into r from cms.notification_reconciliations where website_id=p_site and actor_id=p_actor and request_id=p_request for update;
 select * into d from cms.notification_dispatches where website_id=p_site and id=r.dispatch_id for update;
 if p_message is distinct from d.message then raise exception 'notification_message_changed';end if;
 if r.receipt is not null then return r.receipt;end if;
 if j.status='running' and j.lease_until>clock_timestamp() then raise exception 'notification_worker_active' using errcode='40001';end if;
 if d.provider_message_id is not null and d.provider_message_id<>r.provider_message_id then raise exception 'notification_receipt_conflict';end if;
 if p_evidence is null or jsonb_typeof(p_evidence)<>'object' or octet_length(p_evidence::text)>2000 or not p_evidence ?& array['provider','dispatchId','providerMessageId','acceptedAt','observedAt','messageDigest']
 or p_evidence-array['provider','dispatchId','providerMessageId','acceptedAt','observedAt','messageDigest']<>'{}'::jsonb
 or p_evidence->>'provider' is distinct from 'resend' or p_evidence->>'dispatchId' is distinct from d.id::text or p_evidence->>'providerMessageId' is distinct from r.provider_message_id::text
 or coalesce(p_evidence->>'messageDigest','') !~ '^[a-f0-9]{64}$' then raise exception 'invalid_notification_evidence';end if;
 begin proof_time:=(p_evidence->>'acceptedAt')::timestamptz;observed:=(p_evidence->>'observedAt')::timestamptz;exception when others then raise exception 'invalid_notification_evidence_time';end;
 if proof_time is null or observed is null or not isfinite(proof_time) or not isfinite(observed) or observed<clock_timestamp()-interval '5 minutes' or observed>clock_timestamp()+interval '5 seconds'
 or proof_time<d.first_attempt_at-interval '5 seconds' or proof_time>observed+interval '5 seconds' then raise exception 'invalid_notification_evidence_time';end if;
 update cms.notification_dispatches set provider_message_id=r.provider_message_id,accepted_at=coalesce(accepted_at,clock_timestamp()) where id=d.id;
 result_receipt:=jsonb_build_object('websiteId',p_site,'leadId',j.lead_id,'jobId',j.id,'dispatchId',d.id,'requestId',p_request,'actorId',p_actor,'providerMessageId',r.provider_message_id,'recordedAt',clock_timestamp());
 update cms.notification_reconciliations set evidence=p_evidence,receipt=result_receipt where website_id=p_site and actor_id=p_actor and request_id=p_request;
 insert into cms.lead_events(website_id,lead_id,actor_id,action,details) values(p_site,j.lead_id,p_actor,'notification_reconciled',jsonb_build_object('dispatchId',d.id,'providerMessageId',r.provider_message_id,'requestId',p_request));
 return result_receipt;
end $$;
revoke all on function cms.notification_reconciliation_allowed(uuid,uuid,uuid),cms.begin_notification_reconciliation(uuid,uuid,uuid,uuid,uuid,uuid),cms.record_notification_reconciliation(uuid,uuid,uuid,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function cms.begin_notification_reconciliation(uuid,uuid,uuid,uuid,uuid,uuid) to authenticated;
grant execute on function cms.record_notification_reconciliation(uuid,uuid,uuid,jsonb,jsonb) to service_role;
commit;
