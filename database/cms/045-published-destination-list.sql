begin;
create function cms.list_published_destinations(p_site uuid,p_locale text default 'en',p_after uuid default null,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_page_size'; end if;
 select coalesce(jsonb_agg(value order by id),'[]') into result from (
  select r.id,jsonb_build_object('recordId',r.id,'revisionId',v.id,'path',r.path,'modifiedAt',v.created_at,
   'slug',v.payload->>'slug','title',v.payload->>'title','description',v.payload->>'description',
   'continent',v.payload->>'continent','country',v.payload->>'country','region',v.payload->>'region',
   'bestMonths',v.payload->>'bestMonths','image',v.payload->'image',
   'indexing',v.payload->'seo'->>'indexing','sitemap',v.payload->'seo'->>'sitemap') value
  from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
  where r.website_id=p_site and r.locale=p_locale and r.content_type='destination'
   and (p_after is null or r.id>p_after)
   and cms.destination_delivery_references(p_site,r.id,r.locale) is not null
  order by r.id limit p_limit
 ) rows;
 return result;
end $$;
revoke all on function cms.list_published_destinations(uuid,text,uuid,integer) from public;
grant execute on function cms.list_published_destinations(uuid,text,uuid,integer) to anon,authenticated;
commit;
