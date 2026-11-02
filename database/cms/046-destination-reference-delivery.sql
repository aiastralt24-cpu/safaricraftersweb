begin;
-- Service-only evidence from the pinned saved revision; never browser-supplied.
create or replace function cms.get_destination_reference_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb; collection text; target_type text; item jsonb; target uuid; related cms.records; published_payload jsonb; result jsonb:='[]'; route_prefix text;
begin
 select v.payload into payload from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision and r.content_type='destination';
 if not found then return null; end if;
 foreach collection in array array['journeys','expeditions','pairings'] loop
  if jsonb_typeof(payload->collection) is distinct from 'array' then raise exception 'invalid_destination_references'; end if;
  if jsonb_array_length(payload->collection)>100 then raise exception 'invalid_destination_references'; end if;
  target_type:=case collection when 'journeys' then 'journey' when 'expeditions' then 'photoExpedition' else 'destination' end;
  route_prefix:=case collection when 'journeys' then '/journeys/' when 'expeditions' then '/photo-expeditions/' else '/destinations/' end;
  for item in select value from jsonb_array_elements(payload->collection) loop
   if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'recordId') is distinct from 'string' then raise exception 'invalid_destination_references'; end if;
   begin target:=(item->>'recordId')::uuid; exception when invalid_text_representation then raise exception 'invalid_destination_references'; end;
   select * into related from cms.records where website_id=p_site and id=target and content_type=target_type and id<>p_record;
   if not found then result:=result||jsonb_build_array(jsonb_build_object('recordId',target,'type',target_type,'available',false));
   else
    select v.payload into published_payload from cms.revisions v where v.website_id=p_site and v.record_id=related.id and v.id=related.published_revision_id;
    result:=result||jsonb_build_array(jsonb_build_object('recordId',target,'type',target_type,'available',true,'locale',related.locale,'published',coalesce(
     related.published_revision_id is not null and related.path=route_prefix||(published_payload->>'slug')
     and related.path ~ '^/[a-z-]+/[a-z0-9]+(-[a-z0-9]+)*$' and cms.record_media_available(p_site,target_type,published_payload)
     and (target_type<>'destination' or cms.destination_delivery_references(p_site,target,related.locale) is not null),false)));
   end if;
  end loop;
 end loop;
 return result;
end $$;
-- Keep the service-only grants from migration 041. No publication policy is enabled here.
commit;
