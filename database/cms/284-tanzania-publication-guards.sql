begin;
-- Query strings stay in content; only validated local pathnames select dependencies.
create function cms.tanzania_link_path(p_href text)
returns text language plpgsql immutable set search_path='' as $$
begin
 if p_href is null or length(p_href)>2048 or p_href ~ '[[:space:][:cntrl:]]' or position(chr(92) in p_href)>0 or p_href like '%//%'
  or p_href !~ '^/[a-z0-9/-]*(\?[^#]*)?(#[a-z][a-z0-9-]*)?$' then return null; end if;
 return split_part(split_part(p_href,'#',1),'?',1);
end $$;
revoke all on function cms.tanzania_link_path(text) from public;
create function cms.assert_tanzania_publication_dependencies(p_site uuid,p_payload jsonb,p_locale text)
returns void language plpgsql security definer set search_path='' as $$
declare sections jsonb; section jsonb; href text; link_path text; target uuid; related cms.records; dependency jsonb; asset text; own_assets text[]; all_assets text[]; media cms.media_objects;
begin
 if p_locale is distinct from 'en' or jsonb_typeof(p_payload) is distinct from 'object'
  or p_payload-'composition'-'seo'<>'{}'::jsonb or jsonb_typeof(p_payload#>'{composition,sections}') is distinct from 'array' then raise exception 'tanzania_content_invalid'; end if;
 select coalesce(jsonb_agg(value),'[]') into sections from jsonb_array_elements(p_payload#>'{composition,sections}') where value#>'{controls,visible}' is distinct from 'false'::jsonb;
 for section in select value from jsonb_array_elements(sections) loop
  if coalesce(section->>'kind','') not in ('tanzaniaHero','tanzaniaFacts','tanzaniaIntroduction','tanzaniaPlaces','tanzaniaGallery','tanzaniaItineraries','tanzaniaFaq','tanzaniaPlanner','tanzaniaRelated') then raise exception 'tanzania_section_unsupported'; end if;
  if coalesce(section#>'{controls,regions}','[]'::jsonb)<>'[]'::jsonb or coalesce(section#>>'{controls,animation}','none')<>'none'
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
revoke all on function cms.assert_tanzania_publication_dependencies(uuid,jsonb,text) from public;
create function cms.enforce_tanzania_page_release()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;
begin
 if new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and old.path='/destinations/tanzania' and old.published_revision_id is not null and (new.path is distinct from old.path or new.content_type is distinct from old.content_type or new.locale is distinct from old.locale) then raise exception 'tanzania_route_not_ready'; end if;
 if new.path is distinct from '/destinations/tanzania' then return new; end if;
 if new.content_type is distinct from 'page' or new.locale is distinct from 'en' then raise exception 'tanzania_route_not_ready'; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 perform cms.assert_tanzania_publication_dependencies(new.website_id,payload,new.locale);
 return new;
end $$;
revoke all on function cms.enforce_tanzania_page_release() from public;
create trigger cms_tanzania_page_release before insert or update of published_revision_id,path,locale,content_type on cms.records for each row execute function cms.enforce_tanzania_page_release();
commit;
