begin;
-- Public payload contains only currently visible content, never future drafts,
-- internal editorial labels or unsupported fields. The route gate remains closed.
create function cms.project_kenya_payload(p_raw jsonb,p_locale text)
returns jsonb language plpgsql stable set search_path='' as $$
declare selectors jsonb; section jsonb; controls jsonb; sections jsonb:='[]'; result jsonb;
begin
 if p_locale is distinct from 'en' or jsonb_typeof(p_raw#>'{composition,sections}') is distinct from 'array' then return null; end if;
 selectors:='{"kenyaHero":{"title":"scalar","accent":"scalar","copy":"scalar","meta":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"focalPoint":{"x":"scalar","y":"scalar"},"breadcrumbs":[{"id":"scalar","label":"scalar","href":"scalar"}]},"kenyaFacts":{"accessibleLabel":"scalar","items":[{"id":"scalar","label":"scalar","value":"scalar","note":"scalar"}]},"kenyaIntroduction":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"lead":"scalar","paragraphs":[{"id":"scalar","text":"scalar"}]},"kenyaPlaces":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"items":[{"id":"scalar","title":"scalar","subtitle":"scalar","copy":"scalar","focus":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"button":{"label":"scalar","href":"scalar"},"imageLinkLabel":"scalar"}]},"kenyaGallery":{"heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"copy":"scalar","accessibleLabel":"scalar","images":[{"id":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"}}]},"kenyaLuxury":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"caption":"scalar","paragraphs":[{"id":"scalar","text":"scalar","emphasized":"scalar"}]},"kenyaItineraries":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"items":[{"id":"scalar","title":"scalar","label":"scalar","copy":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"button":{"label":"scalar","href":"scalar"}}]},"kenyaFaq":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"items":[{"id":"scalar","question":"scalar","answer":"scalar"}]},"kenyaPlanner":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"copy":"scalar","button":{"label":"scalar","href":"scalar"}},"kenyaRelated":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"items":[{"id":"scalar","title":"scalar","copy":"scalar","button":{"label":"scalar","href":"scalar"}}]}}'::jsonb;
 for section in select value from jsonb_array_elements(p_raw#>'{composition,sections}') loop
  if not cms.homepage_section_visible(section,p_locale) then continue; end if;
  if not(selectors ? (section->>'kind')) then return null; end if;
  if coalesce(section#>'{controls,regions}','[]'::jsonb)<>'[]'::jsonb or coalesce(section#>>'{controls,animation}','none')<>'none' then return null; end if;
  if coalesce(section#>>'{controls,background}','paper')<>'paper' or coalesce(section#>>'{controls,width}','content')<>'content' or coalesce(section#>>'{controls,spacing}','standard')<>'standard' or coalesce(section#>>'{controls,textAlign}','start')<>'start' or coalesce(section#>>'{controls,mediaAlign}','end')<>'end' or coalesce(section#>>'{controls,mobileOrder}','textFirst')<>'textFirst' then return null; end if;
  controls:=cms.project_settings_fields(section->'controls','{"visible":"scalar","anchor":"scalar","background":"scalar","width":"scalar","spacing":"scalar","textAlign":"scalar","mediaAlign":"scalar","mobileOrder":"scalar","headingLevel":"scalar","animation":"scalar","locales":["scalar"],"regions":["scalar"]}'::jsonb)||jsonb_build_object('label',section->>'kind');
  -- This is a current snapshot. Removing time bounds prevents a public client
  -- from forecasting missing future sections, whose private copy is not exposed.
  sections:=sections||jsonb_build_array(cms.project_settings_fields(section,'{"id":"scalar","kind":"scalar"}'::jsonb)||jsonb_build_object('controls',controls,'data',cms.project_settings_fields(section->'data',selectors->(section->>'kind'))));
 end loop;
 if (select count(*) from jsonb_array_elements(sections) s where s->>'kind'='kenyaHero' and s#>>'{controls,headingLevel}'='h1')<>1
  or (select count(*) from jsonb_array_elements(sections) s where s#>>'{controls,headingLevel}'='h1')<>1
 then return null; end if;
 result:=jsonb_build_object('composition',cms.project_settings_fields(p_raw->'composition','{"schemaVersion":"scalar","title":"scalar"}'::jsonb)||jsonb_build_object('sections',sections));
 if p_raw ? 'seo' then result:=result||jsonb_build_object('seo',cms.project_settings_fields(p_raw->'seo','{"schemaVersion":"scalar","title":"scalar","description":"scalar","canonical":"scalar","indexing":"scalar","following":"scalar","socialTitle":"scalar","socialDescription":"scalar","breadcrumbLabel":"scalar","sitemap":"scalar","socialImage":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"}}'::jsonb));end if;
 return result;
end $$;
revoke all on function cms.project_kenya_payload(jsonb,text) from public;
create function cms.get_public_kenya(p_site uuid,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; raw jsonb; payload jsonb; section jsonb; href text; link_path text; anchor text;
begin
 if p_locale is distinct from 'en' then return null; end if;
 select * into rec from cms.records where website_id=p_site and content_type='page' and path='/destinations/kenya' and locale=p_locale and published_revision_id is not null;
 if not found then return null; end if;
 if not exists(select 1 from cms.validations checked join cms.validation_policy policy on policy.content_type='page' and policy.validator_version=checked.validator_version where checked.revision_id=rec.published_revision_id and checked.valid and checked.validator_version='composition-5') then return null; end if;
 select v.payload into raw from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 payload:=cms.project_kenya_payload(raw,p_locale);
 if payload is null or not cms.record_media_available(p_site,'page',payload) then return null; end if;
 for href in select value#>>'{}' from jsonb_path_query(payload,'$.**.href') value loop
  link_path:=cms.kenya_link_path(href);if link_path is null then return null; end if;
  if link_path='/destinations/kenya' then
   if position('#' in href)>0 then
    anchor:=split_part(href,'#',2);
    if not exists(select 1 from jsonb_array_elements(payload#>'{composition,sections}') s where s#>>'{controls,anchor}'=anchor) then return null; end if;
   end if;
  elsif position('#' in href)>0 then return null;
  elsif not exists(select 1 from cms.navigation_public_paths where path=link_path) and not cms.concept_link_available(p_site,link_path,p_locale) then return null;
  end if;
 end loop;
 return jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',rec.published_revision_id,'type','page','path','/destinations/kenya','locale',p_locale,'payload',payload);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then return null;
end $$;
revoke all on function cms.get_public_kenya(uuid,text) from public;
grant execute on function cms.get_public_kenya(uuid,text) to anon,authenticated;
commit;
