begin;
-- Deployment-owned policy: changing a validator invalidates old receipts immediately.
create table cms.validation_policy (
 content_type text primary key,
 validator_version text not null check(length(validator_version) between 1 and 100)
);
insert into cms.validation_policy values ('journey','journey-1');
alter table cms.validation_policy enable row level security;
alter table cms.validations add column expires_at timestamptz;
-- Existing receipts have no expiry and must be rechecked.
revoke insert,update on cms.validations from service_role;

create function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,'type',r.content_type,'path',r.path,'payload',v.payload)
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision;
$$;

create function cms.record_validation(p_site uuid,p_record uuid,p_revision uuid,p_version text,p_valid boolean,p_findings jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare rec cms.records; expected_version text;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record for update;
 if not found then raise exception 'revision_not_found'; end if;
 if rec.current_revision_id is distinct from p_revision then raise exception 'revision_conflict' using errcode='40001'; end if;
 select validator_version into expected_version from cms.validation_policy where content_type=rec.content_type for share;
 if expected_version is null or p_version is distinct from expected_version then raise exception 'validator_version_required'; end if;
 if p_valid is null or p_findings is null or jsonb_typeof(p_findings)<>'array' or octet_length(p_findings::text)>200000 then raise exception 'invalid_validation_findings'; end if;
 if exists(select 1 from jsonb_array_elements(p_findings) f where jsonb_typeof(f)<>'object'
   or not (f ?& array['field','severity','code','message'])
   or jsonb_typeof(f->'field')<>'string' or jsonb_typeof(f->'code')<>'string' or jsonb_typeof(f->'message')<>'string'
   or jsonb_typeof(f->'severity')<>'string' or (f->>'severity') not in ('error','warning')) then raise exception 'invalid_validation_findings'; end if;
 if p_valid and exists(select 1 from jsonb_array_elements(p_findings) f where f->>'severity'='error') then raise exception 'validation_errors_present'; end if;
 insert into cms.validations(revision_id,validator_version,valid,findings,checked_at,expires_at)
 values(p_revision,p_version,p_valid,p_findings,now(),now()+interval '15 minutes')
 on conflict(revision_id) do update set validator_version=excluded.validator_version,valid=excluded.valid,findings=excluded.findings,checked_at=excluded.checked_at,expires_at=excluded.expires_at;
 insert into cms.audit_events(website_id,action,record_id,revision_id,details)
 values(p_site,'validation.checked',p_record,p_revision,jsonb_build_object('validatorVersion',p_version,'valid',p_valid));
end $$;

create function cms.get_validation(p_site uuid,p_record uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; result jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found or not cms.can(p_site,'view',rec.content_type,rec.id) then return null; end if;
 select jsonb_build_object('revision',rec.current_revision_id,'validatorVersion',v.validator_version,
  'requiredVersion',p.validator_version,'checkedAt',v.checked_at,'expiresAt',v.expires_at,'findings',v.findings,
  'valid',coalesce(v.valid and v.validator_version=p.validator_version and v.expires_at>now(),false))
 into result from cms.records r left join cms.validations v on v.revision_id=r.current_revision_id
 left join cms.validation_policy p on p.content_type=r.content_type where r.id=rec.id;
 return result;
end $$;

create or replace function cms.publish(p_site uuid,p_record uuid,p_revision uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare rec cms.records; job uuid; expected_version text;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record for update;
 if not found or not cms.can(p_site,'publish',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_revision is distinct from rec.current_revision_id or p_revision is distinct from rec.approved_revision_id or rec.review_status<>'approved' then raise exception 'approved_revision_required'; end if;
 select validator_version into expected_version from cms.validation_policy where content_type=rec.content_type for share;
 if not exists(select 1 from cms.validations where revision_id=p_revision and valid
  and validator_version=expected_version and expires_at>now()) then raise exception 'validated_revision_required'; end if;
 if rec.published_revision_id=p_revision then
  select id into job from cms.delivery_jobs where website_id=p_site and record_id=rec.id and revision_id=p_revision and operation='publish' order by created_at desc limit 1;
  return job;
 end if;
 update cms.records set published_revision_id=p_revision,updated_at=now() where id=rec.id;
 insert into cms.delivery_jobs(website_id,record_id,revision_id,operation) values(p_site,rec.id,p_revision,'publish') returning id into job;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details) values(p_site,auth.uid(),'published',rec.id,p_revision,jsonb_build_object('deliveryJobId',job));
 return job;
end $$;

revoke all on function cms.record_validation(uuid,uuid,uuid,text,boolean,jsonb),cms.get_validation(uuid,uuid),cms.get_validation_input(uuid,uuid,uuid) from public;
grant execute on function cms.record_validation(uuid,uuid,uuid,text,boolean,jsonb),cms.get_validation_input(uuid,uuid,uuid) to service_role;
grant execute on function cms.get_validation(uuid,uuid) to authenticated;
commit;
