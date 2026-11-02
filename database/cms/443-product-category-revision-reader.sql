begin;
-- Exact saved definitions, subject to the existing record/revision row-level policies.
create function cms.get_product_category_revision(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'recordId',r.id,'revisionId',v.id,'currentRevision',r.current_revision_id,'locale',r.locale,'payload',v.payload)
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id
 where r.website_id=p_site and r.id=p_record and r.content_type='productCategory' and v.id=p_revision;
$$;
revoke all on function cms.get_product_category_revision(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function cms.get_product_category_revision(uuid,uuid,uuid) to authenticated;
commit;
