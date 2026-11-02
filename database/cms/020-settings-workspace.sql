begin;
create function cms.get_settings_workspace(p_site uuid,p_locale text default 'en')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare target uuid;
begin
 if p_locale is null or p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then raise exception 'invalid_locale'; end if;
 if not exists(select 1 from cms.websites where id=p_site) then return null; end if;
 select id into target from cms.records where website_id=p_site and content_type='settings' and locale=p_locale;
 return jsonb_build_object('record',case when target is null then null else cms.get_editor_record(p_site,target) end,
  'canCreate',cms.can(p_site,'create','settings'),'canConfigure',cms.can(p_site,'configure','settings',target));
end $$;
revoke all on function cms.get_settings_workspace(uuid,text) from public;
grant execute on function cms.get_settings_workspace(uuid,text) to authenticated;
commit;
