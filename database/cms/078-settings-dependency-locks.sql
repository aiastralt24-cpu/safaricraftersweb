begin;
-- Private release helper: lock the published graph used by settings/header readers.
create function cms.lock_settings_dependencies(p_site uuid,p_roots uuid[],p_locale text,p_settings uuid)
returns void language plpgsql security definer set search_path='' as $$
declare pending uuid[]:=p_roots; visited uuid[]:='{}'; target uuid; child uuid; rec cms.records; payload jsonb; asset text; media cms.media_objects; edges integer:=0;
begin
 while cardinality(pending)>0 loop
  select id into target from unnest(pending) id order by id limit 1;
  pending:=array_remove(pending,target);
  if target=any(visited) then continue; end if;
  if target=p_settings or cardinality(visited)>=2000 then raise exception 'settings_reference_verification_required'; end if;
  visited:=array_append(visited,target);
  select * into rec from cms.records where website_id=p_site and id=target for share;
  if not found or rec.locale<>p_locale or rec.published_revision_id is null then raise exception 'settings_reference_verification_required'; end if;
  select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=target and v.id=rec.published_revision_id;
  if payload is null then raise exception 'settings_reference_verification_required'; end if;
  for asset in select distinct v #>> '{}' from jsonb_path_query(payload,'$.**.assetId') v where jsonb_typeof(v)='string' order by 1 loop
   select * into media from cms.media_objects where website_id=p_site and id=asset for share;
   if not found or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'settings_reference_verification_required'; end if;
  end loop;
  if not cms.record_media_available(p_site,rec.content_type,payload) then raise exception 'settings_reference_verification_required'; end if;
  -- Other supported types are leaves in the public header/destination graph.
  if rec.content_type in ('navigation','destination') then
   if exists(select 1 from jsonb_path_query(payload,'$.**.recordId') v where jsonb_typeof(v)<>'string' or (v #>> '{}') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$') then raise exception 'settings_reference_verification_required'; end if;
   for child in select distinct (v #>> '{}')::uuid from jsonb_path_query(payload,'$.**.recordId') v order by 1 loop
    edges:=edges+1;if edges>4000 then raise exception 'settings_reference_verification_required'; end if;
    if not child=any(visited) then pending:=array_append(pending,child); end if;
   end loop;
  end if;
 end loop;
end $$;
revoke all on function cms.lock_settings_dependencies(uuid,uuid[],text,uuid) from public;

create function cms.settings_menu_ready(p_site uuid,p_record uuid,p_locale text)
returns boolean language sql stable security definer set search_path='' as $$
 select menu is not null and not exists(select 1 from jsonb_array_elements(menu->'references') v where v->'available' is distinct from 'true'::jsonb)
 from (select cms.get_public_navigation(p_site,p_record,p_locale) menu) snapshot;
$$;
revoke all on function cms.settings_menu_ready(uuid,uuid,text) from public;
create or replace function cms.get_settings_reference_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; identifier text; target uuid; evidence jsonb; result jsonb:='[]';
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='settings';
 if not found then return null; end if;
 if current_setting('role',true)<>'service_role' and not cms.can(p_site,'view','settings',rec.id) then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=p_revision;
 if not found then return null; end if;
 for identifier in select distinct value #>> '{}' from jsonb_path_query(payload,'$.header.**.recordId') as refs(value) loop
  if identifier !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then continue; end if;
  target:=identifier::uuid;
  if cms.settings_menu_ready(p_site,target,rec.locale) then
   evidence:=jsonb_build_object('recordId',target,'available',true,'type','navigation','locale',rec.locale);
  else
   evidence:=cms.navigation_reference_evidence(p_site,jsonb_build_object('featuredContent',jsonb_build_array(jsonb_build_object('recordId',target))),rec.locale)->0;
   if evidence is null then evidence:=jsonb_build_object('recordId',target,'available',false); end if;
   evidence:=evidence-'path'-'title';
  end if;
  result:=result||jsonb_build_array(evidence);
 end loop;
 return result;
end $$;
create or replace function cms.enforce_settings_publication_references()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; ref_id uuid; related cms.records; name text; target text; evidence jsonb; node jsonb;
begin
 if new.content_type<>'settings' or new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path and new.content_type is not distinct from old.content_type then return new; end if;
 if new.locale<>'en' or new.path is not null then raise exception 'settings_route_not_ready'; end if;
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
 perform 1 from cms.navigation_public_paths order by path for share;
 for node in select v from jsonb_path_query(payload,'$.**.href') v loop
  if jsonb_typeof(node)<>'string' or not cms.navigation_url_available(node #>> '{}') then raise exception 'settings_url_verification_required'; end if;
 end loop;
 return new;
end $$;

-- Settings validation/publication policy remains disabled.
commit;
