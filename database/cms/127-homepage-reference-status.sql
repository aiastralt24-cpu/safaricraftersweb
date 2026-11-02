begin;
create function cms.get_homepage_reference_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; target uuid; related cms.records; dependency jsonb; available boolean; evidence jsonb:='[]';
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='homepage' and current_revision_id=p_revision;
 if not found then return null; end if;
 if current_setting('role',true)<>'service_role' and not cms.can(p_site,'view','homepage',rec.id) then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=p_revision;
 for target in select distinct (value #>> '{}')::uuid from jsonb_path_query(payload,'$.composition.sections[*].data.**.recordId') value loop
  available:=false;
  select * into related from cms.records where website_id=p_site and id=target and locale=rec.locale and locale='en' and published_revision_id is not null;
  if found then
   if related.content_type='journey' then
    select v.payload into dependency from cms.revisions v where v.website_id=p_site and v.record_id=target and v.id=related.published_revision_id;
    available:=cms.get_public_page(p_site,related.path,rec.locale) is not null and exists(select 1 from jsonb_array_elements(case when jsonb_typeof(dependency->'media')='array' then dependency->'media' else '[]'::jsonb end) image where image->>'role'='hero' and length(trim(image->>'assetId'))>0 and length(trim(image->>'alt'))>0);
   elsif related.content_type='photoExpedition' then
    available:=cms.get_public_expedition(p_site,related.path,rec.locale) is not null;
   elsif related.content_type='testimonial' then
    available:=cms.get_public_homepage_guest(p_site,target,rec.locale) is not null;
   end if;
  end if;
  evidence:=evidence||jsonb_build_array(case when available then jsonb_build_object('recordId',target,'available',true,'type',related.content_type,'locale',related.locale,'revisionId',related.published_revision_id) else jsonb_build_object('recordId',target,'available',false) end);
 end loop;
 return evidence;
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.get_homepage_reference_status(uuid,uuid,uuid) from public;
grant execute on function cms.get_homepage_reference_status(uuid,uuid,uuid) to authenticated,service_role;
create or replace function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,'type',r.content_type,'path',r.path,'payload',v.payload,
  'locale',r.locale,'mediaStatus',cms.get_record_media_status(p_site,p_record,p_revision))
  ||case when r.content_type='destination' then jsonb_build_object('referenceStatus',cms.get_destination_reference_status(p_site,p_record,p_revision)) when r.content_type='navigation' then jsonb_build_object('navigationStatus',cms.get_navigation_reference_status(p_site,p_record,p_revision)) when r.content_type='settings' then jsonb_build_object('settingsStatus',cms.get_settings_reference_status(p_site,p_record,p_revision)) when r.content_type='specialist' then jsonb_build_object('specialistStatus',coalesce(cms.get_specialist_reference_status(p_site,p_record,p_revision),'[]'::jsonb)) when r.content_type='photoExpedition' then jsonb_build_object('expeditionStatus',coalesce(cms.get_expedition_reference_status(p_site,p_record,p_revision),'[]'::jsonb)) when r.content_type='homepage' then jsonb_build_object('homepageStatus',coalesce(cms.get_homepage_reference_status(p_site,p_record,p_revision),'[]'::jsonb),'homepagePublishedPaths',coalesce((select jsonb_agg(href order by href) from (select distinct value #>> '{}' as href from jsonb_path_query(v.payload,'$.**.href') value where jsonb_typeof(value)='string') links where href like '/%' and cms.get_public_page(r.website_id,href,r.locale) is not null),'[]'::jsonb)) else '{}'::jsonb end
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision;
$$;


commit;
