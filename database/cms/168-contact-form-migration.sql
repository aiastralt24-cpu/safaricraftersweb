begin;
create table cms.contact_form_migration_batches(
 id uuid primary key default gen_random_uuid(),website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_key uuid not null,
 source_digest text not null,review_digest text not null,manifest jsonb not null,result jsonb,created_at timestamptz not null default now(),unique(website_id,actor_id,request_key)
);
alter table cms.contact_form_migration_batches enable row level security;
create function cms.apply_contact_form_migration(p_site uuid,p_request uuid,p_source text,p_review text,p_manifest jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare batch cms.contact_form_migration_batches; item jsonb; rec cms.records; saved jsonb; results jsonb:='[]'; target uuid; expected uuid;
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 if p_request is null or p_source is null or p_source!~'^[a-f0-9]{64}$' or p_review is null or p_review!~'^[a-f0-9]{64}$' then raise exception 'invalid_migration_identity'; end if;
 if p_manifest is null or jsonb_typeof(p_manifest) is distinct from 'array' or octet_length(p_manifest::text)>500000 then raise exception 'invalid_migration_manifest'; end if;
 if jsonb_array_length(p_manifest)<>2 or p_manifest->0->>'variant' is distinct from 'contact' or p_manifest->1->>'variant' is distinct from 'corporate' then raise exception 'invalid_migration_manifest'; end if;
 if p_manifest->0->>'recordId' is not null and p_manifest->0->>'recordId'=p_manifest->1->>'recordId' then raise exception 'invalid_migration_target'; end if;
 -- Deterministic target locks cover replacements and prevent partial stale updates.
 perform 1 from cms.records where website_id=p_site and id in(select (value->>'recordId')::uuid from jsonb_array_elements(p_manifest)) order by id for update;
 for item in select value from jsonb_array_elements(p_manifest) loop
  if jsonb_typeof(item) is distinct from 'object' or not(item ?& array['variant','recordId','expectedRevision','payload']) or (select count(*) from jsonb_object_keys(item))<>4
   or item->'payload'->'schemaVersion' is distinct from '1'::jsonb or jsonb_typeof(item->'payload'->'fields') is distinct from 'array'
   or length(btrim(coalesce(item->'payload'->>'title',''))) not between 1 and 200 then raise exception 'invalid_migration_manifest'; end if;
  target:=(item->>'recordId')::uuid;expected:=(item->>'expectedRevision')::uuid;
  if target is null then
   if expected is not null then raise exception 'invalid_migration_target'; end if;
   if not cms.can(p_site,'create','form',null) then raise exception 'forbidden' using errcode='42501'; end if;
  else
   if expected is null then raise exception 'invalid_migration_target'; end if;
   select * into rec from cms.records where website_id=p_site and id=target;
   if not found or rec.content_type<>'form' or rec.locale<>'en' or not cms.can(p_site,'edit','form',target) then raise exception 'forbidden' using errcode='42501'; end if;
  end if;
 end loop;
 insert into cms.contact_form_migration_batches(website_id,actor_id,request_key,source_digest,review_digest,manifest) values(p_site,auth.uid(),p_request,p_source,p_review,p_manifest) on conflict(website_id,actor_id,request_key) do nothing;
 select * into batch from cms.contact_form_migration_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request for update;
 if batch.source_digest<>p_source or batch.review_digest<>p_review or batch.manifest<>p_manifest then raise exception 'idempotency_key_reused'; end if;
 if batch.result is not null then
  for item in select value from jsonb_array_elements(batch.result) loop
   if not cms.can(p_site,'view','form',(item->>'recordId')::uuid) then raise exception 'forbidden' using errcode='42501'; end if;
  end loop;
  return batch.result;
 end if;
 for item in select value from jsonb_array_elements(p_manifest) loop
  saved:=cms.save_draft(p_site,(item->>'recordId')::uuid,(item->>'expectedRevision')::uuid,'form',null,item->'payload'->>'title',item->'payload','en');
  results:=results||jsonb_build_array(saved||jsonb_build_object('variant',item->>'variant'));
 end loop;
 update cms.contact_form_migration_batches set result=results where id=batch.id;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'contact_form_migration.applied',jsonb_build_object('batchId',batch.id,'sourceDigest',p_source,'reviewDigest',p_review,'results',results));
 return results;
end $$;
create function cms.get_contact_form_migration_result(p_site uuid,p_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare batch cms.contact_form_migration_batches; item jsonb;
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 select * into batch from cms.contact_form_migration_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request;
 if not found or batch.result is null then return null; end if;
 for item in select value from jsonb_array_elements(batch.result) loop
  if not cms.can(p_site,'view','form',(item->>'recordId')::uuid) then raise exception 'forbidden' using errcode='42501'; end if;
 end loop;
 return jsonb_build_object('requestKey',batch.request_key,'sourceDigest',batch.source_digest,'reviewDigest',batch.review_digest,'createdAt',batch.created_at,'result',batch.result);
end $$;
revoke all on function cms.apply_contact_form_migration(uuid,uuid,text,text,jsonb),cms.get_contact_form_migration_result(uuid,uuid) from public;
grant execute on function cms.apply_contact_form_migration(uuid,uuid,text,text,jsonb),cms.get_contact_form_migration_result(uuid,uuid) to authenticated;
commit;
