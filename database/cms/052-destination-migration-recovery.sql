begin;
create function cms.get_destination_migration_result(p_site uuid,p_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare batch cms.destination_migration_batches;
begin
 if not cms.can(p_site,'create','destination',null) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_request is null then raise exception 'invalid_migration_identity'; end if;
 select * into batch from cms.destination_migration_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request;
 if not found or batch.result is null then return null; end if;
 return jsonb_build_object('requestKey',batch.request_key,'sourceDigest',batch.source_digest,'reviewDigest',batch.review_digest,'createdAt',batch.created_at,'result',batch.result);
end $$;
revoke all on function cms.get_destination_migration_result(uuid,uuid) from public;
grant execute on function cms.get_destination_migration_result(uuid,uuid) to authenticated;
commit;
