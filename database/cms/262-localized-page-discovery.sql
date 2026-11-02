begin;
create function cms.list_published_localized_pages(p_site uuid,p_after uuid default null,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_page_size';end if;
 with languages as materialized (
  select distinct locale from cms.records where website_id=p_site and content_type='page' and published_revision_id is not null and locale<>'en'
 ), settings as materialized (
  select locale,cms.get_public_seo_settings(p_site,locale) seo from languages where cms.localized_public_shell_ready(p_site,locale)
 )
 select coalesce(jsonb_agg(value order by id),'[]'::jsonb) into result from (
  select r.id,jsonb_build_object('recordId',r.id,'revisionId',v.id,'locale',r.locale,'path',r.path,'modifiedAt',v.created_at,
   'title',v.payload#>>'{composition,title}',
   'seo',case when v.payload ? 'seo' then cms.project_settings_fields(v.payload->'seo','{"schemaVersion":"scalar","title":"scalar","description":"scalar","canonical":"scalar","indexing":"scalar","following":"scalar","socialTitle":"scalar","socialDescription":"scalar","breadcrumbLabel":"scalar","sitemap":"scalar"}'::jsonb) else null end,
   'seoDefaults',settings.seo->'seo') value
  from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
  join settings on settings.locale=r.locale and settings.seo is not null
  where r.website_id=p_site and r.content_type='page' and r.locale<>'en' and cms.is_custom_page_path(r.path) and (p_after is null or r.id>p_after)
   and cms.get_public_page(p_site,r.path,r.locale) is not null
  order by r.id limit p_limit
 ) rows;
 return jsonb_build_object('websiteId',p_site,'items',result);
end $$;
revoke all on function cms.list_published_localized_pages(uuid,uuid,integer) from public;
grant execute on function cms.list_published_localized_pages(uuid,uuid,integer) to anon,authenticated;
commit;
