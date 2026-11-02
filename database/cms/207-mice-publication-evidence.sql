begin;
-- Trusted read-only snapshot. This does not enable MICE publication or delivery.
create function cms.get_mice_publication_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,
  'media',cms.get_record_media_status(p_site,p_record,p_revision),
  'forms',coalesce((select jsonb_agg(jsonb_build_object('recordId',refs.id,'revisionId',f->'revisionId','locale',f->'locale',
    'available',coalesce(f->>'locale'='en' and cms.mice_form_compatible(f->'definition'),false)) order by refs.id)
    from (select distinct (s->'data'->'form'->>'recordId')::uuid id from jsonb_array_elements(v.payload->'composition'->'sections') s
      where s->>'kind'='miceEnquiry' and s->'controls'->'visible'='true'::jsonb and s->'data'->'form'->>'recordId' is not null) refs
    left join lateral cms.get_published_form(r.website_id,refs.id) f on true),'[]'::jsonb),
  'publishedPaths',coalesce((select jsonb_agg(href order by href) from
    (select distinct value#>>'{}' href from jsonb_path_query(v.payload,'$.**.href') value where jsonb_typeof(value)='string') links
    where href ~ '^/[a-z0-9/-]*$' and href not like '%//%' and cms.concept_link_available(r.website_id,href,r.locale)),'[]'::jsonb))
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision and r.content_type='page' and r.path='/mice' and r.locale='en';
$$;
revoke all on function cms.get_mice_publication_evidence(uuid,uuid,uuid) from public;
grant execute on function cms.get_mice_publication_evidence(uuid,uuid,uuid) to service_role;
commit;
