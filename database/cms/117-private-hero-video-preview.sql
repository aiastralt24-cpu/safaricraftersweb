begin;
create function cms.can_read_hero_video_object(p_key text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.media_objects m join cms.uploads u on u.website_id=m.website_id and u.id::text=m.id
 where m.storage_key=p_key and p_key=m.website_id::text||'/'||m.id||'/delivery.mp4'
 and m.mime_type='video/mp4' and m.inspection_status='ready' and m.archived_at is null
 and u.status='ready' and u.inspection_version='hero-video-1' and u.mime_type='video/mp4'
 and m.has_audio is false and m.video_codec='h264' and m.video_pixel_format='yuv420p'
 and cms.can(m.website_id,'view','document'));
$$;
create function cms.get_hero_video_preview(p_site uuid,p_asset text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'site',m.website_id,'key',m.storage_key,'sha256',m.sha256,'bytes',m.byte_size)
 from cms.media_objects m where m.website_id=p_site and m.id=p_asset and cms.can_read_hero_video_object(m.storage_key);
$$;
revoke all on function cms.can_read_hero_video_object(text),cms.get_hero_video_preview(uuid,text) from public;
grant execute on function cms.can_read_hero_video_object(text) to authenticated,anon;
grant execute on function cms.get_hero_video_preview(uuid,text) to authenticated;
-- Originals stay unreadable. Only authorized processed assets gain private review access.
alter policy cms_video_private on storage.objects using(
 bucket_id not in ('cms-video-originals','cms-video-media')
 or (bucket_id='cms-video-media' and cms.can_read_hero_video_object(name)));
create policy cms_video_media_read on storage.objects for select to authenticated
 using(bucket_id='cms-video-media' and cms.can_read_hero_video_object(name));
commit;
