begin;
-- Metadata authorization for a future server-mediated download. This does not
-- grant visitor storage access or enable a publication policy.
create function cms.get_document_download(p_site uuid,p_record uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; ver cms.revisions; file cms.document_files; body jsonb;
 today date:=(now() at time zone 'UTC')::date; effective date; expiry date;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='document';
 if not found or rec.published_revision_id is null then return null; end if;
 select * into ver from cms.revisions where website_id=p_site and record_id=p_record and id=rec.published_revision_id;
 if not found then return null; end if;
 -- Published receipt remains evidence of the released content. Its short-lived
 -- publication admission expiry is not a download lifetime; mutable file/date
 -- conditions are rechecked below on every call.
 if not exists(select 1 from cms.validations checked join cms.validation_policy policy
  on policy.content_type='document' and policy.validator_version=checked.validator_version
  where checked.revision_id=ver.id and checked.valid and checked.validator_version='document-1') then return null; end if;
 body:=ver.payload;
 if body->>'schemaVersion' is distinct from '1' or body->>'language' is distinct from rec.locale
  or rec.path is not null or body->>'access' is null or body->>'access' not in ('public','authenticated')
  or body->>'expiryPolicy' is null or body->>'expiryPolicy' not in ('warn','blockPublication','removeAvailability') then return null; end if;
 if body->>'access'='authenticated' and not exists(select 1 from auth.users where id=auth.uid()) then return null; end if;
 if body ? 'effectiveOn' then
  if (body->>'effectiveOn') is null or (body->>'effectiveOn') !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  effective:=(body->>'effectiveOn')::date;
  if effective>today then return null; end if;
 end if;
 if body ? 'expiresOn' then
  if (body->>'expiresOn') is null or (body->>'expiresOn') !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  expiry:=(body->>'expiresOn')::date;
  if expiry<effective or (expiry<today and body->>'expiryPolicy'='removeAvailability') then return null; end if;
 end if;
 select f.* into file from cms.document_files f join cms.uploads u on u.website_id=f.website_id and u.id=f.id
 where f.website_id=p_site and f.id::text=lower(body #>> '{file,assetId}')
  and u.status='ready' and u.mime_type='application/pdf' and u.inspection_version='document-pdf-1'
  and f.inspection_version=u.inspection_version and f.original_sha256=u.original_sha256
  and f.archived_at is null and f.rights_status='approved' and (f.rights_expires_at is null or f.rights_expires_at>now());
 if not found then return null; end if;
 return jsonb_build_object('site',p_site,'record',p_record,'revision',ver.id,'id',file.id,
  'key',file.storage_key,'bytes',file.byte_size,'sha256',file.sha256,
  'downloadName',body #>> '{file,downloadName}','label',body->>'downloadLabel',
  'access',body->>'access','expired',coalesce(expiry<today,false));
 exception when invalid_datetime_format or datetime_field_overflow then return null;
end $$;
revoke all on function cms.get_document_download(uuid,uuid) from public;
grant execute on function cms.get_document_download(uuid,uuid) to anon,authenticated;
commit;
