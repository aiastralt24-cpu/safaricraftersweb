begin;
-- Keep the original active-session checks for new submissions. Only durable,
-- consumed receipts can supply evidence after expiry or withdrawal.
alter function cms.get_enquiry_file_evidence(uuid,uuid,uuid,uuid,uuid,text,jsonb) rename to get_active_enquiry_file_evidence;
revoke all on function cms.get_active_enquiry_file_evidence(uuid,uuid,uuid,uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
create function cms.get_enquiry_file_evidence(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_session uuid,p_token_hash text,p_files jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s cms.enquiry_file_sessions;a cms.enquiry_attachment_submissions;expected jsonb;
begin
 perform 1 from cms.websites where id=p_site for update;
 select * into s from cms.enquiry_file_sessions where website_id=p_site and id=p_session for update;
 if not found or s.form_id is distinct from p_form or s.form_revision_id is distinct from p_revision or s.request_key is distinct from p_request or s.token_hash is distinct from p_token_hash then raise exception 'upload_session_unavailable';end if;
 if s.state<>'consumed' then
  return cms.get_active_enquiry_file_evidence(p_site,p_form,p_revision,p_request,p_session,p_token_hash,p_files);
 end if;
 select * into a from cms.enquiry_attachment_submissions where website_id=p_site and request_key=p_request and session_id=p_session and form_id=p_form and form_revision_id=p_revision and lead_id is not null;
 if not found then raise exception 'upload_session_unavailable';end if;
 if p_files is null or jsonb_typeof(p_files)<>'array' or jsonb_array_length(p_files)>50 or octet_length(p_files::text)>20000 then raise exception 'invalid_attachment_selection';end if;
 select coalesce(jsonb_agg(jsonb_build_object('fieldId',e->>'fieldId','uploadId',e->>'uploadId')),'[]'::jsonb) into expected from jsonb_array_elements(a.files) e;
 -- Equality as a set plus length preserves order independence without allowing
 -- omitted, additional, duplicated or field-swapped file selections.
 if jsonb_array_length(p_files)<>jsonb_array_length(expected) or not(p_files @> expected and expected @> p_files) then raise exception 'idempotency_key_reused';end if;
 return a.files;
end $$;
revoke all on function cms.get_enquiry_file_evidence(uuid,uuid,uuid,uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function cms.get_enquiry_file_evidence(uuid,uuid,uuid,uuid,uuid,text,jsonb) to service_role;
commit;
