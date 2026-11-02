begin;
create function cms.get_editor_localized_page_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare evidence jsonb;
begin
 if not cms.can(p_site,'view','page',p_record) then raise exception 'forbidden' using errcode='42501';end if;
 evidence:=cms.get_localized_publication_evidence(p_site,p_record,p_revision);
 if evidence is null then return null;end if;
 return jsonb_build_object('localizedEvidence',evidence,'downloadStatus',cms.get_download_reference_status(p_site,p_record,p_revision));
end $$;
revoke all on function cms.get_editor_localized_page_evidence(uuid,uuid,uuid) from public;
grant execute on function cms.get_editor_localized_page_evidence(uuid,uuid,uuid) to authenticated;
commit;
