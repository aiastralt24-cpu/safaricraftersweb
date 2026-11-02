begin;
-- Availability for a translated shell uses published data, never a newer settings draft.
create function cms.localized_public_shell_ready(p_site uuid,p_locale text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare header jsonb; paths jsonb; registry jsonb;
begin
 if p_locale='en' then return cms.get_public_seo_settings(p_site,p_locale) is not null;end if;
 header:=cms.get_public_header(p_site,p_locale);
 if header is null or jsonb_typeof(header#>'{settings,payload,interfaceText,homeHref}') is distinct from 'string' then return false;end if;
 if exists(select 1 from jsonb_path_query(header,'$.**.available') v where v is distinct from 'true'::jsonb) then return false;end if;
 select coalesce(jsonb_agg(path order by path collate "C"),'[]'::jsonb) into paths from (
  select distinct cms.localized_publication_link_path(value#>>'{}') path from (
   select value from jsonb_path_query(header,'$.**.href') value
   union all select value from jsonb_path_query(header,'$.**.homeHref') value
   union all select value from jsonb_path_query(header,'$.**.path') value
  ) links where jsonb_typeof(value)='string'
 ) candidates where path is not null;
 registry:=cms.get_public_localized_routes(p_site,p_locale,paths);
 return not exists(select 1 from jsonb_array_elements(registry->'routes') v where v->'available' is distinct from 'true'::jsonb);
exception when others then return false;
end $$;
revoke all on function cms.localized_public_shell_ready(uuid,text) from public;
create function cms.get_public_language_variants(p_site uuid,p_record uuid,p_revision uuid,p_locale text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare current_page cms.records; source_id uuid; candidate cms.records; page jsonb; settings jsonb; variants jsonb:='[]'; candidates integer:=0;
begin
 select * into current_page from cms.records where website_id=p_site and id=p_record and locale=p_locale and published_revision_id=p_revision and content_type='page';
 if not found or not cms.is_custom_page_path(current_page.path) or cms.get_public_page(p_site,current_page.path,p_locale) is null then return null;end if;
 select source_record_id into source_id from cms.translations where website_id=p_site and record_id=p_record;
 source_id:=coalesce(source_id,p_record);
 for candidate in select r.* from cms.records r where r.website_id=p_site and r.content_type='page' and r.published_revision_id is not null
  and (r.id=source_id or exists(select 1 from cms.translations t where t.website_id=p_site and t.source_record_id=source_id and t.record_id=r.id))
  order by r.locale collate "C",r.id limit 101 loop
  candidates:=candidates+1;if candidates>100 then return null;end if;
  if not cms.is_custom_page_path(candidate.path) then continue;end if;
  page:=cms.get_public_page(p_site,candidate.path,candidate.locale);
  settings:=cms.get_public_seo_settings(p_site,candidate.locale);
  if page is null or settings is null or not cms.localized_public_shell_ready(p_site,candidate.locale) then continue;end if;
  variants:=variants||jsonb_build_array(jsonb_build_object('recordId',candidate.id,'revisionId',candidate.published_revision_id,'locale',candidate.locale,'path',candidate.path,
   'indexable',coalesce(settings#>>'{seo,indexing}','noindex')='index' and coalesce(page#>>'{payload,seo,indexing}','inherit')<>'noindex',
   'canonical',coalesce(page#>>'{payload,seo,canonical}','')));
 end loop;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'locale',p_locale,'variants',variants);
end $$;
revoke all on function cms.get_public_language_variants(uuid,uuid,uuid,text) from public;
grant execute on function cms.get_public_language_variants(uuid,uuid,uuid,text) to anon,authenticated;
commit;
