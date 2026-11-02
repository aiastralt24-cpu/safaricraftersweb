begin;
-- Disabled until an AAL2 access administrator explicitly enables the site policy.
create table cms.mfa_policies (
 website_id uuid primary key references cms.websites(id),
 require_privileged boolean not null default false,
 version bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table cms.mfa_policies enable row level security;
revoke all on cms.mfa_policies from public,anon,authenticated;

-- Claims are supplied by the authenticated provider gateway, not RPC arguments.
create function cms.has_second_factor()
returns boolean language plpgsql stable security definer set search_path='' as $$
declare claims jsonb;
begin
 claims:=nullif(current_setting('request.jwt.claims',true),'')::jsonb;
 return coalesce(claims->>'aal'='aal2' and claims->>'sub'=auth.uid()::text,false);
exception when others then return false;
end $$;
create function cms.mfa_allows(p_site uuid,p_action text)
returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from cms.mfa_policies where website_id=p_site and require_privileged)
 or p_action not in ('approve','publish','configure','export','delete','lead_write')
 or cms.has_second_factor()
 -- Only the database service role may execute a previously authorized schedule.
 -- Current membership/permissions are still checked by every caller below.
 or (p_action='publish' and current_setting('role',true)='service_role');
$$;
create or replace function cms.can(p_site uuid,p_action text,p_type text default '*',p_record uuid default null)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.mfa_allows(p_site,p_action) and exists(
  select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
  where m.website_id=p_site and m.user_id=(select auth.uid()) and m.revoked_at is null
   and (m.expires_at is null or m.expires_at>now()) and p.action=p_action
   and (p.content_type='*' or p.content_type=p_type) and (p.record_id is null or p.record_id=p_record));
$$;
create or replace function cms.can_manage_access(p_site uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.mfa_allows(p_site,'configure') and exists (
  select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
  where m.website_id=p_site and m.user_id=auth.uid() and m.revoked_at is null
   and (m.expires_at is null or m.expires_at>now()) and p.action='configure' and p.content_type='access' and p.record_id is null);
$$;
create or replace function cms.can_lead(p_site uuid,p_action text,p_lead uuid default null)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.mfa_allows(p_site,case when p_action='view' then 'view' else 'lead_write' end) and exists(
 select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
 where m.website_id=p_site and m.user_id=auth.uid() and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())
 and p.content_type='lead' and p.action=p_action and (p.record_id is null or p.record_id=p_lead));
$$;
create function cms.get_mfa_policy(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare policy cms.mfa_policies;
begin
 if not exists(select 1 from cms.memberships where website_id=p_site and user_id=auth.uid() and revoked_at is null and (expires_at is null or expires_at>now())) then raise exception 'forbidden' using errcode='42501';end if;
 select * into policy from cms.mfa_policies where website_id=p_site;
 return jsonb_build_object('websiteId',p_site,'required',coalesce(policy.require_privileged,false),'version',coalesce(policy.version,0),'verified',cms.has_second_factor());
end $$;
create function cms.set_mfa_policy(p_site uuid,p_version bigint,p_required boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare policy cms.mfa_policies; next_version bigint;
begin
 if not cms.has_second_factor() or not cms.can_manage_access(p_site) then raise exception 'forbidden' using errcode='42501';end if;
 if p_version is null or p_version<0 or p_required is null then raise exception 'invalid_mfa_policy';end if;
 perform 1 from cms.websites where id=p_site for update;
 select * into policy from cms.mfa_policies where website_id=p_site for update;
 if coalesce(policy.version,0)<>p_version then raise exception 'mfa_policy_changed' using errcode='40001';end if;
 next_version:=p_version+1;
 insert into cms.mfa_policies(website_id,require_privileged,version) values(p_site,p_required,next_version)
 on conflict(website_id) do update set require_privileged=excluded.require_privileged,version=excluded.version,updated_at=now();
 if p_required and not coalesce(policy.require_privileged,false) then
  -- Prior schedules were not created under this policy; require fresh human review.
  update cms.publication_schedules set status='blocked',error_code='publication_guard_failed',finished_at=now(),lease_token=null,lease_until=null
   where website_id=p_site and status in ('pending','running');
  update cms.release_schedules set status='blocked',error_code='publication_guard_failed',finished_at=now(),lease_token=null,lease_until=null
   where website_id=p_site and status in ('pending','running');
 end if;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'security.mfa_policy_changed',jsonb_build_object('required',p_required,'version',next_version));
 return cms.get_mfa_policy(p_site);
end $$;
revoke all on function cms.has_second_factor(),cms.mfa_allows(uuid,text),cms.get_mfa_policy(uuid),cms.set_mfa_policy(uuid,bigint,boolean) from public;
grant execute on function cms.get_mfa_policy(uuid),cms.set_mfa_policy(uuid,bigint,boolean) to authenticated;

-- Serialize schedule creation with policy activation.
create or replace function cms.schedule_publication(p_site uuid,p_record uuid,p_revision uuid,p_operation text,p_run_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare rec cms.records; result uuid;
begin
 perform 1 from cms.websites where id=p_site for update;
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
create or replace function cms.schedule_release(p_site uuid,p_request uuid,p_items jsonb,p_run_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare item jsonb;rec cms.records;count_records integer:=0;existing cms.release_schedules;
begin
 perform 1 from cms.websites where id=p_site for update;
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
commit;
