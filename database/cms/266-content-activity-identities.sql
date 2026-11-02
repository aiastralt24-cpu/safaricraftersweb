begin;
create or replace function cms.list_content_activity(p_site uuid,p_before bigint default null,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; more boolean;
begin
 if p_limit is null or p_limit not between 1 and 20 or p_before<=0 then raise exception 'invalid_page_size';end if;
 if not cms.can(p_site,'configure') then
  return jsonb_build_object('websiteId',p_site,'available',false,'actorLabelsAvailable',false,'items','[]'::jsonb,'nextCursor',null);
 end if;
 with visible as materialized (
  select a.id,a.actor_id,a.action,a.record_id,a.revision_id,a.created_at,r.internal_title,r.content_type,r.locale
  from cms.audit_events a join cms.records r on r.website_id=a.website_id and r.id=a.record_id
  where a.website_id=p_site and (p_before is null or a.id<p_before) and cms.can(p_site,'view',r.content_type,r.id)
  order by a.id desc limit p_limit+1
 ) select coalesce((select jsonb_agg(jsonb_build_object('id',v.id::text,'actorId',v.actor_id,'actorLabel',case when cms.can_manage_access(p_site) then (select u.email from auth.users u where u.id=v.actor_id and exists(select 1 from cms.memberships m where m.website_id=p_site and m.user_id=u.id)) else null end,'action',v.action,
  'record',v.record_id,'revision',v.revision_id,'createdAt',v.created_at,'title',v.internal_title,'type',v.content_type,'locale',v.locale) order by v.id desc)
  from (select * from visible order by id desc limit p_limit) v),'[]'::jsonb),
  (select count(*)>p_limit from visible) into items,more;
 return jsonb_build_object('websiteId',p_site,'available',true,'actorLabelsAvailable',cms.can_manage_access(p_site),'items',items,'nextCursor',case when more then items->-1->>'id' else null end);
end $$;
revoke all on function cms.list_content_activity(uuid,bigint,integer) from public;
grant execute on function cms.list_content_activity(uuid,bigint,integer) to authenticated;
commit;
