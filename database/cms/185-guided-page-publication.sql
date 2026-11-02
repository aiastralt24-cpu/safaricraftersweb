begin;
-- Coordinate the reserved-route exemption with its dedicated release guard.
create or replace function cms.enforce_custom_page_release()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; node jsonb;
begin
 if new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and old.content_type='page' and cms.is_custom_page_path(old.path) and old.published_revision_id is not null and (new.content_type is distinct from old.content_type or new.path is distinct from old.path or new.locale is distinct from old.locale) then raise exception 'custom_page_route_not_ready'; end if;
 if new.content_type<>'page' or new.path in ('/guided-bespoke-safaris','/concept','/contact','/conservation-commitment','/about','/specialists','/photo-expeditions','/legal/privacy','/legal/terms','/legal/cookies') then return new; end if;
 if not cms.is_custom_page_path(new.path) or new.locale<>'en' then raise exception 'custom_page_route_not_ready'; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path and new.content_type is not distinct from old.content_type then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 perform 1 from cms.navigation_public_paths order by path for share;
 for node in select value from jsonb_path_query(payload,'$.composition.sections[*].data.**.href') as links(value) loop
  if jsonb_typeof(node) is distinct from 'string' then raise exception 'custom_page_link_unavailable'; end if;
  -- Local anchors and their visibility intervals are checked by the trusted validator.
  if (node #>> '{}') ~ '^mailto:[A-Za-z0-9.!#$&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' and (node #>> '{}') !~ '[?%,[:space:]\\]' then continue; end if;
  if left((node #>> '{}'),1)<>'#' and not cms.navigation_url_available((node #>> '{}')) then raise exception 'custom_page_link_unavailable'; end if;
 end loop;
 return new;
end $$;

create function cms.enforce_guided_page_release()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; section jsonb;
begin
 if new.published_revision_id is null or new.path is distinct from '/guided-bespoke-safaris' then return new; end if;
 if new.content_type is distinct from 'page' or new.locale is distinct from 'en' then raise exception 'guided_route_not_ready'; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if payload is null or jsonb_typeof(payload) is distinct from 'object' or payload-'composition'-'seo'<>'{}'::jsonb
  or jsonb_typeof(payload#>'{composition,sections}') is distinct from 'array' then raise exception 'guided_page_content_invalid'; end if;
 for section in select value from jsonb_array_elements(payload#>'{composition,sections}') loop
  if coalesce(section#>>'{controls,visible}','true')<>'false' then
   if coalesce(section->>'kind','') not in ('guidedHero','guidedIntroduction','guidedEncounter','guidedFieldCards','guidedPhotography','guidedCompanion','guidedPaths','guidedFaq') then raise exception 'guided_page_section_unsupported'; end if;
   if coalesce(section#>'{controls,regions}','[]'::jsonb)<>'[]'::jsonb then raise exception 'guided_page_region_unsupported'; end if;
  end if;
 end loop;
 -- Revision-bound trusted validation enforces full structure, H1 schedules,
 -- heading structure and link anchors. Separate triggers lock dependencies/media.
 return new;
end $$;
revoke all on function cms.enforce_guided_page_release() from public;
create trigger cms_guided_page_release before insert or update of published_revision_id,path,locale,content_type on cms.records for each row execute function cms.enforce_guided_page_release();
commit;
