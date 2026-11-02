begin;
create function cms.list_validation_findings(p_site uuid,p_after uuid default null,p_severity text default 'all',p_search text default '',p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; more boolean;
begin
 if p_limit is null or p_limit not between 1 and 20 or p_severity is null or p_severity not in ('all','error','warning') or p_search is null or length(p_search)>200 then raise exception 'invalid_findings_query';end if;
 with candidates as materialized (
 select r.id,r.internal_title,r.content_type,r.locale,r.current_revision_id,v.checked_at,v.expires_at,
 (p.validator_version is null or p.validator_version<>v.validator_version or v.expires_at is null or v.expires_at<=now()) stale,v.findings
 from cms.records r join cms.validations v on v.revision_id=r.current_revision_id
 left join cms.validation_policy p on p.content_type=r.content_type
 where r.website_id=p_site and (p_after is null or r.id>p_after) and cms.can(p_site,'view',r.content_type,r.id)
 ), matching as (
 select c.*,m.entries,m.count from candidates c cross join lateral (
  select coalesce(jsonb_agg(jsonb_build_object('field',f.value->>'field','code',f.value->>'code','severity',f.value->>'severity','message',f.value->>'message') order by f.ordinality) filter(where f.rank<=25),'[]'::jsonb) entries,count(*) count
  from (select value,ordinality,row_number() over(order by ordinality) rank from jsonb_array_elements(c.findings) with ordinality
   where value->>'severity' in ('error','warning') and (p_severity='all' or value->>'severity'=p_severity)
   and (p_search='' or position(lower(p_search) in lower(coalesce(value->>'field','')||' '||coalesce(value->>'code','')||' '||coalesce(value->>'message','')))>0)) f
 ) m where m.count>0
 ), visible as materialized (select * from matching order by id limit p_limit+1)
 select coalesce((select jsonb_agg(jsonb_build_object('record',v.id,'revision',v.current_revision_id,'title',v.internal_title,'type',v.content_type,'locale',v.locale,
 'checkedAt',v.checked_at,'expiresAt',v.expires_at,'stale',v.stale,'findings',v.entries,'matchingCount',v.count) order by v.id) from (select * from visible order by id limit p_limit) v),'[]'::jsonb),
 (select count(*)>p_limit from visible) into items,more;
 return jsonb_build_object('websiteId',p_site,'severity',p_severity,'search',p_search,'items',items,'nextCursor',case when more then items->-1->>'record' else null end);
end $$;
revoke all on function cms.list_validation_findings(uuid,uuid,text,text,integer) from public;
grant execute on function cms.list_validation_findings(uuid,uuid,text,text,integer) to authenticated;
commit;
