begin;
-- A privileged server read. The HTTP projection removes private form configuration.
create function cms.get_career_application_form(p_site uuid,p_record uuid,p_revision uuid,p_form uuid,p_form_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;page jsonb;payload jsonb;form jsonb;checked_at timestamptz:=statement_timestamp();
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='career' and locale='en' and published_revision_id=p_revision;
 if not found then return null;end if;
 page:=cms.get_public_career(p_site,rec.path,'en');payload:=page->'payload';
 if page is null or payload#>>'{application,mode}' is distinct from 'form'
 or page#>>'{applicationForm,formId}' is distinct from p_form::text
 or page#>>'{applicationForm,revisionId}' is distinct from p_form_revision::text then return null;end if;
 if payload->>'status' is distinct from 'open' or payload->>'opensAt' is null or payload->>'closesAt' is null
 or (payload->>'opensAt'<>'' and checked_at<(payload->>'opensAt')::timestamptz)
 or (payload->>'closesAt'<>'' and checked_at>=(payload->>'closesAt')::timestamptz) then return null;end if;
 form:=cms.get_published_form(p_site,p_form);
 if form is null or form->>'revisionId' is distinct from p_form_revision::text or form->>'locale' is distinct from 'en' then return null;end if;
 return jsonb_build_object('career',page,'form',form);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then return null;
end $$;
revoke all on function cms.get_career_application_form(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_career_application_form(uuid,uuid,uuid,uuid,uuid) to service_role;
commit;
