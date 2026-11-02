begin;
create or replace function cms.enforce_navigation_publication_references()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; ref_id uuid; related cms.records; target_payload jsonb; evidence jsonb; node jsonb; asset text; media cms.media_objects; prefix text;
begin
 if new.content_type<>'navigation' or new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path and new.content_type is not distinct from old.content_type then return new; end if;
 if new.locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' or new.path is not null then raise exception 'navigation_route_not_ready'; end if;
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
  if new.locale<>'en' and related.content_type<>'page' then raise exception 'navigation_reference_verification_required'; end if;
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
create or replace function cms.enforce_navigation_publication_urls()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; node jsonb;
begin
 if new.content_type<>'navigation' or new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path and new.content_type is not distinct from old.content_type then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 -- Serialize route removal with releases, including absolute owned-domain URLs.
 perform 1 from cms.navigation_public_paths order by path for share;
 for node in select value from jsonb_array_elements(payload->'items') loop
  if node->'target'->>'kind'='url' and (not cms.navigation_url_available(node->'target'->>'href') or (new.locale<>'en' and cms.localized_publication_link_path(node->'target'->>'href') is not null)) then raise exception 'navigation_url_verification_required'; end if;
 end loop;
 return new;
end $$;


drop trigger cms_navigation_url_check on cms.records;
create trigger cms_navigation_url_check before insert or update of published_revision_id,path,locale,content_type on cms.records for each row execute function cms.enforce_navigation_publication_urls();
commit;
