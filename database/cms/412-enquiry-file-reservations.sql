begin;
create table cms.enquiry_files (
 id uuid primary key,website_id uuid not null,session_id uuid not null,
 field_id text not null check(field_id ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$'),
 filename text not null check(length(filename) between 1 and 200),
 mime text not null check(mime in ('application/pdf','image/jpeg','image/png')),
 bytes bigint not null check(bytes between 1 and 25000000),
 max_bytes bigint not null check(max_bytes between 1 and 25000000 and bytes<=max_bytes),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 state text not null default 'reserved' check(state in ('reserved','uploaded','processing','retry','rejected','ready')),
 attempts integer not null default 0 check(attempts between 0 and 3),
 lease_token uuid,lease_until timestamptz,completed_token uuid,result jsonb,error_code text,
 created_at timestamptz not null default clock_timestamp(),
 foreign key(website_id,session_id) references cms.enquiry_file_sessions(website_id,id),
 check((state='processing')=(lease_token is not null and lease_until is not null)),
 check((state='ready')=(result is not null))
);
create index enquiry_files_session on cms.enquiry_files(website_id,session_id);
alter table cms.enquiry_files enable row level security;
revoke all on cms.enquiry_files from public,anon,authenticated,service_role;

-- Internal only. Lock order matches session cancellation and enquiry intake.
create function cms.lock_active_enquiry_file_session(p_site uuid,p_session uuid)
returns cms.enquiry_file_sessions language plpgsql security definer set search_path='' as $$
declare s cms.enquiry_file_sessions;
begin
 perform 1 from cms.websites where id=p_site for update;
 select * into s from cms.enquiry_file_sessions where website_id=p_site and id=p_session for update;
 if not found or s.state<>'active' or s.created_at>clock_timestamp() or s.expires_at<=clock_timestamp() then raise exception 'upload_session_unavailable';end if;
 if exists(select 1 from cms.leads where website_id=p_site and request_key=s.request_key) then raise exception 'submission_already_received';end if;
 perform 1 from cms.records where website_id=p_site and id=s.form_id and content_type='form' and published_revision_id=s.form_revision_id for share;
 if not found or cms.get_enquiry_input(p_site,s.form_id,s.form_revision_id,s.request_key) is null then raise exception 'form_unavailable';end if;
 return s;
end $$;
create function cms.enquiry_file_response(u cms.enquiry_files,s cms.enquiry_file_sessions)
returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',u.id,'site',u.website_id,'form',s.form_id,'revision',s.form_revision_id,'request',s.request_key,'field',u.field_id,'filename',u.filename,'mime',u.mime,'bytes',u.bytes,'maxBytes',u.max_bytes,'sha256',u.sha256,'state',u.state,'storageKey',u.website_id::text||'/enquiries/'||s.request_key::text||'/'||u.id::text||'/original','deliveryKey',u.website_id::text||'/enquiries/'||s.request_key::text||'/'||u.id::text||'/delivery.'||case when u.mime='application/pdf' then 'pdf' else 'webp' end);
$$;
create function cms.reserve_enquiry_file(p_site uuid,p_session uuid,p_token_hash text,p_upload uuid,p_file jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s cms.enquiry_file_sessions;u cms.enquiry_files;field jsonb;limit_bytes bigint;
begin
 s:=cms.lock_active_enquiry_file_session(p_site,p_session);
 if p_token_hash is null or s.token_hash<>p_token_hash then raise exception 'upload_session_unavailable';end if;
 if p_upload is null or p_file is null or jsonb_typeof(p_file)<>'object' or not(p_file ?& array['field','filename','mime','bytes','sha256']) or (select count(*) from jsonb_object_keys(p_file))<>5
 or jsonb_typeof(p_file->'field') is distinct from 'string' or jsonb_typeof(p_file->'sha256') is distinct from 'string'
 or coalesce(p_file->>'field','') !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$'
 or jsonb_typeof(p_file->'filename')<>'string' or length(p_file->>'filename') not between 1 and 200
 or left(p_file->>'filename',1)='.' or (p_file->>'filename') ~ '[[:cntrl:]/\\]'
 or coalesce(p_file->>'mime','') not in ('application/pdf','image/jpeg','image/png')
 or coalesce(p_file->>'sha256','') !~ '^[a-f0-9]{64}$'
 or jsonb_typeof(p_file->'bytes')<>'number' or coalesce(p_file->>'bytes','') !~ '^[1-9][0-9]{0,7}$' then raise exception 'invalid_upload';end if;
 if not(case p_file->>'mime' when 'application/pdf' then (p_file->>'filename') ~* '\.pdf$' when 'image/jpeg' then (p_file->>'filename') ~* '\.jpe?g$' else (p_file->>'filename') ~* '\.png$' end) then raise exception 'invalid_upload';end if;
 select f into field from cms.revisions v cross join lateral jsonb_array_elements(v.payload->'fields') f where v.website_id=p_site and v.record_id=s.form_id and v.id=s.form_revision_id and f->>'id'=p_file->>'field' and f->>'type'='file';
 if field is null or not(field->'mimeTypes' ? (p_file->>'mime')) then raise exception 'invalid_upload_field';end if;
 limit_bytes:=(field->>'maxBytes')::bigint;
 if limit_bytes not between 1 and 25000000 or (p_file->>'bytes')::bigint>limit_bytes then raise exception 'upload_size_limit';end if;
 select * into u from cms.enquiry_files where id=p_upload for update;
 if found then
  if u.website_id<>p_site or u.session_id<>p_session or u.field_id<>p_file->>'field' or u.filename<>p_file->>'filename' or u.mime<>p_file->>'mime' or u.bytes<>(p_file->>'bytes')::bigint or u.sha256<>p_file->>'sha256' then raise exception 'upload_identity_conflict';end if;
  return cms.enquiry_file_response(u,s);
 end if;
 if (select count(*) from cms.enquiry_files where session_id=p_session)>=50 or (select coalesce(sum(bytes),0) from cms.enquiry_files where session_id=p_session)+(p_file->>'bytes')::bigint>100000000 then raise exception 'upload_session_limit';end if;
 insert into cms.enquiry_files(id,website_id,session_id,field_id,filename,mime,bytes,max_bytes,sha256) values(p_upload,p_site,p_session,p_file->>'field',p_file->>'filename',p_file->>'mime',(p_file->>'bytes')::bigint,limit_bytes,p_file->>'sha256') returning * into u;
 return cms.enquiry_file_response(u,s);
end $$;
create function cms.confirm_enquiry_file(p_site uuid,p_session uuid,p_token_hash text,p_upload uuid,p_sha256 text,p_bytes bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s cms.enquiry_file_sessions;u cms.enquiry_files;
begin
 s:=cms.lock_active_enquiry_file_session(p_site,p_session);
 if p_token_hash is null or s.token_hash<>p_token_hash then raise exception 'upload_session_unavailable';end if;
 select * into u from cms.enquiry_files where website_id=p_site and session_id=p_session and id=p_upload for update;
 if not found or u.sha256 is distinct from p_sha256 or u.bytes is distinct from p_bytes then raise exception 'upload_bytes_mismatch';end if;
 if u.state='reserved' then update cms.enquiry_files set state='uploaded' where id=u.id returning * into u;end if;
 return cms.enquiry_file_response(u,s);
end $$;
create function cms.claim_enquiry_file(p_site uuid,p_upload uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s cms.enquiry_file_sessions;u cms.enquiry_files;sid uuid;token uuid:=gen_random_uuid();
begin
 select session_id into sid from cms.enquiry_files where website_id=p_site and id=p_upload;
 if sid is null then return null;end if;
 s:=cms.lock_active_enquiry_file_session(p_site,sid);
 select * into u from cms.enquiry_files where website_id=p_site and id=p_upload for update;
 if not(u.state in ('uploaded','retry') or (u.state='processing' and u.lease_until<=clock_timestamp())) then return null;end if;
 if u.attempts>=3 then update cms.enquiry_files set state='rejected',error_code='attempt_limit',lease_token=null,lease_until=null where id=u.id;return null;end if;
 update cms.enquiry_files set state='processing',attempts=attempts+1,lease_token=token,lease_until=least(s.expires_at,clock_timestamp()+interval '5 minutes'),error_code=null where id=u.id returning * into u;
 return (cms.enquiry_file_response(u,s)-'state')||jsonb_build_object('leaseToken',token);
end $$;
revoke all on function cms.lock_active_enquiry_file_session(uuid,uuid),cms.enquiry_file_response(cms.enquiry_files,cms.enquiry_file_sessions) from public,anon,authenticated,service_role;
revoke all on function cms.reserve_enquiry_file(uuid,uuid,text,uuid,jsonb),cms.confirm_enquiry_file(uuid,uuid,text,uuid,text,bigint),cms.claim_enquiry_file(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function cms.reserve_enquiry_file(uuid,uuid,text,uuid,jsonb),cms.confirm_enquiry_file(uuid,uuid,text,uuid,text,bigint),cms.claim_enquiry_file(uuid,uuid) to service_role;

create function cms.finish_enquiry_file(p_site uuid,p_upload uuid,p_token uuid,p_result jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare s cms.enquiry_file_sessions;u cms.enquiry_files;sid uuid;
begin
 select session_id into sid from cms.enquiry_files where website_id=p_site and id=p_upload;
 s:=cms.lock_active_enquiry_file_session(p_site,sid);
 select * into u from cms.enquiry_files where website_id=p_site and id=p_upload for update;
 if u.state='ready' and p_token is not null and u.completed_token=p_token and u.result=p_result then return u.id;end if;
 if not found or u.state<>'processing' or p_token is null or u.lease_token is distinct from p_token or u.lease_until<=clock_timestamp() then raise exception 'upload_lease_lost';end if;
 if p_result is null or jsonb_typeof(p_result)<>'object' or (select count(*) from jsonb_object_keys(p_result))<>9
 or not(p_result ?& array['originalSha256','originalBytes','originalMime','sha256','bytes','mime','inspectionVersion'])
 or jsonb_typeof(p_result->'originalSha256') is distinct from 'string' or jsonb_typeof(p_result->'sha256') is distinct from 'string'
 or p_result->>'originalSha256' is distinct from u.sha256 or p_result->>'originalMime' is distinct from u.mime
 or p_result->'originalBytes' is distinct from to_jsonb(u.bytes)
 or coalesce(p_result->>'sha256','') !~ '^[a-f0-9]{64}$'
 or jsonb_typeof(p_result->'bytes')<>'number' or coalesce(p_result->>'bytes','') !~ '^[1-9][0-9]{0,7}$' then raise exception 'invalid_upload_inspection';end if;
 if (p_result->>'bytes')::bigint>u.max_bytes then raise exception 'upload_size_limit';end if;
 if u.mime='application/pdf' then
  if p_result->>'mime' is distinct from 'application/pdf' or p_result->>'inspectionVersion' is distinct from 'document-pdf-1'
   or coalesce(p_result->>'parserVersion','') !~ '^[0-9]+\.[0-9]+\.[0-9]+$' or jsonb_typeof(p_result->'parserVersion')<>'string'
   or jsonb_typeof(p_result->'pages') is distinct from 'number' or coalesce(p_result->>'pages','') !~ '^[1-9][0-9]{0,2}$' then raise exception 'invalid_upload_inspection';end if;
  if (p_result->>'pages')::integer>300 then raise exception 'invalid_upload_inspection';end if;
 else
  if p_result->>'mime' is distinct from 'image/webp' or p_result->>'inspectionVersion' is distinct from 'image-1'
   or jsonb_typeof(p_result->'width') is distinct from 'number' or jsonb_typeof(p_result->'height') is distinct from 'number'
   or coalesce(p_result->>'width','') !~ '^[1-9][0-9]{0,4}$' or coalesce(p_result->>'height','') !~ '^[1-9][0-9]{0,4}$' then raise exception 'invalid_upload_inspection';end if;
  if (p_result->>'width')::bigint>20000 or (p_result->>'height')::bigint>20000 or (p_result->>'width')::bigint*(p_result->>'height')::bigint>40000000 then raise exception 'invalid_upload_inspection';end if;
 end if;
 update cms.enquiry_files set state='ready',completed_token=p_token,result=p_result,lease_token=null,lease_until=null where id=u.id;
 return u.id;
end $$;
create function cms.fail_enquiry_file(p_site uuid,p_upload uuid,p_token uuid,p_code text,p_retryable boolean)
returns void language plpgsql security definer set search_path='' as $$
declare s cms.enquiry_file_sessions;u cms.enquiry_files;sid uuid;
begin
 select session_id into sid from cms.enquiry_files where website_id=p_site and id=p_upload;
 s:=cms.lock_active_enquiry_file_session(p_site,sid);
 select * into u from cms.enquiry_files where website_id=p_site and id=p_upload for update;
 if not found or u.state<>'processing' or p_token is null or u.lease_token is distinct from p_token or u.lease_until<=clock_timestamp() then raise exception 'upload_lease_lost';end if;
 if p_code is null or p_code not in ('bytes_mismatch','scan_unavailable','processing_unavailable','inspection_rejected','storage_unavailable') or p_retryable is distinct from (p_code in ('scan_unavailable','processing_unavailable','storage_unavailable')) then raise exception 'invalid_upload_failure';end if;
 update cms.enquiry_files set state=case when p_retryable and attempts<3 then 'retry' else 'rejected' end,error_code=p_code,lease_token=null,lease_until=null where id=u.id;
end $$;
revoke all on function cms.finish_enquiry_file(uuid,uuid,uuid,jsonb),cms.fail_enquiry_file(uuid,uuid,uuid,text,boolean) from public,anon,authenticated,service_role;
grant execute on function cms.finish_enquiry_file(uuid,uuid,uuid,jsonb),cms.fail_enquiry_file(uuid,uuid,uuid,text,boolean) to service_role;
commit;
