begin;
create function cms.list_published_custom_pages(p_site uuid,p_locale text default 'en',p_after uuid default null,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_page_size'; end if;
 if p_locale is distinct from 'en' then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(value order by id),'[]'::jsonb) into result from (
  select r.id,jsonb_build_object('recordId',r.id,'revisionId',v.id,'path',r.path,'modifiedAt',v.created_at,
   'title',v.payload#>>'{composition,title}','seo',case when v.payload ? 'seo' then cms.project_settings_fields(v.payload->'seo','{"schemaVersion":"scalar","title":"scalar","description":"scalar","canonical":"scalar","indexing":"scalar","following":"scalar","socialTitle":"scalar","socialDescription":"scalar","breadcrumbLabel":"scalar","sitemap":"scalar"}'::jsonb) else null end) value
  from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
  where r.website_id=p_site and r.content_type='page' and r.locale=p_locale
   and cms.is_custom_page_path(r.path) and (p_after is null or r.id>p_after)
   and cms.get_public_page(p_site,r.path,p_locale) is not null
  order by r.id limit p_limit
 ) rows;
 return result;
end $$;
revoke all on function cms.list_published_custom_pages(uuid,text,uuid,integer) from public;
grant execute on function cms.list_published_custom_pages(uuid,text,uuid,integer) to anon,authenticated;
commit;
