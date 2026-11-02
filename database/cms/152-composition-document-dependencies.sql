begin;
-- Current composer payloads nest sections under composition. Preserve legacy
-- top-level bindings as well; hidden sections still retain their dependencies.
create function cms.document_download_items(p_payload jsonb) returns setof jsonb
language sql immutable set search_path='' as $$
 select value from jsonb_path_query(p_payload,'$.composition.sections[*] ? (@.kind == "downloads").data.items[*]') value
 union
 select value from jsonb_path_query(p_payload,'$.sections[*] ? (@.kind == "downloads").data.items[*]') value;
$$;
revoke all on function cms.document_download_items(jsonb) from public;
create or replace function cms.document_payload_uses_file(p_site uuid,p_type text,p_payload jsonb,p_asset uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((p_type='document' and p_payload #>> '{file,assetId}'=p_asset::text),false)
 or exists(select 1 from cms.document_download_items(p_payload) item
  join cms.revisions v on v.website_id=p_site and v.id::text=item->>'versionId' and v.record_id::text=item #>> '{document,recordId}'
  join cms.records r on r.website_id=v.website_id and r.id=v.record_id and r.content_type='document'
  where v.payload #>> '{file,assetId}'=p_asset::text);
$$;
create or replace function cms.document_payload_file_ids(p_site uuid,p_type text,p_payload jsonb)
returns setof uuid language sql stable security definer set search_path='' as $$
 select f.id from cms.document_files f where f.website_id=p_site and p_type='document' and f.id::text=p_payload #>> '{file,assetId}'
 union
 select f.id from cms.document_download_items(p_payload) item
 join cms.revisions v on v.website_id=p_site and v.id::text=item->>'versionId' and v.record_id::text=item #>> '{document,recordId}'
 join cms.records r on r.website_id=v.website_id and r.id=v.record_id and r.content_type='document'
 join cms.document_files f on f.website_id=p_site and f.id::text=v.payload #>> '{file,assetId}';
$$;
commit;
