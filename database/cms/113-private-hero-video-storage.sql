begin;
-- Separate private buckets; do not widen the existing image buckets.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cms-video-originals','cms-video-originals',false,100000000,array['video/mp4']),
 ('cms-video-media','cms-video-media',false,100000000,array['video/mp4']) on conflict(id) do nothing;
do $$ begin
 if (select count(*) from storage.buckets where id in ('cms-video-originals','cms-video-media') and public=false and file_size_limit=100000000 and allowed_mime_types=array['video/mp4'])<>2 then raise exception 'cms_video_bucket_configuration_mismatch'; end if;
end $$;
create function cms.can_upload_hero_video_object(p_key text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.uploads u where u.storage_key=p_key
  and u.storage_key=u.website_id::text||'/'||u.id::text||'/original'
  and u.mime_type='video/mp4' and u.expected_bytes between 1 and 100000000
  and u.created_by=auth.uid() and u.status='reserved' and u.expires_at>now()
  and cms.can(u.website_id,'create','document'));
$$;
create function cms.get_hero_video_upload_transfer(p_site uuid,p_upload uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',u.id,'site',u.website_id,'key',u.storage_key,'mime',u.mime_type,'bytes',u.expected_bytes)
 from cms.uploads u where u.website_id=p_site and u.id=p_upload and cms.can_upload_hero_video_object(u.storage_key);
$$;
revoke all on function cms.can_upload_hero_video_object(text),cms.get_hero_video_upload_transfer(uuid,uuid) from public;
grant execute on function cms.can_upload_hero_video_object(text) to authenticated,anon;
grant execute on function cms.get_hero_video_upload_transfer(uuid,uuid) to authenticated;
-- These restrictive guards also apply when another application's permissive
-- all-buckets policy exists. Trusted storage workers retain BYPASSRLS.
create policy cms_video_original_insert_bound on storage.objects as restrictive for insert to public
 with check(bucket_id<>'cms-video-originals' or cms.can_upload_hero_video_object(name));
create policy cms_video_original_insert on storage.objects for insert to authenticated
 with check(bucket_id='cms-video-originals' and cms.can_upload_hero_video_object(name));
create policy cms_video_media_no_insert on storage.objects as restrictive for insert to public
 with check(bucket_id<>'cms-video-media');
-- No browser read path is enabled at this stage, including for processed files.
create policy cms_video_private on storage.objects as restrictive for select to public
 using(bucket_id not in ('cms-video-originals','cms-video-media'));
create policy cms_video_no_overwrite on storage.objects as restrictive for update to public
 using(bucket_id not in ('cms-video-originals','cms-video-media'))
 with check(bucket_id not in ('cms-video-originals','cms-video-media'));
create policy cms_video_no_delete on storage.objects as restrictive for delete to public
 using(bucket_id not in ('cms-video-originals','cms-video-media'));
commit;
