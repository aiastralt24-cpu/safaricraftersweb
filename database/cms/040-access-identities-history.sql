begin;
create or replace function cms.list_access_members(p_site uuid,p_after uuid default null,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not cms.can_manage_access(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'invalid_page_size'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('userId',m.user_id,'email',u.email,'roleId',m.role_id,
  'expiresAt',m.expires_at,'revokedAt',m.revoked_at,'version',m.version,
  'status',case when m.revoked_at is not null then 'revoked' when m.expires_at<=now() then 'expired' else 'active' end) order by m.user_id)
  from (select * from cms.memberships where website_id=p_site and (p_after is null or user_id>p_after) order by user_id limit p_limit) m
  join auth.users u on u.id=m.user_id),'[]'::jsonb);
end $$;
create function cms.list_access_history(p_site uuid,p_before bigint default null,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not cms.can_manage_access(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_limit is null or p_limit<1 or p_limit>100 or p_before<=0 then raise exception 'invalid_page_size'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',a.id::text,'actorId',a.actor_id,'action',a.action,'createdAt',a.created_at,'details',a.details) order by a.id desc)
  from (select * from cms.audit_events where website_id=p_site and action in ('membership.updated','role.created','role.updated')
   and (p_before is null or id<p_before) order by id desc limit p_limit) a),'[]'::jsonb);
end $$;
revoke all on function cms.list_access_history(uuid,bigint,integer) from public;
grant execute on function cms.list_access_history(uuid,bigint,integer) to authenticated;
commit;
