begin;
create table cms.uploads (
 id uuid primary key default gen_random_uuid(),website_id uuid not null references cms.websites(id),
 created_by uuid not null references auth.users(id),request_key uuid not null,
 filename text not null,mime_type text not null,expected_bytes bigint not null,
 storage_key text not null unique,
 status text not null default 'reserved' check(status in ('reserved','uploaded','processing','ready','rejected','failed','cancelled')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '30 minutes',
 unique(website_id,created_by,request_key)
);
create index cms_uploads_owner on cms.uploads(website_id,created_by,created_at desc);
alter table cms.uploads enable row level security;
-- Storage details are only exposed to the later trusted signing/processing adapter.
grant select on cms.uploads to service_role;

create function cms.reserve_upload(p_site uuid,p_request uuid,p_filename text,p_mime text,p_bytes bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare upload cms.uploads; upload_id uuid; suffix text;
begin
 if not cms.can(p_site,'create','document') then raise exception 'forbidden' using errcode='42501'; end if;
 if p_request is null or p_filename is null or length(p_filename) not between 1 and 255
  or p_filename ~ '[[:cntrl:]/\\]' or p_bytes is null or p_bytes not between 1 and 25000000 then raise exception 'invalid_upload'; end if;
 suffix:=lower(substring(p_filename from '\.([^.]+)$'));
 if p_mime is null or not coalesce((p_mime='image/jpeg' and suffix in ('jpg','jpeg')) or (p_mime='image/png' and suffix='png')
  or (p_mime='image/webp' and suffix='webp') or (p_mime='image/avif' and suffix='avif'),false) then raise exception 'invalid_upload'; end if;
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
  insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'upload.reserved',jsonb_build_object('uploadId',upload.id));
 end if;
 return jsonb_build_object('id',upload.id,'status',case when upload.status='reserved' and upload.expires_at<=now() then 'expired' else upload.status end,
  'expiresAt',upload.expires_at,'filename',upload.filename,'expectedBytes',upload.expected_bytes);
end $$;

create function cms.get_upload(p_site uuid,p_upload uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',u.id,'filename',u.filename,'expectedBytes',u.expected_bytes,'mime',u.mime_type,
  'status',case when u.status='reserved' and u.expires_at<=now() then 'expired' else u.status end,'expiresAt',u.expires_at,'createdAt',u.created_at)
 from cms.uploads u where u.website_id=p_site and u.id=p_upload and u.created_by=auth.uid() and cms.can(p_site,'create','document');
$$;

create function cms.cancel_upload(p_site uuid,p_upload uuid)
returns void language plpgsql security definer set search_path='' as $$
declare upload cms.uploads;
begin
 if not cms.can(p_site,'create','document') then raise exception 'forbidden' using errcode='42501'; end if;
 select * into upload from cms.uploads where website_id=p_site and id=p_upload and created_by=auth.uid() for update;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 if upload.status='cancelled' then return; end if;
 if upload.status<>'reserved' then raise exception 'upload_already_processing'; end if;
 update cms.uploads set status='cancelled' where id=upload.id;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'upload.cancelled',jsonb_build_object('uploadId',upload.id));
end $$;
revoke all on function cms.reserve_upload(uuid,uuid,text,text,bigint),cms.get_upload(uuid,uuid),cms.cancel_upload(uuid,uuid) from public;
grant execute on function cms.reserve_upload(uuid,uuid,text,text,bigint),cms.get_upload(uuid,uuid),cms.cancel_upload(uuid,uuid) to authenticated;
commit;
