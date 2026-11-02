begin;
create function cms.list_scheduled_releases(p_site uuid,p_before uuid default null,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare boundary cms.release_schedules; result jsonb;
begin
 if p_limit is null or p_limit not between 1 and 50 then raise exception 'invalid_page_size'; end if;
 if p_before is not null then
  select * into boundary from cms.release_schedules where website_id=p_site and id=p_before;
  if not found or exists(select 1 from jsonb_array_elements(boundary.items) item where not exists(select 1 from cms.records rec where rec.website_id=p_site and rec.id=(item->>'record')::uuid and cms.can(p_site,'view',rec.content_type,rec.id))) then raise exception 'invalid_release_cursor'; end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'site',s.website_id,'request',s.request_id,'items',s.items,'runAt',s.run_at,'status',s.status,'attempts',s.attempts,'errorCode',s.error_code,'createdAt',s.created_at) order by s.created_at desc,s.id desc),'[]') into result from (
  select job.* from cms.release_schedules job where website_id=p_site and (p_before is null or (job.created_at,job.id)<(boundary.created_at,boundary.id))
   and not exists(select 1 from jsonb_array_elements(job.items) item where not exists(select 1 from cms.records rec where rec.website_id=p_site and rec.id=(item->>'record')::uuid and cms.can(p_site,'view',rec.content_type,rec.id)))
  order by created_at desc,id desc limit p_limit
 ) s;
 return result;
end $$;
revoke all on function cms.list_scheduled_releases(uuid,uuid,integer) from public;
grant execute on function cms.list_scheduled_releases(uuid,uuid,integer) to authenticated;
commit;
