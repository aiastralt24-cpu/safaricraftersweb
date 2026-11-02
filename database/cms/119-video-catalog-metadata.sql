begin;
create or replace function cms.get_media(p_site uuid,p_asset text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'revision',m.revision,'title',m.title,'description',m.description,'alt',m.default_alt,'caption',m.caption,'folder',m.folder,'tags',m.tags,
 'durationSeconds',m.duration_seconds,'framesPerSecond',m.frames_per_second,'hasAudio',m.has_audio,
 'videoCodec',m.video_codec,'videoPixelFormat',m.video_pixel_format,'videoVerified',case when m.mime_type='video/mp4' then cms.can_read_hero_video_object(m.storage_key) else false end,
 'mime',m.mime_type,'bytes',m.byte_size,'width',m.width,'height',m.height,'inspectionStatus',m.inspection_status,
 'rightsStatus',m.rights_status,'rightsExpiresAt',m.rights_expires_at,'archivedAt',m.archived_at,
 'rightsEvidence',case when cms.can(p_site,'configure','document') then m.rights_evidence else null end,
 'canArchive',cms.can(p_site,'delete','document'),'canEdit',cms.can(p_site,'edit','document'),'canManageRights',cms.can(p_site,'configure','document'))
 from cms.media_objects m where m.website_id=p_site and m.id=p_asset and cms.can(p_site,'view','document');
$$;
commit;
