begin;
-- Server transport only: the HTTP projection removes private routing configuration.
create function cms.get_published_form(p_site uuid,p_form uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('websiteId',r.website_id,'formId',r.id,'revisionId',v.id,'locale',r.locale,'definition',v.payload)
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
 where r.website_id=p_site and r.id=p_form and r.content_type='form';
$$;
revoke all on function cms.get_published_form(uuid,uuid) from public;
grant execute on function cms.get_published_form(uuid,uuid) to service_role;
commit;
