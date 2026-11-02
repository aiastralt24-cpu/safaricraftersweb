begin;
-- Recheck and lock the direct records and specialist journey/media dependencies used at release.
create function cms.enforce_expedition_publication_references()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; target uuid; related cms.records; dependency jsonb; ref_entry jsonb; asset text; media cms.media_objects; pending uuid[]; visited uuid[]:='{}'; child uuid; value jsonb;
begin
 if new.content_type<>'photoExpedition' or new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path and new.content_type is not distinct from old.content_type then return new; end if;
 if new.locale<>'en' then raise exception 'expedition_reference_verification_required'; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if payload is null or octet_length(payload::text)>1000000 or jsonb_typeof(payload->'specialists') is distinct from 'array' or jsonb_array_length(payload->'specialists')>20 or payload#>>'{enquiry,form,recordId}' is null then raise exception 'expedition_reference_verification_required'; end if;
 select array_agg(distinct id) into pending from (
  select (item->>'recordId')::uuid id from jsonb_array_elements(payload->'specialists') item
  union all select (payload#>>'{enquiry,form,recordId}')::uuid
 ) ids;
 while cardinality(pending)>0 loop
  select id into target from unnest(pending) id order by id limit 1;
  if target is null or target=new.id or cardinality(visited)>=1000 then raise exception 'expedition_reference_verification_required'; end if;
  pending:=array_remove(pending,target);
  if target=any(visited) then continue; end if;
  visited:=array_append(visited,target);
  select * into related from cms.records where website_id=new.website_id and id=target for share;
  if not found or related.locale<>new.locale or related.published_revision_id is null then raise exception 'expedition_reference_verification_required'; end if;
  select v.payload into dependency from cms.revisions v where v.website_id=new.website_id and v.record_id=target and v.id=related.published_revision_id;
  if dependency is null then raise exception 'expedition_reference_verification_required'; end if;
  for asset in select distinct v #>> '{}' from jsonb_path_query(dependency,'$.**.assetId') v where jsonb_typeof(v)='string' order by 1 loop
   select * into media from cms.media_objects where website_id=new.website_id and id=asset for share;
   if not found or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'expedition_reference_verification_required'; end if;
  end loop;
  if related.content_type='specialist' then
   if jsonb_typeof(dependency->'journeys') is distinct from 'array' then raise exception 'expedition_reference_verification_required'; end if;
   for child in select distinct (item->>'recordId')::uuid from jsonb_array_elements(dependency->'journeys') item loop
    if child is null then raise exception 'expedition_reference_verification_required'; end if;
    if not child=any(visited) then pending:=array_append(pending,child); end if;
   end loop;
  end if;
 end loop;
 for ref_entry in select v from jsonb_array_elements(payload->'specialists') v loop
  if ref_entry->>'role' not in ('mentor','guide') or ref_entry->>'role' is null or cms.get_public_specialist(new.website_id,(ref_entry->>'recordId')::uuid,new.locale) is null then raise exception 'expedition_reference_verification_required'; end if;
 end loop;
 target:=(payload#>>'{enquiry,form,recordId}')::uuid;
 value:=cms.get_published_form(new.website_id,target);
 if value is null or value->>'locale' is distinct from new.locale or value->'definition'->'schemaVersion' is distinct from '1'::jsonb or jsonb_typeof(value->'definition'->'fields') is distinct from 'array' then raise exception 'expedition_reference_verification_required'; end if;
 if jsonb_array_length(value->'definition'->'fields') not between 1 and 50 or exists(select 1 from jsonb_array_elements(value->'definition'->'fields') f where f->>'type'='file') then raise exception 'expedition_reference_verification_required'; end if;
 return new;
exception when invalid_text_representation then raise exception 'expedition_reference_verification_required';
end $$;
create trigger cms_expedition_reference_check before insert or update of published_revision_id,path,locale,content_type on cms.records for each row execute function cms.enforce_expedition_publication_references();
revoke all on function cms.enforce_expedition_publication_references() from public;
-- Defense in depth: this does not enable the expedition publication policy.
commit;
