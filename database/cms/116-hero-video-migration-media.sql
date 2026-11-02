begin;
-- Read-only evidence; draft application must recheck under transaction locks.
create function cms.review_hero_video_migration_media(p_site uuid,p_bindings jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare item jsonb; result jsonb:='[]'; m cms.media_objects; u cms.uploads; matches boolean;
begin
 if not cms.can(p_site,'view','document') then raise exception 'forbidden' using errcode='42501'; end if;
 if p_bindings is null or jsonb_typeof(p_bindings)<>'array' then raise exception 'invalid_video_media_bindings'; end if;
 if jsonb_array_length(p_bindings) not between 1 and 4 then raise exception 'invalid_video_media_bindings'; end if;
 if (select count(distinct value->>'assetId') from jsonb_array_elements(p_bindings))<>jsonb_array_length(p_bindings) then raise exception 'invalid_video_media_bindings'; end if;
 for item in select value from jsonb_array_elements(p_bindings) loop
  if jsonb_typeof(item)<>'object' then raise exception 'invalid_video_media_bindings'; end if;
  if not(item ?& array['assetId','sourceSha256']) or (select count(*) from jsonb_object_keys(item))<>2
   or jsonb_typeof(item->'assetId')<>'string' or coalesce(item->>'assetId','')!~'^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$'
   or jsonb_typeof(item->'sourceSha256')<>'string' or coalesce(item->>'sourceSha256','')!~'^[a-f0-9]{64}$' then raise exception 'invalid_video_media_bindings'; end if;
  select * into m from cms.media_objects where website_id=p_site and id=item->>'assetId';
  select * into u from cms.uploads where website_id=p_site and id::text=item->>'assetId';
  matches:=coalesce(u.status='ready' and u.inspection_version='hero-video-1' and u.mime_type='video/mp4' and u.original_sha256=item->>'sourceSha256'
   and m.storage_key=p_site::text||'/'||u.id::text||'/delivery.mp4',false);
  result:=result||jsonb_build_array(jsonb_build_object('assetId',item->>'assetId','sourceSha256',item->>'sourceSha256',
   'sourceMatches',matches,'revision',m.revision,'processedSha256',m.sha256,
   'available',coalesce(matches and m.mime_type='video/mp4' and m.has_audio is false and m.video_codec='h264' and m.video_pixel_format='yuv420p'
    and m.duration_seconds>0 and m.duration_seconds<=180 and m.frames_per_second=30
    and m.width between 2 and 1920 and m.height between 2 and 1920 and m.width%2=0 and m.height%2=0 and m.inspection_status='ready' and m.archived_at is null
    and m.rights_status='approved' and length(trim(m.rights_evidence))>0 and (m.rights_expires_at is null or m.rights_expires_at>now()),false)));
 end loop;
 return result;
end $$;
revoke all on function cms.review_hero_video_migration_media(uuid,jsonb) from public;
grant execute on function cms.review_hero_video_migration_media(uuid,jsonb) to authenticated;
commit;
