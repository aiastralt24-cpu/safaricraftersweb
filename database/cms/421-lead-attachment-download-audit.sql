begin;
-- This records authorization to release verified bytes, not proof that the
-- browser completed a download. The actor is always the authenticated caller.
create function cms.audit_lead_attachment_download(p_site uuid,p_lead uuid,p_upload uuid,p_sha256 text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare value jsonb;details jsonb;
begin
 perform 1 from cms.websites where id=p_site for update;
 value:=cms.get_lead_attachment_download(p_site,p_lead,p_upload);
 if value is null or p_sha256 is null or value->>'sha256' is distinct from p_sha256 then raise exception 'attachment_unavailable' using errcode='42501';end if;
 details:=jsonb_build_object('leadId',p_lead,'uploadId',p_upload,'mime',value->>'mime','bytes',(value->>'bytes')::bigint,'sha256',p_sha256);
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'lead.attachment_download_authorized',details);
 insert into cms.lead_events(website_id,lead_id,actor_id,action,details) values(p_site,p_lead,auth.uid(),'attachment_download_authorized',details);
 return value;
end $$;
revoke all on function cms.audit_lead_attachment_download(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function cms.audit_lead_attachment_download(uuid,uuid,uuid,text) to authenticated;
commit;
