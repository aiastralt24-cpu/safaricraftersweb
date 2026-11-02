begin;
create or replace function cms.get_mfa_policy(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare policy cms.mfa_policies;
begin
 if not exists(select 1 from cms.memberships where website_id=p_site and user_id=auth.uid() and revoked_at is null and (expires_at is null or expires_at>now())) then raise exception 'forbidden' using errcode='42501';end if;
 select * into policy from cms.mfa_policies where website_id=p_site;
 return jsonb_build_object('websiteId',p_site,'required',coalesce(policy.require_privileged,false),'version',coalesce(policy.version,0),'verified',cms.has_second_factor(),'canManage',cms.can_manage_access(p_site));
end $$;
commit;
