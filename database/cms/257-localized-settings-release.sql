begin;
create or replace function cms.enforce_settings_publication_references()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; ref_id uuid; related cms.records; name text; target text; evidence jsonb; node jsonb;
begin
 if new.content_type<>'settings' or new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path and new.content_type is not distinct from old.content_type then return new; end if;
 if new.locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' or new.path is not null then raise exception 'settings_route_not_ready'; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if payload is null or jsonb_typeof(payload->'header') is distinct from 'object' or jsonb_typeof(payload->'header'->'featuredContent') is distinct from 'array' or octet_length(payload::text)>1000000 then raise exception 'settings_reference_verification_required'; end if;
 if jsonb_array_length(payload->'header'->'featuredContent')>12 then raise exception 'settings_reference_verification_required'; end if;
 if exists(select 1 from jsonb_path_query(payload,'$.header.**.recordId') v where jsonb_typeof(v)<>'string' or (v #>> '{}') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$') then raise exception 'settings_reference_verification_required'; end if;
 perform cms.lock_settings_dependencies(new.website_id,array(select distinct (v #>> '{}')::uuid from jsonb_path_query(payload,'$.header.**.recordId') v),new.locale,new.id);
 -- Direct targets cannot change their publication pointers during the release.
 for ref_id in select distinct (v #>> '{}')::uuid from jsonb_path_query(payload,'$.header.**.recordId') v order by 1 loop
  if ref_id=new.id then raise exception 'settings_reference_verification_required'; end if;
  select * into related from cms.records where website_id=new.website_id and id=ref_id for share;
  if not found or related.locale<>new.locale or related.published_revision_id is null then raise exception 'settings_reference_verification_required'; end if;
 end loop;
 foreach name in array array['mainMenu','utilityMenu','mobileMenu'] loop
  if payload->'header' ? name then
   target:=payload->'header'->name->>'recordId';
   if target is null or not cms.settings_menu_ready(new.website_id,target::uuid,new.locale) then raise exception 'settings_reference_verification_required'; end if;
  end if;
 end loop;
 evidence:=cms.navigation_reference_evidence(new.website_id,jsonb_build_object('featuredContent',payload->'header'->'featuredContent'),new.locale);
 if evidence is null or exists(select 1 from jsonb_array_elements(evidence) v where v->'available' is distinct from 'true'::jsonb) then raise exception 'settings_reference_verification_required'; end if;
 if new.locale<>'en' then
  if jsonb_typeof(payload->'interfaceText') is distinct from 'object' or jsonb_typeof(payload#>'{interfaceText,homeHref}') is distinct from 'string'
   or jsonb_array_length(payload#>'{header,featuredContent}')<>0 or payload#>'{header,languageSelector}' is distinct from 'false'::jsonb or payload#>'{search,enabled}' is distinct from 'false'::jsonb
   then raise exception 'settings_route_not_ready';end if;
  perform cms.assert_localized_page_links(new.website_id,new.id,new.locale,'',jsonb_build_object('composition',jsonb_build_object('sections',jsonb_build_array(jsonb_build_object('data',(
   select coalesce(jsonb_agg(jsonb_build_object('href',value)),'[]'::jsonb) from (
    select value from jsonb_path_query(payload,'$.**.href') value union all select value from jsonb_path_query(payload,'$.**.homeHref') value
   ) links
  ))))));
  return new;
 end if;
 perform 1 from cms.navigation_public_paths order by path for share;
 for node in select v from jsonb_path_query(payload,'$.**.href') v union all select v from jsonb_path_query(payload,'$.**.homeHref') v loop
  if jsonb_typeof(node)<>'string' or not cms.navigation_url_available(node #>> '{}') then raise exception 'settings_url_verification_required'; end if;
 end loop;
 return new;
end $$;

-- Existing settings approval and validation receipt policies remain mandatory.
commit;
