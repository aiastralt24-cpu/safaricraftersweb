begin;
-- Private, saved-revision evidence. This does not relax release triggers.
create function cms.localized_publication_link_path(p_href text)
returns text language plpgsql immutable set search_path='' as $$
declare candidate text:=p_href;
begin
 if candidate is null then return null; end if;
 if candidate ~* '^https://' then
  if candidate !~* '^https://(www\.)?safaricrafters\.com\.?(:443)?([/?#]|$)' then return null; end if;
  candidate:=regexp_replace(candidate,'^https://(www\.)?safaricrafters\.com\.?(:443)?','','i');
  if candidate='' or left(candidate,1) in ('?','#') then candidate:='/'||candidate; end if;
 end if;
 if left(candidate,1)<>'/' then return null; end if;
 return split_part(split_part(candidate,'?',1),'#',1);
end $$;
create function cms.get_localized_publication_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; paths jsonb; registry jsonb; entries jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and current_revision_id=p_revision;
 if not found or rec.content_type<>'page' or rec.locale='en' or not cms.is_custom_page_path(rec.path) then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 select jsonb_agg(path order by path collate "C") into paths from (
  select rec.path as path union select cms.localized_publication_link_path(value#>>'{}') from jsonb_path_query(payload,'$.**.href') value where jsonb_typeof(value)='string'
 ) candidates where path is not null;
 registry:=cms.get_public_localized_routes(p_site,rec.locale,paths);
 -- A page may link to its own draft path; content/anchor checks still inspect this exact revision.
 select jsonb_agg(case when value->>'path'=rec.path then jsonb_build_object('path',rec.path,'available',true,'recordId',rec.id,'revisionId',p_revision) else value end order by ordinality) into entries from jsonb_array_elements(registry->'routes') with ordinality;
 registry:=jsonb_set(registry,'{routes}',entries);
 return jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',p_revision,'locale',rec.locale,'path',rec.path,'registry',registry);
end $$;
revoke all on function cms.localized_publication_link_path(text),cms.get_localized_publication_evidence(uuid,uuid,uuid) from public;
-- Preserve the established input implementation and grants behind a private wrapper.
alter function cms.get_validation_input(uuid,uuid,uuid) rename to get_validation_input_before_localized;
revoke all on function cms.get_validation_input_before_localized(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select value||case when value->>'type'='page' and value->>'locale'<>'en' and cms.is_custom_page_path(value->>'path')
 then jsonb_build_object('localizedEvidence',cms.get_localized_publication_evidence(p_site,p_record,p_revision)) else '{}'::jsonb end
 from (select cms.get_validation_input_before_localized(p_site,p_record,p_revision) value) source;
$$;
revoke all on function cms.get_validation_input(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_validation_input(uuid,uuid,uuid) to service_role;
commit;
