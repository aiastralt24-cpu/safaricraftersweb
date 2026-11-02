-- Trusted link evidence is derived from this stored revision and current public delivery.
-- It is advisory: homepage publication remains disabled until its complete policy is ready.
begin;
create or replace function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,'type',r.content_type,'path',r.path,'payload',v.payload,
  'locale',r.locale,'mediaStatus',cms.get_record_media_status(p_site,p_record,p_revision))
  ||case when r.content_type='destination' then jsonb_build_object('referenceStatus',cms.get_destination_reference_status(p_site,p_record,p_revision)) when r.content_type='navigation' then jsonb_build_object('navigationStatus',cms.get_navigation_reference_status(p_site,p_record,p_revision)) when r.content_type='settings' then jsonb_build_object('settingsStatus',cms.get_settings_reference_status(p_site,p_record,p_revision)) when r.content_type='specialist' then jsonb_build_object('specialistStatus',coalesce(cms.get_specialist_reference_status(p_site,p_record,p_revision),'[]'::jsonb)) when r.content_type='photoExpedition' then jsonb_build_object('expeditionStatus',coalesce(cms.get_expedition_reference_status(p_site,p_record,p_revision),'[]'::jsonb)) when r.content_type='homepage' then jsonb_build_object('homepagePublishedPaths',coalesce((select jsonb_agg(href order by href) from (select distinct value #>> '{}' as href from jsonb_path_query(v.payload,'$.**.href') value where jsonb_typeof(value)='string') links where href like '/%' and cms.get_public_page(r.website_id,href,r.locale) is not null),'[]'::jsonb)) else '{}'::jsonb end
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision;
$$;


commit;
