begin;
create table cms.enquiry_file_retention (
 website_id uuid primary key references cms.websites(id),version integer not null check(version>0),policy jsonb not null,
 updated_by uuid not null references auth.users(id),updated_at timestamptz not null default clock_timestamp()
);
create table cms.enquiry_file_retention_changes (
 website_id uuid not null references cms.websites(id),request_id uuid not null,actor_id uuid not null references auth.users(id),
 expected integer not null,policy jsonb not null,receipt jsonb not null,created_at timestamptz not null default clock_timestamp(),primary key(website_id,request_id)
);
alter table cms.enquiry_file_retention enable row level security;
alter table cms.enquiry_file_retention_changes enable row level security;
revoke all on cms.enquiry_file_retention,cms.enquiry_file_retention_changes from public,anon,authenticated,service_role;
create function cms.get_enquiry_file_retention(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not cms.can_lead(p_site,'configure') then raise exception 'forbidden' using errcode='42501';end if;
 return jsonb_build_object('websiteId',p_site,'version',coalesce((select version from cms.enquiry_file_retention where website_id=p_site),0),'policy',coalesce((select policy from cms.enquiry_file_retention where website_id=p_site),'{"enabled":false,"submittedDays":null,"abandonedHours":null,"approvalReference":""}'::jsonb));
end $$;
create function cms.save_enquiry_file_retention(p_site uuid,p_expected integer,p_request uuid,p_policy jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare previous cms.enquiry_file_retention_changes;current_version integer;receipt jsonb;
begin
 if not cms.can_lead(p_site,'configure') then raise exception 'forbidden' using errcode='42501';end if;
 perform 1 from cms.websites where id=p_site for update;
 if not found or not cms.can_lead(p_site,'configure') then raise exception 'forbidden' using errcode='42501';end if;
 if p_request is null or p_expected is null or p_expected<0 or p_policy is null or jsonb_typeof(p_policy)<>'object' or octet_length(p_policy::text)>4000
 or (select count(*) from jsonb_object_keys(p_policy))<>4 or not(p_policy ?& array['enabled','submittedDays','abandonedHours','approvalReference'])
 or jsonb_typeof(p_policy->'enabled') is distinct from 'boolean' or jsonb_typeof(p_policy->'approvalReference') is distinct from 'string' or length(p_policy->>'approvalReference')>1000 then raise exception 'invalid_retention_policy';end if;
 if p_policy->'submittedDays'<>'null'::jsonb and (jsonb_typeof(p_policy->'submittedDays')<>'number' or (p_policy->>'submittedDays') !~ '^[0-9]+$' or (p_policy->>'submittedDays')::numeric not between 1 and 36500) then raise exception 'invalid_retention_policy';end if;
 if p_policy->'abandonedHours'<>'null'::jsonb and (jsonb_typeof(p_policy->'abandonedHours')<>'number' or (p_policy->>'abandonedHours') !~ '^[0-9]+$' or (p_policy->>'abandonedHours')::numeric not between 1 and 8760) then raise exception 'invalid_retention_policy';end if;
 if (p_policy->>'enabled')::boolean and (p_policy->'submittedDays'='null'::jsonb or p_policy->'abandonedHours'='null'::jsonb or length(trim(p_policy->>'approvalReference'))=0) then raise exception 'retention_approval_required';end if;
 select * into previous from cms.enquiry_file_retention_changes where website_id=p_site and request_id=p_request;
 if found then
  if previous.actor_id<>auth.uid() or previous.expected<>p_expected or previous.policy<>p_policy then raise exception 'retention_request_reused';end if;
  return previous.receipt;
 end if;
 select version into current_version from cms.enquiry_file_retention where website_id=p_site;
 if coalesce(current_version,0)<>p_expected then raise exception 'retention_conflict' using errcode='40001';end if;
 insert into cms.enquiry_file_retention(website_id,version,policy,updated_by) values(p_site,p_expected+1,p_policy,auth.uid())
 on conflict(website_id) do update set version=excluded.version,policy=excluded.policy,updated_by=excluded.updated_by,updated_at=clock_timestamp();
 receipt:=cms.get_enquiry_file_retention(p_site);
 insert into cms.enquiry_file_retention_changes(website_id,request_id,actor_id,expected,policy,receipt) values(p_site,p_request,auth.uid(),p_expected,p_policy,receipt);
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'enquiry_file.retention_changed',jsonb_build_object('version',p_expected+1,'policy',p_policy,'requestId',p_request));
 return receipt;
end $$;
-- A bounded dry run: no session, upload, object or lead is changed. Counts refer
-- to candidate metadata, not guaranteed storage objects or an authorized delete.
create function cms.preview_enquiry_file_retention(p_site uuid,p_version integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare settings jsonb;policy jsonb;items jsonb;total integer;
begin
 settings:=cms.get_enquiry_file_retention(p_site);
 if p_version is distinct from (settings->>'version')::integer then raise exception 'retention_conflict' using errcode='40001';end if;
 policy:=settings->'policy';
 select coalesce(jsonb_agg(to_jsonb(candidate)),'[]'::jsonb) into items from (
  select u.id,case when a.upload_id is null then 'abandoned' else 'submitted' end as category,u.bytes+coalesce((u.result->>'bytes')::bigint,0) as bytes
  from cms.enquiry_files u join cms.enquiry_file_sessions s on s.website_id=u.website_id and s.id=u.session_id
  left join cms.lead_attachments a on a.website_id=u.website_id and a.upload_id=u.id
  left join cms.leads l on l.website_id=a.website_id and l.id=a.lead_id
  where u.website_id=p_site and (u.lease_until is null or u.lease_until<=now())
  and ((a.upload_id is not null and l.created_at+make_interval(days=>(policy->>'submittedDays')::integer)<=now())
   or (a.upload_id is null and s.expires_at+make_interval(hours=>(policy->>'abandonedHours')::integer)<=now()))
  order by u.created_at,u.id limit 501
 ) candidate;
 total:=jsonb_array_length(items);
 return jsonb_build_object('websiteId',p_site,'version',p_version,'enabled',(policy->>'enabled')::boolean,'asOf',now(),'hasMore',total>500,
 'candidateCount',least(total,500),'submittedCount',(select count(*) from jsonb_array_elements(items) with ordinality e(value,n) where n<=500 and value->>'category'='submitted'),
 'abandonedCount',(select count(*) from jsonb_array_elements(items) with ordinality e(value,n) where n<=500 and value->>'category'='abandoned'),
 'plannedBytes',(select coalesce(sum((value->>'bytes')::bigint),0) from jsonb_array_elements(items) with ordinality e(value,n) where n<=500));
end $$;
revoke all on function cms.get_enquiry_file_retention(uuid),cms.save_enquiry_file_retention(uuid,integer,uuid,jsonb),cms.preview_enquiry_file_retention(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function cms.get_enquiry_file_retention(uuid),cms.save_enquiry_file_retention(uuid,integer,uuid,jsonb),cms.preview_enquiry_file_retention(uuid,integer) to authenticated;
commit;
