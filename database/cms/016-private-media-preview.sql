begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cms-media','cms-media',false,25000000,array['image/webp']) on conflict(id) do nothing;
do $$ begin
 if not exists(select 1 from storage.buckets where id='cms-media' and public=false and file_size_limit=25000000 and allowed_mime_types=array['image/webp']) then raise exception 'cms_bucket_configuration_mismatch'; end if;
end $$;
create function cms.can_read_media_object(p_key text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.media_objects m where m.storage_key=p_key and m.mime_type='image/webp' and m.inspection_status='ready'
  and cms.can(m.website_id,'view','document'));
$$;
create function cms.get_media_preview(p_site uuid,p_asset text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'site',m.website_id,'key',m.storage_key,'sha256',m.sha256,'bytes',m.byte_size)
 from cms.media_objects m where m.website_id=p_site and m.id=p_asset and m.mime_type='image/webp' and m.inspection_status='ready'
  and cms.can(p_site,'view','document');
$$;
revoke all on function cms.can_read_media_object(text),cms.get_media_preview(uuid,text) from public;
grant execute on function cms.can_read_media_object(text) to authenticated,anon;
grant execute on function cms.get_media_preview(uuid,text) to authenticated;
create policy cms_media_read_bound on storage.objects as restrictive for select to public using(bucket_id<>'cms-media' or cms.can_read_media_object(name));
create policy cms_media_read on storage.objects for select to authenticated using(bucket_id='cms-media' and cms.can_read_media_object(name));
create policy cms_media_no_insert on storage.objects as restrictive for insert to public with check(bucket_id<>'cms-media');
create policy cms_media_no_update on storage.objects as restrictive for update to public using(bucket_id<>'cms-media') with check(bucket_id<>'cms-media');
create policy cms_media_no_delete on storage.objects as restrictive for delete to public using(bucket_id<>'cms-media');
commit;
