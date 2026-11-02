begin;
create table cms.legal_migration_batches(
 id uuid primary key default gen_random_uuid(),website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_key uuid not null,
 source_digest text not null,review_digest text not null,manifest jsonb not null,result jsonb,created_at timestamptz not null default now(),unique(website_id,actor_id,request_key)
);
alter table cms.legal_migration_batches enable row level security;
-- Receipt access is through the permission-checking RPCs only.
create function cms.apply_legal_migration(p_site uuid,p_request uuid,p_source text,p_review text,p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare batch cms.legal_migration_batches; item jsonb; rec cms.records; saved jsonb; results jsonb:='[]'; target uuid; expected uuid;
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 if p_request is null or p_source is null or p_source !~ '^[a-f0-9]{64}$' or p_review is null or p_review !~ '^[a-f0-9]{64}$' then raise exception 'invalid_migration_identity'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 3 or octet_length(p_items::text)>1000000 then raise exception 'invalid_migration_manifest'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) v group by v->>'path' having count(*)>1) then raise exception 'duplicate_import_record'; end if;
 -- Recheck current authority even when returning a completed receipt.
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'path','') not in ('/legal/privacy','/legal/terms','/legal/cookies') or coalesce(item->>'sourceSha256','') !~ '^[a-f0-9]{64}$'
   or jsonb_typeof(item->'payload') is distinct from 'object' or item->'payload'->'composition'->'schemaVersion' is distinct from '1'::jsonb
   or length(btrim(coalesce(item->'payload'->'composition'->>'title',''))) not between 1 and 200 then raise exception 'invalid_migration_item'; end if;
  if not (item ? 'recordId') or not (item ? 'expectedRevision') then raise exception 'invalid_migration_target'; end if;
  target:=(item->>'recordId')::uuid;expected:=(item->>'expectedRevision')::uuid;
  if target is null then
   if expected is not null then raise exception 'invalid_migration_target'; end if;
   if not cms.can(p_site,'create','page',null) then raise exception 'forbidden' using errcode='42501'; end if;
  else
   if expected is null then raise exception 'invalid_migration_target'; end if;
   select * into rec from cms.records where website_id=p_site and id=target;
   if not found or rec.content_type<>'page' or rec.path<>item->>'path' or rec.locale<>'en' or not cms.can(p_site,'edit','page',target) then raise exception 'forbidden' using errcode='42501'; end if;
  end if;
 end loop;
 insert into cms.legal_migration_batches(website_id,actor_id,request_key,source_digest,review_digest,manifest) values(p_site,auth.uid(),p_request,p_source,p_review,p_items) on conflict(website_id,actor_id,request_key) do nothing;
 select * into batch from cms.legal_migration_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request for update;
 if batch.source_digest<>p_source or batch.review_digest<>p_review or batch.manifest<>p_items then raise exception 'idempotency_key_reused'; end if;
 if batch.result is not null then return batch.result; end if;
 for item in select value from jsonb_array_elements(p_items) order by value->>'path' loop
  saved:=cms.save_draft(p_site,(item->>'recordId')::uuid,(item->>'expectedRevision')::uuid,'page',item->>'path',item->'payload'->'composition'->>'title',item->'payload','en');
  results:=results||jsonb_build_array(saved||jsonb_build_object('path',item->>'path','sourceSha256',item->>'sourceSha256'));
 end loop;
 update cms.legal_migration_batches set result=results where id=batch.id;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'legal_migration.applied',jsonb_build_object('batchId',batch.id,'sourceDigest',p_source,'reviewDigest',p_review,'count',jsonb_array_length(results)));
 return results;
end $$;
create function cms.get_legal_migration_result(p_site uuid,p_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare batch cms.legal_migration_batches; item jsonb;
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 select * into batch from cms.legal_migration_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request;
 if not found or batch.result is null then return null; end if;
 for item in select value from jsonb_array_elements(batch.result) loop
  if not cms.can(p_site,'view','page',(item->>'recordId')::uuid) then raise exception 'forbidden' using errcode='42501'; end if;
 end loop;
 return jsonb_build_object('requestKey',batch.request_key,'sourceDigest',batch.source_digest,'reviewDigest',batch.review_digest,'createdAt',batch.created_at,'result',batch.result);
end $$;
revoke all on function cms.apply_legal_migration(uuid,uuid,text,text,jsonb),cms.get_legal_migration_result(uuid,uuid) from public;
grant execute on function cms.apply_legal_migration(uuid,uuid,text,text,jsonb),cms.get_legal_migration_result(uuid,uuid) to authenticated;
commit;
