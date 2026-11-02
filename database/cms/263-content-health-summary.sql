begin;
create function cms.list_content_health(p_site uuid,p_after uuid default null,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; more boolean;
begin
 if p_limit is null or p_limit not between 1 and 50 then raise exception 'invalid_page_size';end if;
 -- Filter before pagination: neither counts nor cursors disclose inaccessible records.
 with visible as materialized (
  select r.* from cms.records r where r.website_id=p_site and r.current_revision_id is not null
   and (p_after is null or r.id>p_after) and cms.can(p_site,'view',r.content_type,r.id)
  order by r.id limit p_limit+1
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
  from (select * from visible order by id limit p_limit) r
  left join cms.validations v on v.revision_id=r.current_revision_id
  left join cms.validation_policy p on p.content_type=r.content_type
 )
 select coalesce((select jsonb_agg(value order by id) from rows),'[]'::jsonb),(select count(*)>p_limit from visible) into items,more;
 return jsonb_build_object('websiteId',p_site,'items',items,'nextCursor',case when more then items->-1->>'id' else null end);
end $$;
revoke all on function cms.list_content_health(uuid,uuid,integer) from public;
grant execute on function cms.list_content_health(uuid,uuid,integer) to authenticated;
commit;
