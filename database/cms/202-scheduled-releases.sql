begin;
create table cms.release_schedules (
 id uuid primary key default gen_random_uuid(),website_id uuid not null references cms.websites(id),
 request_id uuid not null,actor_id uuid not null references auth.users(id),items jsonb not null,
 run_at timestamptz not null check(isfinite(run_at)),status text not null default 'pending' check(status in ('pending','running','published','blocked','cancelled')),
 attempts integer not null default 0 check(attempts between 0 and 8),next_attempt_at timestamptz not null,
 lease_token uuid,lease_until timestamptz,error_code text,receipt jsonb,created_at timestamptz not null default now(),finished_at timestamptz,
 unique(website_id,request_id)
);
alter table cms.release_schedules enable row level security;
create index cms_release_schedules_due on cms.release_schedules(next_attempt_at) where status in ('pending','running');
create function cms.schedule_release(p_site uuid,p_request uuid,p_items jsonb,p_run_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare item jsonb;rec cms.records;count_records integer:=0;existing cms.release_schedules;
begin
 if p_site is null or p_request is null or p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'invalid_release'; end if;
 if jsonb_array_length(p_items) not between 1 and 50 or octet_length(p_items::text)>20000 then raise exception 'invalid_release'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item)<>'object' or not(item ?& array['record','revision']) or (item-'record'-'revision')<>'{}'::jsonb
   or jsonb_typeof(item->'record')<>'string' or jsonb_typeof(item->'revision')<>'string'
   or (item->>'record') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or (item->>'revision') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'invalid_release'; end if;
 end loop;
 if (select count(distinct (value->>'record')::uuid) from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then raise exception 'duplicate_release_record'; end if;
 -- Serialize overlapping releases in UUID order, regardless of dependency order.
 for rec in select * from cms.records where website_id=p_site and id in(select (value->>'record')::uuid from jsonb_array_elements(p_items)) order by id for update loop
  if not cms.can(p_site,'publish',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
  count_records:=count_records+1;
 end loop;
 if count_records<>jsonb_array_length(p_items) then raise exception 'forbidden' using errcode='42501'; end if;

 select * into existing from cms.release_schedules where website_id=p_site and request_id=p_request;
 if found then
  if existing.actor_id is distinct from auth.uid() or existing.items is distinct from p_items or existing.run_at is distinct from p_run_at then raise exception 'idempotency_key_reused'; end if;
  return existing.id;
 end if;
 if p_run_at is null or not isfinite(p_run_at) or p_run_at<=clock_timestamp() then raise exception 'invalid_schedule'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  select * into rec from cms.records where website_id=p_site and id=(item->>'record')::uuid;
  if rec.current_revision_id is distinct from (item->>'revision')::uuid or rec.approved_revision_id is distinct from rec.current_revision_id or rec.review_status<>'approved' then raise exception 'approved_revision_required'; end if;
 end loop;
 insert into cms.release_schedules(website_id,request_id,actor_id,items,run_at,next_attempt_at) values(p_site,p_request,auth.uid(),p_items,p_run_at,p_run_at) returning * into existing;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'release.schedule_created',jsonb_build_object('scheduleId',existing.id,'requestId',p_request,'runAt',p_run_at));
 return existing.id;
end $$;
create function cms.cancel_scheduled_release(p_site uuid,p_schedule uuid)
returns void language plpgsql security definer set search_path='' as $$
declare job cms.release_schedules;item jsonb;rec cms.records;
begin
 select * into job from cms.release_schedules where website_id=p_site and id=p_schedule for update;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 for item in select value from jsonb_array_elements(job.items) loop
  select * into rec from cms.records where website_id=p_site and id=(item->>'record')::uuid;
  if not found or not cms.can(p_site,'publish',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 end loop;
 if job.status='cancelled' then return; end if;
 if job.status not in ('pending','running') then raise exception 'schedule_finished'; end if;
 update cms.release_schedules set status='cancelled',finished_at=now(),lease_token=null,lease_until=null where id=job.id;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'release.schedule_cancelled',jsonb_build_object('scheduleId',job.id));
end $$;
create function cms.claim_scheduled_release()
returns jsonb language plpgsql security definer set search_path='' as $$
declare job cms.release_schedules;token uuid;
begin
 update cms.release_schedules set status='blocked',finished_at=now(),lease_token=null,lease_until=null,error_code='worker_lease_expired' where status='running' and attempts>=8 and lease_until<=now();
 select * into job from cms.release_schedules where run_at<=now() and attempts<8 and ((status='pending' and next_attempt_at<=now()) or (status='running' and lease_until<=now())) order by next_attempt_at,id for update skip locked limit 1;
 if not found then return null; end if;
 token:=gen_random_uuid();
 update cms.release_schedules set status='running',attempts=attempts+1,lease_token=token,lease_until=now()+interval '5 minutes',error_code=null where id=job.id;
 return jsonb_build_object('id',job.id,'token',token,'site',job.website_id,'request',job.request_id,'items',job.items);
end $$;
create function cms.fail_scheduled_release(p_job uuid,p_token uuid,p_code text)
returns text language plpgsql security definer set search_path='' as $$
declare job cms.release_schedules;terminal boolean;
begin
 select * into job from cms.release_schedules where id=p_job for update;
 if not found or job.status<>'running' or p_token is null or job.lease_token is distinct from p_token or job.lease_until<=clock_timestamp() then raise exception 'schedule_lease_lost' using errcode='40001'; end if;
 if p_code is null or p_code not in ('validation_failed','validation_unavailable') then raise exception 'invalid_schedule_error'; end if;
 terminal:=p_code='validation_failed' or job.attempts>=8;
 update cms.release_schedules set status=case when terminal then 'blocked' else 'pending' end,error_code=p_code,finished_at=case when terminal then now() else null end,next_attempt_at=now()+make_interval(secs=>least(3600,15*power(2,attempts)::integer)),lease_token=null,lease_until=null where id=job.id;
 return case when terminal then 'blocked' else 'retry_pending' end;
end $$;
create function cms.execute_scheduled_release(p_job uuid,p_token uuid)
returns text language plpgsql security definer set search_path='' as $$
declare job cms.release_schedules;old_sub text;old_claims text;result jsonb;rejected boolean:=false;
begin
 select * into job from cms.release_schedules where id=p_job for update;
 if not found or job.status<>'running' or p_token is null or job.lease_token is distinct from p_token or job.lease_until<=clock_timestamp() or job.run_at>clock_timestamp() then raise exception 'schedule_lease_lost' using errcode='40001'; end if;
 old_sub:=current_setting('request.jwt.claim.sub',true);old_claims:=current_setting('request.jwt.claims',true);
 begin
  perform set_config('request.jwt.claim.sub',job.actor_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',job.actor_id,'role','authenticated')::text,true);
  result:=cms.publish_release(job.website_id,job.request_id,job.items);
 exception when insufficient_privilege or raise_exception or serialization_failure or check_violation then rejected:=true;
 end;
 perform set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 perform set_config('request.jwt.claims',coalesce(old_claims,''),true);
 update cms.release_schedules set status=case when rejected then 'blocked' else 'published' end,receipt=result,error_code=case when rejected then 'publication_guard_failed' else null end,finished_at=now(),lease_token=null,lease_until=null where id=job.id;
 insert into cms.audit_events(website_id,actor_id,action,details) values(job.website_id,job.actor_id,case when rejected then 'release.schedule_blocked' else 'release.schedule_executed' end,jsonb_build_object('scheduleId',job.id,'requestId',job.request_id));
 return case when rejected then 'blocked' else 'published' end;
end $$;
revoke all on function cms.schedule_release(uuid,uuid,jsonb,timestamptz),cms.cancel_scheduled_release(uuid,uuid),cms.claim_scheduled_release(),cms.fail_scheduled_release(uuid,uuid,text),cms.execute_scheduled_release(uuid,uuid) from public;
grant execute on function cms.schedule_release(uuid,uuid,jsonb,timestamptz),cms.cancel_scheduled_release(uuid,uuid) to authenticated;
grant execute on function cms.claim_scheduled_release(),cms.fail_scheduled_release(uuid,uuid,text),cms.execute_scheduled_release(uuid,uuid) to service_role;
commit;
