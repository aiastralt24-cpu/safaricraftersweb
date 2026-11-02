begin;
-- Preserve pathless record identity and prepare translated documents without their source PDF.
create or replace function cms.create_translation_draft_unfenced(p_site uuid,p_source uuid,p_source_revision uuid,p_locale text,p_path text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare source cms.records; prior cms.translations; manifest jsonb; saved jsonb; payload jsonb;
begin
 select * into source from cms.records where website_id=p_site and id=p_source;
 if not found or not cms.can(p_site,'view',source.content_type,p_source) or not cms.can(p_site,'create',source.content_type,null) then raise exception 'forbidden' using errcode='42501';end if;
 if p_request is null or p_source_revision is null or p_locale is null or p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' or p_locale=source.locale or (p_path is not null and (length(p_path)>500 or p_path !~ '^/[a-z0-9/-]*$' or p_path like '%//%')) then raise exception 'translation_fields_invalid';end if;
 manifest:=jsonb_build_object('source',p_source,'sourceRevision',p_source_revision,'locale',p_locale,'path',p_path);
 perform pg_advisory_xact_lock(hashtextextended(p_site::text||auth.uid()::text||p_request::text,0));
 select * into prior from cms.translations where website_id=p_site and created_by=auth.uid() and request_id=p_request;
 if found then
  if prior.creation_manifest<>manifest then raise exception 'idempotency_key_reused';end if;
  if not cms.can(p_site,'view',source.content_type,prior.record_id) then raise exception 'forbidden' using errcode='42501';end if;
  return jsonb_build_object('recordId',prior.record_id,'revisionId',prior.created_revision_id);
 end if;
 select * into source from cms.records where website_id=p_site and id=p_source for update;
 if not cms.can(p_site,'view',source.content_type,p_source) then raise exception 'forbidden' using errcode='42501';end if;
 if source.current_revision_id is distinct from p_source_revision then raise exception 'revision_conflict';end if;
 if exists(select 1 from cms.translations where website_id=p_site and record_id=p_source) then raise exception 'translation_primary_source_required';end if;
 if exists(select 1 from cms.translations where website_id=p_site and source_record_id=p_source and locale=p_locale) then raise exception 'translation_locale_exists';end if;
 if (source.path is null)<>(p_path is null) then raise exception 'translation_route_shape_mismatch';end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_source and v.id=p_source_revision;
 -- A translated PDF must be supplied explicitly; do not label the source PDF as translated.
 if source.content_type='document' then payload:=jsonb_set(payload-'file','{language}',to_jsonb(p_locale),true);end if;
 saved:=cms.save_draft(p_site,null,null,source.content_type,p_path,source.internal_title,payload,p_locale);
 insert into cms.translations(website_id,record_id,source_record_id,locale,source_revision_id,created_revision_id,created_by,request_id,creation_manifest)
 values(p_site,(saved->>'recordId')::uuid,p_source,p_locale,p_source_revision,(saved->>'revisionId')::uuid,auth.uid(),p_request,manifest);
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(p_site,auth.uid(),'translation.created',(saved->>'recordId')::uuid,(saved->>'revisionId')::uuid,manifest);
 return saved;
end $$;

create or replace function cms.cancel_translation_creation(p_site uuid,p_source uuid,p_source_revision uuid,p_locale text,p_path text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare source cms.records;prior cms.translations;manifest jsonb;cancelled jsonb;
begin
 select * into source from cms.records where website_id=p_site and id=p_source;
 if not found or not cms.can(p_site,'view',source.content_type,p_source) then raise exception 'forbidden' using errcode='42501';end if;
 if p_request is null or p_source_revision is null or p_locale is null or p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' or p_locale=source.locale or (p_path is not null and (length(p_path)>500 or p_path !~ '^/[a-z0-9/-]*$' or p_path like '%//%')) then raise exception 'translation_fields_invalid';end if;
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
revoke all on function cms.create_translation_draft_unfenced(uuid,uuid,uuid,text,text,uuid) from public,anon,authenticated;
commit;
