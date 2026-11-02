begin;
-- Stop for operator resolution rather than taking ownership of existing URLs.
do $$ begin
 if exists(select 1 from cms.records where path='/languages' or path like '/languages/%')
 or exists(select 1 from cms.page_redirects where source_path='/languages' or source_path like '/languages/%')
 then raise exception 'localized_namespace_occupied'; end if;
end $$;
create or replace function cms.is_custom_page_path(p_path text)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(length(p_path)<=500
  and p_path !~ '[^a-z0-9/-]'
  and p_path ~ '^/[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'
  and split_part(p_path,'/',2) <> all(array['about','admin','api','assets','auth','blog','blogs','brand','cms','concept','conservation-commitment','contact','destinations','documents','enquire','guided-bespoke-safaris','itineraries','journal','journeys','legal','login','logout','languages','mice','photo-expeditions','plan','private-aviation','register','reviews','search','specialists','store','studio','tours']::text[]),false);
$$;
create function cms.get_public_localized_routes(p_site uuid,p_locale text,p_paths jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb:='[]'; target_path text; rec cms.records; delivered jsonb;
begin
 if p_locale is null or p_locale='en' or p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then raise exception 'invalid_localized_language'; end if;
 if p_paths is null or jsonb_typeof(p_paths)<>'array' then raise exception 'invalid_localized_paths'; end if;
 if jsonb_array_length(p_paths)>1000 or exists(select 1 from jsonb_array_elements(p_paths) v where jsonb_typeof(v)<>'string' or length(v #>> '{}')>500 or (v #>> '{}') !~ '^/[a-z0-9/-]*$' or (v #>> '{}') like '%//%')
 or (select count(*) from jsonb_array_elements(p_paths))<>(select count(distinct v) from jsonb_array_elements(p_paths) v) then raise exception 'invalid_localized_paths'; end if;
 for target_path in select value from jsonb_array_elements_text(p_paths) loop
  delivered:=null;
  if cms.is_custom_page_path(target_path) then
   select * into rec from cms.records where website_id=p_site and locale=p_locale and content_type='page' and cms.records.path=target_path and published_revision_id is not null;
   if found then delivered:=cms.get_public_page(p_site,target_path,p_locale); end if;
  end if;
  if delivered is null then result:=result||jsonb_build_array(jsonb_build_object('path',target_path,'available',false));
  else result:=result||jsonb_build_array(jsonb_build_object('path',target_path,'available',true,'recordId',rec.id,'revisionId',rec.published_revision_id));end if;
 end loop;
 return jsonb_build_object('websiteId',p_site,'locale',p_locale,'routes',result);
end $$;
revoke all on function cms.get_public_localized_routes(uuid,text,jsonb) from public;
grant execute on function cms.get_public_localized_routes(uuid,text,jsonb) to anon,authenticated;
commit;
