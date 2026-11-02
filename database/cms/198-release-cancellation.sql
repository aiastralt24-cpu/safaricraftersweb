begin;
alter table cms.publication_releases add column cancelled_at timestamptz;
create or replace function cms.publish_release(p_site uuid,p_request uuid,p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; rec cms.records; receipt cms.publication_releases; job uuid; jobs jsonb:='[]'; count_records integer:=0;
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
 insert into cms.publication_releases(website_id,request_id,actor_id,items) values(p_site,p_request,auth.uid(),p_items)
 on conflict(website_id,request_id) do nothing;
 select * into receipt from cms.publication_releases where website_id=p_site and request_id=p_request for update;
 if receipt.actor_id is distinct from auth.uid() or receipt.items is distinct from p_items then raise exception 'idempotency_key_reused'; end if;
 if receipt.cancelled_at is not null then raise exception 'release_cancelled'; end if;
 if receipt.result is not null then return receipt.result; end if;
 -- Caller-reviewed dependency order: referenced records precede their consumers.
 -- Existing guards remain active; unsupported cycles fail and roll back everything.
 for item in select value from jsonb_array_elements(p_items) loop
  job:=cms.publish(p_site,(item->>'record')::uuid,(item->>'revision')::uuid);
  if job is null then raise exception 'release_delivery_required'; end if;
  jobs:=jobs||jsonb_build_array(jsonb_build_object('record',item->>'record','revision',item->>'revision','deliveryJob',job));
 end loop;
 update cms.publication_releases set result=jsonb_build_object('release',receipt.id,'request',p_request,'items',jobs) where id=receipt.id returning result into jobs;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'release.published',jsonb_build_object('releaseId',receipt.id,'requestId',p_request,'recordCount',jsonb_array_length(p_items)));
 return jobs;
end $$;
create function cms.cancel_release(p_site uuid,p_request uuid,p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; rec cms.records; receipt cms.publication_releases; job uuid; jobs jsonb:='[]'; count_records integer:=0;
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
 insert into cms.publication_releases(website_id,request_id,actor_id,items) values(p_site,p_request,auth.uid(),p_items)
 on conflict(website_id,request_id) do nothing;
 select * into receipt from cms.publication_releases where website_id=p_site and request_id=p_request for update;
 if receipt.actor_id is distinct from auth.uid() or receipt.items is distinct from p_items then raise exception 'idempotency_key_reused'; end if;
 if receipt.result is not null then return jsonb_build_object('status','committed','result',receipt.result); end if;
 if receipt.cancelled_at is null then
 update cms.publication_releases set cancelled_at=now() where id=receipt.id;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'release.cancelled',jsonb_build_object('releaseId',receipt.id,'requestId',p_request));
 end if;
 return jsonb_build_object('status','cancelled','site',p_site,'request',p_request,'items',p_items);
end $$;
revoke all on function cms.cancel_release(uuid,uuid,jsonb) from public;
grant execute on function cms.cancel_release(uuid,uuid,jsonb) to authenticated;
commit;
