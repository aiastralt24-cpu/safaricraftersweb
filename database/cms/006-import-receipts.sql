begin;
alter table cms.import_batches add column review_sha256 text check(review_sha256 ~ '^[a-f0-9]{64}$');
create function cms.get_import_receipt(p_site uuid,p_request uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('sourceSha256',source_sha256,'reviewSha256',review_sha256,'result',result)
 from cms.import_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request and result is not null;
$$;
create function cms.apply_reviewed_import(p_site uuid,p_request uuid,p_source text,p_review text,p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; old_review text;
begin
 if p_review is null or p_review !~ '^[a-f0-9]{64}$' then raise exception 'invalid_review_digest'; end if;
 result:=cms.apply_import(p_site,p_request,p_source,p_items);
 select review_sha256 into old_review from cms.import_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request for update;
 if old_review is not null and old_review<>p_review then raise exception 'review_digest_conflict' using errcode='40001'; end if;
 update cms.import_batches set review_sha256=p_review where website_id=p_site and actor_id=auth.uid() and request_key=p_request;
 return result;
end $$;
revoke all on function cms.get_import_receipt(uuid,uuid),cms.apply_reviewed_import(uuid,uuid,text,text,jsonb) from public;
grant execute on function cms.get_import_receipt(uuid,uuid),cms.apply_reviewed_import(uuid,uuid,text,text,jsonb) to authenticated;
commit;
