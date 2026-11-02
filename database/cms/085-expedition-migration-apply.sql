begin;
create table cms.expedition_migration_batches (
 id uuid primary key default gen_random_uuid(),website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_key uuid not null,
 source_digest text not null,review_digest text not null,manifest jsonb not null,result jsonb,created_at timestamptz not null default now(),unique(website_id,actor_id,request_key)
);
alter table cms.expedition_migration_batches enable row level security;
create policy own_expedition_migration on cms.expedition_migration_batches for select to authenticated using(actor_id=auth.uid() and cms.can(website_id,'create','photoExpedition',null));
grant select on cms.expedition_migration_batches to authenticated;
create function cms.apply_expedition_migration(p_site uuid,p_request uuid,p_source text,p_review text,p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare batch cms.expedition_migration_batches; item jsonb; saved jsonb; results jsonb:='[]'; asset text; media cms.media_objects; field text; target jsonb; related cms.records; target_type text;
begin
 if not cms.can(p_site,'create','photoExpedition',null) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_request is null or p_source is null or p_source !~ '^[a-f0-9]{64}$' or p_review is null or p_review !~ '^[a-f0-9]{64}$' then raise exception 'invalid_migration_identity'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 25 or octet_length(p_items::text)>1100000 then raise exception 'invalid_migration_manifest'; end if;
 insert into cms.expedition_migration_batches(website_id,actor_id,request_key,source_digest,review_digest,manifest) values(p_site,auth.uid(),p_request,p_source,p_review,p_items) on conflict(website_id,actor_id,request_key) do nothing;
 select * into batch from cms.expedition_migration_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request for update;
 if batch.source_digest<>p_source or batch.review_digest<>p_review or batch.manifest<>p_items then raise exception 'idempotency_key_reused'; end if;
 if batch.result is not null then return batch.result; end if;
 if exists(select 1 from jsonb_array_elements(p_items) v group by v->>'sourceKey' having count(*)>1) then raise exception 'duplicate_import_record'; end if;
 for item in select value from jsonb_array_elements(p_items) order by value->>'sourceKey' loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'sourceKey','') !~ '^snapshot:[a-f0-9]{64}$' or jsonb_typeof(item->'source') is distinct from 'object' or jsonb_typeof(item->'payload') is distinct from 'object'
   or item->'payload'->'schemaVersion' is distinct from '1'::jsonb or length(btrim(coalesce(item->'payload'->>'title',''))) not between 1 and 200
   or coalesce(item->>'locale','')<>'en' then raise exception 'invalid_migration_item'; end if;
  if exists(select 1 from cms.import_record_keys where website_id=p_site and source_key='expedition_'||substring(item->>'sourceKey' from 10)) then raise exception 'import_key_already_exists'; end if;
  if jsonb_typeof(item->'mappings') is distinct from 'object' or jsonb_typeof(item->'payload'->'image') is distinct from 'object' or coalesce(item->'payload'->'image'->>'assetId','') !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$' or jsonb_typeof(item->'payload'->'heroImage') is distinct from 'object' or coalesce(item->'payload'->'heroImage'->>'assetId','') !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$' or item->'payload' ? 'video' then raise exception 'invalid_migration_item'; end if;
  if exists(select 1 from jsonb_path_query(jsonb_build_array(item->'payload',item->'mappings'),'$.**.assetId') value where jsonb_typeof(value)<>'string') then raise exception 'media_verification_required'; end if;
  for asset in select distinct value #>> '{}' from jsonb_path_query(jsonb_build_array(item->'payload',item->'mappings'),'$.**.assetId') value order by 1 loop
   select * into media from cms.media_objects where website_id=p_site and id=asset for share;
   if not found or not cms.can(p_site,'view','document',null) or media.mime_type<>'image/webp' or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'media_verification_required'; end if;
  end loop;
  if coalesce(item->'payload'->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(item->'payload'->>'slug')>100
   or jsonb_typeof(item->'payload'->'specialists') is distinct from 'array' or jsonb_array_length(item->'payload'->'specialists')>20
   or jsonb_typeof(item->'payload'->'enquiry'->'form') is distinct from 'object' then raise exception 'invalid_migration_references'; end if;
  if exists(select 1 from jsonb_array_elements(item->'payload'->'specialists') v group by v->>'recordId',v->>'role' having count(*)>1)
   or exists(select 1 from jsonb_array_elements(item->'payload'->'specialists') v where coalesce(v->>'role','') not in ('mentor','guide')) then raise exception 'invalid_migration_references'; end if;
  for target in select value from jsonb_array_elements(
   (select coalesce(jsonb_agg(v||jsonb_build_object('type','specialist')),'[]'::jsonb) from jsonb_array_elements(item->'payload'->'specialists') v)
   ||jsonb_build_array((item->'payload'->'enquiry'->'form')||jsonb_build_object('type','form'))) order by value->>'recordId',value->>'type' loop
   if jsonb_typeof(target)<>'object' or coalesce(target->>'recordId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then raise exception 'invalid_migration_references'; end if;
   target_type:=target->>'type';
   select * into related from cms.records where website_id=p_site and id=(target->>'recordId')::uuid and content_type=target_type for share;
   if not found or related.locale<>item->>'locale' or not cms.can(p_site,'view',target_type,related.id) then raise exception 'expedition_reference_verification_required'; end if;
  end loop;
  saved:=cms.save_draft(p_site,null,null,'photoExpedition','/photo-expeditions/'||(item->'payload'->>'slug'),item->'payload'->>'title',item->'payload',item->>'locale');
  insert into cms.import_record_keys(website_id,source_key,record_id) values(p_site,'expedition_'||substring(item->>'sourceKey' from 10),(saved->>'recordId')::uuid);
  results:=results||jsonb_build_array(saved||jsonb_build_object('sourceKey',item->>'sourceKey'));
 end loop;
 update cms.expedition_migration_batches set result=results where id=batch.id;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'expedition_migration.applied',jsonb_build_object('batchId',batch.id,'sourceDigest',p_source,'count',jsonb_array_length(results)));
 return results;
end $$;
revoke all on function cms.apply_expedition_migration(uuid,uuid,text,text,jsonb) from public;
grant execute on function cms.apply_expedition_migration(uuid,uuid,text,text,jsonb) to authenticated;
create function cms.get_expedition_migration_result(p_site uuid,p_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare batch cms.expedition_migration_batches;
begin
 if not cms.can(p_site,'create','photoExpedition',null) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_request is null then raise exception 'invalid_migration_identity'; end if;
 select * into batch from cms.expedition_migration_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request;
 if not found or batch.result is null then return null; end if;
 return jsonb_build_object('requestKey',batch.request_key,'sourceDigest',batch.source_digest,'reviewDigest',batch.review_digest,'createdAt',batch.created_at,'result',batch.result);
end $$;
revoke all on function cms.get_expedition_migration_result(uuid,uuid) from public;
grant execute on function cms.get_expedition_migration_result(uuid,uuid) to authenticated;
commit;
