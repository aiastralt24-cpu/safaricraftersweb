begin;
create function cms.can_read_published_hero_video(p_key text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.media_objects m where m.storage_key=p_key
 and p_key=m.website_id::text||'/'||m.id||'/delivery.mp4'
 and cms.hero_video_is_published(m.website_id,m.id));
$$;
revoke all on function cms.can_read_published_hero_video(text) from public;
grant execute on function cms.can_read_published_hero_video(text) to anon,authenticated;
alter policy cms_video_private on storage.objects using(
 bucket_id not in ('cms-video-originals','cms-video-media')
 or (bucket_id='cms-video-media' and (cms.can_read_hero_video_object(name) or cms.can_read_published_hero_video(name))));
create policy cms_video_published_read on storage.objects for select to anon,authenticated
 using(bucket_id='cms-video-media' and cms.can_read_published_hero_video(name));
commit;
