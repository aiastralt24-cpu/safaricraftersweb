begin;
create table cms.validation_jobs (
 id uuid primary key default gen_random_uuid(),website_id uuid not null,record_id uuid not null,revision_id uuid not null unique,
 requested_by uuid not null references auth.users(id),requested_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','running','succeeded','failed','superseded')),
 attempts integer not null default 0,lease_token uuid,lease_until timestamptz,next_attempt_at timestamptz not null default now(),
 finished_at timestamptz,last_error_code text,
 foreign key(website_id,record_id,revision_id) references cms.revisions(website_id,record_id,id)
);
alter table cms.validation_jobs enable row level security;
create policy validation_job_read on cms.validation_jobs for select to authenticated using(cms.can(website_id,'view',(select content_type from cms.records where id=record_id),record_id));
grant select on cms.validation_jobs to authenticated;
create index cms_validation_pending on cms.validation_jobs(next_attempt_at) where status in ('pending','running','failed');
create function cms.request_validation(p_site uuid,p_record uuid,p_revision uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare rec cms.records; job cms.validation_jobs;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found or not cms.can(p_site,'view',rec.content_type,p_record) or not (
 cms.can(p_site,'edit',rec.content_type,p_record) or cms.can(p_site,'submit',rec.content_type,p_record)
 or cms.can(p_site,'approve',rec.content_type,p_record) or cms.can(p_site,'publish',rec.content_type,p_record)) then raise exception 'forbidden' using errcode='42501'; end if;
 if rec.current_revision_id is distinct from p_revision then raise exception 'revision_conflict' using errcode='40001'; end if;
 if not exists(select 1 from cms.validation_policy where content_type=rec.content_type) then raise exception 'unsupported_validation_type'; end if;
 insert into cms.validation_jobs(website_id,record_id,revision_id,requested_by) values(p_site,p_record,p_revision,auth.uid()) on conflict(revision_id) do nothing;
 select * into job from cms.validation_jobs where revision_id=p_revision for update;
 if job.status in ('succeeded','superseded') or (job.status='failed' and job.attempts>=8) then
  if job.requested_at>now()-interval '30 seconds' then raise exception 'validation_request_throttled'; end if;
  update cms.validation_jobs set status='pending',attempts=0,requested_by=auth.uid(),requested_at=now(),next_attempt_at=now(),finished_at=null,last_error_code=null,lease_token=null,lease_until=null where id=job.id;
 end if;
 return job.id;
end $$;
create function cms.claim_validations(p_limit integer default 10,p_lease_seconds integer default 120)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job cms.validation_jobs; result jsonb:='[]'; token uuid;
begin
 if p_limit is null or p_limit not between 1 and 50 or p_lease_seconds is null or p_lease_seconds not between 30 and 300 then raise exception 'invalid_lease_options'; end if;
 update cms.validation_jobs set status='failed',finished_at=now(),lease_token=null,lease_until=null,last_error_code='worker_lease_expired' where status='running' and attempts>=8 and lease_until<=now();
 for job in select * from cms.validation_jobs where attempts<8 and ((status in ('pending','failed') and next_attempt_at<=now()) or (status='running' and lease_until<=now())) order by next_attempt_at,id for update skip locked limit p_limit loop
  if not exists(select 1 from cms.records where id=job.record_id and website_id=job.website_id and current_revision_id=job.revision_id) then
   update cms.validation_jobs set status='superseded',finished_at=now(),lease_token=null,lease_until=null where id=job.id;continue;
  end if;
  token:=gen_random_uuid();
  update cms.validation_jobs set status='running',attempts=attempts+1,lease_token=token,lease_until=now()+make_interval(secs=>p_lease_seconds),last_error_code=null where id=job.id;
  result:=result||jsonb_build_array(jsonb_build_object('id',job.id,'site',job.website_id,'record',job.record_id,'revision',job.revision_id,'token',token));
 end loop;
 return result;
end $$;
create function cms.get_validation_job_input(p_job uuid,p_token uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select cms.get_validation_input(website_id,record_id,revision_id) from cms.validation_jobs
 where id=p_job and lease_token=p_token and status='running' and lease_until>now();
$$;
create function cms.finish_validation_job(p_job uuid,p_token uuid,p_version text,p_valid boolean,p_findings jsonb,p_error_code text default null)
returns void language plpgsql security definer set search_path='' as $$
declare job cms.validation_jobs;
begin
 select * into job from cms.validation_jobs where id=p_job for update;
 if not found or p_token is null or job.lease_token is distinct from p_token or job.status<>'running' or job.lease_until<=now() then raise exception 'validation_lease_lost' using errcode='40001'; end if;
 if p_error_code is not null then
  if p_error_code not in ('validation_unavailable','invalid_worker_input') then raise exception 'safe_error_code_required'; end if;
  update cms.validation_jobs set status='failed',lease_token=null,lease_until=null,last_error_code=p_error_code,
   next_attempt_at=now()+make_interval(secs=>least(3600,15*power(2,attempts)::integer)),finished_at=case when attempts>=8 then now() else null end where id=job.id;
 else
  -- Receipt and job acknowledgement share a transaction and an active lease.
  perform cms.record_validation(job.website_id,job.record_id,job.revision_id,p_version,p_valid,p_findings);
  update cms.validation_jobs set status='succeeded',finished_at=now(),lease_token=null,lease_until=null,last_error_code=null where id=job.id;
 end if;
end $$;
revoke all on function cms.request_validation(uuid,uuid,uuid),cms.claim_validations(integer,integer),cms.get_validation_job_input(uuid,uuid),cms.finish_validation_job(uuid,uuid,text,boolean,jsonb,text) from public;
grant execute on function cms.request_validation(uuid,uuid,uuid) to authenticated;
grant execute on function cms.claim_validations(integer,integer),cms.get_validation_job_input(uuid,uuid),cms.finish_validation_job(uuid,uuid,text,boolean,jsonb,text) to service_role;
commit;
