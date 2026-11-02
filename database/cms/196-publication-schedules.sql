begin;
create table cms.publication_schedules (
 id uuid primary key default gen_random_uuid(), website_id uuid not null,
 record_id uuid not null, revision_id uuid not null, actor_id uuid not null references auth.users(id),
 operation text not null check(operation in ('publish','unpublish')),
 run_at timestamptz not null check(isfinite(run_at)),
 status text not null default 'pending' check(status in ('pending','running','published','unpublished','blocked','cancelled')),
 attempts integer not null default 0 check(attempts between 0 and 8),
 next_attempt_at timestamptz not null, lease_token uuid, lease_until timestamptz,
 error_code text, delivery_job_id uuid references cms.delivery_jobs(id),
 created_at timestamptz not null default now(), finished_at timestamptz,
 foreign key(website_id,record_id,revision_id) references cms.revisions(website_id,record_id,id)
);
alter table cms.publication_schedules enable row level security;
-- A publish and a later withdrawal may coexist; duplicate active operations may not.
create unique index cms_schedule_active on cms.publication_schedules(website_id,record_id,operation) where status in ('pending','running');
create index cms_schedule_due on cms.publication_schedules(next_attempt_at) where status in ('pending','running');

create function cms.schedule_publication(p_site uuid,p_record uuid,p_revision uuid,p_operation text,p_run_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare rec cms.records; result uuid;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record for update;
 if not found or not cms.can(p_site,'publish',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_operation is null or p_operation not in ('publish','unpublish') or p_run_at is null or not isfinite(p_run_at) or p_run_at<=clock_timestamp() then raise exception 'invalid_schedule'; end if;
 if p_revision is null then raise exception 'revision_required'; end if;
 if p_operation='publish' and (rec.current_revision_id is distinct from p_revision or rec.approved_revision_id is distinct from p_revision or rec.review_status<>'approved') then raise exception 'approved_revision_required'; end if;
 if p_operation='unpublish' and rec.published_revision_id is distinct from p_revision then raise exception 'publication_conflict' using errcode='40001'; end if;
 insert into cms.publication_schedules(website_id,record_id,revision_id,actor_id,operation,run_at,next_attempt_at)
 values(p_site,p_record,p_revision,auth.uid(),p_operation,p_run_at,p_run_at) returning id into result;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(p_site,auth.uid(),'schedule.created',p_record,p_revision,jsonb_build_object('scheduleId',result,'operation',p_operation,'runAt',p_run_at));
 return result;
end $$;

create function cms.list_publication_schedules(p_site uuid,p_record uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found or not cms.can(p_site,'view',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(s)-'lease_token'-'lease_until' order by s.created_at desc,s.id) from
 (select * from cms.publication_schedules where website_id=p_site and record_id=p_record order by created_at desc,id limit 100) s),'[]');
end $$;

create function cms.cancel_publication_schedule(p_site uuid,p_schedule uuid)
returns void language plpgsql security definer set search_path='' as $$
declare job cms.publication_schedules; rec cms.records;
begin
 select * into job from cms.publication_schedules where website_id=p_site and id=p_schedule for update;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 select * into rec from cms.records where website_id=p_site and id=job.record_id;
 if not cms.can(p_site,'publish',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 if job.status='cancelled' then return; end if;
 if job.status not in ('pending','running') then raise exception 'schedule_finished'; end if;
 update cms.publication_schedules set status='cancelled',finished_at=now(),lease_token=null,lease_until=null where id=job.id;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(p_site,auth.uid(),'schedule.cancelled',job.record_id,job.revision_id,jsonb_build_object('scheduleId',job.id));
end $$;

create function cms.claim_publication_schedules(p_limit integer default 10,p_lease_seconds integer default 120)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job cms.publication_schedules; token uuid; result jsonb:='[]';
begin
 if p_limit is null or p_limit not between 1 and 50 or p_lease_seconds is null or p_lease_seconds not between 15 and 300 then raise exception 'invalid_lease_options'; end if;
 update cms.publication_schedules set status='blocked',error_code='worker_lease_expired',finished_at=now(),lease_token=null,lease_until=null
 where status='running' and attempts>=8 and lease_until<=now();
 for job in select * from cms.publication_schedules where run_at<=now() and attempts<8 and
 ((status='pending' and next_attempt_at<=now()) or (status='running' and lease_until<=now()))
 order by next_attempt_at,id for update skip locked limit p_limit loop
 token:=gen_random_uuid();
 update cms.publication_schedules set status='running',attempts=attempts+1,lease_token=token,lease_until=now()+make_interval(secs=>p_lease_seconds),error_code=null where id=job.id;
 result:=result||jsonb_build_array(jsonb_build_object('id',job.id,'site',job.website_id,'record',job.record_id,'revision',job.revision_id,'operation',job.operation,'runAt',job.run_at,'token',token));
 end loop;
 return result;
end $$;

create function cms.fail_publication_schedule(p_job uuid,p_token uuid,p_code text)
returns text language plpgsql security definer set search_path='' as $$
declare job cms.publication_schedules; terminal boolean;
begin
 select * into job from cms.publication_schedules where id=p_job for update;
 if not found or job.status<>'running' or p_token is null or job.lease_token is distinct from p_token or job.lease_until<=clock_timestamp() then raise exception 'schedule_lease_lost' using errcode='40001'; end if;
 if p_code is null or p_code not in ('validation_failed','validation_unavailable') then raise exception 'invalid_schedule_error'; end if;
 terminal:=p_code='validation_failed' or job.attempts>=8;
 update cms.publication_schedules set status=case when terminal then 'blocked' else 'pending' end,error_code=p_code,
 next_attempt_at=now()+make_interval(secs=>least(3600,15*power(2,attempts)::integer)),finished_at=case when terminal then now() else null end,lease_token=null,lease_until=null where id=job.id;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(job.website_id,job.actor_id,'schedule.validation_failed',job.record_id,job.revision_id,jsonb_build_object('scheduleId',job.id,'errorCode',p_code,'attempt',job.attempts,'terminal',terminal));
 return case when terminal then 'blocked' else 'retry_pending' end;
end $$;

-- This worker-only boundary restores request identity even on a rejected release.
-- Existing publish/unpublish functions and all their triggers remain authoritative.
create function cms.execute_publication_schedule(p_job uuid,p_token uuid)
returns text language plpgsql security definer set search_path='' as $$
declare job cms.publication_schedules; delivery uuid; old_sub text; old_claims text; rejected boolean:=false;
begin
 select * into job from cms.publication_schedules where id=p_job for update;
 if not found or job.status<>'running' or p_token is null or job.lease_token is distinct from p_token or job.lease_until<=clock_timestamp() or job.run_at>clock_timestamp() then raise exception 'schedule_lease_lost' using errcode='40001'; end if;
 old_sub:=current_setting('request.jwt.claim.sub',true); old_claims:=current_setting('request.jwt.claims',true);
 begin
 perform set_config('request.jwt.claim.sub',job.actor_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',job.actor_id,'role','authenticated')::text,true);
 if job.operation='publish' then delivery:=cms.publish(job.website_id,job.record_id,job.revision_id);
 else delivery:=cms.unpublish(job.website_id,job.record_id,job.revision_id); end if;
 exception when insufficient_privilege or raise_exception or serialization_failure or check_violation then rejected:=true;
 end;
 perform set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 perform set_config('request.jwt.claims',coalesce(old_claims,''),true);
 update cms.publication_schedules set status=case when rejected then 'blocked' when operation='publish' then 'published' else 'unpublished' end,
 error_code=case when rejected then 'publication_guard_failed' else null end,delivery_job_id=delivery,finished_at=now(),lease_token=null,lease_until=null where id=job.id;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(job.website_id,job.actor_id,case when rejected then 'schedule.blocked' else 'schedule.executed' end,job.record_id,job.revision_id,jsonb_build_object('scheduleId',job.id,'deliveryJobId',delivery));
 return case when rejected then 'blocked' when job.operation='publish' then 'published' else 'unpublished' end;
end $$;

revoke all on function cms.schedule_publication(uuid,uuid,uuid,text,timestamptz),cms.list_publication_schedules(uuid,uuid),cms.cancel_publication_schedule(uuid,uuid),cms.claim_publication_schedules(integer,integer),cms.fail_publication_schedule(uuid,uuid,text),cms.execute_publication_schedule(uuid,uuid) from public;
grant execute on function cms.schedule_publication(uuid,uuid,uuid,text,timestamptz),cms.list_publication_schedules(uuid,uuid),cms.cancel_publication_schedule(uuid,uuid) to authenticated;
grant execute on function cms.claim_publication_schedules(integer,integer),cms.fail_publication_schedule(uuid,uuid,text),cms.execute_publication_schedule(uuid,uuid) to service_role;
commit;
