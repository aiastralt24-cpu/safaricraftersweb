begin;
-- Receipt expiry gates a new publication, not continued delivery of a previously
-- published immutable revision. Current policy, rights and binding still apply.
create or replace function cms.hero_video_is_published(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.hero_video_available(p_site,p_asset) and exists(
  select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
  join cms.validations checked on checked.revision_id=v.id and checked.valid and checked.validator_version=case when r.content_type='homepage' then 'homepage-1' else 'composition-5' end
  join cms.validation_policy policy on policy.content_type=r.content_type and policy.validator_version=checked.validator_version
  cross join lateral jsonb_array_elements(case when jsonb_typeof(v.payload->'composition'->'sections')='array' then v.payload->'composition'->'sections' else '[]'::jsonb end) section
  where r.website_id=p_site and ((r.content_type='homepage' and r.path='/') or (r.content_type='page' and r.path='/concept' and cms.get_public_concept(p_site,r.locale) is not null)) and r.locale='en'
  and cms.record_media_available(p_site,'homepage',v.payload)
  and cms.hero_video_section_visible(section,r.locale)
  and section->'data'->'background'->>'kind'='video'
  and (section->'data'->'background'->>'desktopAssetId'=p_asset or section->'data'->'background'->>'mobileAssetId'=p_asset)
 );
$$;
commit;
