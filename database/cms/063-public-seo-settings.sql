begin;
-- Only the SEO projection is public. Other settings and future internal fields
-- must acquire their own explicit delivery contract before being exposed.
create function cms.get_public_seo_settings(p_site uuid,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; seo jsonb; image jsonb;
begin
 if p_locale is distinct from 'en' then return null; end if;
 select * into rec from cms.records where website_id=p_site and content_type='settings' and locale=p_locale and published_revision_id is not null;
 if not found then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 if payload->'schemaVersion' is distinct from '1'::jsonb then return null; end if;
 seo:=cms.journal_public_scalars(payload->'seo',array['titleTemplate','description','indexing']);
 if seo is null or jsonb_typeof(seo->'titleTemplate') is distinct from 'string' or position('%s' in seo->>'titleTemplate')=0
  or length(seo->>'titleTemplate') not between 1 and 300 or jsonb_typeof(seo->'description') is distinct from 'string'
  or length(seo->>'description')>1000 or coalesce(seo->>'indexing','') not in ('index','noindex') then return null; end if;
 if payload->'seo' ? 'socialImage' then
  image:=cms.journal_public_scalars(payload->'seo'->'socialImage',array['assetId','alt','decorative','caption','credit']);
  if image is null or jsonb_typeof(image->'assetId') is distinct from 'string' or jsonb_typeof(image->'alt') is distinct from 'string'
   or jsonb_typeof(image->'decorative') is distinct from 'boolean' then return null; end if;
  if not exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=image->>'assetId'
   and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null
   and (m.rights_expires_at is null or m.rights_expires_at>now())) then return null; end if;
  seo:=seo||jsonb_build_object('socialImage',image);
 end if;
 return jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',rec.published_revision_id,'locale',rec.locale,'seo',seo);
end $$;
revoke all on function cms.get_public_seo_settings(uuid,text) from public;
grant execute on function cms.get_public_seo_settings(uuid,text) to anon,authenticated;
-- Settings publication remains disabled until its complete validation gate is implemented.
create or replace function cms.media_is_published(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=p_asset
  and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null
  and (m.rights_expires_at is null or m.rights_expires_at>now())
  and exists(select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
   where r.website_id=p_site and (r.path is not null or r.content_type='settings') and (
    (r.content_type='settings' and cms.get_public_seo_settings(p_site,r.locale)->'seo'->'socialImage'->>'assetId'=p_asset)
    or (r.content_type in ('journey','page','homepage')
     and cms.record_media_available(p_site,r.content_type,v.payload)
     and exists(select 1 from jsonb_path_query(v.payload,'$.**.assetId') value where value=to_jsonb(p_asset)))
    or (r.content_type='destination'
     and (v.payload->'image'->>'assetId'=p_asset or v.payload->'heroImage'->>'assetId'=p_asset
      or v.payload->'seo'->'socialImage'->>'assetId'=p_asset
      or exists(select 1 from jsonb_path_query(v.payload,'$.gallery[*].assetId') value where value=to_jsonb(p_asset)))
     and cms.destination_delivery_references(p_site,r.id,r.locale) is not null)
    or (r.content_type='journalArticle'
     and exists(select 1 from jsonb_path_query(
      cms.get_public_journal_article(p_site,r.path,r.locale)->'payload','$.**.assetId') value
      where value=to_jsonb(p_asset)))
   )));
$$;
commit;
