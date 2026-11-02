begin;
create or replace function cms.fail_publication_schedule(p_job uuid,p_token uuid,p_code text)
returns text language plpgsql security definer set search_path='' as $$
declare job cms.publication_schedules; terminal boolean;
begin
 select * into job from cms.publication_schedules where id=p_job for update;
 if not found or job.status<>'running' or p_token is null or job.lease_token is distinct from p_token or job.lease_until<=clock_timestamp() then raise exception 'schedule_lease_lost' using errcode='40001'; end if;
 if p_code is null or p_code not in ('validation_failed','validation_unavailable') then raise exception 'invalid_schedule_error'; end if;
 -- A newer draft cannot be fixed by retrying validation of the pinned old revision.
 if job.operation='publish' and exists(select 1 from cms.records r where r.website_id=job.website_id and r.id=job.record_id and r.current_revision_id is distinct from job.revision_id) then p_code:='publication_guard_failed';end if;
 terminal:=p_code in ('validation_failed','publication_guard_failed') or job.attempts>=8;
 update cms.publication_schedules set status=case when terminal then 'blocked' else 'pending' end,error_code=p_code,
 next_attempt_at=now()+make_interval(secs=>least(3600,15*power(2,attempts)::integer)),finished_at=case when terminal then now() else null end,lease_token=null,lease_until=null where id=job.id;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(job.website_id,job.actor_id,'schedule.validation_failed',job.record_id,job.revision_id,jsonb_build_object('scheduleId',job.id,'errorCode',p_code,'attempt',job.attempts,'terminal',terminal));
 return case when terminal then 'blocked' else 'retry_pending' end;
end $$;

commit;
