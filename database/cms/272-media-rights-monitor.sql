begin;
create function cms.list_media_rights_monitor(p_site uuid,p_after text default null,p_filter text default 'attention',p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; more boolean;
begin
 if p_limit is null or p_limit not between 1 and 20 or p_filter is null or p_filter not in ('attention','expired','expiring','pending','revoked') or (p_after is not null and p_after !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$') then raise exception 'invalid_media_monitor_query';end if;
 with assessed as materialized (
 select m.id,m.title,m.mime_type,m.revision,m.rights_status,m.rights_expires_at,
  coalesce(m.rights_expires_at<=now(),false) expired,
  coalesce(m.rights_expires_at>now() and m.rights_expires_at<=now()+interval '30 days',false) expiring
 from cms.media_objects m where m.website_id=p_site and m.archived_at is null and cms.can(p_site,'view','document') and (p_after is null or m.id collate "C">p_after collate "C")
 ), visible as materialized (
 select * from assessed where (p_filter='attention' and (expired or expiring or rights_status<>'approved')) or (p_filter='expired' and expired) or (p_filter='expiring' and expiring) or rights_status=p_filter
 order by id collate "C" limit p_limit+1
 ) select coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'title',v.title,'mime',v.mime_type,'revision',v.revision,'rightsStatus',v.rights_status,'expiresAt',v.rights_expires_at,'expired',v.expired,'expiring',v.expiring) order by v.id collate "C")
 from (select * from visible order by id collate "C" limit p_limit) v),'[]'::jsonb),(select count(*)>p_limit from visible) into items,more;
 return jsonb_build_object('websiteId',p_site,'filter',p_filter,'checkedAt',now(),'items',items,'nextCursor',case when more then items->-1->>'id' else null end);
end $$;
revoke all on function cms.list_media_rights_monitor(uuid,text,text,integer) from public;
grant execute on function cms.list_media_rights_monitor(uuid,text,text,integer) to authenticated;
commit;
