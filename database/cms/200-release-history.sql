begin;
create index cms_release_history on cms.publication_releases(website_id,created_at desc,id desc);
create function cms.list_release_history(p_site uuid,p_before uuid default null,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare boundary cms.publication_releases; result jsonb;
begin
 if p_limit is null or p_limit not between 1 and 50 then raise exception 'invalid_page_size'; end if;
 if p_before is not null then
  select * into boundary from cms.publication_releases where website_id=p_site and id=p_before;
  if not found or cms.get_release_delivery_status(p_site,boundary.request_id) is null then raise exception 'invalid_release_cursor'; end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('release',r.id,'request',r.request_id,'createdAt',r.created_at,'status',case when r.cancelled_at is not null then 'cancelled' else 'committed' end,'recordCount',jsonb_array_length(r.items)) order by r.created_at desc,r.id desc),'[]'::jsonb)
 into result from (
  select rel.* from cms.publication_releases rel
  where rel.website_id=p_site and (rel.result is not null or rel.cancelled_at is not null)
   and (p_before is null or (rel.created_at,rel.id)<(boundary.created_at,boundary.id))
   and not exists(select 1 from jsonb_array_elements(rel.items) item where not exists(
    select 1 from cms.records rec where rec.website_id=p_site and rec.id=(item->>'record')::uuid and cms.can(p_site,'view',rec.content_type,rec.id)))
  order by rel.created_at desc,rel.id desc limit p_limit
 ) r;
 return result;
end $$;
revoke all on function cms.list_release_history(uuid,uuid,integer) from public;
grant execute on function cms.list_release_history(uuid,uuid,integer) to authenticated;
commit;
