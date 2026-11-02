begin;
create function cms.media_is_published(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=p_asset
  and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null
  and (m.rights_expires_at is null or m.rights_expires_at>now())
  and exists(select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
   where r.website_id=p_site and r.content_type in ('journey','page','homepage') and r.path is not null
   and cms.record_media_available(p_site,r.content_type,v.payload)
   and exists(select 1 from jsonb_path_query(v.payload,'$.**.assetId') value where value=to_jsonb(p_asset))));
$$;
create function cms.get_public_media(p_site uuid,p_asset text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'site',m.website_id,'key',m.storage_key,'sha256',m.sha256,'bytes',m.byte_size)
 from cms.media_objects m where m.website_id=p_site and m.id=p_asset and cms.media_is_published(p_site,p_asset);
$$;
create or replace function cms.can_read_media_object(p_key text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.media_objects m where m.storage_key=p_key and m.mime_type='image/webp' and m.inspection_status='ready'
  and (cms.can(m.website_id,'view','document') or cms.media_is_published(m.website_id,m.id)));
$$;
-- The bucket remains private. Anonymous reads must pass the restrictive policy
-- and this explicit publication check; originals retain their separate private policy.
create policy cms_media_public_read on storage.objects for select to anon using(bucket_id='cms-media' and cms.can_read_media_object(name));
revoke all on function cms.media_is_published(uuid,text),cms.get_public_media(uuid,text) from public;
grant execute on function cms.get_public_media(uuid,text) to anon,authenticated;
commit;
