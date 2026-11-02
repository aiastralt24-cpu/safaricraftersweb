begin;
create table cms.page_import_batches (
 id uuid primary key default gen_random_uuid(),website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_key uuid not null,
 source_digest text not null,review_digest text not null,manifest jsonb not null,result jsonb,created_at timestamptz not null default now(),unique(website_id,actor_id,request_key)
);
alter table cms.page_import_batches enable row level security;
create policy own_page_import on cms.page_import_batches for select to authenticated using(actor_id=auth.uid() and exists(select 1 from cms.memberships m where m.website_id=page_import_batches.website_id and m.user_id=auth.uid() and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())));
grant select on cms.page_import_batches to authenticated;
create function cms.apply_page_import(p_site uuid,p_request uuid,p_source text,p_review text,p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare batch cms.page_import_batches; item jsonb; saved jsonb; results jsonb:='[]'; asset text; media cms.media_objects; existing cms.records; record_id uuid; expected uuid; download jsonb; doc cms.records; descriptor jsonb;
begin
 if auth.uid() is null or not exists(select 1 from cms.memberships m where m.website_id=p_site and m.user_id=auth.uid() and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_request is null or p_source is null or p_source !~ '^[a-f0-9]{64}$' or p_review is null or p_review !~ '^[a-f0-9]{64}$' then raise exception 'invalid_import_identity'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 25 or octet_length(p_items::text)>1100000 then raise exception 'invalid_import_manifest'; end if;
 insert into cms.page_import_batches(website_id,actor_id,request_key,source_digest,review_digest,manifest) values(p_site,auth.uid(),p_request,p_source,p_review,p_items) on conflict(website_id,actor_id,request_key) do nothing;
 select * into batch from cms.page_import_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request for update;
 if batch.source_digest<>p_source or batch.review_digest<>p_review or batch.manifest<>p_items then raise exception 'idempotency_key_reused'; end if;
 if batch.result is not null then return batch.result; end if;
 if exists(select 1 from jsonb_array_elements(p_items) v group by v->>'sourceKey' having count(*)>1) or exists(select 1 from jsonb_array_elements(p_items) v where v->>'recordId' is not null group by v->>'recordId' having count(*)>1) then raise exception 'duplicate_import_record'; end if;
 for item in select value from jsonb_array_elements(p_items) order by value->>'sourceKey' loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'sourceKey','') !~ '^page_import_[a-f0-9]{64}$' or coalesce(item->>'operation','') not in ('create','update') or jsonb_typeof(item->'payload') is distinct from 'object'
   or (item->'payload') - 'composition' - 'seo' <> '{}'::jsonb
   or item->'payload'->'composition'->'schemaVersion' is distinct from '1'::jsonb
   or jsonb_typeof(item->'payload'->'composition'->'sections') is distinct from 'array'
   or length(coalesce(item->>'title','')) not between 1 and 200
   or item->>'title' is distinct from item->'payload'->'composition'->>'title'
   or not coalesce(cms.is_custom_page_path(item->>'path'),false)
   or item->>'locale' is distinct from 'en'  then raise exception 'invalid_import_item'; end if;
  record_id:=null; expected:=null;
  if item->>'operation'='create' then
   if item->>'recordId' is not null or item->>'expectedRevision' is not null then raise exception 'unexpected_revision'; end if;
   if not cms.can(p_site,'create','page',null) then raise exception 'forbidden' using errcode='42501'; end if;
   if exists(select 1 from cms.import_record_keys where website_id=p_site and source_key=item->>'sourceKey') then raise exception 'import_key_already_exists'; end if;
  else
   record_id:=(item->>'recordId')::uuid; expected:=(item->>'expectedRevision')::uuid;
   select * into existing from cms.records where website_id=p_site and id=record_id for update;
   if not found or existing.content_type<>'page' or not cms.can(p_site,'view','page',existing.id) or not cms.can(p_site,'edit','page',existing.id) then raise exception 'forbidden' using errcode='42501'; end if;
   if expected is distinct from existing.current_revision_id then raise exception 'revision_conflict' using errcode='40001'; end if;
   if existing.locale<>item->>'locale' or existing.path is distinct from item->>'path' then raise exception 'route_or_type_change_requires_migration'; end if;
  end if;
  if exists(select 1 from jsonb_array_elements(item->'payload'->'composition'->'sections') section
   where coalesce(section->>'kind','') not in ('hero','text','imageText','cards','cta','downloads')) then raise exception 'unsupported_import_section'; end if;
  if exists(select 1 from jsonb_path_query(item->'payload','$.**.assetId') value where jsonb_typeof(value)<>'string') then raise exception 'media_verification_required'; end if;
  for asset in select distinct value #>> '{}' from jsonb_path_query(item->'payload','$.**.assetId') value order by 1 loop
   select * into media from cms.media_objects where website_id=p_site and id=asset for share;
   if not found or not cms.can(p_site,'view','document',null) or media.mime_type<>'image/webp' or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'media_verification_required'; end if;
  end loop;
  for download in select value from cms.document_download_items(item->'payload') value order by value #>> '{document,recordId}',value->>'versionId' loop
   select * into doc from cms.records where website_id=p_site and id::text=lower(download #>> '{document,recordId}') and content_type='document' for share;
   if not found or not cms.can(p_site,'view','document',doc.id) or doc.locale is distinct from item->>'locale'
    or doc.published_revision_id::text is distinct from lower(download->>'versionId') then raise exception 'download_reference_verification_required'; end if;
   perform f.id from cms.document_files f join cms.uploads u on u.website_id=f.website_id and u.id=f.id
    join cms.revisions v on v.website_id=f.website_id and lower(v.payload #>> '{file,assetId}')=f.id::text
    where v.id=doc.published_revision_id and v.record_id=doc.id for share of f,u;
   descriptor:=cms.document_release_descriptor(p_site,doc.id);
   if descriptor is null or descriptor->>'revision' is distinct from lower(download->>'versionId') then raise exception 'download_reference_verification_required'; end if;
  end loop;
  saved:=cms.save_draft(p_site,record_id,expected,'page',item->>'path',item->>'title',item->'payload',item->>'locale');
  if item->>'operation'='create' then insert into cms.import_record_keys(website_id,source_key,record_id) values(p_site,item->>'sourceKey',(saved->>'recordId')::uuid); end if;
  results:=results||jsonb_build_array(saved||jsonb_build_object('sourceKey',item->>'sourceKey'));
 end loop;
 update cms.page_import_batches set result=results where id=batch.id;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'page_import.applied',jsonb_build_object('batchId',batch.id,'sourceDigest',p_source,'count',jsonb_array_length(results)));
 return results;
end $$;
revoke all on function cms.apply_page_import(uuid,uuid,text,text,jsonb) from public;
grant execute on function cms.apply_page_import(uuid,uuid,text,text,jsonb) to authenticated;
create function cms.get_page_import_receipt(p_site uuid,p_request uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('requestKey',request_key,'sourceDigest',source_digest,'reviewDigest',review_digest,'result',result)
 from cms.page_import_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request and result is not null;
$$;
revoke all on function cms.get_page_import_receipt(uuid,uuid) from public;
grant execute on function cms.get_page_import_receipt(uuid,uuid) to authenticated;
commit;
