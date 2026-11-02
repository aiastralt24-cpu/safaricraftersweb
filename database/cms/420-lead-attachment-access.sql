begin;
create function cms.list_lead_attachments(p_site uuid,p_lead uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not cms.can_lead(p_site,'view',p_lead) then return null;end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('uploadId',a.upload_id,'fieldId',a.field_id,'filename',a.snapshot->>'filename','mime',a.snapshot->'inspection'->>'mime','bytes',(a.snapshot->'inspection'->>'bytes')::bigint,'canDownload',cms.can_lead(p_site,'export',p_lead)) order by a.field_id),'[]'::jsonb) from cms.lead_attachments a where a.website_id=p_site and a.lead_id=p_lead);
end $$;
create function cms.get_lead_attachment_download(p_site uuid,p_lead uuid,p_upload uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 -- Download is an export of applicant information, not broad content access.
 if not cms.can_lead(p_site,'view',p_lead) or not cms.can_lead(p_site,'export',p_lead) then return null;end if;
 return (select jsonb_build_object('site',p_site,'lead',p_lead,'upload',a.upload_id,'request',l.request_key,'key',a.snapshot->>'storageKey','filename',a.snapshot->>'filename','mime',a.snapshot->'inspection'->>'mime','bytes',(a.snapshot->'inspection'->>'bytes')::bigint,'sha256',a.snapshot->'inspection'->>'sha256')
 from cms.lead_attachments a join cms.leads l on l.website_id=a.website_id and l.id=a.lead_id
 join cms.enquiry_files u on u.website_id=a.website_id and u.id=a.upload_id
 where a.website_id=p_site and a.lead_id=p_lead and a.upload_id=p_upload and u.state='ready' and u.result=a.snapshot->'inspection');
end $$;
revoke all on function cms.list_lead_attachments(uuid,uuid),cms.get_lead_attachment_download(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function cms.list_lead_attachments(uuid,uuid),cms.get_lead_attachment_download(uuid,uuid,uuid) to authenticated;
commit;
