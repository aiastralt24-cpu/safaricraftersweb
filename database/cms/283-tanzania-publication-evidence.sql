begin;
-- Service-only revision-bound observations. This does not enable publication.
create function cms.get_tanzania_publication_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,
  'media',cms.get_record_media_status(p_site,p_record,p_revision),
  'publishedPaths',coalesce((select jsonb_agg(path order by path) from
    (select distinct split_part(split_part(value#>>'{}','#',1),'?',1) path
     from jsonb_path_query(v.payload,'$.**.href') value where jsonb_typeof(value)='string') links
    where path ~ '^/[a-z0-9/-]*$' and path not like '%//%' and cms.concept_link_available(r.website_id,path,r.locale)),'[]'::jsonb))
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision and r.content_type='page' and r.path='/destinations/tanzania' and r.locale='en';
$$;
revoke all on function cms.get_tanzania_publication_evidence(uuid,uuid,uuid) from public;
grant execute on function cms.get_tanzania_publication_evidence(uuid,uuid,uuid) to service_role;

-- Preserve all current validation input fields, including localization evidence.
alter function cms.get_validation_input(uuid,uuid,uuid) rename to get_validation_input_before_tanzania;
revoke all on function cms.get_validation_input_before_tanzania(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select value||case when value->>'type'='page' and value->>'path'='/destinations/tanzania'
 then jsonb_build_object('tanzaniaEvidence',cms.get_tanzania_publication_evidence(p_site,p_record,p_revision)) else '{}'::jsonb end
 from (select cms.get_validation_input_before_tanzania(p_site,p_record,p_revision) value) source;
$$;
revoke all on function cms.get_validation_input(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_validation_input(uuid,uuid,uuid) to service_role;
commit;
