begin;
-- Public video identity is limited to a currently visible homepage hero.
create function cms.hero_video_section_visible(p_section jsonb,p_locale text)
returns boolean language plpgsql stable set search_path='' as $$
declare c jsonb; start_at timestamptz; end_at timestamptz;
begin
 if p_section->>'kind' is distinct from 'homepageHero' then return false; end if;
 c:=p_section->'controls';
 if c->'visible' is distinct from 'true'::jsonb or jsonb_typeof(c->'locales') is distinct from 'array'
 or jsonb_typeof(c->'regions') is distinct from 'array' then return false; end if;
 -- Region-restricted delivery requires an authenticated audience context not yet implemented.
 if jsonb_array_length(c->'regions')<>0 then return false; end if;
 if jsonb_array_length(c->'locales')<>0 and not (c->'locales' ? p_locale) then return false; end if;
 if c ? 'visibleFrom' then
  if jsonb_typeof(c->'visibleFrom')<>'string' or c->>'visibleFrom' !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then return false; end if;
  start_at:=(c->>'visibleFrom')::timestamptz;
 end if;
 if c ? 'visibleUntil' then
  if jsonb_typeof(c->'visibleUntil')<>'string' or c->>'visibleUntil' !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then return false; end if;
  end_at:=(c->>'visibleUntil')::timestamptz;
 end if;
 return (start_at is null or start_at<=now()) and (end_at is null or end_at>now()) and (start_at is null or end_at is null or start_at<end_at);
exception when others then return false;
end $$;
create function cms.hero_video_is_published(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.hero_video_available(p_site,p_asset) and exists(
  select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
  join cms.validations checked on checked.revision_id=v.id and checked.valid and checked.validator_version='homepage-1' and checked.expires_at>now()
  join cms.validation_policy policy on policy.content_type='homepage' and policy.validator_version=checked.validator_version
  cross join lateral jsonb_array_elements(case when jsonb_typeof(v.payload->'composition'->'sections')='array' then v.payload->'composition'->'sections' else '[]'::jsonb end) section
  where r.website_id=p_site and r.content_type='homepage' and r.path='/' and r.locale='en'
  and cms.record_media_available(p_site,'homepage',v.payload)
  and cms.hero_video_section_visible(section,r.locale)
  and section->'data'->'background'->>'kind'='video'
  and (section->'data'->'background'->>'desktopAssetId'=p_asset or section->'data'->'background'->>'mobileAssetId'=p_asset)
 );
$$;
create function cms.get_public_hero_video(p_site uuid,p_asset text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'site',m.website_id,'key',m.storage_key,'sha256',m.sha256,'bytes',m.byte_size)
 from cms.media_objects m where m.website_id=p_site and m.id=p_asset and cms.hero_video_is_published(p_site,p_asset);
$$;
revoke all on function cms.hero_video_section_visible(jsonb,text),cms.hero_video_is_published(uuid,text),cms.get_public_hero_video(uuid,text) from public;
grant execute on function cms.get_public_hero_video(uuid,text) to anon,authenticated;
-- Storage policy is deliberately unchanged until end-to-end public delivery is validated.
commit;
