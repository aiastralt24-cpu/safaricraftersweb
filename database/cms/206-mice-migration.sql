begin;
-- Compatibility guard for an already published form; generic form validation remains
-- the publication worker's responsibility. No private definition leaves the review RPC.
create function cms.mice_form_compatible(p_definition jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare required_field jsonb; field jsonb; destination jsonb;
begin
 if jsonb_typeof(p_definition) is distinct from 'object' or p_definition->'schemaVersion' is distinct from '1'::jsonb
  or jsonb_typeof(p_definition->'fields') is distinct from 'array' or p_definition->'notificationRouteIds' is distinct from '[]'::jsonb then return false; end if;
 if jsonb_array_length(p_definition->'fields') not between 7 and 50
  or (select count(distinct value->>'id') from jsonb_array_elements(p_definition->'fields'))<>jsonb_array_length(p_definition->'fields')
  or exists(select 1 from jsonb_array_elements(p_definition->'fields') where jsonb_typeof(value) is distinct from 'object' or value->>'type' is null or value->>'type'='file') then return false; end if;
 for required_field in select value from jsonb_array_elements('[ ["name","name",true], ["email","email",true], ["phone","phone",true], ["company","organization",false], ["destination","select",false], ["message","message",false], ["consent","consent",true]]') loop
  select value into field from jsonb_array_elements(p_definition->'fields') where value->>'id'=required_field->>0;
  if not found or field->'type' is distinct from required_field->1 or field->'required' is distinct from required_field->2 or field ? 'showWhen' then return false; end if;
  if field->>'id'='consent' and field->>'purpose' is distinct from 'enquiry' then return false; end if;
  if field->>'id'='destination' then destination:=field; end if;
 end loop;
 if jsonb_typeof(destination->'options') is distinct from 'array' or jsonb_typeof(destination->'defaultOptionId') is distinct from 'string' then return false; end if;
 if jsonb_array_length(destination->'options') not between 1 and 100
  or (select count(distinct value->>'id') from jsonb_array_elements(destination->'options'))<>jsonb_array_length(destination->'options')
  or not exists(select 1 from jsonb_array_elements(destination->'options') where value->'id'=destination->'defaultOptionId') then return false; end if;
 return true;
end $$;
revoke all on function cms.mice_form_compatible(jsonb) from public;
create function cms.review_mice_migration_form(p_site uuid,p_form uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare form jsonb;
begin
 if auth.uid() is null or not cms.can(p_site,'view','form',p_form) then raise exception 'forbidden' using errcode='42501'; end if;
 form:=cms.get_published_form(p_site,p_form);
 return jsonb_build_object('recordId',p_form,'revisionId',form->'revisionId','locale',form->'locale','available',coalesce(form->>'locale'='en' and cms.mice_form_compatible(form->'definition'),false));
end $$;
revoke all on function cms.review_mice_migration_form(uuid,uuid) from public;
grant execute on function cms.review_mice_migration_form(uuid,uuid) to authenticated;

create table cms.mice_migration_batches(
 id uuid primary key default gen_random_uuid(),website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_key uuid not null,
 source_digest text not null,review_digest text not null,manifest jsonb not null,result jsonb,created_at timestamptz not null default now(),unique(website_id,actor_id,request_key)
);
alter table cms.mice_migration_batches enable row level security;
create function cms.apply_mice_migration(p_site uuid,p_request uuid,p_source text,p_review text,p_manifest jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare batch cms.mice_migration_batches; rec cms.records; target uuid; expected uuid; binding jsonb; m cms.media_objects; u cms.uploads; current_evidence jsonb:='[]'; saved jsonb; refs jsonb; matches boolean; available boolean; form_record cms.records; form_evidence jsonb;
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 if p_request is null or p_source is null or p_source!~'^[a-f0-9]{64}$' or p_review is null or p_review!~'^[a-f0-9]{64}$' then raise exception 'invalid_migration_identity'; end if;
 if p_manifest is null or jsonb_typeof(p_manifest)<>'object' or octet_length(p_manifest::text)>1000000
  or not(p_manifest ?& array['recordId','expectedRevision','payload','bindings','evidence','formBinding']) or p_manifest-'recordId'-'expectedRevision'-'payload'-'bindings'-'evidence'-'formBinding'<>'{}'::jsonb then raise exception 'invalid_migration_manifest'; end if;
 if jsonb_typeof(p_manifest->'payload') is distinct from 'object' or p_manifest->'payload'->'composition'->'schemaVersion' is distinct from '1'::jsonb
  or length(btrim(coalesce(p_manifest->'payload'->'composition'->>'title',''))) not between 1 and 200
  or jsonb_typeof(p_manifest->'bindings') is distinct from 'array' or jsonb_typeof(p_manifest->'evidence') is distinct from 'array' then raise exception 'invalid_migration_manifest'; end if;
 if jsonb_array_length(p_manifest->'bindings')<>2 or jsonb_array_length(p_manifest->'evidence')<>2 then raise exception 'invalid_migration_manifest'; end if;
 if jsonb_typeof(p_manifest->'formBinding') is distinct from 'object' or not(p_manifest->'formBinding' ?& array['recordId','revisionId','locale'])
  or (p_manifest->'formBinding')-'recordId'-'revisionId'-'locale'<>'{}'::jsonb
  or jsonb_typeof(p_manifest->'formBinding'->'recordId') is distinct from 'string'
  or jsonb_typeof(p_manifest->'formBinding'->'revisionId') is distinct from 'string'
  or p_manifest->'formBinding'->>'locale' is distinct from 'en'
  or jsonb_typeof(p_manifest->'payload'->'composition'->'sections') is distinct from 'array' then raise exception 'invalid_migration_manifest'; end if;
 perform (p_manifest->'formBinding'->>'recordId')::uuid,(p_manifest->'formBinding'->>'revisionId')::uuid;
 target:=(p_manifest->>'recordId')::uuid;expected:=(p_manifest->>'expectedRevision')::uuid;
 if target is null then
  if expected is not null then raise exception 'invalid_migration_target'; end if;
  if not cms.can(p_site,'create','page',null) then raise exception 'forbidden' using errcode='42501'; end if;
 else
  if expected is null then raise exception 'invalid_migration_target'; end if;
  select * into rec from cms.records where website_id=p_site and id=target for update;
  if not found or rec.content_type is distinct from 'page' or rec.path is distinct from '/mice' or rec.locale is distinct from 'en' or not cms.can(p_site,'edit','page',target) then raise exception 'forbidden' using errcode='42501'; end if;
 end if;
 -- Current authority is required even for completed retries. The saved result is immutable.
 insert into cms.mice_migration_batches(website_id,actor_id,request_key,source_digest,review_digest,manifest) values(p_site,auth.uid(),p_request,p_source,p_review,p_manifest) on conflict(website_id,actor_id,request_key) do nothing;
 select * into batch from cms.mice_migration_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request for update;
 if batch.source_digest<>p_source or batch.review_digest<>p_review or batch.manifest<>p_manifest then raise exception 'idempotency_key_reused'; end if;
 if batch.result is not null then
  if not cms.can(p_site,'view','page',(batch.result->>'recordId')::uuid) then raise exception 'forbidden' using errcode='42501'; end if;
  return batch.result;
 end if;
 if target is not null and rec.current_revision_id is distinct from expected then raise exception 'revision_conflict' using errcode='40001'; end if;
 -- Validate identities before locks. This read-only call cannot authorize the write.
 perform cms.review_contact_migration_media(p_site,p_manifest->'bindings');
 select coalesce(jsonb_agg(id order by id),'[]') into refs from (select distinct value#>>'{}' id from jsonb_path_query(p_manifest->'payload','$.**.assetId') as found(value)) assets;
 if refs is distinct from (select jsonb_agg(value->>'assetId' order by value->>'assetId') from jsonb_array_elements(p_manifest->'bindings')) then raise exception 'migration_media_mismatch'; end if;
 perform 1 from cms.uploads where website_id=p_site and id::text in(select value->>'assetId' from jsonb_array_elements(p_manifest->'bindings')) order by id for share;
 perform 1 from cms.media_objects where website_id=p_site and id in(select value->>'assetId' from jsonb_array_elements(p_manifest->'bindings')) order by id for share;
 for binding in select value from jsonb_array_elements(p_manifest->'bindings') loop
  select * into m from cms.media_objects where website_id=p_site and id=binding->>'assetId';
  select * into u from cms.uploads where website_id=p_site and id::text=binding->>'assetId';
  matches:=coalesce(u.status='ready' and u.inspection_version='image-1' and u.original_sha256=binding->>'sourceSha256' and m.storage_key=p_site::text||'/'||u.id::text||'/delivery.webp',false);
  available:=coalesce(matches and m.mime_type='image/webp' and m.inspection_status='ready' and m.archived_at is null and m.rights_status='approved' and length(trim(m.rights_evidence))>0 and (m.rights_expires_at is null or m.rights_expires_at>clock_timestamp()),false);
  if not available then raise exception 'migration_media_unavailable'; end if;
  current_evidence:=current_evidence||jsonb_build_array(jsonb_build_object('assetId',binding->>'assetId','sourceSha256',binding->>'sourceSha256','sourceMatches',matches,'revision',m.revision,'processedSha256',m.sha256,'available',available));
 end loop;
 if current_evidence<>p_manifest->'evidence' then raise exception 'migration_media_changed' using errcode='40001'; end if;
 -- Bind only the reviewed, same-site published form. Lock its pointer through save.
 select * into form_record from cms.records where website_id=p_site and id=(p_manifest->'formBinding'->>'recordId')::uuid for share;
 if not found or form_record.content_type is distinct from 'form' or not cms.can(p_site,'view','form',form_record.id) then raise exception 'forbidden' using errcode='42501'; end if;
 form_evidence:=cms.review_mice_migration_form(p_site,form_record.id);
 if form_evidence->'available' is distinct from 'true'::jsonb then raise exception 'migration_form_unavailable'; end if;
 if form_evidence-'available' is distinct from p_manifest->'formBinding' then raise exception 'migration_form_changed' using errcode='40001'; end if;
 if (select count(*) from jsonb_array_elements(p_manifest->'payload'->'composition'->'sections') where value->>'kind'='miceEnquiry')<>1
  or not exists(select 1 from jsonb_array_elements(p_manifest->'payload'->'composition'->'sections') where value->>'kind'='miceEnquiry' and value->'data'->'form'=jsonb_build_object('recordId',form_record.id)) then raise exception 'migration_form_mismatch'; end if;
 select coalesce(jsonb_agg(id order by id),'[]') into refs from (select distinct value#>>'{}' id from jsonb_path_query(p_manifest->'payload','$.**.recordId') as found(value)) ids;
 if refs is distinct from jsonb_build_array(form_record.id) then raise exception 'migration_form_mismatch'; end if;
 saved:=cms.save_draft(p_site,target,expected,'page','/mice',p_manifest->'payload'->'composition'->>'title',p_manifest->'payload','en');
 update cms.mice_migration_batches set result=saved where id=batch.id;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'mice_migration.applied',jsonb_build_object('batchId',batch.id,'sourceDigest',p_source,'reviewDigest',p_review,'recordId',saved->>'recordId'));
 return saved;
end $$;
create function cms.get_mice_migration_result(p_site uuid,p_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare batch cms.mice_migration_batches;
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 select * into batch from cms.mice_migration_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request;
 if not found or batch.result is null then return null; end if;
 if not cms.can(p_site,'view','page',(batch.result->>'recordId')::uuid) then raise exception 'forbidden' using errcode='42501'; end if;
 return jsonb_build_object('requestKey',batch.request_key,'sourceDigest',batch.source_digest,'reviewDigest',batch.review_digest,'createdAt',batch.created_at,'result',batch.result);
end $$;
revoke all on function cms.apply_mice_migration(uuid,uuid,text,text,jsonb),cms.get_mice_migration_result(uuid,uuid) from public;
grant execute on function cms.apply_mice_migration(uuid,uuid,text,text,jsonb),cms.get_mice_migration_result(uuid,uuid) to authenticated;
commit;
