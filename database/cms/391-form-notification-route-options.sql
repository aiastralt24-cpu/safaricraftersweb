begin;
create function cms.list_form_notification_routes(p_site uuid,p_form uuid default null,p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb;
begin
 if p_form is null then
  if not cms.can(p_site,'create','form') then raise exception 'forbidden' using errcode='42501';end if;
 else
  if not cms.can(p_site,'view','form',p_form) or not cms.can(p_site,'edit','form',p_form)
   or not exists(select 1 from cms.records where website_id=p_site and id=p_form and content_type='form')
  then raise exception 'forbidden' using errcode='42501';end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('routeId',r.id,'revisionId',r.revision_id,'label',r.label) order by r.id),'[]') into items
 from(select id,revision_id,label from cms.notification_email_routes where website_id=p_site and enabled and approved_at is not null and approved_by is not null and (p_after is null or id>p_after) order by id limit 50)r;
 return jsonb_build_object('websiteId',p_site,'formId',p_form,'after',p_after,'items',items);
end $$;
revoke all on function cms.list_form_notification_routes(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function cms.list_form_notification_routes(uuid,uuid,uuid) to authenticated;
commit;
