begin;
create table cms.translation_creation_cancellations (
 website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_id uuid not null,
 manifest jsonb not null,created_at timestamptz not null default now(),primary key(website_id,actor_id,request_id)
);
alter table cms.translation_creation_cancellations enable row level security;
revoke all on cms.translation_creation_cancellations from public,anon,authenticated;
alter function cms.create_translation_draft(uuid,uuid,uuid,text,text,uuid) rename to create_translation_draft_unfenced;
revoke all on function cms.create_translation_draft_unfenced(uuid,uuid,uuid,text,text,uuid) from public,anon,authenticated;
create function cms.create_translation_draft(p_site uuid,p_source uuid,p_source_revision uuid,p_locale text,p_path text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cancelled jsonb;manifest jsonb;
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_site::text||auth.uid()::text||p_request::text,0));
 select c.manifest into cancelled from cms.translation_creation_cancellations c where c.website_id=p_site and c.actor_id=auth.uid() and c.request_id=p_request;
 if found then
  manifest:=jsonb_build_object('source',p_source,'sourceRevision',p_source_revision,'locale',p_locale,'path',p_path);
  if cancelled<>manifest then raise exception 'idempotency_key_reused';end if;
  raise exception 'translation_request_cancelled';
 end if;
 return cms.create_translation_draft_unfenced(p_site,p_source,p_source_revision,p_locale,p_path,p_request);
end $$;
create function cms.cancel_translation_creation(p_site uuid,p_source uuid,p_source_revision uuid,p_locale text,p_path text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare source cms.records;prior cms.translations;manifest jsonb;cancelled jsonb;
begin
 select * into source from cms.records where website_id=p_site and id=p_source;
 if not found or not cms.can(p_site,'view',source.content_type,p_source) then raise exception 'forbidden' using errcode='42501';end if;
 if p_request is null or p_source_revision is null or p_locale is null or p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' or p_locale=source.locale or p_path is null or length(p_path)>500 or p_path !~ '^/[a-z0-9/-]*$' or p_path like '%//%' then raise exception 'translation_fields_invalid';end if;
 manifest:=jsonb_build_object('source',p_source,'sourceRevision',p_source_revision,'locale',p_locale,'path',p_path);
 perform pg_advisory_xact_lock(hashtextextended(p_site::text||auth.uid()::text||p_request::text,0));
 select * into prior from cms.translations where website_id=p_site and created_by=auth.uid() and request_id=p_request;
 if found then
  if prior.creation_manifest<>manifest then raise exception 'idempotency_key_reused';end if;
  if not cms.can(p_site,'view',source.content_type,prior.record_id) then raise exception 'forbidden' using errcode='42501';end if;
  return jsonb_build_object('status','created','result',jsonb_build_object('recordId',prior.record_id,'revisionId',prior.created_revision_id));
 end if;
 select c.manifest into cancelled from cms.translation_creation_cancellations c where c.website_id=p_site and c.actor_id=auth.uid() and c.request_id=p_request;
 if found then
  if cancelled<>manifest then raise exception 'idempotency_key_reused';end if;
 else
  insert into cms.translation_creation_cancellations(website_id,actor_id,request_id,manifest) values(p_site,auth.uid(),p_request,manifest);
  insert into cms.audit_events(website_id,actor_id,action,record_id,details) values(p_site,auth.uid(),'translation.creation_cancelled',p_source,jsonb_build_object('requestId',p_request));
 end if;
 return jsonb_build_object('status','cancelled');
end $$;
revoke all on function cms.create_translation_draft(uuid,uuid,uuid,text,text,uuid),cms.cancel_translation_creation(uuid,uuid,uuid,text,text,uuid) from public;
grant execute on function cms.create_translation_draft(uuid,uuid,uuid,text,text,uuid),cms.cancel_translation_creation(uuid,uuid,uuid,text,text,uuid) to authenticated;
commit;
