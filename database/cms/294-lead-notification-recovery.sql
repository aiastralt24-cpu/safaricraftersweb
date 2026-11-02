begin;
alter table cms.lead_notification_jobs add column retry_generation integer not null default 1 check(retry_generation>0);
create table cms.lead_notification_retries (
 website_id uuid not null,actor_id uuid not null references auth.users(id),request_id uuid not null,
 job_id uuid not null references cms.lead_notification_jobs(id),lead_id uuid not null,
 expected_generation integer not null check(expected_generation>0),created_at timestamptz not null default now(),
 primary key(website_id,actor_id,request_id),foreign key(website_id,lead_id) references cms.leads(website_id,id)
);
alter table cms.lead_notification_retries enable row level security;
create function cms.retry_lead_notification(p_site uuid,p_lead uuid,p_job uuid,p_generation integer,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job cms.lead_notification_jobs; previous cms.lead_notification_retries;
begin
 if p_request is null or p_generation is null or p_generation<1 then raise exception 'invalid_notification_retry';end if;
 if not cms.can_lead(p_site,'view',p_lead) or not cms.can_lead(p_site,'edit',p_lead) then raise exception 'forbidden' using errcode='42501';end if;
 -- Serialize with merging without blocking the worker’s event foreign-key check.
 perform 1 from cms.leads where website_id=p_site and id=p_lead for no key update;
 if not found then raise exception 'forbidden' using errcode='42501';end if;
 select * into job from cms.lead_notification_jobs where website_id=p_site and lead_id=p_lead and id=p_job for update;
 if not found then raise exception 'forbidden' using errcode='42501';end if;
 if not cms.can_lead(p_site,'view',p_lead) or not cms.can_lead(p_site,'edit',p_lead) then raise exception 'forbidden' using errcode='42501';end if;
 select * into previous from cms.lead_notification_retries where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if found then
  if previous.job_id is distinct from p_job or previous.lead_id is distinct from p_lead or previous.expected_generation is distinct from p_generation then raise exception 'idempotency_key_reused';end if;
  return jsonb_build_object('websiteId',p_site,'leadId',p_lead,'jobId',p_job,'requestId',p_request,'generation',p_generation+1,'replayed',true);
 end if;
 if cms.lead_is_merged(p_site,p_lead) or job.retry_generation<>p_generation or job.status<>'failed' or job.attempts<8 or job.finished_at is null or job.lease_token is not null or job.lease_until is not null then raise exception 'notification_retry_not_eligible' using errcode='40001';end if;
 update cms.lead_notification_jobs set status='pending',attempts=0,next_attempt_at=now(),finished_at=null,last_error_code=null,retry_generation=retry_generation+1 where id=p_job;
 insert into cms.lead_notification_retries(website_id,actor_id,request_id,job_id,lead_id,expected_generation) values(p_site,auth.uid(),p_request,p_job,p_lead,p_generation);
 insert into cms.lead_events(website_id,lead_id,actor_id,action,details) values(p_site,p_lead,auth.uid(),'notification_retry_requested',jsonb_build_object('jobId',p_job,'generation',p_generation+1,'previousAttempts',job.attempts,'previousErrorCode',job.last_error_code));
 return jsonb_build_object('websiteId',p_site,'leadId',p_lead,'jobId',p_job,'requestId',p_request,'generation',p_generation+1,'replayed',false);
end $$;

alter function cms.get_lead(uuid,uuid) rename to get_lead_before_notification_recovery;
revoke all on function cms.get_lead_before_notification_recovery(uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_lead(p_site uuid,p_lead uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not cms.can_lead(p_site,'view',p_lead) then return null;end if;
 result:=cms.get_lead_before_notification_recovery(p_site,p_lead);if result is null then return null;end if;
 return result||jsonb_build_object('notifications',(select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'status',j.status,'attempts',j.attempts,'errorCode',j.last_error_code,'generation',j.retry_generation,
 'canRetry',cms.can_lead(p_site,'edit',p_lead) and not cms.lead_is_merged(p_site,p_lead) and j.status='failed' and j.attempts>=8 and j.finished_at is not null and j.lease_token is null and j.lease_until is null) order by j.created_at,j.id),'[]') from cms.lead_notification_jobs j where j.website_id=p_site and j.lead_id=p_lead));
end $$;
revoke all on function cms.retry_lead_notification(uuid,uuid,uuid,integer,uuid),cms.get_lead(uuid,uuid) from public;
grant execute on function cms.retry_lead_notification(uuid,uuid,uuid,integer,uuid),cms.get_lead(uuid,uuid) to authenticated;
commit;
