begin;
-- Expose only reference eligibility already present in this published page,
-- never private storage descriptors or another draft's selections.
create function cms.get_public_page_download_status(p_site uuid,p_record uuid,p_revision uuid,p_locale text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare parent cms.records; delivered jsonb; evidence jsonb;
begin
 if p_locale is null or p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then return null; end if;
 select * into parent from cms.records where website_id=p_site and id=p_record and locale=p_locale and published_revision_id=p_revision and content_type in ('page','homepage') and path is not null;
 if not found then return null; end if;
 delivered:=cms.get_public_page(p_site,parent.path,p_locale);
 if delivered is null or delivered->>'recordId' is distinct from p_record::text or delivered->>'revisionId' is distinct from p_revision::text then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('recordId',refs.record_id,'versionId',refs.version_id,'locale',p_locale,
  'available',coalesce(doc.locale=p_locale and doc.published_revision_id::text=refs.version_id and cms.document_release_descriptor(p_site,doc.id) is not null,false)) order by refs.record_id,refs.version_id),'[]'::jsonb) into evidence
 from (select distinct lower(item #>> '{document,recordId}') record_id,lower(item->>'versionId') version_id
  from cms.document_download_items(delivered->'payload') item
  where item #>> '{document,recordId}' ~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
  and item->>'versionId' ~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
  order by record_id,version_id limit 5000) refs
 left join cms.records doc on doc.website_id=p_site and doc.id::text=refs.record_id and doc.content_type='document';
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'locale',p_locale,'documents',evidence);
end $$;
revoke all on function cms.get_public_page_download_status(uuid,uuid,uuid,text) from public;
grant execute on function cms.get_public_page_download_status(uuid,uuid,uuid,text) to anon,authenticated;
commit;
