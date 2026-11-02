begin;
-- Preliminary evidence only; acceptance must recheck and consume the same files
-- atomically. This does not create leads or grant download access.
create function cms.get_enquiry_file_evidence(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_session uuid,p_token_hash text,p_files jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s cms.enquiry_file_sessions;selected jsonb;u cms.enquiry_files;result jsonb:='[]';seen uuid[]:='{}';fields text[]:='{}';target uuid;
begin
 s:=cms.lock_active_enquiry_file_session(p_site,p_session);
 if s.form_id is distinct from p_form or s.form_revision_id is distinct from p_revision or s.request_key is distinct from p_request or s.token_hash is distinct from p_token_hash then raise exception 'upload_session_unavailable';end if;
 if p_files is null or jsonb_typeof(p_files)<>'array' or jsonb_array_length(p_files)>50 or octet_length(p_files::text)>20000 then raise exception 'invalid_attachment_selection';end if;
 for selected in select value from jsonb_array_elements(p_files) loop
  if jsonb_typeof(selected)<>'object' or (select count(*) from jsonb_object_keys(selected))<>2 or not(selected ?& array['fieldId','uploadId'])
   or jsonb_typeof(selected->'fieldId') is distinct from 'string' or coalesce(selected->>'fieldId','') !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$'
   or jsonb_typeof(selected->'uploadId') is distinct from 'string' or coalesce(selected->>'uploadId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then raise exception 'invalid_attachment_selection';end if;
  target:=(selected->>'uploadId')::uuid;
  if target=any(seen) or selected->>'fieldId'=any(fields) then raise exception 'invalid_attachment_selection';end if;
  seen:=array_append(seen,target);fields:=array_append(fields,selected->>'fieldId');
  select * into u from cms.enquiry_files where website_id=p_site and session_id=p_session and id=target and field_id=selected->>'fieldId';
  -- Return no evidence for missing, foreign or unchecked files. Form validation
  -- reports the corresponding field; no ownership details leak to the caller.
  if found and u.state='ready' and u.result is not null and u.bytes<=u.max_bytes and (u.result->>'bytes')::bigint<=u.max_bytes then
   result:=result||jsonb_build_array(jsonb_build_object('uploadId',u.id,'fieldId',u.field_id,'mimeType',u.mime,'byteSize',u.bytes,'available',true));
  end if;
 end loop;
 return result;
end $$;
revoke all on function cms.get_enquiry_file_evidence(uuid,uuid,uuid,uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function cms.get_enquiry_file_evidence(uuid,uuid,uuid,uuid,uuid,text,jsonb) to service_role;
commit;
