begin;
create function cms.list_lead_attention(p_site uuid,p_after uuid default null,p_filter text default 'attention',p_limit integer default 20)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare items jsonb; more boolean;
begin
 if p_limit is null or p_limit not between 1 and 20 or p_filter is null or p_filter not in ('attention','unassigned','overdue') then raise exception 'invalid_attention_filter';end if;
 with visible as materialized (
  select l.* from cms.leads l where website_id=p_site and (p_after is null or id>p_after)
   and status not in ('won','lost','invalid')
   and ((p_filter in ('attention','unassigned') and assigned_to is null) or (p_filter in ('attention','overdue') and next_follow_up<now()))
  order by id limit p_limit+1
 ) select coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'status',v.status,'priority',v.priority,'version',v.version,
  'createdAt',v.created_at,'nextFollowUp',v.next_follow_up,'unassigned',v.assigned_to is null,'overdue',coalesce(v.next_follow_up<now(),false)) order by v.id)
  from (select * from visible order by id limit p_limit) v),'[]'::jsonb),(select count(*)>p_limit from visible) into items,more;
 return jsonb_build_object('websiteId',p_site,'filter',p_filter,'asOf',now(),'items',items,'nextCursor',case when more then items->-1->>'id' else null end);
end $$;
revoke all on function cms.list_lead_attention(uuid,uuid,text,integer) from public;
grant execute on function cms.list_lead_attention(uuid,uuid,text,integer) to authenticated;
commit;
