begin;
create function cms.get_public_header(p_site uuid,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare settings jsonb; header jsonb; menus jsonb:='{}'; name text; target text; menu jsonb; featured jsonb;
begin
 settings:=cms.get_public_settings(p_site,p_locale);
 if settings is null then return null; end if;
 header:=settings->'payload'->'header';
 if not header ? 'mainMenu' then return null; end if;
 foreach name in array array['mainMenu','utilityMenu','mobileMenu'] loop
  menu:=null;
  if header ? name then
   target:=header->name->>'recordId';
   if target is null or target !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then return null; end if;
   menu:=cms.get_public_navigation(p_site,target::uuid,p_locale);
   if menu is null then return null; end if;
  end if;
  menus:=menus||jsonb_build_object(name,menu);
 end loop;
 if jsonb_typeof(header->'featuredContent') is distinct from 'array' or jsonb_array_length(header->'featuredContent')>12 then return null; end if;
 featured:=cms.navigation_reference_evidence(p_site,jsonb_build_object('featuredContent',header->'featuredContent'),p_locale);
 if featured is null then return null; end if;
 return jsonb_build_object('settings',settings,'menus',menus,'featured',featured);
end $$;
revoke all on function cms.get_public_header(uuid,text) from public;
grant execute on function cms.get_public_header(uuid,text) to anon,authenticated;
commit;
