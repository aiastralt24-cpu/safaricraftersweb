begin;
create function cms.enforce_destination_publication_references()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; collection text; item jsonb; target uuid; refs jsonb:='[]'; ref jsonb; related cms.records; published_payload jsonb; asset text; media cms.media_objects; prefix text;
begin
 if new.content_type<>'destination' or new.published_revision_id is null or new.published_revision_id is not distinct from old.published_revision_id then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 foreach collection in array array['journeys','expeditions','pairings'] loop
  if jsonb_typeof(payload->collection) is distinct from 'array' then raise exception 'destination_reference_verification_required'; end if;
  if jsonb_array_length(payload->collection)>(case when collection='pairings' then 50 else 100 end) then raise exception 'destination_reference_verification_required'; end if;
  for item in select value from jsonb_array_elements(payload->collection) loop
   if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'recordId') is distinct from 'string' then raise exception 'destination_reference_verification_required'; end if;
   begin target:=(item->>'recordId')::uuid; exception when invalid_text_representation then raise exception 'destination_reference_verification_required'; end;
   if target=new.id then raise exception 'destination_reference_verification_required'; end if;
   refs:=refs||jsonb_build_array(jsonb_build_object('id',target,'type',case collection when 'journeys' then 'journey' when 'expeditions' then 'photoExpedition' else 'destination' end));
  end loop;
 end loop;
 if exists(select 1 from jsonb_array_elements(refs) value group by value->>'id' having count(*)>1) then raise exception 'destination_reference_verification_required'; end if;
 -- Stable lock ordering reduces contention. Database deadlock detection remains a retryable failure for mutually linked publications.
 for ref in select value from jsonb_array_elements(refs) order by value->>'id' loop
  select * into related from cms.records where website_id=new.website_id and id=(ref->>'id')::uuid for share;
  if not found or related.content_type<>ref->>'type' or related.locale<>new.locale or related.published_revision_id is null then raise exception 'destination_reference_verification_required'; end if;
  select v.payload into published_payload from cms.revisions v where v.website_id=new.website_id and v.record_id=related.id and v.id=related.published_revision_id;
  prefix:=case related.content_type when 'journey' then '/journeys/' when 'photoExpedition' then '/photo-expeditions/' else '/destinations/' end;
  if related.path is null or related.path is distinct from prefix||(published_payload->>'slug') or related.path !~ '^/[a-z-]+/[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'destination_reference_verification_required'; end if;
  for asset in select distinct value #>> '{}' from jsonb_path_query(published_payload,'$.**.assetId') value where jsonb_typeof(value)='string' order by 1 loop
   select * into media from cms.media_objects where website_id=new.website_id and id=asset for share;
   if not found or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'destination_reference_verification_required'; end if;
  end loop;
  if not cms.record_media_available(new.website_id,related.content_type,published_payload) then raise exception 'destination_reference_verification_required'; end if;
 end loop;
 return new;
end $$;
create trigger cms_destination_reference_check before update of published_revision_id on cms.records for each row execute function cms.enforce_destination_publication_references();
revoke all on function cms.enforce_destination_publication_references() from public;
commit;
