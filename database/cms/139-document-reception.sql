begin;
-- Trusted worker lookup only; never accept expected sizes or object keys from an event payload.
create function cms.get_document_reception(p_site uuid,p_upload uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',u.id,'site',u.website_id,'key',u.storage_key,'bytes',u.expected_bytes,'mime',u.mime_type)
 from cms.uploads u where u.website_id=p_site and u.id=p_upload
 and u.mime_type='application/pdf' and u.status='reserved' and u.expires_at>now()
 and u.expected_bytes between 1 and 25000000
 and u.storage_key=p_site::text||'/'||p_upload::text||'/original'
$$;
revoke all on function cms.get_document_reception(uuid,uuid) from public;
grant execute on function cms.get_document_reception(uuid,uuid) to service_role;


create function cms.list_document_receptions(p_limit integer default 5)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if p_limit is null or p_limit<1 or p_limit>20 then raise exception 'invalid_document_batch'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('site',q.website_id,'id',q.id)) from (
  select u.website_id,u.id from cms.uploads u
  where u.mime_type='application/pdf' and u.status='reserved' and u.expires_at>now()
   and exists(select 1 from storage.objects o where o.bucket_id='cms-document-originals' and o.name=u.storage_key)
  order by u.created_at,u.id limit p_limit
 ) q),'[]'::jsonb);
end $$;
revoke all on function cms.list_document_receptions(integer) from public;
grant execute on function cms.list_document_receptions(integer) to service_role;
commit;
