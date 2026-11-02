begin;
create index cms_lead_notifications_due on cms.lead_notification_jobs(next_attempt_at) where status in ('pending','failed','running');
create function cms.claim_lead_notifications(p_limit integer default 10,p_lease_seconds integer default 120)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job cms.lead_notification_jobs; token uuid; result jsonb:='[]';
begin
 if p_limit is null or p_limit not between 1 and 50 or p_lease_seconds is null or p_lease_seconds not between 30 and 300 then raise exception 'invalid_notification_claim'; end if;
 for job in select * from cms.lead_notification_jobs where attempts<8 and ((status in ('pending','failed') and next_attempt_at<=now() and finished_at is null) or (status='running' and lease_until<=now())) order by next_attempt_at,id for update skip locked limit p_limit loop
  token:=gen_random_uuid();
  update cms.lead_notification_jobs set status='running',attempts=attempts+1,lease_token=token,lease_until=now()+make_interval(secs=>p_lease_seconds),last_error_code=null where id=job.id;
  result:=result||jsonb_build_array(jsonb_build_object('id',job.id,'websiteId',job.website_id,'leadId',job.lead_id,'leaseToken',token,'attempt',job.attempts+1));
 end loop;
 return result;
end $$;
create function cms.get_lead_notification_input(p_job uuid,p_token uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('websiteId',l.website_id,'leadId',l.id,'formId',l.form_id,'formRevision',l.form_revision_id,'formTitle',v.payload->>'title','routeIds',coalesce(v.payload->'notificationRouteIds','[]'::jsonb),'answers',l.answers,'receivedAt',l.created_at)
 from cms.lead_notification_jobs j join cms.leads l on l.website_id=j.website_id and l.id=j.lead_id
 join cms.revisions v on v.website_id=l.website_id and v.record_id=l.form_id and v.id=l.form_revision_id
 where j.id=p_job and j.status='running' and j.lease_token=p_token and j.lease_until>now();
$$;
create function cms.finish_lead_notification(p_job uuid,p_token uuid,p_success boolean,p_error_code text default null)
returns void language plpgsql security definer set search_path='' as $$
declare job cms.lead_notification_jobs;
begin
 select * into job from cms.lead_notification_jobs where id=p_job for update;
 if not found or job.status<>'running' or p_token is null or job.lease_token is distinct from p_token or job.lease_until<=now() then raise exception 'notification_lease_lost' using errcode='40001'; end if;
 if p_success is null then raise exception 'notification_result_required'; end if;
 if not p_success and (p_error_code is null or p_error_code !~ '^[a-z][a-z0-9_]{0,79}$') then raise exception 'safe_error_code_required'; end if;
 update cms.lead_notification_jobs set status=case when p_success then 'succeeded' else 'failed' end,
 finished_at=case when p_success or attempts>=8 then now() else null end,
 next_attempt_at=case when p_success then next_attempt_at else now()+make_interval(secs=>least(3600,15*power(2,attempts)::integer)) end,
 lease_until=null,lease_token=null,last_error_code=case when p_success then null else p_error_code end where id=p_job;
 insert into cms.lead_events(website_id,lead_id,action,details) values(job.website_id,job.lead_id,case when p_success then 'notification_succeeded' else 'notification_failed' end,jsonb_build_object('jobId',job.id,'attempt',job.attempts,'errorCode',case when p_success then null else p_error_code end));
end $$;
create function cms.reap_lead_notifications()
returns integer language plpgsql security definer set search_path='' as $$
declare count integer;
begin
 with expired as (update cms.lead_notification_jobs set status='failed',finished_at=now(),lease_token=null,lease_until=null,last_error_code='worker_lease_expired' where status='running' and attempts>=8 and lease_until<=now() returning *)
 insert into cms.lead_events(website_id,lead_id,action,details) select website_id,lead_id,'notification_failed',jsonb_build_object('jobId',id,'attempt',attempts,'errorCode','worker_lease_expired') from expired;
 get diagnostics count=row_count;return count;
end $$;
revoke all on function cms.claim_lead_notifications(integer,integer),cms.get_lead_notification_input(uuid,uuid),cms.finish_lead_notification(uuid,uuid,boolean,text),cms.reap_lead_notifications() from public;
grant execute on function cms.claim_lead_notifications(integer,integer),cms.get_lead_notification_input(uuid,uuid),cms.finish_lead_notification(uuid,uuid,boolean,text),cms.reap_lead_notifications() to service_role;
commit;
