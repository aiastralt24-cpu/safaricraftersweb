-- Bind assignments to the permission set reviewed by the administrator.
begin;
drop function cms.update_membership(uuid,uuid,integer,uuid,timestamptz,boolean);
create function cms.update_membership(p_site uuid,p_user uuid,p_expected integer,p_role uuid,p_expires timestamptz,p_revoked boolean,p_expected_role integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare previous cms.memberships; updated cms.memberships; actor uuid:=auth.uid();
begin
 if not cms.can_manage_access(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 -- All access mutations must acquire this website lock before checking current permissions.
 perform 1 from cms.websites where id=p_site for update;
 if not cms.can_manage_access(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 select * into previous from cms.memberships where website_id=p_site and user_id=p_user for update;
 if not found then raise exception 'membership_not_found'; end if;
 if p_expected is distinct from previous.version then raise exception 'membership_conflict' using errcode='40001'; end if;
 if p_revoked is null or not exists(select 1 from cms.roles where website_id=p_site and id=p_role)
  or (p_expires is not null and (not isfinite(p_expires) or p_expires<=now())) then raise exception 'invalid_membership'; end if;
 if p_expected_role is null or p_expected_role is distinct from (select version from cms.roles where website_id=p_site and id=p_role) then raise exception 'role_conflict' using errcode='40001'; end if;
 update cms.memberships set role_id=p_role,expires_at=p_expires,
  revoked_at=case when p_revoked then coalesce(previous.revoked_at,now()) else null end,
  version=version+1 where website_id=p_site and user_id=p_user returning * into updated;
 -- Keep at least one non-expiring administrator; a temporary agency account cannot be the sole recovery path.
 if not exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
  where m.website_id=p_site and m.revoked_at is null and m.expires_at is null
   and p.action='configure' and p.content_type='access' and p.record_id is null)
 then raise exception 'permanent_access_administrator_required'; end if;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,actor,'membership.updated',
  jsonb_build_object('userId',p_user,'reviewedRoleVersion',p_expected_role,'before',jsonb_build_object('roleId',previous.role_id,'expiresAt',previous.expires_at,'revokedAt',previous.revoked_at,'version',previous.version),
   'after',jsonb_build_object('roleId',updated.role_id,'expiresAt',updated.expires_at,'revokedAt',updated.revoked_at,'version',updated.version)));
 return jsonb_build_object('userId',updated.user_id,'roleId',updated.role_id,'expiresAt',updated.expires_at,
  'revokedAt',updated.revoked_at,'version',updated.version,
  'status',case when updated.revoked_at is not null then 'revoked' else 'active' end);
end $$;

revoke all on function cms.update_membership(uuid,uuid,integer,uuid,timestamptz,boolean,integer) from public;
grant execute on function cms.update_membership(uuid,uuid,integer,uuid,timestamptz,boolean,integer) to authenticated;
commit;
