begin;
-- Ignore malformed/legacy values so index creation cannot reject existing content.
create index cms_revision_document_file on cms.revisions(website_id,(payload #>> '{file,assetId}'))
 where (payload #>> '{file,assetId}') ~ '^[a-f0-9-]{36}$';
create function cms.can_read_document_object(p_key text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.document_files f join cms.uploads u on u.website_id=f.website_id and u.id=f.id
  where f.storage_key=p_key and p_key=f.website_id::text||'/'||f.id::text||'/delivery.pdf'
   and u.mime_type='application/pdf' and u.status='ready' and u.inspection_version=f.inspection_version
   and u.original_sha256=f.original_sha256 and f.inspection_version='document-pdf-1'
   and f.archived_at is null and f.rights_status<>'revoked' and (f.rights_expires_at is null or f.rights_expires_at>now())
   and exists(select 1 from cms.revisions v join cms.records r on r.website_id=v.website_id and r.id=v.record_id
    where v.website_id=f.website_id and (v.payload #>> '{file,assetId}') ~ '^[a-f0-9-]{36}$' and r.content_type='document' and v.payload #>> '{file,assetId}'=f.id::text
     and cms.can(r.website_id,'view','document',r.id)));
$$;
create function cms.get_document_preview(p_site uuid,p_record uuid,p_revision uuid,p_asset uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',f.website_id,'record',r.id,'revision',v.id,'id',f.id,'key',f.storage_key,'bytes',f.byte_size,'sha256',f.sha256)
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id
 join cms.document_files f on f.website_id=r.website_id and f.id=p_asset
 where r.website_id=p_site and r.id=p_record and r.content_type='document' and v.id=p_revision
  and v.payload #>> '{file,assetId}'=f.id::text and cms.can(p_site,'view','document',r.id)
  and cms.can_read_document_object(f.storage_key);
$$;
revoke all on function cms.can_read_document_object(text),cms.get_document_preview(uuid,uuid,uuid,uuid) from public;
grant execute on function cms.can_read_document_object(text) to authenticated,anon;
grant execute on function cms.get_document_preview(uuid,uuid,uuid,uuid) to authenticated;
-- Only a processed file referenced by a viewable saved document revision can be
-- read by a CMS member. Public/site visitor access and originals remain denied.
alter policy cms_document_private on storage.objects using(
 bucket_id not in ('cms-document-originals','cms-document-media')
 or (bucket_id='cms-document-media' and cms.can_read_document_object(name)));
create policy cms_document_media_read on storage.objects for select to authenticated
 using(bucket_id='cms-document-media' and cms.can_read_document_object(name));
commit;
