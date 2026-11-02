begin;
-- Draft translations are explicit relationships to one primary-language record.
-- No automatic translation, fallback, approval or publication is performed here.
create table cms.translations (
 website_id uuid not null, record_id uuid not null, source_record_id uuid not null,
 locale text not null, source_revision_id uuid not null, reviewed_revision_id uuid,
 created_revision_id uuid not null, created_by uuid not null references auth.users(id),
 request_id uuid not null, creation_manifest jsonb not null,
 created_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references auth.users(id),
 primary key(website_id,record_id), unique(website_id,source_record_id,locale), unique(website_id,created_by,request_id),
 check(record_id<>source_record_id),
 foreign key(website_id,record_id) references cms.records(website_id,id),
 foreign key(website_id,source_record_id,source_revision_id) references cms.revisions(website_id,record_id,id),
 foreign key(website_id,record_id,created_revision_id) references cms.revisions(website_id,record_id,id),
 foreign key(website_id,record_id,reviewed_revision_id) references cms.revisions(website_id,record_id,id)
);
alter table cms.translations enable row level security;
revoke all on cms.translations from public,anon,authenticated;

create function cms.get_translation_status(p_site uuid,p_record uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; source cms.records; link cms.translations;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found or not cms.can(p_site,'view',rec.content_type,p_record) then raise exception 'forbidden' using errcode='42501';end if;
 select * into link from cms.translations where website_id=p_site and record_id=p_record;
 if not found then return null;end if;
 select * into source from cms.records where website_id=p_site and id=link.source_record_id;
 if not cms.can(p_site,'view',source.content_type,source.id) then raise exception 'forbidden' using errcode='42501';end if;
 return jsonb_build_object('recordId',rec.id,'revisionId',rec.current_revision_id,'locale',rec.locale,
  'sourceRecordId',source.id,'sourceLocale',source.locale,'sourceRevisionId',link.source_revision_id,'currentSourceRevisionId',source.current_revision_id,
  'reviewedRevisionId',link.reviewed_revision_id,
  'status',case when source.current_revision_id is distinct from link.source_revision_id then 'source_changed'
   when link.reviewed_revision_id is null then 'unreviewed'
   when rec.current_revision_id is distinct from link.reviewed_revision_id then 'translation_changed' else 'current' end);
end $$;

create function cms.create_translation_draft(p_site uuid,p_source uuid,p_source_revision uuid,p_locale text,p_path text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare source cms.records; prior cms.translations; manifest jsonb; saved jsonb; payload jsonb;
begin
 select * into source from cms.records where website_id=p_site and id=p_source;
 if not found or not cms.can(p_site,'view',source.content_type,p_source) or not cms.can(p_site,'create',source.content_type,null) then raise exception 'forbidden' using errcode='42501';end if;
 if p_request is null or p_source_revision is null or p_locale is null or p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' or p_locale=source.locale or p_path is null or length(p_path)>500 or p_path !~ '^/[a-z0-9/-]*$' or p_path like '%//%' then raise exception 'translation_fields_invalid';end if;
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
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_source and v.id=p_source_revision;
 saved:=cms.save_draft(p_site,null,null,source.content_type,p_path,source.internal_title,payload,p_locale);
 insert into cms.translations(website_id,record_id,source_record_id,locale,source_revision_id,created_revision_id,created_by,request_id,creation_manifest)
 values(p_site,(saved->>'recordId')::uuid,p_source,p_locale,p_source_revision,(saved->>'revisionId')::uuid,auth.uid(),p_request,manifest);
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(p_site,auth.uid(),'translation.created',(saved->>'recordId')::uuid,(saved->>'revisionId')::uuid,manifest);
 return saved;
end $$;

create function cms.review_translation(p_site uuid,p_record uuid,p_revision uuid,p_source_revision uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec cms.records; source cms.records; link cms.translations; author uuid;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 select * into link from cms.translations where website_id=p_site and record_id=p_record;
 if link.record_id is null or not cms.can(p_site,'approve',rec.content_type,p_record) or not cms.can(p_site,'view',rec.content_type,p_record) then raise exception 'forbidden' using errcode='42501';end if;
 select * into rec from cms.records where website_id=p_site and id=p_record for update;
 select * into link from cms.translations where website_id=p_site and record_id=p_record;
 select * into source from cms.records where website_id=p_site and id=link.source_record_id for share;
 if not cms.can(p_site,'view',source.content_type,source.id) then raise exception 'forbidden' using errcode='42501';end if;
 if rec.current_revision_id is distinct from p_revision or source.current_revision_id is distinct from p_source_revision then raise exception 'revision_conflict';end if;
 select created_by into author from cms.revisions where website_id=p_site and record_id=p_record and id=p_revision;
 if author=auth.uid() and (select separate_approver from cms.websites where id=p_site) then raise exception 'separate_approver_required';end if;
 if link.reviewed_revision_id=p_revision and link.source_revision_id=p_source_revision then return cms.get_translation_status(p_site,p_record);end if;
 update cms.translations set source_revision_id=p_source_revision,reviewed_revision_id=p_revision,reviewed_at=now(),reviewed_by=auth.uid() where website_id=p_site and record_id=p_record;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(p_site,auth.uid(),'translation.reviewed',p_record,p_revision,jsonb_build_object('sourceRecordId',source.id,'sourceRevisionId',p_source_revision));
 return cms.get_translation_status(p_site,p_record);
end $$;

create function cms.enforce_translation_release()
returns trigger language plpgsql security definer set search_path='' as $$
declare link cms.translations; source_revision uuid;
begin
 if new.published_revision_id is null or (tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id) then return new;end if;
 select * into link from cms.translations where website_id=new.website_id and record_id=new.id;
 if not found then return new;end if;
 select current_revision_id into source_revision from cms.records where website_id=new.website_id and id=link.source_record_id for share;
 if link.reviewed_revision_id is distinct from new.published_revision_id or link.source_revision_id is distinct from source_revision then raise exception 'translation_review_required';end if;
 return new;
end $$;
create trigger cms_translation_release before insert or update of published_revision_id on cms.records for each row execute function cms.enforce_translation_release();
revoke all on function cms.get_translation_status(uuid,uuid),cms.create_translation_draft(uuid,uuid,uuid,text,text,uuid),cms.review_translation(uuid,uuid,uuid,uuid),cms.enforce_translation_release() from public;
grant execute on function cms.get_translation_status(uuid,uuid),cms.create_translation_draft(uuid,uuid,uuid,text,text,uuid),cms.review_translation(uuid,uuid,uuid,uuid) to authenticated;
commit;
