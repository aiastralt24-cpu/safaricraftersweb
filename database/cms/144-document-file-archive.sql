begin;
create function cms.document_payload_file_ids(p_site uuid,p_type text,p_payload jsonb)
returns setof uuid language sql stable security definer set search_path='' as $$
 select f.id from cms.document_files f where f.website_id=p_site and p_type='document' and f.id::text=p_payload #>> '{file,assetId}'
 union
 select f.id from jsonb_path_query(p_payload,'$.sections[*] ? (@.kind == "downloads").data.items[*]') item
 join cms.revisions v on v.website_id=p_site and v.id::text=item->>'versionId' and v.record_id::text=item #>> '{document,recordId}'
 join cms.records r on r.website_id=v.website_id and r.id=v.record_id and r.content_type='document'
 join cms.document_files f on f.website_id=p_site and f.id::text=v.payload #>> '{file,assetId}';
$$;
create function cms.check_document_file_references(p_site uuid,p_type text,p_payload jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare f record;
begin
 for f in select d.id,d.archived_at from cms.document_files d
  where d.website_id=p_site and d.id in(select cms.document_payload_file_ids(p_site,p_type,p_payload)) order by d.id for share loop
  if f.archived_at is not null then raise exception 'archived_document_reference'; end if;
 end loop;
end $$;
create function cms.check_revision_document_files() returns trigger language plpgsql security definer set search_path='' as $$
declare kind text;
begin
 select content_type into kind from cms.records where website_id=new.website_id and id=new.record_id;
 perform cms.check_document_file_references(new.website_id,kind,new.payload);return new;
end $$;
create trigger cms_revision_document_files before insert on cms.revisions for each row execute function cms.check_revision_document_files();
create function cms.check_preview_document_files() returns trigger language plpgsql security definer set search_path='' as $$
declare kind text; payload jsonb;
begin
 select r.content_type,v.payload into kind,payload from cms.revisions v join cms.records r on r.website_id=v.website_id and r.id=v.record_id
  where v.website_id=new.website_id and v.id=new.revision_id;
 perform cms.check_document_file_references(new.website_id,kind,payload);return new;
end $$;
create trigger cms_preview_document_files before insert on cms.preview_sessions for each row execute function cms.check_preview_document_files();
create function cms.check_published_document_files() returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;
begin
 if new.published_revision_id is not null and new.published_revision_id is distinct from old.published_revision_id then
  select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
  perform cms.check_document_file_references(new.website_id,new.content_type,payload);
 end if;return new;
end $$;
create trigger cms_published_document_files before update of published_revision_id on cms.records for each row execute function cms.check_published_document_files();
create function cms.archive_document_file(p_site uuid,p_asset uuid,p_expected bigint,p_archive boolean)
returns bigint language plpgsql security definer set search_path='' as $$
declare f cms.document_files; result bigint;
begin
 if not cms.can(p_site,'delete','document') then raise exception 'forbidden' using errcode='42501'; end if;
 select * into f from cms.document_files where website_id=p_site and id=p_asset for update;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 if f.revision is distinct from p_expected then raise exception 'revision_conflict' using errcode='40001'; end if;
 if p_archive is null then raise exception 'invalid_archive_state'; end if;
 if (f.archived_at is not null)=p_archive then return f.revision; end if;
 if p_archive and (
  exists(select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id in(r.current_revision_id,r.published_revision_id)
   where r.website_id=p_site and cms.document_payload_uses_file(p_site,r.content_type,v.payload,p_asset))
  or exists(select 1 from cms.preview_sessions s join cms.revisions v on v.website_id=s.website_id and v.id=s.revision_id
   join cms.records r on r.website_id=v.website_id and r.id=v.record_id
   where s.website_id=p_site and s.revoked_at is null and s.expires_at>now() and cms.document_payload_uses_file(p_site,r.content_type,v.payload,p_asset))
 ) then raise exception 'document_file_in_use'; end if;
 update cms.document_files set archived_at=case when p_archive then now() else null end where website_id=p_site and id=p_asset returning revision into result;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),case when p_archive then 'document_file.archived' else 'document_file.restored' end,jsonb_build_object('assetId',p_asset,'revision',result));
 return result;
end $$;
revoke all on function cms.document_payload_file_ids(uuid,text,jsonb),cms.check_document_file_references(uuid,text,jsonb),cms.check_revision_document_files(),cms.check_preview_document_files(),cms.check_published_document_files(),cms.archive_document_file(uuid,uuid,bigint,boolean) from public;
grant execute on function cms.archive_document_file(uuid,uuid,bigint,boolean) to authenticated;
commit;
