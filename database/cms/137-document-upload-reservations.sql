begin;
-- PDF reservations only. No file transfer, storage access or publication is enabled.
create function cms.reserve_document_upload(p_site uuid,p_request uuid,p_filename text,p_mime text,p_bytes bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare upload cms.uploads; upload_id uuid; suffix text;
begin
 if not cms.can(p_site,'create','document') then raise exception 'forbidden' using errcode='42501'; end if;
 if p_request is null or p_filename is null or length(p_filename) not between 5 and 200 or left(p_filename,1)='.'
  or p_filename ~ '[[:cntrl:]/\\]' or p_bytes is null or p_bytes not between 1 and 25000000 then raise exception 'invalid_upload'; end if;
 suffix:=lower(substring(p_filename from '\.([^.]+)$'));
 if p_mime is distinct from 'application/pdf' or suffix is distinct from 'pdf' then raise exception 'invalid_upload'; end if;
 -- Serializes retry/quota decisions for one uploader without locking other users.
 perform pg_advisory_xact_lock(hashtextextended(p_site::text||auth.uid()::text,0));
 select * into upload from cms.uploads where website_id=p_site and created_by=auth.uid() and request_key=p_request;
 if found then
  if upload.filename is distinct from p_filename or upload.mime_type is distinct from p_mime or upload.expected_bytes is distinct from p_bytes then raise exception 'idempotency_key_reused'; end if;
 else
  if (select count(*) from cms.uploads where website_id=p_site and created_by=auth.uid() and ((status='reserved' and expires_at>now()) or status in ('uploaded','processing')))>=10 then raise exception 'upload_limit'; end if;
  upload_id:=gen_random_uuid();
  insert into cms.uploads(id,website_id,created_by,request_key,filename,mime_type,expected_bytes,storage_key)
  values(upload_id,p_site,auth.uid(),p_request,p_filename,p_mime,p_bytes,p_site::text||'/'||upload_id::text||'/original') returning * into upload;
  insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'upload.document_reserved',jsonb_build_object('uploadId',upload.id));
 end if;
 return jsonb_build_object('id',upload.id,'status',case when upload.status='reserved' and upload.expires_at<=now() then 'expired' else upload.status end,
  'expiresAt',upload.expires_at,'filename',upload.filename,'expectedBytes',upload.expected_bytes);
end $$;

revoke all on function cms.reserve_document_upload(uuid,uuid,text,text,bigint) from public;
grant execute on function cms.reserve_document_upload(uuid,uuid,text,text,bigint) to authenticated;
create function cms.list_document_uploads(p_site uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(cms.get_upload(p_site,u.id) order by u.created_at desc,u.id desc),'[]')
 from (select id,created_at from cms.uploads where website_id=p_site and created_by=auth.uid()
 and mime_type='application/pdf' and cms.can(p_site,'create','document') order by created_at desc,id desc limit 50) u;
$$;
revoke all on function cms.list_document_uploads(uuid) from public;
grant execute on function cms.list_document_uploads(uuid) to authenticated;
commit;
