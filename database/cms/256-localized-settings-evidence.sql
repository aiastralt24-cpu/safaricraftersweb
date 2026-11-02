begin;
create function cms.get_localized_settings_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; paths jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and current_revision_id=p_revision;
 if not found or rec.content_type<>'settings' or rec.locale='en' or rec.path is not null then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 select coalesce(jsonb_agg(path order by path collate "C"),'[]'::jsonb) into paths from (
  select distinct cms.localized_publication_link_path(value#>>'{}') path from (
   select value from jsonb_path_query(payload,'$.**.href') value union all select value from jsonb_path_query(payload,'$.**.homeHref') value
  ) links where jsonb_typeof(value)='string'
 ) candidates where path is not null;
 return jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',p_revision,'locale',rec.locale,'registry',cms.get_public_localized_routes(p_site,rec.locale,paths));
end $$;
revoke all on function cms.get_localized_settings_evidence(uuid,uuid,uuid) from public;
create or replace function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select value||case when value->>'type'='page' and value->>'locale'<>'en' and cms.is_custom_page_path(value->>'path')
 then jsonb_build_object('localizedEvidence',cms.get_localized_publication_evidence(p_site,p_record,p_revision))
 when value->>'type'='settings' and value->>'locale'<>'en' then jsonb_build_object('localizedSettingsEvidence',cms.get_localized_settings_evidence(p_site,p_record,p_revision)) else '{}'::jsonb end
 from (select cms.get_validation_input_before_localized(p_site,p_record,p_revision) value) source;
$$;
create function cms.get_editor_localized_settings_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not cms.can(p_site,'view','settings',p_record) then raise exception 'forbidden' using errcode='42501';end if;
 return cms.get_localized_settings_evidence(p_site,p_record,p_revision);
end $$;
revoke all on function cms.get_editor_localized_settings_evidence(uuid,uuid,uuid) from public;
grant execute on function cms.get_editor_localized_settings_evidence(uuid,uuid,uuid) to authenticated;
commit;
