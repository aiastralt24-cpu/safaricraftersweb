begin;
-- Exact-language published reads only. Release guards remain unchanged.
create or replace function cms.get_public_settings(p_site uuid,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb;
begin
 if p_locale is null or p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then return null; end if;
 select * into rec from cms.records where website_id=p_site and content_type='settings' and locale=p_locale and published_revision_id is not null;
 if not found then return null; end if;
 select cms.public_settings_payload(v.payload) into payload from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 if payload is null or payload->'schemaVersion' is distinct from '1'::jsonb or not cms.record_media_available(p_site,'settings',payload) then return null; end if;
 return jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',rec.published_revision_id,'locale',rec.locale,'payload',payload);
end $$;
create or replace function cms.get_public_seo_settings(p_site uuid,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; seo jsonb; image jsonb;
begin
 if p_locale is null or p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then return null; end if;
 select * into rec from cms.records where website_id=p_site and content_type='settings' and locale=p_locale and published_revision_id is not null;
 if not found then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 if payload->'schemaVersion' is distinct from '1'::jsonb then return null; end if;
 seo:=cms.journal_public_scalars(payload->'seo',array['titleTemplate','description','indexing']);
 if seo is null or jsonb_typeof(seo->'titleTemplate') is distinct from 'string' or position('%s' in seo->>'titleTemplate')=0
  or length(seo->>'titleTemplate') not between 1 and 300 or jsonb_typeof(seo->'description') is distinct from 'string'
  or length(seo->>'description')>1000 or coalesce(seo->>'indexing','') not in ('index','noindex') then return null; end if;
 if payload->'seo' ? 'socialImage' or payload ? 'fallbackImage' then
  image:=cms.journal_public_scalars(case when payload->'seo' ? 'socialImage' then payload->'seo'->'socialImage' else payload->'fallbackImage' end,array['assetId','alt','decorative','caption','credit']);
  if image is null or jsonb_typeof(image->'assetId') is distinct from 'string' or jsonb_typeof(image->'alt') is distinct from 'string'
   or jsonb_typeof(image->'decorative') is distinct from 'boolean' then return null; end if;
  if not exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=image->>'assetId'
   and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null
   and (m.rights_expires_at is null or m.rights_expires_at>now())) then return null; end if;
  seo:=seo||jsonb_build_object('socialImage',image);
 end if;
 return jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',rec.published_revision_id,'locale',rec.locale,'seo',seo);
end $$;
commit;
