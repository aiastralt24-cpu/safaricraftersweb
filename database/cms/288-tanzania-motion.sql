begin;
-- Tanzania fade/reveal uses progressive enhancement with reduced-motion/focus safeguards.
create or replace function cms.assert_tanzania_publication_dependencies(p_site uuid,p_payload jsonb,p_locale text)
returns void language plpgsql security definer set search_path='' as $$
declare sections jsonb; section jsonb; href text; link_path text; target uuid; related cms.records; dependency jsonb; asset text; own_assets text[]; all_assets text[]; media cms.media_objects;
begin
 if p_locale is distinct from 'en' or jsonb_typeof(p_payload) is distinct from 'object'
  or p_payload-'composition'-'seo'<>'{}'::jsonb or jsonb_typeof(p_payload#>'{composition,sections}') is distinct from 'array' then raise exception 'tanzania_content_invalid'; end if;
 select coalesce(jsonb_agg(value),'[]') into sections from jsonb_array_elements(p_payload#>'{composition,sections}') where value#>'{controls,visible}' is distinct from 'false'::jsonb;
 for section in select value from jsonb_array_elements(sections) loop
  if coalesce(section->>'kind','') not in ('tanzaniaHero','tanzaniaFacts','tanzaniaIntroduction','tanzaniaPlaces','tanzaniaGallery','tanzaniaItineraries','tanzaniaFaq','tanzaniaPlanner','tanzaniaRelated') then raise exception 'tanzania_section_unsupported'; end if;
  if coalesce(section#>'{controls,regions}','[]'::jsonb)<>'[]'::jsonb or coalesce(section#>>'{controls,animation}','none') not in ('none','fade','reveal')
   or coalesce(section#>>'{controls,background}','paper')<>'paper' or coalesce(section#>>'{controls,width}','content') not in ('reading','content','full')
   or coalesce(section#>>'{controls,spacing}','standard') not in ('compact','standard','generous') or coalesce(section#>>'{controls,textAlign}','start') not in ('start','center')
   or coalesce(section#>>'{controls,mediaAlign}','end')<>'end' or coalesce(section#>>'{controls,mobileOrder}','textFirst')<>'textFirst' then raise exception 'tanzania_controls_unsupported'; end if;
 end loop;
 -- Include hidden media, future links and all linked records before collecting media locks.
 select coalesce(array_agg(distinct value#>>'{}'),'{}') into own_assets from jsonb_path_query(p_payload,'$.**.assetId') value where jsonb_typeof(value)='string';
 all_assets:=own_assets;
 for target in select r.id from cms.records r where r.website_id=p_site and r.locale=p_locale and
  r.path in(select cms.tanzania_link_path(value#>>'{}') from jsonb_path_query(sections,'$.**.href') value where jsonb_typeof(value)='string') order by r.id loop
  select * into related from cms.records where website_id=p_site and id=target for share;
  select v.payload into dependency from cms.revisions v where v.website_id=p_site and v.record_id=target and v.id=related.published_revision_id;
  for asset in select distinct value#>>'{}' from jsonb_path_query(dependency,'$.**.assetId') value where jsonb_typeof(value)='string' loop all_assets:=array_append(all_assets,asset);end loop;
 end loop;
 perform 1 from cms.media_objects where website_id=p_site and id=any(all_assets) order by id for share;
 foreach asset in array own_assets loop
  select * into media from cms.media_objects where website_id=p_site and id=asset;
  if not found or media.mime_type<>'image/webp' or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null
   or length(btrim(coalesce(media.rights_evidence,'')))=0 or (media.rights_expires_at is not null and media.rights_expires_at<=clock_timestamp()) then raise exception 'tanzania_media_unavailable'; end if;
 end loop;
 perform 1 from cms.navigation_public_paths order by path for share;
 for href in select value#>>'{}' from jsonb_path_query(sections,'$.**.href') value loop
  link_path:=cms.tanzania_link_path(href);
  if link_path is null then raise exception 'tanzania_link_unavailable'; end if;
  -- Self-anchor existence at every schedule boundary belongs to the trusted receipt.
  if link_path='/destinations/tanzania' then continue; end if;
  if position('#' in href)>0 then raise exception 'tanzania_link_unavailable'; end if;
  if not exists(select 1 from cms.navigation_public_paths where navigation_public_paths.path=link_path) and not cms.concept_link_available(p_site,link_path,p_locale) then raise exception 'tanzania_link_unavailable'; end if;
 end loop;
end $$;
create or replace function cms.project_tanzania_payload(p_raw jsonb,p_locale text)
returns jsonb language plpgsql stable set search_path='' as $$
declare selectors jsonb; section jsonb; controls jsonb; sections jsonb:='[]'; result jsonb;
begin
 if p_locale is distinct from 'en' or jsonb_typeof(p_raw#>'{composition,sections}') is distinct from 'array' then return null; end if;
 selectors:='{"tanzaniaHero":{"title":"scalar","accent":"scalar","copy":"scalar","meta":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"focalPoint":{"x":"scalar","y":"scalar"},"breadcrumbs":[{"id":"scalar","label":"scalar","href":"scalar"}]},"tanzaniaFacts":{"accessibleLabel":"scalar","items":[{"id":"scalar","label":"scalar","value":"scalar","note":"scalar"}]},"tanzaniaIntroduction":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"lead":"scalar","paragraphs":[{"id":"scalar","text":"scalar"}]},"tanzaniaPlaces":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"items":[{"id":"scalar","title":"scalar","subtitle":"scalar","copy":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"imageCaption":"scalar","planner":{"label":"scalar","interest":"scalar","region":"scalar","dialogLabel":"scalar","dialogEyebrow":"scalar","closeLabel":"scalar"}}]},"tanzaniaGallery":{"heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"copy":"scalar","accessibleLabel":"scalar","images":[{"id":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"}}]},"tanzaniaItineraries":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"items":[{"id":"scalar","title":"scalar","label":"scalar","copy":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"planner":{"label":"scalar","interest":"scalar","region":"scalar","dialogLabel":"scalar","dialogEyebrow":"scalar","closeLabel":"scalar"}}]},"tanzaniaFaq":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"items":[{"id":"scalar","question":"scalar","answer":"scalar"}]},"tanzaniaPlanner":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"copy":"scalar","planner":{"label":"scalar","interest":"scalar","region":"scalar","dialogLabel":"scalar","dialogEyebrow":"scalar","closeLabel":"scalar"}},"tanzaniaRelated":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"items":[{"id":"scalar","title":"scalar","copy":"scalar","button":{"label":"scalar","href":"scalar"}}]}}'::jsonb;
 for section in select value from jsonb_array_elements(p_raw#>'{composition,sections}') loop
  if not cms.homepage_section_visible(section,p_locale) then continue; end if;
  if not(selectors ? (section->>'kind')) then return null; end if;
  if coalesce(section#>'{controls,regions}','[]'::jsonb)<>'[]'::jsonb or coalesce(section#>>'{controls,animation}','none') not in ('none','fade','reveal') then return null; end if;
  if coalesce(section#>>'{controls,background}','paper')<>'paper' or coalesce(section#>>'{controls,width}','content') not in ('reading','content','full') or coalesce(section#>>'{controls,spacing}','standard') not in ('compact','standard','generous') or coalesce(section#>>'{controls,textAlign}','start') not in ('start','center') or coalesce(section#>>'{controls,mediaAlign}','end')<>'end' or coalesce(section#>>'{controls,mobileOrder}','textFirst')<>'textFirst' then return null; end if;
  controls:=cms.project_settings_fields(section->'controls','{"visible":"scalar","anchor":"scalar","background":"scalar","width":"scalar","spacing":"scalar","textAlign":"scalar","mediaAlign":"scalar","mobileOrder":"scalar","headingLevel":"scalar","animation":"scalar","locales":["scalar"],"regions":["scalar"]}'::jsonb)||jsonb_build_object('label',section->>'kind');
  -- This is a current snapshot. Removing time bounds prevents a public client
  -- from forecasting missing future sections, whose private copy is not exposed.
  sections:=sections||jsonb_build_array(cms.project_settings_fields(section,'{"id":"scalar","kind":"scalar"}'::jsonb)||jsonb_build_object('controls',controls,'data',cms.project_settings_fields(section->'data',selectors->(section->>'kind'))));
 end loop;
 if (select count(*) from jsonb_array_elements(sections) s where s->>'kind'='tanzaniaHero' and s#>>'{controls,headingLevel}'='h1')<>1
  or (select count(*) from jsonb_array_elements(sections) s where s#>>'{controls,headingLevel}'='h1')<>1
 then return null; end if;
 result:=jsonb_build_object('composition',cms.project_settings_fields(p_raw->'composition','{"schemaVersion":"scalar","title":"scalar"}'::jsonb)||jsonb_build_object('sections',sections));
 if p_raw ? 'seo' then result:=result||jsonb_build_object('seo',cms.project_settings_fields(p_raw->'seo','{"schemaVersion":"scalar","title":"scalar","description":"scalar","canonical":"scalar","indexing":"scalar","following":"scalar","socialTitle":"scalar","socialDescription":"scalar","breadcrumbLabel":"scalar","sitemap":"scalar","socialImage":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"}}'::jsonb));end if;
 return result;
end $$;
commit;
