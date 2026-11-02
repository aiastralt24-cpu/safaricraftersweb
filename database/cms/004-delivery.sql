begin;
alter table cms.delivery_jobs add column lease_token uuid;
alter table cms.delivery_jobs add column finished_at timestamptz;
alter table cms.delivery_jobs drop constraint delivery_jobs_status_check;
alter table cms.delivery_jobs add constraint delivery_jobs_status_check check(status in ('pending','running','succeeded','failed','superseded'));
create index cms_delivery_expired on cms.delivery_jobs(lease_until) where status='running';

create function cms.unpublish(p_site uuid,p_record uuid,p_expected_published uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare rec cms.records; job uuid;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record for update;
 if not found or not cms.can(p_site,'publish',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 if rec.published_revision_id is null then
  -- A retry only matches the revision it originally removed.
  select id into job from cms.delivery_jobs where website_id=p_site and record_id=p_record
   and operation='unpublish' and revision_id=p_expected_published order by created_at desc limit 1;
  if job is null then raise exception 'publication_conflict' using errcode='40001'; end if;
  return job;
 end if;
 if p_expected_published is distinct from rec.published_revision_id then raise exception 'publication_conflict' using errcode='40001'; end if;
 update cms.records set published_revision_id=null,updated_at=now() where id=p_record;
 insert into cms.delivery_jobs(website_id,record_id,revision_id,operation) values(p_site,p_record,p_expected_published,'unpublish') returning id into job;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(p_site,auth.uid(),'unpublished',p_record,p_expected_published,jsonb_build_object('deliveryJobId',job));
 return job;
end $$;

-- Jobs invalidate derived caches; workers must never write a historical payload
-- into public delivery. Public reads always resolve the current published pointer.
create function cms.claim_delivery(p_limit integer default 10,p_lease_seconds integer default 60)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job cms.delivery_jobs; rec cms.records; result jsonb := '[]'; token uuid;
begin
 if p_limit is null or p_limit not between 1 and 50 or p_lease_seconds is null or p_lease_seconds not between 15 and 300 then raise exception 'invalid_lease_options'; end if;
 for job in select * from cms.delivery_jobs
  where attempts<8 and ((status in ('pending','failed') and next_attempt_at<=now()) or (status='running' and lease_until<=now()))
  order by next_attempt_at,created_at,id for update skip locked limit p_limit loop
  select * into rec from cms.records where website_id=job.website_id and id=job.record_id;
  if (job.operation='publish' and rec.published_revision_id is distinct from job.revision_id)
   or (job.operation='unpublish' and rec.published_revision_id is not null) then
   update cms.delivery_jobs set status='superseded',finished_at=now(),lease_until=null,lease_token=null where id=job.id;
   continue;
  end if;
  token:=gen_random_uuid();
  update cms.delivery_jobs set status='running',attempts=attempts+1,lease_until=now()+make_interval(secs=>p_lease_seconds),lease_token=token,last_error=null where id=job.id;
  result:=result||jsonb_build_array(jsonb_build_object('id',job.id,'websiteId',job.website_id,'recordId',job.record_id,'revisionId',job.revision_id,
   'operation',job.operation,'path',rec.path,'locale',rec.locale,'contentType',rec.content_type,'leaseToken',token,'attempt',job.attempts+1));
 end loop;
 return result;
end $$;

create function cms.finish_delivery(p_job uuid,p_token uuid,p_success boolean,p_error_code text default null)
returns void language plpgsql security definer set search_path='' as $$
declare job cms.delivery_jobs;
begin
 select * into job from cms.delivery_jobs where id=p_job for update;
 if not found or job.status<>'running' or p_token is null or job.lease_token is distinct from p_token or job.lease_until<=now() then raise exception 'delivery_lease_lost' using errcode='40001'; end if;
 if p_success is null then raise exception 'delivery_result_required'; end if;
 if not p_success and (p_error_code is null or p_error_code !~ '^[a-z][a-z0-9_]{0,79}$') then raise exception 'safe_error_code_required'; end if;
 update cms.delivery_jobs set status=case when p_success then 'succeeded' else 'failed' end,
  finished_at=case when p_success or attempts>=8 then now() else null end,
  next_attempt_at=case when p_success then next_attempt_at else now()+make_interval(secs=>least(3600,15*power(2,attempts)::integer)) end,
  lease_until=null,lease_token=null,last_error=case when p_success then null else p_error_code end where id=p_job;
 insert into cms.audit_events(website_id,action,record_id,revision_id,details)
 values(job.website_id,case when p_success then 'delivery.succeeded' else 'delivery.failed' end,job.record_id,job.revision_id,
  jsonb_build_object('deliveryJobId',job.id,'attempt',job.attempts,'errorCode',case when p_success then null else p_error_code end));
end $$;

-- A crashed eighth attempt must become visibly terminal rather than stay running.
create function cms.reap_delivery()
returns integer language plpgsql security definer set search_path='' as $$
declare count integer;
begin
 update cms.delivery_jobs set status='failed',finished_at=now(),lease_until=null,lease_token=null,last_error='worker_lease_expired'
 where status='running' and attempts>=8 and lease_until<=now();
 get diagnostics count=row_count;
 return count;
end $$;
revoke all on function cms.unpublish(uuid,uuid,uuid),cms.claim_delivery(integer,integer),cms.finish_delivery(uuid,uuid,boolean,text),cms.reap_delivery() from public;
grant execute on function cms.unpublish(uuid,uuid,uuid) to authenticated;
grant execute on function cms.claim_delivery(integer,integer),cms.finish_delivery(uuid,uuid,boolean,text),cms.reap_delivery() to service_role;
commit;
