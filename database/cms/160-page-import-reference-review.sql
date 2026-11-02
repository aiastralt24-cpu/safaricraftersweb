begin;
create function cms.review_page_import_links(p_site uuid,p_create boolean,p_records uuid[],p_assets text[],p_documents jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare assets jsonb; documents jsonb;
begin
 if p_create is null or p_records is null or cardinality(p_records)>25 or array_position(p_records,null) is not null then raise exception 'invalid_import_targets'; end if;
 if not p_create and cardinality(p_records)=0 then raise exception 'forbidden' using errcode='42501'; end if;
 if p_create and not cms.can(p_site,'create','page',null) then raise exception 'forbidden' using errcode='42501'; end if;
 if exists(select 1 from unnest(p_records) q(id) where not exists(select 1 from cms.records r where r.id=q.id and r.website_id=p_site and r.content_type='page' and r.locale='en' and cms.is_custom_page_path(r.path) and cms.can(p_site,'edit','page',r.id))) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_assets is null or cardinality(p_assets)>500 or array_position(p_assets,null) is not null
  or (select count(distinct v) from unnest(p_assets) v)<>cardinality(p_assets)
  or exists(select 1 from unnest(p_assets) v where v !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$') then raise exception 'invalid_import_assets'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',a.id,'available',coalesce(m.id is not null and cms.can(p_site,'view','document',null) and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()),false)) order by a.n),'[]') into assets
 from unnest(p_assets) with ordinality a(id,n) left join cms.media_objects m on m.website_id=p_site and m.id=a.id;
 if p_documents is null or jsonb_typeof(p_documents)<>'array' then raise exception 'invalid_import_documents'; end if;
 if jsonb_array_length(p_documents)>5000 or octet_length(p_documents::text)>1000000 then raise exception 'invalid_import_documents'; end if;
 if exists(select 1 from jsonb_array_elements(p_documents) d where jsonb_typeof(d)<>'object'
  or jsonb_typeof(d->'recordId') is distinct from 'string' or jsonb_typeof(d->'versionId') is distinct from 'string'
  or coalesce(d->>'recordId','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
  or coalesce(d->>'versionId','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
  or d - 'recordId' - 'versionId' <> '{}'::jsonb)
  or exists(select 1 from jsonb_array_elements(p_documents) d group by lower(d->>'recordId'),lower(d->>'versionId') having count(*)>1)
 then raise exception 'invalid_import_documents'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('recordId',lower(d.value->>'recordId'),'versionId',lower(d.value->>'versionId'),
  'available',case when r.id is not null and cms.can(p_site,'view','document',r.id) then
   r.locale='en' and r.published_revision_id::text=lower(d.value->>'versionId') and cms.document_release_descriptor(p_site,r.id) is not null
   else false end) order by d.n),'[]'::jsonb) into documents
 from jsonb_array_elements(p_documents) with ordinality d(value,n)
 left join cms.records r on r.website_id=p_site and r.id=(d.value->>'recordId')::uuid and r.content_type='document';
 return jsonb_build_object('assets',assets,'documents',documents);
end $$;
revoke all on function cms.review_page_import_links(uuid,boolean,uuid[],text[],jsonb) from public;
grant execute on function cms.review_page_import_links(uuid,boolean,uuid[],text[],jsonb) to authenticated;
commit;
