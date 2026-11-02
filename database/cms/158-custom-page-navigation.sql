begin;
create or replace function cms.navigation_reference_evidence(p_site uuid,p_payload jsonb,p_locale text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare refs jsonb:='[]'; ref_id uuid; related cms.records; available boolean; target_title text;
begin
 if p_locale is distinct from 'en' or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>1000000 then return null; end if;
 if exists(select 1 from jsonb_path_query(p_payload,'$.**.recordId') v where jsonb_typeof(v)<>'string' or (v #>> '{}') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$') then return null; end if;
 for ref_id in select distinct (v #>> '{}')::uuid from jsonb_path_query(p_payload,'$.**.recordId') v order by 1 loop
  select * into related from cms.records where website_id=p_site and id=ref_id and locale=p_locale and published_revision_id is not null;
  available:=false;
  if found then
   case related.content_type
    when 'page' then available:=cms.is_custom_page_path(related.path) and cms.get_public_page(p_site,related.path,p_locale) is not null;
    when 'journey' then available:=cms.get_public_page(p_site,related.path,p_locale) is not null;
    when 'destination' then available:=cms.get_public_destination(p_site,related.path,p_locale) is not null;
    when 'journalArticle' then available:=cms.get_public_journal_article(p_site,related.path,p_locale) is not null;
    else available:=false;
   end case;
  end if;
  target_title:=null;
  if available then
   select case when related.content_type='page' then v.payload#>>'{composition,title}' else v.payload->>'title' end into target_title from cms.revisions v where v.website_id=p_site and v.record_id=related.id and v.id=related.published_revision_id and jsonb_typeof(case when related.content_type='page' then v.payload#>'{composition,title}' else v.payload->'title' end)='string';
   if target_title is null or length(trim(target_title)) not between 1 and 200 then available:=false; end if;
  end if;
  refs:=refs||jsonb_build_array(case when available then jsonb_build_object('recordId',ref_id,'available',true,'type',related.content_type,'title',target_title,'path',related.path,'locale',related.locale) else jsonb_build_object('recordId',ref_id,'available',false) end);
 end loop;
 return refs;
end $$;
revoke all on function cms.navigation_reference_evidence(uuid,jsonb,text) from public;
create or replace function cms.enforce_navigation_publication_references()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; ref_id uuid; related cms.records; target_payload jsonb; evidence jsonb; node jsonb; asset text; media cms.media_objects; prefix text;
begin
 if new.content_type<>'navigation' or new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path and new.content_type is not distinct from old.content_type then return new; end if;
 if new.locale<>'en' or new.path is not null then raise exception 'navigation_route_not_ready'; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if payload is null or jsonb_typeof(payload->'items') is distinct from 'array' then raise exception 'navigation_reference_verification_required'; end if;
 if jsonb_array_length(payload->'items') not between 1 and 200 or octet_length(payload::text)>1000000 then raise exception 'navigation_reference_verification_required'; end if;
 if exists(select 1 from jsonb_path_query(payload,'$.**.recordId') v where jsonb_typeof(v)<>'string' or (v #>> '{}') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$') then raise exception 'navigation_reference_verification_required'; end if;
 -- Lock target records in identity order before reading publication pointers.
 for ref_id in select distinct (v #>> '{}')::uuid from jsonb_path_query(payload,'$.**.recordId') v order by 1 loop
  if ref_id=new.id then raise exception 'navigation_reference_verification_required'; end if;
  select * into related from cms.records where website_id=new.website_id and id=ref_id for share;
  if not found or related.locale<>new.locale or related.published_revision_id is null or related.content_type not in ('journey','destination','journalArticle','page') then raise exception 'navigation_reference_verification_required'; end if;
  select v.payload into target_payload from cms.revisions v where v.website_id=new.website_id and v.record_id=related.id and v.id=related.published_revision_id;
  if related.content_type='page' then
   if not cms.is_custom_page_path(related.path) then raise exception 'navigation_reference_verification_required'; end if;
  else
  prefix:=case related.content_type when 'journey' then '/journeys/' when 'destination' then '/destinations/' else '/journal/' end;
  if related.path is null or related.path is distinct from prefix||(target_payload->>'slug') or related.path !~ '^/[a-z-]+/[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'navigation_reference_verification_required'; end if;
  end if;
  for asset in select distinct v #>> '{}' from jsonb_path_query(target_payload,'$.**.assetId') v where jsonb_typeof(v)='string' order by 1 loop
   select * into media from cms.media_objects where website_id=new.website_id and id=asset for share;
   if not found or media.mime_type<>'image/webp' or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'navigation_reference_verification_required'; end if;
  end loop;
 end loop;
 evidence:=cms.navigation_reference_evidence(new.website_id,payload,new.locale);
 if evidence is null or exists(select 1 from jsonb_array_elements(evidence) v where v->'available' is distinct from 'true'::jsonb) then raise exception 'navigation_reference_verification_required'; end if;
 for node in select value from jsonb_array_elements(payload->'items') loop
  if node->'target'->>'kind'='record' and not exists(select 1 from jsonb_array_elements(evidence) v where v->>'recordId'=node->'target'->>'recordId' and v->>'type'=node->'target'->>'contentType') then raise exception 'navigation_reference_verification_required'; end if;
 end loop;
 return new;
end $$;
revoke all on function cms.enforce_navigation_publication_references() from public;
commit;
