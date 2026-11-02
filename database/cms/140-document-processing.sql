begin;
-- Separate immutable document files: never expose PDFs through image/video readers.
create table cms.document_files (
 website_id uuid not null references cms.websites(id),
 id uuid not null references cms.uploads(id),
 storage_key text not null unique,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 original_sha256 text not null check(original_sha256 ~ '^[a-f0-9]{64}$'),
 byte_size bigint not null check(byte_size between 1 and 25000000),
 page_count integer not null check(page_count between 1 and 300),
 parser_version text not null check(parser_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
 inspection_version text not null check(inspection_version='document-pdf-1'),
 rights_status text not null default 'pending' check(rights_status in ('pending','approved','revoked')),
 rights_evidence text not null default '' check(length(rights_evidence)<=5000),
 rights_expires_at timestamptz,archived_at timestamptz,created_at timestamptz not null default now(),
 primary key(website_id,id),
 check(storage_key=website_id::text||'/'||id::text||'/delivery.pdf'),
 check(rights_status<>'approved' or length(trim(rights_evidence))>0)
);
alter table cms.document_files enable row level security;
grant select on cms.document_files to service_role;
create function cms.claim_document_upload(p_site uuid,p_upload uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u cms.uploads; token uuid;
begin
 select * into u from cms.uploads where website_id=p_site and id=p_upload for update;
 if not found or u.mime_type<>'application/pdf' then return null; end if;
 if not (u.status in ('uploaded','failed') or (u.status='processing' and u.leased_until<=now())) then return null; end if;
 if u.attempts>=3 then
  update cms.uploads set status='rejected',error_code='attempt_limit',lease_token=null,leased_until=null where id=u.id;
  return null;
 end if;
 token:=gen_random_uuid();
 update cms.uploads set status='processing',lease_token=token,leased_until=now()+interval '5 minutes',attempts=attempts+1,error_code=null where id=u.id;
 return jsonb_build_object('id',u.id,'site',u.website_id,'filename',u.filename,'mime',u.mime_type,'bytes',u.expected_bytes,
  'sha256',u.original_sha256,'storageKey',u.storage_key,'deliveryKey',u.website_id::text||'/'||u.id::text||'/delivery.pdf','leaseToken',token);
end $$;


create function cms.finish_document_upload(p_site uuid,p_upload uuid,p_token uuid,p_result jsonb)
returns text language plpgsql security definer set search_path='' as $$
declare u cms.uploads;
begin
 select * into u from cms.uploads where website_id=p_site and id=p_upload for update;
 if not found or u.status<>'processing' or u.lease_token is distinct from p_token or u.leased_until<=now() then raise exception 'upload_lease_lost'; end if;
 if u.mime_type<>'application/pdf' or p_result is null or jsonb_typeof(p_result)<>'object' then raise exception 'invalid_document_inspection_result'; end if;
 if not(p_result ?& array['originalSha256','sha256','bytes','pages','parserVersion','inspectionVersion'])
  or (select count(*) from jsonb_object_keys(p_result))<>6
  or p_result->>'originalSha256' is distinct from u.original_sha256
  or p_result->>'inspectionVersion' is distinct from 'document-pdf-1'
  or coalesce(p_result->>'sha256','')!~'^[a-f0-9]{64}$'
  or coalesce(p_result->>'parserVersion','')!~'^[0-9]+\.[0-9]+\.[0-9]+$'
  or exists(select 1 from unnest(array['bytes','pages']) k where jsonb_typeof(p_result->k)<>'number' or coalesce(p_result->>k,'')!~'^[0-9]+$')
  then raise exception 'invalid_document_inspection_result'; end if;
 if (p_result->>'bytes')::numeric not between 1 and 25000000 or (p_result->>'pages')::numeric not between 1 and 300 then raise exception 'invalid_document_inspection_result'; end if;
 insert into cms.document_files(website_id,id,storage_key,sha256,original_sha256,byte_size,page_count,parser_version,inspection_version)
 values(p_site,u.id,p_site::text||'/'||u.id::text||'/delivery.pdf',p_result->>'sha256',u.original_sha256,(p_result->>'bytes')::bigint,(p_result->>'pages')::integer,p_result->>'parserVersion','document-pdf-1');
 update cms.uploads set status='ready',inspection_version='document-pdf-1',lease_token=null,leased_until=null where id=u.id;
 insert into cms.audit_events(website_id,action,details) values(p_site,'upload.document_inspected',jsonb_build_object('uploadId',u.id,'inspectionVersion','document-pdf-1','parserVersion',p_result->>'parserVersion'));
 return u.id::text;
end $$;
create function cms.list_document_work(p_limit integer default 5)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if p_limit is null or p_limit<1 or p_limit>20 then raise exception 'invalid_document_batch'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('site',q.website_id,'id',q.id)) from (
  select u.website_id,u.id from cms.uploads u where u.mime_type='application/pdf'
   and (u.status in ('uploaded','failed') or (u.status='processing' and u.leased_until<=now()))
  order by u.created_at,u.id limit p_limit
 ) q),'[]'::jsonb);
end $$;
revoke all on function cms.claim_document_upload(uuid,uuid),cms.finish_document_upload(uuid,uuid,uuid,jsonb),cms.list_document_work(integer) from public;
grant execute on function cms.claim_document_upload(uuid,uuid),cms.finish_document_upload(uuid,uuid,uuid,jsonb),cms.list_document_work(integer) to service_role;
commit;
