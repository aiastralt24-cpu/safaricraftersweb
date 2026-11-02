begin;
create function cms.list_schedule_monitor(p_site uuid,p_after uuid default null,p_state text default 'attention',p_operation text default 'all',p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; more boolean; cursor_time timestamptz;
begin
 if p_limit is null or p_limit not between 1 and 20 or p_state is null or p_state not in ('attention','pending','running','blocked','published','unpublished','cancelled','all') or p_operation is null or p_operation not in ('all','publish','unpublish') then raise exception 'invalid_monitor_query';end if;
 if p_after is not null then
  select s.run_at into cursor_time from cms.publication_schedules s join cms.records r on r.website_id=s.website_id and r.id=s.record_id
  where s.website_id=p_site and s.id=p_after and cms.can(p_site,'view',r.content_type,r.id);
  if cursor_time is null then raise exception 'invalid_monitor_cursor';end if;
 end if;
 with visible as materialized (
  select s.*,r.internal_title,r.content_type,r.locale from cms.publication_schedules s
  join cms.records r on r.website_id=s.website_id and r.id=s.record_id
  where s.website_id=p_site and cms.can(p_site,'view',r.content_type,r.id)
   and (p_after is null or (s.run_at,s.id)>(cursor_time,p_after))
   and (p_operation='all' or s.operation=p_operation)
   and (p_state='all' or s.status=p_state or (p_state='attention' and s.status in ('pending','running','blocked')))
  order by s.run_at,s.id limit p_limit+1
 ) select coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'record',v.record_id,'revision',v.revision_id,
  'title',v.internal_title,'type',v.content_type,'locale',v.locale,'operation',v.operation,'runAt',v.run_at,'status',v.status,
  'attempts',v.attempts,'errorCode',v.error_code) order by v.run_at,v.id)
  from (select * from visible order by run_at,id limit p_limit) v),'[]'::jsonb),(select count(*)>p_limit from visible) into items,more;
 return jsonb_build_object('websiteId',p_site,'state',p_state,'operation',p_operation,'items',items,'nextCursor',case when more then items->-1->>'id' else null end);
end $$;
revoke all on function cms.list_schedule_monitor(uuid,uuid,text,text,integer) from public;
grant execute on function cms.list_schedule_monitor(uuid,uuid,text,text,integer) to authenticated;
commit;
