begin;
create or replace function cms.get_document_file(p_site uuid,p_asset uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',f.id,'revision',f.revision,'filename',u.filename,'bytes',f.byte_size,'pages',f.page_count,
  'parserVersion',f.parser_version,'inspectionVersion',f.inspection_version,'createdAt',f.created_at,
  'rightsStatus',f.rights_status,'rightsExpiresAt',f.rights_expires_at,'archivedAt',f.archived_at,
  'rightsEvidence',case when cms.can(p_site,'configure','document') then f.rights_evidence else null end,
  'canManageRights',cms.can(p_site,'configure','document'),'canArchive',cms.can(p_site,'delete','document'),
  'eligible',u.status='ready' and u.mime_type='application/pdf' and u.inspection_version=f.inspection_version
   and u.original_sha256=f.original_sha256 and f.rights_status='approved' and f.archived_at is null
   and (f.rights_expires_at is null or f.rights_expires_at>now()))
 from cms.document_files f join cms.uploads u on u.id=f.id and u.website_id=f.website_id
 where f.website_id=p_site and f.id=p_asset and cms.can(p_site,'view','document');
$$;
commit;
