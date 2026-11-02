begin;
create function cms.get_download_reference_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('recordId',refs.record_id,'versionId',refs.version_id,
  'available',coalesce(doc.locale=parent.locale and doc.published_revision_id::text=refs.version_id
   and cms.document_release_descriptor(p_site,doc.id) is not null,false)) order by refs.record_id,refs.version_id),'[]'::jsonb)
 from cms.records parent join cms.revisions v on v.website_id=parent.website_id and v.record_id=parent.id and v.id=p_revision
 cross join lateral (select distinct lower(item #>> '{document,recordId}') record_id,lower(item->>'versionId') version_id
  from cms.document_download_items(v.payload) item
  where item #>> '{document,recordId}' ~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
   and item->>'versionId' ~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
  order by record_id,version_id limit 5000) refs
 left join cms.records doc on doc.website_id=p_site and doc.id::text=refs.record_id and doc.content_type='document'
 where parent.website_id=p_site and parent.id=p_record and parent.content_type in ('page','homepage');
$$;
revoke all on function cms.get_download_reference_status(uuid,uuid,uuid) from public;
grant execute on function cms.get_download_reference_status(uuid,uuid,uuid) to service_role;
create or replace function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,'type',r.content_type,'path',r.path,'payload',v.payload,
  'locale',r.locale,'mediaStatus',cms.get_record_media_status(p_site,p_record,p_revision))
  ||case when r.content_type in ('page','homepage') then jsonb_build_object('downloadStatus',cms.get_download_reference_status(p_site,p_record,p_revision)) else '{}'::jsonb end
  ||case when r.content_type='destination' then jsonb_build_object('referenceStatus',cms.get_destination_reference_status(p_site,p_record,p_revision)) when r.content_type='navigation' then jsonb_build_object('navigationStatus',cms.get_navigation_reference_status(p_site,p_record,p_revision)) when r.content_type='settings' then jsonb_build_object('settingsStatus',cms.get_settings_reference_status(p_site,p_record,p_revision)) when r.content_type='specialist' then jsonb_build_object('specialistStatus',coalesce(cms.get_specialist_reference_status(p_site,p_record,p_revision),'[]'::jsonb)) when r.content_type='photoExpedition' then jsonb_build_object('expeditionStatus',coalesce(cms.get_expedition_reference_status(p_site,p_record,p_revision),'[]'::jsonb)) when r.content_type='homepage' then jsonb_build_object('homepageHeader',cms.get_public_header(r.website_id,r.locale),'homepageStatus',coalesce(cms.get_homepage_reference_status(p_site,p_record,p_revision),'[]'::jsonb),'homepagePublishedPaths',coalesce((select jsonb_agg(href order by href) from (select distinct value #>> '{}' as href from jsonb_path_query(v.payload,'$.**.href') value where jsonb_typeof(value)='string') links where href like '/%' and cms.get_public_page(r.website_id,href,r.locale) is not null),'[]'::jsonb)) when r.content_type='document' then jsonb_build_object('documentStatus',cms.get_document_validation_status(p_site,p_record,p_revision)) else '{}'::jsonb end
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision;
$$;
commit;
