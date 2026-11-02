begin;
create table cms.notification_probe_reconciliations(
 website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_id uuid not null,
 probe_id uuid not null references cms.notification_probe_requests(id),provider_message_id uuid not null,
 evidence jsonb,receipt jsonb,created_at timestamptz not null default clock_timestamp(),
 primary key(website_id,actor_id,request_id),check((evidence is null)=(receipt is null))
);
alter table cms.notification_probe_reconciliations enable row level security;
revoke all on cms.notification_probe_reconciliations from public,anon,authenticated,service_role;
create function cms.probe_reconciliation_allowed(p_site uuid,p_actor uuid,p_probe uuid)
returns boolean language sql volatile security definer set search_path='' as $$
 select exists(select 1 from cms.notification_probe_requests q join cms.memberships m on m.website_id=q.website_id and m.user_id=q.actor_id
 join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
 where q.id=p_probe and q.website_id=p_site and q.actor_id=p_actor
 and m.revoked_at is null and(m.expires_at is null or m.expires_at>clock_timestamp())
 and p.content_type='lead' and p.action='approve' and p.record_id is null);
$$;
create function cms.begin_probe_reconciliation(p_site uuid,p_probe uuid,p_provider uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare q cms.notification_probe_requests;r cms.notification_probe_reconciliations;
begin
 if p_provider is null or p_request is null then raise exception 'invalid_reconciliation_request';end if;
 if not cms.probe_reconciliation_allowed(p_site,auth.uid(),p_probe) then raise exception 'forbidden' using errcode='42501';end if;
 select * into q from cms.notification_probe_requests where website_id=p_site and id=p_probe for update;
 if not found or not cms.probe_reconciliation_allowed(p_site,auth.uid(),p_probe) then raise exception 'forbidden' using errcode='42501';end if;
 if q.state<>'pending' or q.first_attempt_at is null or q.message is null then raise exception 'notification_probe_unavailable';end if;
 if q.provider_message_id is not null and q.provider_message_id<>p_provider then raise exception 'notification_probe_receipt_conflict';end if;
 insert into cms.notification_probe_reconciliations(website_id,actor_id,request_id,probe_id,provider_message_id) values(p_site,auth.uid(),p_request,p_probe,p_provider) on conflict do nothing;
 select * into r from cms.notification_probe_reconciliations where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if r.probe_id<>p_probe or r.provider_message_id<>p_provider then raise exception 'idempotency_key_reused';end if;
 if r.receipt is null and q.lease_until>clock_timestamp() then raise exception 'notification_probe_leased' using errcode='40001';end if;
 return jsonb_build_object('websiteId',p_site,'probeId',p_probe,'requestId',p_request,'actorId',auth.uid(),'providerMessageId',p_provider,'firstAttemptAt',q.first_attempt_at,'message',q.message,'receipt',r.receipt);
end $$;
create function cms.record_probe_reconciliation(p_site uuid,p_actor uuid,p_request uuid,p_message jsonb,p_evidence jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare q cms.notification_probe_requests;r cms.notification_probe_reconciliations;observed timestamptz;accepted timestamptz;result jsonb;
begin
 select * into r from cms.notification_probe_reconciliations where website_id=p_site and actor_id=p_actor and request_id=p_request;
 if not found then raise exception 'reconciliation_request_unavailable';end if;
 select * into q from cms.notification_probe_requests where website_id=p_site and id=r.probe_id for update;
 if not found or not cms.probe_reconciliation_allowed(p_site,p_actor,q.id) then raise exception 'forbidden' using errcode='42501';end if;
 select * into r from cms.notification_probe_reconciliations where website_id=p_site and actor_id=p_actor and request_id=p_request for update;
 if p_message is distinct from q.message then raise exception 'notification_message_changed';end if;
 if r.receipt is not null then return r.receipt;end if;
 if q.state<>'pending' or q.first_attempt_at is null then raise exception 'notification_probe_unavailable';end if;
 if q.lease_until>clock_timestamp() then raise exception 'notification_probe_leased' using errcode='40001';end if;
 if q.provider_message_id is not null and q.provider_message_id<>r.provider_message_id then raise exception 'notification_probe_receipt_conflict';end if;
 if p_evidence is null or jsonb_typeof(p_evidence)<>'object' or octet_length(p_evidence::text)>2000
 or not p_evidence ?& array['provider','dispatchId','providerMessageId','acceptedAt','observedAt','messageDigest']
 or p_evidence-array['provider','dispatchId','providerMessageId','acceptedAt','observedAt','messageDigest']<>'{}'::jsonb
 or p_evidence->>'provider' is distinct from 'resend' or p_evidence->>'dispatchId' is distinct from q.id::text
 or p_evidence->>'providerMessageId' is distinct from r.provider_message_id::text
 or coalesce(p_evidence->>'messageDigest','') !~ '^[a-f0-9]{64}$' then raise exception 'invalid_notification_evidence';end if;
 begin accepted:=(p_evidence->>'acceptedAt')::timestamptz;observed:=(p_evidence->>'observedAt')::timestamptz;exception when others then raise exception 'invalid_notification_evidence_time';end;
 if accepted is null or observed is null or not isfinite(accepted) or not isfinite(observed)
 or observed<clock_timestamp()-interval '5 minutes' or observed>clock_timestamp()+interval '5 seconds'
 or accepted<q.first_attempt_at-interval '5 seconds' or accepted>observed+interval '5 seconds' then raise exception 'invalid_notification_evidence_time';end if;
 update cms.notification_probe_requests set provider_message_id=r.provider_message_id,accepted_at=coalesce(accepted_at,clock_timestamp()) where id=q.id;
 result:=jsonb_build_object('websiteId',p_site,'probeId',q.id,'requestId',p_request,'actorId',p_actor,'providerMessageId',r.provider_message_id,'recordedAt',clock_timestamp());
 update cms.notification_probe_reconciliations set evidence=p_evidence,receipt=result where website_id=p_site and actor_id=p_actor and request_id=p_request;
 return result;
end $$;
revoke all on function cms.probe_reconciliation_allowed(uuid,uuid,uuid),cms.begin_probe_reconciliation(uuid,uuid,uuid,uuid),cms.record_probe_reconciliation(uuid,uuid,uuid,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function cms.begin_probe_reconciliation(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function cms.record_probe_reconciliation(uuid,uuid,uuid,jsonb,jsonb) to service_role;
commit;
