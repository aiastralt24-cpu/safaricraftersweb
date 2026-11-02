begin;
-- Recheck the shared header under transaction locks when a homepage is released.
-- The homepage validation policy remains disabled until the remaining release gates pass.
create function cms.enforce_homepage_header_release()
returns trigger language plpgsql security definer set search_path='' as $$
declare settings cms.records; payload jsonb; roots uuid[]; name text; target text; node jsonb;
begin
 if new.content_type<>'homepage' or new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path and new.content_type is not distinct from old.content_type then return new; end if;
 if new.locale is distinct from 'en' or new.path is distinct from '/' then raise exception 'homepage_header_verification_required'; end if;
 select * into settings from cms.records where website_id=new.website_id and content_type='settings' and locale=new.locale for share;
 if not found or settings.published_revision_id is null then raise exception 'homepage_header_verification_required'; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=settings.id and v.id=settings.published_revision_id;
 if payload#>>'{header,mainMenu,recordId}' is null or payload#>'{header,languageSelector}' is distinct from 'false'::jsonb then raise exception 'homepage_header_verification_required'; end if;
 -- Lock settings media plus the menu/featured graph and its media. Published
 -- pointers and rights cannot change between these checks and transaction commit.
 roots:=array[settings.id]||array(select distinct (v #>> '{}')::uuid from jsonb_path_query(payload,'$.header.**.recordId') v);
 perform cms.lock_settings_dependencies(new.website_id,roots,new.locale,new.id);
 foreach name in array array['mainMenu','utilityMenu','mobileMenu'] loop
  if payload->'header' ? name then
   target:=payload->'header'->name->>'recordId';
   if target is null or not cms.settings_menu_ready(new.website_id,target::uuid,new.locale) then raise exception 'homepage_header_verification_required'; end if;
  end if;
 end loop;
 perform 1 from cms.navigation_public_paths order by path for share;
 for node in select v from jsonb_path_query(payload,'$.header.**.href') v loop
  if jsonb_typeof(node)<>'string' or not cms.navigation_url_available(node #>> '{}') then raise exception 'homepage_header_verification_required'; end if;
 end loop;
 if cms.get_public_header(new.website_id,new.locale) is null then raise exception 'homepage_header_verification_required'; end if;
 return new;
exception when raise_exception or invalid_text_representation then raise exception 'homepage_header_verification_required';
end $$;
revoke all on function cms.enforce_homepage_header_release() from public;
create trigger cms_homepage_header_release before insert or update of published_revision_id,path,locale,content_type on cms.records for each row execute function cms.enforce_homepage_header_release();
commit;
