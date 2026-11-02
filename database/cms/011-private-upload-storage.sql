begin;
-- Requires Supabase's managed storage schema. Apply to staging only after review.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cms-originals','cms-originals',false,25000000,array['image/jpeg','image/png','image/webp','image/avif']) on conflict(id) do nothing;
do $$ begin
 if not exists(select 1 from storage.buckets where id='cms-originals' and public=false and file_size_limit=25000000
  and allowed_mime_types=array['image/jpeg','image/png','image/webp','image/avif']) then raise exception 'cms_bucket_configuration_mismatch'; end if;
end $$;
create function cms.can_upload_object(p_key text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.uploads u where u.storage_key=p_key and u.created_by=auth.uid()
  and u.status='reserved' and u.expires_at>now() and cms.can(u.website_id,'create','document'));
$$;
create function cms.get_upload_transfer(p_site uuid,p_upload uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',u.id,'site',u.website_id,'key',u.storage_key,'mime',u.mime_type,'bytes',u.expected_bytes)
 from cms.uploads u where u.website_id=p_site and u.id=p_upload and cms.can_upload_object(u.storage_key);
$$;
revoke all on function cms.can_upload_object(text),cms.get_upload_transfer(uuid,uuid) from public;
grant execute on function cms.can_upload_object(text),cms.get_upload_transfer(uuid,uuid) to authenticated;
grant execute on function cms.can_upload_object(text) to anon;
-- Restrictive policies defend this dedicated bucket even if another application
-- has a permissive all-buckets policy. Service workers retain BYPASSRLS access.
create policy cms_original_insert_bound on storage.objects as restrictive for insert to public
 with check(bucket_id<>'cms-originals' or cms.can_upload_object(name));
create policy cms_original_insert on storage.objects for insert to authenticated
 with check(bucket_id='cms-originals' and cms.can_upload_object(name));
create policy cms_original_private on storage.objects as restrictive for select to public using(bucket_id<>'cms-originals');
create policy cms_original_no_overwrite on storage.objects as restrictive for update to public using(bucket_id<>'cms-originals') with check(bucket_id<>'cms-originals');
create policy cms_original_no_delete on storage.objects as restrictive for delete to public using(bucket_id<>'cms-originals');
commit;
