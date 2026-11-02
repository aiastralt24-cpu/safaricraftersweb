begin;
-- Aviation images and videos require eligible projected public references.
create or replace function cms.media_is_published(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=p_asset
  and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null
  and (m.rights_expires_at is null or m.rights_expires_at>now())
  and exists(select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
   where r.website_id=p_site and (r.path is not null or r.content_type in ('settings','specialist')) and (
    (r.content_type='settings' and exists(select 1 from jsonb_path_query(cms.get_public_settings(p_site,r.locale)->'payload','$.**.assetId') value where value=to_jsonb(p_asset)))
    or (r.content_type='specialist' and cms.get_public_specialist(p_site,r.id,r.locale)->'payload'->'image'->>'assetId'=p_asset)
    or (r.content_type='page' and r.path='/concept' and r.locale='en'
     and exists(select 1 from jsonb_path_query(cms.get_public_concept(p_site,r.locale)->'payload','$.**.assetId') value where value=to_jsonb(p_asset)))
    or (r.content_type='page' and r.path='/guided-bespoke-safaris' and r.locale='en' and exists(select 1 from jsonb_path_query(cms.get_public_guided(p_site,r.locale)->'payload','$.**.assetId') value where value=to_jsonb(p_asset)))
    or (r.content_type='page' and r.path='/private-aviation' and r.locale='en' and exists(select 1 from jsonb_path_query(cms.get_public_aviation(p_site,r.locale)->'payload','$.**.assetId') value where value=to_jsonb(p_asset)))
    or (r.content_type in ('journey','page','homepage')
     and not (r.content_type='page' and r.path in ('/concept','/guided-bespoke-safaris','/private-aviation'))
     and cms.record_media_available(p_site,r.content_type,v.payload)
     and exists(select 1 from jsonb_path_query(v.payload,'$.**.assetId') value where value=to_jsonb(p_asset)))
    or (r.content_type='destination'
     and (v.payload->'image'->>'assetId'=p_asset or v.payload->'heroImage'->>'assetId'=p_asset
      or v.payload->'seo'->'socialImage'->>'assetId'=p_asset
      or exists(select 1 from jsonb_path_query(v.payload,'$.gallery[*].assetId') value where value=to_jsonb(p_asset)))
     and cms.destination_delivery_references(p_site,r.id,r.locale) is not null)
    or (r.content_type='photoExpedition'
     and exists(select 1 from jsonb_path_query(
      cms.get_public_expedition(p_site,r.path,r.locale)->'page'->'payload','$.**.assetId') value
      where value=to_jsonb(p_asset)))
    or (r.content_type='journalArticle'
     and exists(select 1 from jsonb_path_query(
      cms.get_public_journal_article(p_site,r.path,r.locale)->'payload','$.**.assetId') value
      where value=to_jsonb(p_asset)))
   )));
$$;
-- All public page lookups must honor the same Bespoke field boundary.
create or replace function cms.get_public_page(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare concept jsonb; result jsonb;
begin
 if p_path='/private-aviation' then
  concept:=cms.get_public_aviation(p_site,p_locale);
  if concept is null then return null; end if;
  return jsonb_build_object('recordId',concept->'recordId','revisionId',concept->'revisionId','type',concept->'type','payload',concept->'payload');
 end if;
 if p_path='/guided-bespoke-safaris' then
  concept:=cms.get_public_guided(p_site,p_locale);
  if concept is null then return null; end if;
  return jsonb_build_object('recordId',concept->'recordId','revisionId',concept->'revisionId','type',concept->'type','payload',concept->'payload');
 end if;
 if p_path='/concept' then
  concept:=cms.get_public_concept(p_site,p_locale);
  if concept is null then return null; end if;
  return jsonb_build_object('recordId',concept->'recordId','revisionId',concept->'revisionId','type',concept->'type','payload',concept->'payload');
 end if;
 select jsonb_build_object('recordId',r.id,'revisionId',v.id,'type',r.content_type,'payload',cms.public_page_payload(r.content_type,v.payload)) into result
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
 where r.website_id=p_site and r.path=p_path and r.locale=p_locale and r.content_type in ('journey','page','homepage')
 and cms.record_media_available(p_site,r.content_type,v.payload);
 return result;
end $$;


create or replace function cms.hero_video_is_published(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.hero_video_available(p_site,p_asset) and (exists(
  select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
  join cms.validations checked on checked.revision_id=v.id and checked.valid and checked.validator_version=case when r.content_type='homepage' then 'homepage-1' else 'composition-5' end
  join cms.validation_policy policy on policy.content_type=r.content_type and policy.validator_version=checked.validator_version
  cross join lateral jsonb_array_elements(case when jsonb_typeof(v.payload->'composition'->'sections')='array' then v.payload->'composition'->'sections' else '[]'::jsonb end) section
  where r.website_id=p_site and ((r.content_type='homepage' and r.path='/') or (r.content_type='page' and r.path='/concept' and cms.get_public_concept(p_site,r.locale) is not null)) and r.locale='en'
  and cms.record_media_available(p_site,'homepage',v.payload)
  and cms.hero_video_section_visible(section,r.locale)
  and section->'data'->'background'->>'kind'='video'
  and (section->'data'->'background'->>'desktopAssetId'=p_asset or section->'data'->'background'->>'mobileAssetId'=p_asset)
 ) or exists(
  select 1 from jsonb_array_elements(cms.get_public_aviation(p_site,'en')#>'{payload,composition,sections}') section
  where section->>'kind'='aviationHero' and section#>>'{data,media,background,kind}'='video'
  and (section#>>'{data,media,background,desktopAssetId}'=p_asset or section#>>'{data,media,background,mobileAssetId}'=p_asset)
 ));
$$;


commit;
