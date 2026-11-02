begin;
create function cms.search_project_library(p_site uuid,p_search text default '',p_status text default '',p_owned boolean default false,p_publication text default '',p_after uuid default null,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare matches jsonb;
begin
 if p_site is null or p_search is null or length(p_search)>120 or p_status is null or p_status not in('','draft','in_review','changes_requested','approved') or p_owned is null or p_publication is null or p_publication not in('','published','unpublished') or p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_project_search';end if;
 if p_after is not null and not exists(select 1 from cms.records r where r.website_id=p_site and r.id=p_after and r.content_type='project' and cms.can(p_site,'view','project',r.id)) then raise exception 'invalid_project_cursor';end if;
 select coalesce(jsonb_agg(item order by id),'[]') into matches from(
  select r.id,jsonb_build_object('id',r.id,'type',r.content_type,'title',r.internal_title,'path',r.path,'locale',r.locale,'currentRevision',r.current_revision_id,'reviewStatus',r.review_status,'publishedRevision',r.published_revision_id,'ownerId',r.owner_id) item
  from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
  where r.website_id=p_site and r.content_type='project' and cms.can(p_site,'view','project',r.id)
  and (p_after is null or r.id>p_after) and (p_status='' or r.review_status=p_status) and (not p_owned or r.owner_id=auth.uid())
  and (p_publication='' or (p_publication='published' and r.published_revision_id is not null) or (p_publication='unpublished' and r.published_revision_id is null))
  and (btrim(p_search)='' or position(lower(btrim(p_search)) in lower(concat_ws(' ',r.internal_title,v.payload->>'summary',v.payload->>'client',v.payload->>'industry')))>0)
  order by r.id limit p_limit+1
 ) page;
 return jsonb_build_object('records',(select coalesce(jsonb_agg(value order by n),'[]') from jsonb_array_elements(matches) with ordinality x(value,n) where n<=p_limit),
 'next',case when jsonb_array_length(matches)>p_limit then matches->(p_limit-1)->>'id' else null end);
end $$;
revoke all on function cms.search_project_library(uuid,text,text,boolean,text,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function cms.search_project_library(uuid,text,text,boolean,text,uuid,integer) to authenticated;
commit;
