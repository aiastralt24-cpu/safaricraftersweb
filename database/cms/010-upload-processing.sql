begin;
alter table cms.uploads add column original_sha256 text,
 add column lease_token uuid,add column leased_until timestamptz,
 add column attempts integer not null default 0,add column error_code text,
 add column inspection_version text;

create function cms.confirm_upload(p_site uuid,p_upload uuid,p_sha256 text,p_bytes bigint)
returns void language plpgsql security definer set search_path='' as $$
declare u cms.uploads;
begin
 select * into u from cms.uploads where website_id=p_site and id=p_upload for update;
 if not found then raise exception 'upload_not_found'; end if;
 if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' or p_bytes is distinct from u.expected_bytes then raise exception 'upload_bytes_mismatch'; end if;
 if u.status in ('uploaded','processing','ready') and u.original_sha256=p_sha256 then return; end if;
 if u.status<>'reserved' or u.expires_at<=now() then raise exception 'upload_not_reserved'; end if;
 update cms.uploads set status='uploaded',original_sha256=p_sha256 where id=u.id;
 insert into cms.audit_events(website_id,action,details) values(p_site,'upload.received',jsonb_build_object('uploadId',u.id));
end $$;

create function cms.claim_upload(p_site uuid,p_upload uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u cms.uploads; token uuid;
begin
 select * into u from cms.uploads where website_id=p_site and id=p_upload for update;
 if not found then return null; end if;
 if not (u.status in ('uploaded','failed') or (u.status='processing' and u.leased_until<=now())) then return null; end if;
 if u.attempts>=3 then
  update cms.uploads set status='rejected',error_code='attempt_limit',lease_token=null,leased_until=null where id=u.id;
  return null;
 end if;
 token:=gen_random_uuid();
 update cms.uploads set status='processing',lease_token=token,leased_until=now()+interval '5 minutes',attempts=attempts+1,error_code=null where id=u.id;
 return jsonb_build_object('id',u.id,'site',u.website_id,'filename',u.filename,'mime',u.mime_type,'bytes',u.expected_bytes,
  'sha256',u.original_sha256,'storageKey',u.storage_key,'deliveryKey',u.website_id::text||'/'||u.id::text||'/delivery.webp','leaseToken',token);
end $$;

create function cms.finish_upload(p_site uuid,p_upload uuid,p_token uuid,p_result jsonb)
returns text language plpgsql security definer set search_path='' as $$
declare u cms.uploads; asset_id text;
begin
 select * into u from cms.uploads where website_id=p_site and id=p_upload for update;
 if not found or u.status<>'processing' or u.lease_token is distinct from p_token or u.leased_until<=now() then raise exception 'upload_lease_lost'; end if;
 if p_result is null or jsonb_typeof(p_result)<>'object'
  or not (p_result ?& array['originalSha256','sha256','bytes','width','height','inspectionVersion'])
  or (p_result->>'originalSha256') is distinct from u.original_sha256
  or (p_result->>'inspectionVersion') is distinct from 'image-1'
  or coalesce(p_result->>'sha256','') !~ '^[0-9a-f]{64}$'
  or jsonb_typeof(p_result->'bytes')<>'number' or jsonb_typeof(p_result->'width')<>'number' or jsonb_typeof(p_result->'height')<>'number'
  or coalesce(p_result->>'bytes','') !~ '^[0-9]+$' or coalesce(p_result->>'width','') !~ '^[0-9]+$' or coalesce(p_result->>'height','') !~ '^[0-9]+$'
  then raise exception 'invalid_inspection_result'; end if;
 if (p_result->>'bytes')::numeric not between 1 and 25000000 or (p_result->>'width')::numeric not between 1 and 2400 or (p_result->>'height')::numeric not between 1 and 2400 then raise exception 'invalid_inspection_result'; end if;
 asset_id:=u.id::text;
 insert into cms.media_objects(website_id,id,storage_key,sha256,mime_type,byte_size,width,height,inspection_status)
 values(p_site,asset_id,p_site::text||'/'||u.id::text||'/delivery.webp',p_result->>'sha256','image/webp',
  (p_result->>'bytes')::bigint,(p_result->>'width')::integer,(p_result->>'height')::integer,'ready');
 update cms.uploads set status='ready',inspection_version=p_result->>'inspectionVersion',lease_token=null,leased_until=null where id=u.id;
 insert into cms.audit_events(website_id,action,details) values(p_site,'upload.inspected',jsonb_build_object('uploadId',u.id,'assetId',asset_id,'inspectionVersion',p_result->>'inspectionVersion'));
 return asset_id;
end $$;

create function cms.fail_upload(p_site uuid,p_upload uuid,p_token uuid,p_code text,p_retryable boolean)
returns void language plpgsql security definer set search_path='' as $$
declare u cms.uploads;
begin
 select * into u from cms.uploads where website_id=p_site and id=p_upload for update;
 if not found or u.status<>'processing' or u.lease_token is distinct from p_token or u.leased_until<=now() then raise exception 'upload_lease_lost'; end if;
 if p_code is null or p_code not in ('inspection_rejected','scan_unavailable','storage_unavailable','bytes_mismatch') or p_retryable is null then raise exception 'invalid_upload_error'; end if;
 update cms.uploads set status=case when p_retryable and u.attempts<3 then 'failed' else 'rejected' end,error_code=p_code,lease_token=null,leased_until=null where id=u.id;
 insert into cms.audit_events(website_id,action,details) values(p_site,'upload.processing_failed',jsonb_build_object('uploadId',u.id,'code',p_code,'retryable',p_retryable and u.attempts<3));
end $$;
revoke all on function cms.confirm_upload(uuid,uuid,text,bigint),cms.claim_upload(uuid,uuid),cms.finish_upload(uuid,uuid,uuid,jsonb),cms.fail_upload(uuid,uuid,uuid,text,boolean) from public;
grant execute on function cms.confirm_upload(uuid,uuid,text,bigint),cms.claim_upload(uuid,uuid),cms.finish_upload(uuid,uuid,uuid,jsonb),cms.fail_upload(uuid,uuid,uuid,text,boolean) to service_role;
commit;
