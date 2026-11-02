begin;
-- Background-video lifecycle. No image bucket/type expansion or public delivery.
alter table cms.media_objects add column duration_seconds numeric,
 add column frames_per_second numeric,add column has_audio boolean,
 add column video_codec text,add column video_pixel_format text;
alter table cms.media_objects drop constraint media_objects_mime_type_check,
 drop constraint media_objects_byte_size_check,
 add constraint media_objects_mime_type_check check(mime_type in ('image/jpeg','image/png','image/webp','image/avif','video/mp4')),
 add constraint media_objects_byte_size_check check(byte_size>0 and byte_size<=case when mime_type='video/mp4' then 100000000 else 25000000 end),
 add constraint media_objects_video_metadata_check check(
  (mime_type<>'video/mp4' and duration_seconds is null and frames_per_second is null and has_audio is null and video_codec is null and video_pixel_format is null)
  or (mime_type='video/mp4' and duration_seconds is not null and duration_seconds>0 and duration_seconds<=180
   and frames_per_second is not null and frames_per_second=30 and has_audio is false
   and coalesce(video_codec,'')='h264' and coalesce(video_pixel_format,'')='yuv420p'
   and width between 2 and 1920 and height between 2 and 1920 and width%2=0 and height%2=0));

create function cms.reserve_hero_video_upload(p_site uuid,p_request uuid,p_filename text,p_mime text,p_bytes bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare upload cms.uploads; upload_id uuid; suffix text;
begin
 if not cms.can(p_site,'create','document') then raise exception 'forbidden' using errcode='42501'; end if;
 if p_request is null or p_filename is null or length(p_filename) not between 1 and 255
  or p_filename ~ '[[:cntrl:]/\\]' or p_bytes is null or p_bytes not between 1 and 100000000 then raise exception 'invalid_upload'; end if;
 suffix:=lower(substring(p_filename from '\.([^.]+)$'));
 if p_mime is distinct from 'video/mp4' or suffix is distinct from 'mp4' then raise exception 'invalid_upload'; end if;
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
  insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'upload.video_reserved',jsonb_build_object('uploadId',upload.id));
 end if;
 return jsonb_build_object('id',upload.id,'status',case when upload.status='reserved' and upload.expires_at<=now() then 'expired' else upload.status end,
  'expiresAt',upload.expires_at,'filename',upload.filename,'expectedBytes',upload.expected_bytes);
end $$;

create or replace function cms.claim_upload(p_site uuid,p_upload uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u cms.uploads; token uuid;
begin
 select * into u from cms.uploads where website_id=p_site and id=p_upload for update;
 if not found or u.mime_type not in ('image/jpeg','image/png','image/webp','image/avif') then return null; end if;
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

create or replace function cms.finish_upload(p_site uuid,p_upload uuid,p_token uuid,p_result jsonb)
returns text language plpgsql security definer set search_path='' as $$
declare u cms.uploads; asset_id text;
begin
 select * into u from cms.uploads where website_id=p_site and id=p_upload for update;
 if not found or u.status<>'processing' or u.lease_token is distinct from p_token or u.leased_until<=now() then raise exception 'upload_lease_lost'; end if;
 if u.mime_type not in ('image/jpeg','image/png','image/webp','image/avif') then raise exception 'invalid_inspection_result'; end if;
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

create function cms.claim_hero_video_upload(p_site uuid,p_upload uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u cms.uploads; token uuid;
begin
 select * into u from cms.uploads where website_id=p_site and id=p_upload for update;
 if not found or u.mime_type<>'video/mp4' then return null; end if;
 if not (u.status in ('uploaded','failed') or (u.status='processing' and u.leased_until<=now())) then return null; end if;
 if u.attempts>=3 then
  update cms.uploads set status='rejected',error_code='attempt_limit',lease_token=null,leased_until=null where id=u.id;
  return null;
 end if;
 token:=gen_random_uuid();
 update cms.uploads set status='processing',lease_token=token,leased_until=now()+interval '20 minutes',attempts=attempts+1,error_code=null where id=u.id;
 return jsonb_build_object('id',u.id,'site',u.website_id,'filename',u.filename,'mime',u.mime_type,'bytes',u.expected_bytes,
  'sha256',u.original_sha256,'storageKey',u.storage_key,'deliveryKey',u.website_id::text||'/'||u.id::text||'/delivery.mp4','leaseToken',token);
end $$;

create function cms.finish_hero_video_upload(p_site uuid,p_upload uuid,p_token uuid,p_result jsonb)
returns text language plpgsql security definer set search_path='' as $$
declare u cms.uploads; asset_id text;
begin
 select * into u from cms.uploads where website_id=p_site and id=p_upload for update;
 if not found or u.status<>'processing' or u.lease_token is distinct from p_token or u.leased_until<=now() then raise exception 'upload_lease_lost'; end if;
 if u.mime_type<>'video/mp4' or p_result is null or jsonb_typeof(p_result)<>'object' then raise exception 'invalid_video_inspection_result'; end if;
 if not(p_result ?& array['originalSha256','sha256','bytes','width','height','inspectionVersion','durationSeconds','framesPerSecond','hasAudio','codec','pixelFormat'])
  or (select count(*) from jsonb_object_keys(p_result))<>11
  or p_result->>'originalSha256' is distinct from u.original_sha256
  or p_result->>'inspectionVersion' is distinct from 'hero-video-1'
  or p_result->>'codec' is distinct from 'h264' or p_result->>'pixelFormat' is distinct from 'yuv420p'
  or p_result->'hasAudio' is distinct from 'false'::jsonb
  or coalesce(p_result->>'sha256','')!~'^[a-f0-9]{64}$' then raise exception 'invalid_video_inspection_result'; end if;
 if exists(select 1 from unnest(array['bytes','width','height']) k where jsonb_typeof(p_result->k)<>'number' or coalesce(p_result->>k,'')!~'^[0-9]+$')
  or exists(select 1 from unnest(array['durationSeconds','framesPerSecond']) k where jsonb_typeof(p_result->k)<>'number' or coalesce(p_result->>k,'')!~'^[0-9]+(\.[0-9]+)?$') then raise exception 'invalid_video_inspection_result'; end if;
 if (p_result->>'bytes')::numeric not between 1 and 100000000 or (p_result->>'width')::numeric not between 2 and 1920 or (p_result->>'height')::numeric not between 2 and 1920
  or (p_result->>'durationSeconds')::numeric<=0 or (p_result->>'durationSeconds')::numeric>180 or (p_result->>'framesPerSecond')::numeric<>30
  or (p_result->>'width')::integer%2<>0 or (p_result->>'height')::integer%2<>0 then raise exception 'invalid_video_inspection_result'; end if;
 asset_id:=u.id::text;
 insert into cms.media_objects(website_id,id,storage_key,sha256,mime_type,byte_size,width,height,inspection_status,duration_seconds,frames_per_second,has_audio,video_codec,video_pixel_format)
 values(p_site,asset_id,p_site::text||'/'||u.id::text||'/delivery.mp4',p_result->>'sha256','video/mp4',(p_result->>'bytes')::bigint,(p_result->>'width')::integer,(p_result->>'height')::integer,'ready',(p_result->>'durationSeconds')::numeric,30,false,'h264','yuv420p');
 update cms.uploads set status='ready',inspection_version='hero-video-1',lease_token=null,leased_until=null where id=u.id;
 insert into cms.audit_events(website_id,action,details) values(p_site,'upload.video_inspected',jsonb_build_object('uploadId',u.id,'assetId',asset_id,'inspectionVersion','hero-video-1'));
 return asset_id;
end $$;
-- Existing image transfer/storage authorization must not accept video reservations.
create or replace function cms.can_upload_object(p_key text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.uploads u where u.storage_key=p_key and u.created_by=auth.uid()
  and u.mime_type in ('image/jpeg','image/png','image/webp','image/avif')
  and u.status='reserved' and u.expires_at>now() and cms.can(u.website_id,'create','document'));
$$;
revoke all on function cms.reserve_hero_video_upload(uuid,uuid,text,text,bigint),cms.claim_hero_video_upload(uuid,uuid),cms.finish_hero_video_upload(uuid,uuid,uuid,jsonb) from public;
grant execute on function cms.reserve_hero_video_upload(uuid,uuid,text,text,bigint) to authenticated;
grant execute on function cms.claim_hero_video_upload(uuid,uuid),cms.finish_hero_video_upload(uuid,uuid,uuid,jsonb) to service_role;
-- Video publication requires a separate validated delivery contract.

-- Page images must match the processed format required by public media delivery.
create or replace function cms.record_media_available(p_site uuid,p_type text,p_payload jsonb)
returns boolean language sql stable security definer set search_path='' as $$
 select (p_type<>'journey' or cms.journey_media_available(p_site,p_payload)) and not exists(
  select 1 from jsonb_path_query(p_payload,'$.**.assetId') value
  left join cms.media_objects m on m.website_id=p_site and m.id=value #>> '{}'
  where jsonb_typeof(value)<>'string' or m.id is null or m.inspection_status<>'ready'
   or m.mime_type='video/mp4' or m.rights_status<>'approved' or m.archived_at is not null
   or (p_type in ('destination','journalArticle','settings','photoExpedition','specialist','page','homepage') and m.mime_type<>'image/webp')
   or (m.rights_expires_at is not null and m.rights_expires_at<=now())
 );
$$;

create or replace function cms.get_record_media_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; result jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found then return null; end if;
 if current_setting('role',true)<>'service_role' and not cms.can(p_site,'view',rec.content_type,rec.id) then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if not found then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',refs.id,'available',coalesce(
  m.inspection_status='ready' and m.mime_type<>'video/mp4' and m.rights_status='approved' and m.archived_at is null
  and (rec.content_type not in ('destination','journalArticle','settings','photoExpedition','specialist','page','homepage') or m.mime_type='image/webp')
  and (m.rights_expires_at is null or m.rights_expires_at>now()),false)) order by refs.id),'[]') into result
 from (select distinct value #>> '{}' id from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string') refs
 left join cms.media_objects m on m.website_id=p_site and m.id=refs.id;
 return result;
end $$;

create or replace function cms.enforce_published_media()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; asset text; media cms.media_objects;
begin
 if new.published_revision_id is null or new.published_revision_id is not distinct from old.published_revision_id then return new; end if;
 select v.payload into payload from cms.revisions v where v.id=new.published_revision_id and v.website_id=new.website_id and v.record_id=new.id;
 if new.content_type='journey' and payload ? 'media' and jsonb_typeof(payload->'media') is distinct from 'array' then raise exception 'media_verification_required'; end if;
 if exists(select 1 from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)<>'string') then raise exception 'media_verification_required'; end if;
 for asset in select distinct value #>> '{}' from jsonb_path_query(payload,'$.**.assetId') value order by 1 loop
  select * into media from cms.media_objects where website_id=new.website_id and id=asset for share;
  if not found or media.mime_type='video/mp4' or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null
   or (new.content_type in ('destination','journalArticle','settings','photoExpedition','specialist','page','homepage') and media.mime_type<>'image/webp')
   or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'media_verification_required'; end if;
 end loop;
 -- Retain the journey contract's handling of malformed entries without asset IDs.
 if new.content_type='journey' and not cms.journey_media_available(new.website_id,payload) then raise exception 'media_verification_required'; end if;

 return new;
end $$;




commit;
