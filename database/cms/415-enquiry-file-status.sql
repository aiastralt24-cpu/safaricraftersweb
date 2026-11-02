begin;
-- Credential-scoped recovery remains readable after expiry/cancellation. This
-- grants no transfer, submission or download permission and returns no secrets.
create function cms.get_enquiry_file_status(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_session uuid,p_token_hash text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('session',cms.enquiry_file_session_response(s),'files',coalesce((select jsonb_agg(cms.enquiry_file_response(u,s) order by u.id) from cms.enquiry_files u where u.website_id=s.website_id and u.session_id=s.id),'[]'::jsonb))
 from cms.enquiry_file_sessions s where s.website_id=p_site and s.form_id=p_form and s.form_revision_id=p_revision and s.request_key=p_request and s.id=p_session and s.token_hash=p_token_hash;
$$;
revoke all on function cms.get_enquiry_file_status(uuid,uuid,uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function cms.get_enquiry_file_status(uuid,uuid,uuid,uuid,uuid,text) to service_role;
commit;
