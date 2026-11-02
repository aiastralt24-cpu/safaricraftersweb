begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cms-enquiry-files','cms-enquiry-files',false,25000000,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
do $$ begin
 if not exists(select 1 from storage.buckets where id='cms-enquiry-files' and public=false and file_size_limit=25000000 and allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp']) then raise exception 'cms_enquiry_bucket_configuration_mismatch';end if;
end $$;
-- Even unrelated permissive storage policies must not expose applicant files.
-- Transfer, processing and recruiter download use scoped server authorization.
create policy cms_enquiry_storage_private on storage.objects as restrictive for select to public using(bucket_id<>'cms-enquiry-files');
create policy cms_enquiry_storage_no_insert on storage.objects as restrictive for insert to public with check(bucket_id<>'cms-enquiry-files');
create policy cms_enquiry_storage_no_update on storage.objects as restrictive for update to public using(bucket_id<>'cms-enquiry-files') with check(bucket_id<>'cms-enquiry-files');
create policy cms_enquiry_storage_no_delete on storage.objects as restrictive for delete to public using(bucket_id<>'cms-enquiry-files');
commit;
