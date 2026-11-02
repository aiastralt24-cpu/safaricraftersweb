begin;
create function cms.list_notification_route_history(p_site uuid,p_route uuid,p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare cursor_time timestamptz;items jsonb;
begin
 if not(cms.can_lead(p_site,'configure') or cms.can_lead(p_site,'approve')) then raise exception 'forbidden' using errcode='42501';end if;
 if not exists(select 1 from cms.notification_email_routes where website_id=p_site and id=p_route) then return null;end if;
 if p_after is not null then
  select created_at into cursor_time from cms.notification_route_history where website_id=p_site and route_id=p_route and revision_id=p_after;
  if not found then raise exception 'invalid_notification_history_cursor';end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('revisionId',h.revision_id,'actorId',h.actor_id,'action',h.action,'createdAt',h.created_at,'snapshot',h.snapshot) order by h.created_at desc,h.revision_id desc),'[]') into items
 from(select * from cms.notification_route_history where website_id=p_site and route_id=p_route and(p_after is null or(created_at,revision_id)<(cursor_time,p_after)) order by created_at desc,revision_id desc limit 30)h;
 return jsonb_build_object('websiteId',p_site,'routeId',p_route,'after',p_after,'items',items);
end $$;
revoke all on function cms.list_notification_route_history(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.list_notification_route_history(uuid,uuid,uuid) to authenticated;
commit;
