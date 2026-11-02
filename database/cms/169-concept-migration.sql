begin;
create table cms.concept_migration_batches(
 id uuid primary key default gen_random_uuid(),website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_key uuid not null,
 source_digest text not null,review_digest text not null,manifest jsonb not null,result jsonb,created_at timestamptz not null default now(),unique(website_id,actor_id,request_key)
);
alter table cms.concept_migration_batches enable row level security;
create function cms.apply_concept_migration(p_site uuid,p_request uuid,p_source text,p_review text,p_manifest jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare batch cms.concept_migration_batches; rec cms.records; target uuid; expected uuid; binding jsonb; m cms.media_objects; related cms.records; reference jsonb; observed jsonb; current_evidence jsonb:='[]'; saved jsonb;
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 if p_request is null or p_source is null or p_source!~'^[a-f0-9]{64}$' or p_review is null or p_review!~'^[a-f0-9]{64}$' then raise exception 'invalid_migration_identity'; end if;
 if p_manifest is null or jsonb_typeof(p_manifest)<>'object' or octet_length(p_manifest::text)>1000000
  or not(p_manifest ?& array['recordId','expectedRevision','payload','bindings','evidence','records']) then raise exception 'invalid_migration_manifest'; end if;
 if jsonb_typeof(p_manifest->'payload') is distinct from 'object' or p_manifest->'payload'->'composition'->'schemaVersion' is distinct from '1'::jsonb
  or p_manifest->'payload'->'navigation'->'schemaVersion' is distinct from '1'::jsonb
  or jsonb_typeof(p_manifest->'payload'->'navigation'->'primary') is distinct from 'array'
  or length(btrim(coalesce(p_manifest->'payload'->'composition'->>'title',''))) not between 1 and 200
  or jsonb_typeof(p_manifest->'bindings') is distinct from 'array' or jsonb_typeof(p_manifest->'evidence') is distinct from 'array' then raise exception 'invalid_migration_manifest'; end if;
 if jsonb_array_length(p_manifest->'bindings') not between 1 and 1000 or jsonb_array_length(p_manifest->'evidence')<>jsonb_array_length(p_manifest->'bindings') or jsonb_typeof(p_manifest->'records') is distinct from 'array' then raise exception 'invalid_migration_manifest'; end if;
 target:=(p_manifest->>'recordId')::uuid;expected:=(p_manifest->>'expectedRevision')::uuid;
 if target is null then
  if expected is not null then raise exception 'invalid_migration_target'; end if;
  if not cms.can(p_site,'create','page',null) then raise exception 'forbidden' using errcode='42501'; end if;
 else
  if expected is null then raise exception 'invalid_migration_target'; end if;
  select * into rec from cms.records where website_id=p_site and id=target for update;
  if not found or rec.content_type is distinct from 'page' or rec.path is distinct from '/concept' or rec.locale is distinct from 'en' or not cms.can(p_site,'edit','page',target) then raise exception 'forbidden' using errcode='42501'; end if;
 end if;
 -- Current authority is required even for completed retries. The saved result is immutable.
 insert into cms.concept_migration_batches(website_id,actor_id,request_key,source_digest,review_digest,manifest) values(p_site,auth.uid(),p_request,p_source,p_review,p_manifest) on conflict(website_id,actor_id,request_key) do nothing;
 select * into batch from cms.concept_migration_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request for update;
 if batch.source_digest<>p_source or batch.review_digest<>p_review or batch.manifest<>p_manifest then raise exception 'idempotency_key_reused'; end if;
 if batch.result is not null then
  if not cms.can(p_site,'view','page',(batch.result->>'recordId')::uuid) then raise exception 'forbidden' using errcode='42501'; end if;
  return batch.result;
 end if;
 if target is not null and rec.current_revision_id is distinct from expected then raise exception 'revision_conflict' using errcode='40001'; end if;
 -- Validate all identities before locking dependencies. This creates a draft,
 -- not a receipt asserting source fidelity or publication readiness.
 if jsonb_array_length(p_manifest->'records')>1000
  or (select count(distinct value->>'assetId') from jsonb_array_elements(p_manifest->'bindings'))<>jsonb_array_length(p_manifest->'bindings')
  or (select count(distinct value->>'recordId') from jsonb_array_elements(p_manifest->'records'))<>jsonb_array_length(p_manifest->'records') then raise exception 'invalid_migration_manifest'; end if;
 for binding in select value from jsonb_array_elements(p_manifest->'bindings') loop
  if jsonb_typeof(binding) is distinct from 'object' or binding->>'kind' not in ('image','video') or binding->>'kind' is null
   or coalesce(binding->>'assetId','')!~'^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$' or coalesce(binding->>'sourceSha256','')!~'^[a-f0-9]{64}$' then raise exception 'invalid_migration_manifest'; end if;
 end loop;
 for reference in select value from jsonb_array_elements(p_manifest->'records') order by value->>'recordId' loop
  if jsonb_typeof(reference) is distinct from 'object' or reference->>'type' not in ('journey','photoExpedition','testimonial') or reference->>'type' is null
   or reference->>'recordId' is null or reference->>'revisionId' is null then raise exception 'invalid_migration_manifest'; end if;
  select * into related from cms.records where website_id=p_site and id=(reference->>'recordId')::uuid for share;
  if not found or related.id=target or related.content_type is distinct from reference->>'type' or related.path is distinct from reference->>'path' or related.locale<>'en'
   or not cms.can(p_site,'view',related.content_type,related.id) then raise exception 'migration_reference_unavailable'; end if;
  if related.current_revision_id is distinct from (reference->>'revisionId')::uuid then raise exception 'migration_reference_changed' using errcode='40001'; end if;
 end loop;
 -- Every selected reference must belong to the reviewed mapping; mapped records
 -- may also supply source-only images checked during the server's comparison.
 for reference in select value from jsonb_path_query(p_manifest->'payload','$.**.recordId') value loop
  if not exists(select 1 from jsonb_array_elements(p_manifest->'records') r where r->'recordId'=reference) then raise exception 'migration_reference_mismatch'; end if;
 end loop;
 for reference in select value from jsonb_path_query(p_manifest->'payload','$.**.assetId') value loop
  if not exists(select 1 from jsonb_array_elements(p_manifest->'bindings') b where b->>'kind'='image' and b->'assetId'=reference) then raise exception 'migration_media_mismatch'; end if;
 end loop;
 for reference in select value from jsonb_path_query(p_manifest->'payload','$.**.desktopAssetId') value union select value from jsonb_path_query(p_manifest->'payload','$.**.mobileAssetId') value loop
  if not exists(select 1 from jsonb_array_elements(p_manifest->'bindings') b where b->>'kind'='video' and b->'assetId'=reference) then raise exception 'migration_media_mismatch'; end if;
 end loop;
 perform 1 from cms.uploads where website_id=p_site and id::text in(select value->>'assetId' from jsonb_array_elements(p_manifest->'bindings')) order by id for share;
 perform 1 from cms.media_objects where website_id=p_site and id in(select value->>'assetId' from jsonb_array_elements(p_manifest->'bindings')) order by id for share;
 for binding in select value from jsonb_array_elements(p_manifest->'bindings') loop
  observed:=case when binding->>'kind'='video' then cms.review_hero_video_migration_media(p_site,jsonb_build_array(binding-'kind')) else cms.review_about_migration_media(p_site,jsonb_build_array(binding-'kind')) end;
  if observed->0->'available' is distinct from 'true'::jsonb then raise exception 'migration_media_unavailable'; end if;
  select * into m from cms.media_objects where website_id=p_site and id=binding->>'assetId';
  if m.rights_expires_at is not null and m.rights_expires_at<=clock_timestamp() then raise exception 'migration_media_unavailable'; end if;
  current_evidence:=current_evidence||observed;
 end loop;
 if current_evidence<>p_manifest->'evidence' then raise exception 'migration_media_changed' using errcode='40001'; end if;
 saved:=cms.save_draft(p_site,target,expected,'page','/concept',p_manifest->'payload'->'composition'->>'title',p_manifest->'payload','en');
 update cms.concept_migration_batches set result=saved where id=batch.id;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'concept_migration.applied',jsonb_build_object('batchId',batch.id,'sourceDigest',p_source,'reviewDigest',p_review,'recordId',saved->>'recordId'));
 return saved;
end $$;
create function cms.get_concept_migration_result(p_site uuid,p_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare batch cms.concept_migration_batches;
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 select * into batch from cms.concept_migration_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request;
 if not found or batch.result is null then return null; end if;
 if not cms.can(p_site,'view','page',(batch.result->>'recordId')::uuid) then raise exception 'forbidden' using errcode='42501'; end if;
 return jsonb_build_object('requestKey',batch.request_key,'sourceDigest',batch.source_digest,'reviewDigest',batch.review_digest,'createdAt',batch.created_at,'result',batch.result);
end $$;
revoke all on function cms.apply_concept_migration(uuid,uuid,text,text,jsonb),cms.get_concept_migration_result(uuid,uuid) from public;
grant execute on function cms.apply_concept_migration(uuid,uuid,text,text,jsonb),cms.get_concept_migration_result(uuid,uuid) to authenticated;
commit;
