begin;
-- Walk the published destination graph with explicit limits and cycle detection.
-- Returns only direct reference descriptors; null means delivery is unavailable.
create function cms.destination_delivery_references(p_site uuid,p_record uuid,p_locale text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare pending uuid[]:=array[p_record]; visited uuid[]:='{}'; current_id uuid; current_record cms.records; payload jsonb;
 collection text; item jsonb; target uuid; target_type text; target_record cms.records; target_payload jsonb; prefix text;
 direct jsonb:='[]'; local_ids uuid[]; edges integer:=0;
begin
 while cardinality(pending)>0 loop
  current_id:=pending[1];pending:=pending[2:];
  if current_id=any(visited) then continue; end if;
  if cardinality(visited)>=500 then return null; end if;
  visited:=array_append(visited,current_id);
  select * into current_record from cms.records where website_id=p_site and id=current_id and content_type='destination' and locale=p_locale and published_revision_id is not null;
  if not found then return null; end if;
  select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=current_id and v.id=current_record.published_revision_id;
  if current_record.path is null or current_record.path is distinct from '/destinations/'||(payload->>'slug') or current_record.path !~ '^/destinations/[a-z0-9]+(-[a-z0-9]+)*$'
   or payload ? 'video' or not cms.record_media_available(p_site,'destination',payload) then return null; end if;
  local_ids:='{}';
  foreach collection in array array['journeys','expeditions','pairings'] loop
   if jsonb_typeof(payload->collection) is distinct from 'array' then return null; end if;
   if jsonb_array_length(payload->collection)>(case when collection='pairings' then 50 else 100 end) then return null; end if;
   target_type:=case collection when 'journeys' then 'journey' when 'expeditions' then 'photoExpedition' else 'destination' end;
   prefix:=case collection when 'journeys' then '/journeys/' when 'expeditions' then '/photo-expeditions/' else '/destinations/' end;
   for item in select value from jsonb_array_elements(payload->collection) loop
    edges:=edges+1;if edges>2000 then return null; end if;
    if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'recordId') is distinct from 'string' then return null; end if;
    begin target:=(item->>'recordId')::uuid; exception when invalid_text_representation then return null; end;
    if target=current_id or target=any(local_ids) then return null; end if;
    local_ids:=array_append(local_ids,target);
    select * into target_record from cms.records where website_id=p_site and id=target and content_type=target_type and locale=p_locale and published_revision_id is not null;
    if not found then return null; end if;
    select v.payload into target_payload from cms.revisions v where v.website_id=p_site and v.record_id=target and v.id=target_record.published_revision_id;
    if target_record.path is null or target_record.path is distinct from prefix||(target_payload->>'slug') or target_record.path !~ '^/[a-z-]+/[a-z0-9]+(-[a-z0-9]+)*$'
     or jsonb_typeof(target_payload->'title') is distinct from 'string' or length(btrim(target_payload->>'title'))=0
     or not cms.record_media_available(p_site,target_type,target_payload) then return null; end if;
    if current_id=p_record then direct:=direct||jsonb_build_array(jsonb_build_object('recordId',target,'type',target_type,'title',target_payload->>'title','path',target_record.path,'locale',target_record.locale,'publishedRevisionId',target_record.published_revision_id)); end if;
    if target_type='destination' and not target=any(visited) then pending:=array_append(pending,target); end if;
   end loop;
  end loop;
 end loop;
 return direct;
end $$;
create function cms.get_public_destination(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; safe_payload jsonb; refs jsonb;
begin
 select * into rec from cms.records where website_id=p_site and content_type='destination' and path=p_path and locale=p_locale and published_revision_id is not null;
 if not found then return null; end if;
 refs:=cms.destination_delivery_references(p_site,rec.id,p_locale);if refs is null then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 select jsonb_object_agg(key,value) into safe_payload from jsonb_each(payload) where key=any(array['schemaVersion','slug','title','category','continent','country','parentRegion','status','bestFor','planningNote','region','bestMonths','wildlife','photography','description','homepageCaption','homepageMeta','intro','image','heroImage','gallery','highlights','journeys','expeditions','habitat','idealStay','gateway','access','safariRhythm','fieldIntelligence','pairings','faqs','seo','sources','editorial']);
 return jsonb_build_object('page',jsonb_build_object('recordId',rec.id,'revisionId',rec.published_revision_id,'type','destination','payload',safe_payload),'references',refs);
end $$;
revoke all on function cms.destination_delivery_references(uuid,uuid,text),cms.get_public_destination(uuid,text,text) from public;
grant execute on function cms.get_public_destination(uuid,text,text) to anon,authenticated;
commit;
