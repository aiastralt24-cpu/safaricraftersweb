begin;
-- Fresh authorization before any provider write. The lock is not held across
-- HTTP; confirmation repeats active-session checks after storage completes.
create function cms.get_enquiry_file_transfer(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_session uuid,p_token_hash text,p_upload uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s cms.enquiry_file_sessions;u cms.enquiry_files;
begin
 s:=cms.lock_active_enquiry_file_session(p_site,p_session);
 if s.form_id is distinct from p_form or s.form_revision_id is distinct from p_revision or s.request_key is distinct from p_request or s.token_hash is distinct from p_token_hash then raise exception 'upload_session_unavailable';end if;
 select * into u from cms.enquiry_files where website_id=p_site and session_id=p_session and id=p_upload;
 if not found or u.state='rejected' then raise exception 'upload_unavailable';end if;
 return cms.enquiry_file_response(u,s);
end $$;
revoke all on function cms.get_enquiry_file_transfer(uuid,uuid,uuid,uuid,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function cms.get_enquiry_file_transfer(uuid,uuid,uuid,uuid,uuid,text,uuid) to service_role;
commit;
