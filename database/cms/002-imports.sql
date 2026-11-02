begin;
create table cms.import_batches (
 id uuid primary key default gen_random_uuid(), website_id uuid not null references cms.websites(id),
 actor_id uuid not null references auth.users(id), request_key uuid not null,
 source_sha256 text not null check(source_sha256 ~ '^[a-f0-9]{64}$'),
 manifest jsonb not null, result jsonb, created_at timestamptz not null default now(),
 unique(website_id,actor_id,request_key)
);
create table cms.import_record_keys (
 website_id uuid not null references cms.websites(id), source_key text not null,
 record_id uuid not null, primary key(website_id,source_key),
 foreign key(website_id,record_id) references cms.records(website_id,id)
);
alter table cms.import_batches enable row level security;
alter table cms.import_record_keys enable row level security;
create policy own_import_read on cms.import_batches for select to authenticated using(
 actor_id=auth.uid() and exists(select 1 from cms.memberships m where m.website_id=import_batches.website_id
 and m.user_id=auth.uid() and m.revoked_at is null and (m.expires_at is null or m.expires_at>now()))
);
grant select on cms.import_batches to authenticated;

-- Takes complete reviewed draft payloads. The application must parse/validate and merge
-- against readable current revisions first. This boundary independently checks every
-- permission/revision; it cannot approve, publish, or alter public pointers.
create function cms.apply_import(p_site uuid,p_request uuid,p_source text,p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare batch cms.import_batches; item jsonb; saved jsonb; results jsonb := '[]'; actor uuid := auth.uid(); existing cms.records;
begin
 if actor is null then raise exception 'unauthenticated' using errcode='42501'; end if;
 if p_request is null or p_source is null or p_source !~ '^[a-f0-9]{64}$' then raise exception 'invalid_import_identity'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'invalid_import_manifest'; end if;
 if jsonb_array_length(p_items) not between 1 and 500 or octet_length(p_items::text)>5242880 then raise exception 'import_size_limit'; end if;
 if not exists(select 1 from cms.memberships where website_id=p_site and user_id=actor and revoked_at is null and (expires_at is null or expires_at>now())) then raise exception 'forbidden' using errcode='42501'; end if;
 -- Unique insert serializes retries. Any subsequent failure rolls back this row too.
 insert into cms.import_batches(website_id,actor_id,request_key,source_sha256,manifest)
 values(p_site,actor,p_request,p_source,p_items) on conflict(website_id,actor_id,request_key) do nothing;
 select * into batch from cms.import_batches where website_id=p_site and actor_id=actor and request_key=p_request for update;
 if batch.source_sha256<>p_source or batch.manifest<>p_items then raise exception 'idempotency_key_reused'; end if;
 if batch.result is not null then return batch.result; end if;
 if exists(select 1 from jsonb_array_elements(p_items) v group by v->>'sourceKey' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(p_items) v where v->>'recordId' is not null group by v->>'recordId' having count(*)>1) then raise exception 'duplicate_import_record'; end if;
 for item in select value from jsonb_array_elements(p_items) order by value->>'recordId',value->>'sourceKey' loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'sourceKey','') !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$'
   or coalesce(item->>'operation','') not in ('create','update')
   or jsonb_typeof(item->'payload') is distinct from 'object'
   or coalesce(item->>'title','')='' then raise exception 'invalid_import_item'; end if;
  if item->>'operation'='create' then
   if item->>'recordId' is not null or item->>'expectedRevision' is not null then raise exception 'unexpected_revision'; end if;
   if exists(select 1 from cms.import_record_keys where website_id=p_site and source_key=item->>'sourceKey') then raise exception 'import_key_already_exists'; end if;
   saved := cms.save_draft(p_site,null,null,'journey',item->>'path',item->>'title',item->'payload',coalesce(item->>'locale','en'));
   insert into cms.import_record_keys(website_id,source_key,record_id) values(p_site,item->>'sourceKey',(saved->>'recordId')::uuid);
  else
   select * into existing from cms.records where website_id=p_site and id=(item->>'recordId')::uuid;
   if not found or not cms.can(p_site,'view',existing.content_type,existing.id) then raise exception 'forbidden' using errcode='42501'; end if;
   saved := cms.save_draft(p_site,existing.id,(item->>'expectedRevision')::uuid,'journey',item->>'path',item->>'title',item->'payload',coalesce(item->>'locale','en'));
  end if;
  results := results || jsonb_build_array(saved || jsonb_build_object('sourceKey',item->>'sourceKey'));
 end loop;
 update cms.import_batches set result=results where id=batch.id;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,actor,'import.applied',jsonb_build_object('batchId',batch.id,'sourceSha256',p_source,'recordCount',jsonb_array_length(results)));
 return results;
end $$;
revoke all on function cms.apply_import(uuid,uuid,text,jsonb) from public;
grant execute on function cms.apply_import(uuid,uuid,text,jsonb) to authenticated;

-- A content-type-scoped publisher must see their own delivery queue.
drop policy job_read on cms.delivery_jobs;
create policy job_read on cms.delivery_jobs for select to authenticated using(exists(
 select 1 from cms.records r where r.website_id=delivery_jobs.website_id and r.id=delivery_jobs.record_id
 and cms.can(r.website_id,'publish',r.content_type,r.id)
));
commit;
