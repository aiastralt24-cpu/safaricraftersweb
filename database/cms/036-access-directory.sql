-- Read-only access administration. Bootstrap grants remain an operator responsibility.
begin;
create function cms.can_manage_access(p_site uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists (
  select 1 from cms.memberships m join cms.permissions p
   on p.website_id=m.website_id and p.role_id=m.role_id
  where m.website_id=p_site and m.user_id=auth.uid() and m.revoked_at is null
   and (m.expires_at is null or m.expires_at>now())
   and p.action='configure' and p.content_type='access' and p.record_id is null
 );
$$;
-- Generic content configuration does not imply visibility of access rules.
drop policy role_read on cms.roles;
drop policy permission_read on cms.permissions;
create policy role_read on cms.roles for select to authenticated using(cms.can_manage_access(website_id));
create policy permission_read on cms.permissions for select to authenticated using(cms.can_manage_access(website_id));

create function cms.list_access_roles(p_site uuid,p_after uuid default null,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not cms.can_manage_access(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'invalid_page_size'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,
  'permissions',coalesce((select jsonb_agg(jsonb_build_object('action',p.action,'contentType',p.content_type,'recordId',p.record_id) order by p.id)
   from cms.permissions p where p.website_id=p_site and p.role_id=r.id),'[]'::jsonb)) order by r.id)
  from (select id,name from cms.roles where website_id=p_site and (p_after is null or id>p_after) order by id limit p_limit) r),'[]'::jsonb);
end $$;

create function cms.list_access_members(p_site uuid,p_after uuid default null,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not cms.can_manage_access(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'invalid_page_size'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('userId',m.user_id,'roleId',m.role_id,
  'expiresAt',m.expires_at,'revokedAt',m.revoked_at,
  'status',case when m.revoked_at is not null then 'revoked' when m.expires_at<=now() then 'expired' else 'active' end) order by m.user_id)
  from (select * from cms.memberships where website_id=p_site and (p_after is null or user_id>p_after) order by user_id limit p_limit) m),'[]'::jsonb);
end $$;
revoke all on function cms.can_manage_access(uuid),cms.list_access_roles(uuid,uuid,integer),cms.list_access_members(uuid,uuid,integer) from public;
grant execute on function cms.can_manage_access(uuid),cms.list_access_roles(uuid,uuid,integer),cms.list_access_members(uuid,uuid,integer) to authenticated;
commit;
