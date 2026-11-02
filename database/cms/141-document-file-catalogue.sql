begin;
alter table cms.document_files add column revision bigint not null default 1;
create function cms.bump_document_file_revision() returns trigger language plpgsql set search_path='' as $$
begin new.revision:=old.revision+1;return new;end $$;
create trigger cms_document_file_revision before update on cms.document_files for each row execute function cms.bump_document_file_revision();
create function cms.get_document_file(p_site uuid,p_asset uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',f.id,'revision',f.revision,'filename',u.filename,'bytes',f.byte_size,'pages',f.page_count,
  'parserVersion',f.parser_version,'inspectionVersion',f.inspection_version,'createdAt',f.created_at,
  'rightsStatus',f.rights_status,'rightsExpiresAt',f.rights_expires_at,'archivedAt',f.archived_at,
  'rightsEvidence',case when cms.can(p_site,'configure','document') then f.rights_evidence else null end,
  'canManageRights',cms.can(p_site,'configure','document'),
  'eligible',u.status='ready' and u.mime_type='application/pdf' and u.inspection_version=f.inspection_version
   and u.original_sha256=f.original_sha256 and f.rights_status='approved' and f.archived_at is null
   and (f.rights_expires_at is null or f.rights_expires_at>now()))
 from cms.document_files f join cms.uploads u on u.id=f.id and u.website_id=f.website_id
 where f.website_id=p_site and f.id=p_asset and cms.can(p_site,'view','document');
$$;
create function cms.list_document_files(p_site uuid,p_after uuid default null,p_search text default '')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_search is null or length(p_search)>200 then raise exception 'invalid_media_search'; end if;
 select coalesce(jsonb_agg(cms.get_document_file(p_site,q.id) order by q.id),'[]') into result
 from (select f.id from cms.document_files f join cms.uploads u on u.id=f.id and u.website_id=f.website_id
  where f.website_id=p_site and cms.can(p_site,'view','document') and (p_after is null or f.id>p_after)
   and (p_search='' or position(lower(p_search) in lower(u.filename))>0)
  order by f.id limit 50) q;
 return result;
end $$;
create function cms.set_document_file_rights(p_site uuid,p_asset uuid,p_expected bigint,p_status text,p_evidence text,p_expires timestamptz)
returns bigint language plpgsql security definer set search_path='' as $$
declare f cms.document_files; result bigint;
begin
 if not cms.can(p_site,'configure','document') then raise exception 'forbidden' using errcode='42501'; end if;
 select * into f from cms.document_files where website_id=p_site and id=p_asset for update;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 if f.revision is distinct from p_expected then raise exception 'revision_conflict' using errcode='40001'; end if;
 if p_status is null or p_status not in ('pending','approved','revoked') or p_evidence is null or length(p_evidence)>5000
  or (p_expires is not null and not isfinite(p_expires))
  or (p_status='approved' and (length(trim(p_evidence))=0 or (p_expires is not null and p_expires<=now()))) then raise exception 'invalid_media_rights'; end if;
 update cms.document_files set rights_status=p_status,rights_evidence=p_evidence,rights_expires_at=p_expires
 where website_id=p_site and id=p_asset returning revision into result;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'document_file.rights_updated',jsonb_build_object('assetId',p_asset,'revision',result,'status',p_status,'expiresAt',p_expires));
 return result;
end $$;
revoke all on function cms.bump_document_file_revision(),cms.get_document_file(uuid,uuid),cms.list_document_files(uuid,uuid,text),cms.set_document_file_rights(uuid,uuid,bigint,text,text,timestamptz) from public;
grant execute on function cms.get_document_file(uuid,uuid),cms.list_document_files(uuid,uuid,text),cms.set_document_file_rights(uuid,uuid,bigint,text,text,timestamptz) to authenticated;
commit;
