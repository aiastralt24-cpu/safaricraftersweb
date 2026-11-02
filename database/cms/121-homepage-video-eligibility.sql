begin;
create function cms.hero_video_available(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.media_objects m join cms.uploads u on u.website_id=m.website_id and u.id::text=m.id
 where m.website_id=p_site and m.id=p_asset and m.storage_key=p_site::text||'/'||m.id||'/delivery.mp4'
 and m.mime_type='video/mp4' and m.inspection_status='ready' and m.archived_at is null
 and m.rights_status='approved' and length(trim(m.rights_evidence))>0 and (m.rights_expires_at is null or m.rights_expires_at>now())
 and u.status='ready' and u.mime_type='video/mp4' and u.inspection_version='hero-video-1' and u.original_sha256 ~ '^[a-f0-9]{64}$'
 and m.has_audio is false and m.video_codec='h264' and m.video_pixel_format='yuv420p'
 and m.duration_seconds>0 and m.duration_seconds<=180 and m.frames_per_second=30
 and m.width between 2 and 1920 and m.height between 2 and 1920 and m.width%2=0 and m.height%2=0);
$$;
create function cms.record_videos_available(p_site uuid,p_type text,p_payload jsonb)
returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from (
  select value from jsonb_path_query(p_payload,'$.**.desktopAssetId') value
  union all select value from jsonb_path_query(p_payload,'$.**.mobileAssetId') value
 ) refs where p_type<>'homepage' or jsonb_typeof(value)<>'string' or not cms.hero_video_available(p_site,value #>> '{}'));
$$;
revoke all on function cms.hero_video_available(uuid,text),cms.record_videos_available(uuid,text,jsonb) from public;
create or replace function cms.record_media_available(p_site uuid,p_type text,p_payload jsonb)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.record_videos_available(p_site,p_type,p_payload) and (p_type<>'journey' or cms.journey_media_available(p_site,p_payload)) and not exists(
  select 1 from jsonb_path_query(p_payload,'$.**.assetId') value
  left join cms.media_objects m on m.website_id=p_site and m.id=value #>> '{}'
  where jsonb_typeof(value)<>'string' or m.id is null or m.inspection_status<>'ready'
   or m.mime_type='video/mp4' or m.rights_status<>'approved' or m.archived_at is not null
   or (p_type in ('destination','journalArticle','settings','photoExpedition','specialist','page','homepage') and m.mime_type<>'image/webp')
   or (m.rights_expires_at is not null and m.rights_expires_at<=now())
 );
$$;

create function cms.enforce_published_videos()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; asset text;
begin
 if new.published_revision_id is null or new.published_revision_id is not distinct from old.published_revision_id then return new; end if;
 select v.payload into payload from cms.revisions v where v.id=new.published_revision_id and v.website_id=new.website_id and v.record_id=new.id;
 for asset in select distinct value #>> '{}' from (
  select value from jsonb_path_query(payload,'$.**.desktopAssetId') value
  union all select value from jsonb_path_query(payload,'$.**.mobileAssetId') value
 ) refs where jsonb_typeof(value)='string' order by 1 loop
  -- Match upload completion's upload-before-media lock order.
  perform 1 from cms.uploads where website_id=new.website_id and id::text=asset for share;
  perform 1 from cms.media_objects where website_id=new.website_id and id=asset for share;
 end loop;
 if not cms.record_videos_available(new.website_id,new.content_type,payload) then raise exception 'media_verification_required'; end if;
 return new;
end $$;
revoke all on function cms.enforce_published_videos() from public;
create trigger cms_published_video_check before update of published_revision_id on cms.records for each row execute function cms.enforce_published_videos();
commit;
