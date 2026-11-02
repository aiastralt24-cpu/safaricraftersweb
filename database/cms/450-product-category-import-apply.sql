begin;
create table cms.product_category_import_batches (
 id uuid primary key default gen_random_uuid(),website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_key uuid not null,
 source_digest text not null,review_digest text not null,manifest jsonb not null,result jsonb,created_at timestamptz not null default now(),unique(website_id,actor_id,request_key)
);
alter table cms.product_category_import_batches enable row level security;
create policy own_product_category_import on cms.product_category_import_batches for select to authenticated using(actor_id=auth.uid() and exists(select 1 from cms.memberships m where m.website_id=product_category_import_batches.website_id and m.user_id=auth.uid() and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())));
grant select on cms.product_category_import_batches to authenticated;
create function cms.apply_product_category_import(p_site uuid,p_request uuid,p_source text,p_review text,p_items jsonb,p_evidence jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare batch cms.product_category_import_batches; item jsonb; saved jsonb; results jsonb:='[]'; asset text; media cms.media_objects; existing cms.records; record_id uuid; expected uuid; refs jsonb; assets text[]; checked jsonb; target uuid;
begin
 if auth.uid() is null or not exists(select 1 from cms.memberships m where m.website_id=p_site and m.user_id=auth.uid() and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_request is null or p_source is null or p_source !~ '^[a-f0-9]{64}$' or p_review is null or p_review !~ '^[a-f0-9]{64}$' then raise exception 'invalid_import_identity'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 25 or octet_length(p_items::text)>1100000 then raise exception 'invalid_import_manifest'; end if;
 insert into cms.product_category_import_batches(website_id,actor_id,request_key,source_digest,review_digest,manifest) values(p_site,auth.uid(),p_request,p_source,p_review,p_items) on conflict(website_id,actor_id,request_key) do nothing;
 select * into batch from cms.product_category_import_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request for update;
 if batch.source_digest<>p_source or batch.review_digest<>p_review or batch.manifest<>p_items then raise exception 'idempotency_key_reused'; end if;
 if batch.result is not null then return batch.result; end if;

 -- Lock the union of updated targets and referenced records in a deterministic order.
 -- References come from payloads, never solely from caller-supplied evidence.
 select coalesce(jsonb_agg(jsonb_build_object('type',type,'recordId',id) order by type,id),'[]') into refs from (
  select distinct 'productCategory'::text type, imported.value#>>'{payload,parent,recordId}' id
  from jsonb_array_elements(p_items) imported(value) where imported.value#>>'{payload,parent,recordId}' is not null

 ) refs;
 select coalesce(array_agg(distinct value#>>'{}' order by value#>>'{}'),'{}') into assets from jsonb_path_query(p_items,'$[*].payload.**.assetId') value;
 if cardinality(assets)>500 or jsonb_array_length(refs)>500 then raise exception 'import_links_limit';end if;
 for target in select distinct id from (
  select (value->>'recordId')::uuid id from jsonb_array_elements(p_items) where value->>'operation'='update'
  union select (value->>'recordId')::uuid from jsonb_array_elements(refs)
 ) targets order by id loop
  perform 1 from cms.records where website_id=p_site and id=target for update;
 end loop;
 for asset in select unnest(assets) order by 1 loop
  perform 1 from cms.media_objects where website_id=p_site and id=asset for share;
 end loop;
 checked:=cms.review_product_category_import_links(p_site,
  exists(select 1 from jsonb_array_elements(p_items) x where x->>'operation'='create'),
  array(select (x->>'recordId')::uuid from jsonb_array_elements(p_items) x where x->>'operation'='update'),assets,refs);
 -- Compare sets, retaining exact revision and availability values. No omitted,
 -- duplicate or additional caller evidence may bypass this check.
 if p_evidence is null or jsonb_typeof(p_evidence)<>'object' or p_evidence-'assets'-'references'<>'{}'::jsonb
  or jsonb_typeof(p_evidence->'assets') is distinct from 'array' or jsonb_typeof(p_evidence->'references') is distinct from 'array' then raise exception 'import_evidence_required';end if;
 if jsonb_array_length(p_evidence->'assets')<>jsonb_array_length(checked->'assets')
  or jsonb_array_length(p_evidence->'references')<>jsonb_array_length(checked->'references')
  or not (p_evidence @> checked and checked @> p_evidence)
  or exists(select 1 from jsonb_array_elements(checked->'assets') x where x->>'available'<>'true')
  or exists(select 1 from jsonb_array_elements(checked->'references') x where x->>'available'<>'true') then raise exception 'import_evidence_changed' using errcode='40001';end if;
 if exists(select 1 from jsonb_array_elements(p_items) v group by v->>'sourceKey' having count(*)>1) or exists(select 1 from jsonb_array_elements(p_items) v where v->>'recordId' is not null group by v->>'recordId' having count(*)>1) then raise exception 'duplicate_import_record'; end if;
 for item in select value from jsonb_array_elements(p_items) order by value->>'sourceKey' loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'sourceKey','') !~ '^product_category_import_[a-f0-9]{64}$' or coalesce(item->>'operation','') not in ('create','update') or jsonb_typeof(item->'payload') is distinct from 'object'
   or item->'payload'->'schemaVersion' is distinct from '1'::jsonb or length(coalesce(item->'payload'->>'title','')) not between 1 and 200 or coalesce(item->'payload'->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(item->'payload'->>'slug')>100
   or coalesce(item->>'locale','') !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then raise exception 'invalid_import_item'; end if;
  if (item->'payload') - array['schemaVersion','title','slug','summary','parent','attributeGroups','seo','internalNotes']::text[] <> '{}'::jsonb then raise exception 'invalid_import_item'; end if;
  record_id:=null; expected:=null;
  if item->>'operation'='create' then
   if item->>'recordId' is not null or item->>'expectedRevision' is not null then raise exception 'unexpected_revision'; end if;
   if not cms.can(p_site,'create','productCategory',null) then raise exception 'forbidden' using errcode='42501'; end if;
   if exists(select 1 from cms.import_record_keys where website_id=p_site and source_key=item->>'sourceKey') then raise exception 'import_key_already_exists'; end if;
  else
   record_id:=(item->>'recordId')::uuid; expected:=(item->>'expectedRevision')::uuid;
   select * into existing from cms.records where website_id=p_site and id=record_id for update;
   if not found or existing.content_type<>'productCategory' or not cms.can(p_site,'view','productCategory',existing.id) or not cms.can(p_site,'edit','productCategory',existing.id) then raise exception 'forbidden' using errcode='42501'; end if;
   if expected is distinct from existing.current_revision_id then raise exception 'revision_conflict' using errcode='40001'; end if;
   if existing.locale<>item->>'locale' or existing.path is distinct from '/product-categories/'||(item->'payload'->>'slug') then raise exception 'route_or_type_change_requires_migration'; end if;
  end if;
  if item->'payload' ? 'video' then raise exception 'video_delivery_not_ready'; end if;
  if exists(select 1 from jsonb_path_query(item->'payload','$.**.assetId') value where jsonb_typeof(value)<>'string') then raise exception 'media_verification_required'; end if;
  for asset in select distinct value #>> '{}' from jsonb_path_query(item->'payload','$.**.assetId') value order by 1 loop
   select * into media from cms.media_objects where website_id=p_site and id=asset for share;
   if not found or not cms.can(p_site,'view','document',null) or media.mime_type<>'image/webp' or media.inspection_status<>'ready' or media.rights_status<>'approved' or length(btrim(media.rights_evidence))=0 or media.archived_at is not null or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'media_verification_required'; end if;
  end loop;
  saved:=cms.save_draft(p_site,record_id,expected,'productCategory','/product-categories/'||(item->'payload'->>'slug'),item->'payload'->>'title',item->'payload',item->>'locale');
  if item->>'operation'='create' then insert into cms.import_record_keys(website_id,source_key,record_id) values(p_site,item->>'sourceKey',(saved->>'recordId')::uuid); end if;
  results:=results||jsonb_build_array(saved||jsonb_build_object('sourceKey',item->>'sourceKey'));
 end loop;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item#>'{payload,parent}') is distinct from 'null' then
   if jsonb_typeof(item#>'{payload,parent}') is distinct from 'object' or (item#>'{payload,parent}')-'recordId'<>'{}'::jsonb then raise exception 'invalid_category_parent';end if;
   target:=(item#>>'{payload,parent,recordId}')::uuid;
   if target is null or exists(select 1 from jsonb_array_elements(results) x where x->>'sourceKey'=item->>'sourceKey' and (x->>'recordId')::uuid=target) then raise exception 'invalid_category_parent';end if;
   if not exists(select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id where r.website_id=p_site and r.id=target and r.content_type='productCategory' and r.locale=item->>'locale' and v.payload->'parent'='null'::jsonb and cms.can(p_site,'view','productCategory',r.id)) then raise exception 'invalid_category_parent';end if;
   if exists(select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id cross join lateral jsonb_array_elements(v.payload->'attributeGroups') g cross join lateral jsonb_array_elements(g->'attributes') a where r.website_id=p_site and r.id=target and a->>'id' in(select a2->>'id' from jsonb_array_elements(item#>'{payload,attributeGroups}') g2 cross join lateral jsonb_array_elements(g2->'attributes') a2)) then raise exception 'category_attribute_collision';end if;
  end if;
 end loop;
 update cms.product_category_import_batches set result=results where id=batch.id;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'product_category_import.applied',jsonb_build_object('batchId',batch.id,'sourceDigest',p_source,'count',jsonb_array_length(results)));
 return results;
end $$;
revoke all on function cms.apply_product_category_import(uuid,uuid,text,text,jsonb,jsonb) from public;
grant execute on function cms.apply_product_category_import(uuid,uuid,text,text,jsonb,jsonb) to authenticated;
create function cms.get_product_category_import_receipt(p_site uuid,p_request uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('requestKey',request_key,'sourceDigest',source_digest,'reviewDigest',review_digest,'result',result)
 from cms.product_category_import_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request and result is not null;
$$;
revoke all on function cms.get_product_category_import_receipt(uuid,uuid) from public;
grant execute on function cms.get_product_category_import_receipt(uuid,uuid) to authenticated;
commit;
