begin;
create function cms.get_document_validation_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb; asset text; file_status jsonb; products jsonb;
begin
 select v.payload into payload from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id
 where r.website_id=p_site and r.id=p_record and r.content_type='document' and v.id=p_revision;
 if not found then return null; end if;
 asset:=payload #>> '{file,assetId}';
 if asset ~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then
  select jsonb_build_object('assetId',asset,'revision',f.revision,
   'processed',coalesce(u.status='ready' and u.mime_type='application/pdf' and u.inspection_version='document-pdf-1'
    and f.inspection_version=u.inspection_version and f.original_sha256=u.original_sha256
    and f.storage_key=p_site::text||'/'||f.id::text||'/delivery.pdf',false),
   'rightsApproved',coalesce(f.rights_status='approved',false),
   'rightsCurrent',f.id is not null and (f.rights_expires_at is null or f.rights_expires_at>now()),
   'archived',f.archived_at is not null) into file_status
  from (select 1) seed left join cms.document_files f on f.website_id=p_site and f.id::text=lower(asset)
  left join cms.uploads u on u.website_id=f.website_id and u.id=f.id;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('recordId',refs.id,'available',r.id is not null,'locale',r.locale) order by refs.id),'[]') into products
 from (select distinct item->>'recordId' id from jsonb_array_elements(case when jsonb_typeof(payload->'products')='array' then payload->'products' else '[]'::jsonb end) item
  where item->>'recordId' ~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' order by id limit 100) refs
 left join cms.records r on r.website_id=p_site and r.id::text=lower(refs.id) and r.content_type='product';
 return jsonb_build_object('file',file_status,'products',products);
end $$;
revoke all on function cms.get_document_validation_status(uuid,uuid,uuid) from public;
grant execute on function cms.get_document_validation_status(uuid,uuid,uuid) to service_role;
create or replace function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,'type',r.content_type,'path',r.path,'payload',v.payload,
  'locale',r.locale,'mediaStatus',cms.get_record_media_status(p_site,p_record,p_revision))
  ||case when r.content_type='destination' then jsonb_build_object('referenceStatus',cms.get_destination_reference_status(p_site,p_record,p_revision)) when r.content_type='navigation' then jsonb_build_object('navigationStatus',cms.get_navigation_reference_status(p_site,p_record,p_revision)) when r.content_type='settings' then jsonb_build_object('settingsStatus',cms.get_settings_reference_status(p_site,p_record,p_revision)) when r.content_type='specialist' then jsonb_build_object('specialistStatus',coalesce(cms.get_specialist_reference_status(p_site,p_record,p_revision),'[]'::jsonb)) when r.content_type='photoExpedition' then jsonb_build_object('expeditionStatus',coalesce(cms.get_expedition_reference_status(p_site,p_record,p_revision),'[]'::jsonb)) when r.content_type='homepage' then jsonb_build_object('homepageHeader',cms.get_public_header(r.website_id,r.locale),'homepageStatus',coalesce(cms.get_homepage_reference_status(p_site,p_record,p_revision),'[]'::jsonb),'homepagePublishedPaths',coalesce((select jsonb_agg(href order by href) from (select distinct value #>> '{}' as href from jsonb_path_query(v.payload,'$.**.href') value where jsonb_typeof(value)='string') links where href like '/%' and cms.get_public_page(r.website_id,href,r.locale) is not null),'[]'::jsonb)) when r.content_type='document' then jsonb_build_object('documentStatus',cms.get_document_validation_status(p_site,p_record,p_revision)) else '{}'::jsonb end
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision;
$$;


commit;
