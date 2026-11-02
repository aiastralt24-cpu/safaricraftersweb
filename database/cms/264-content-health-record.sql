begin;
create function cms.get_content_health(p_site uuid,p_record uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb;
begin

 -- Missing and inaccessible records return the same empty envelope.
 with visible as materialized (
  select r.* from cms.records r where r.website_id=p_site and r.current_revision_id is not null
   and r.id=p_record and cms.can(p_site,'view',r.content_type,r.id)
  order by r.id limit 1
 ), rows as (
  select r.id,jsonb_build_object('id',r.id,'type',r.content_type,'title',r.internal_title,'locale',r.locale,
   'revision',r.current_revision_id,'publishedRevision',r.published_revision_id,'reviewStatus',r.review_status,
   'validationState',case when p.validator_version is null then 'unsupported' when v.revision_id is null then 'not_checked'
    when v.validator_version<>p.validator_version or v.expires_at is null or v.expires_at<=now() then 'stale'
    when v.valid then 'passed' else 'failed' end,
   'checkedAt',v.checked_at,'expiresAt',v.expires_at,
   'errors',(select count(*) from jsonb_array_elements(coalesce(v.findings,'[]')) f where f->>'severity'='error'),
   'warnings',(select count(*) from jsonb_array_elements(coalesce(v.findings,'[]')) f where f->>'severity'='warning'),
   'canRequest',p.validator_version is not null and (cms.can(p_site,'edit',r.content_type,r.id) or cms.can(p_site,'submit',r.content_type,r.id) or cms.can(p_site,'approve',r.content_type,r.id) or cms.can(p_site,'publish',r.content_type,r.id))) value
  from (select * from visible order by id limit 1) r
  left join cms.validations v on v.revision_id=r.current_revision_id
  left join cms.validation_policy p on p.content_type=r.content_type
 )
 select coalesce((select jsonb_agg(value order by id) from rows),'[]'::jsonb) into items;
 return jsonb_build_object('websiteId',p_site,'items',items,'nextCursor',null);
end $$;
revoke all on function cms.get_content_health(uuid,uuid) from public;
grant execute on function cms.get_content_health(uuid,uuid) to authenticated;
commit;
