begin;
-- Trusted worker lookup only; never accept expected sizes or object keys from an event payload.
create function cms.get_hero_video_reception(p_site uuid,p_upload uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',u.id,'site',u.website_id,'key',u.storage_key,'bytes',u.expected_bytes,'mime',u.mime_type)
 from cms.uploads u where u.website_id=p_site and u.id=p_upload
 and u.mime_type='video/mp4' and u.status='reserved' and u.expires_at>now()
 and u.expected_bytes between 1 and 100000000
 and u.storage_key=p_site::text||'/'||p_upload::text||'/original'
$$;
revoke all on function cms.get_hero_video_reception(uuid,uuid) from public;
grant execute on function cms.get_hero_video_reception(uuid,uuid) to service_role;
commit;
