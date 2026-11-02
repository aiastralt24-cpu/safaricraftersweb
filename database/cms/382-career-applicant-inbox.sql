begin;
-- RLS applies before search and pagination; no access to current job drafts is required.
create function cms.list_career_leads(p_site uuid,p_status text default null,p_search text default '',p_after uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare cursor_time timestamptz;items jsonb;
begin
 if p_status is not null and p_status not in ('new','assigned','contacted','qualified','in_progress','won','lost','invalid') then raise exception 'invalid_lead_status';end if;
 if p_search is null or length(p_search)>200 then raise exception 'invalid_applicant_search';end if;
 if p_after is not null then select created_at into cursor_time from cms.leads where website_id=p_site and id=p_after and attribution ? 'careerSelection';if not found then raise exception 'invalid_lead_cursor';end if;end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'formId',l.form_id,'formRevision',l.form_revision_id,'status',l.status,'priority',l.priority,'nextFollowUp',l.next_follow_up,'createdAt',l.created_at,'version',l.version,'attribution',l.attribution) order by l.created_at desc,l.id desc),'[]') into items
 from(select * from cms.leads where website_id=p_site and attribution ? 'careerSelection' and not cms.lead_is_merged(p_site,id)
 and (p_status is null or status=p_status)
 and (p_search='' or strpos(lower(coalesce(attribution#>>'{career,title}','')||' '||coalesce(attribution#>>'{career,referenceCode}','')||' '||coalesce(attribution#>>'{career,organization}','')||' '||coalesce(attribution#>>'{career,recordId}','')),lower(p_search))>0)
 and(p_after is null or (created_at,id)<(cursor_time,p_after)) order by created_at desc,id desc limit 50)l;
 return jsonb_build_object('websiteId',p_site,'status',p_status,'search',p_search,'after',p_after,'items',items);
end $$;
revoke all on function cms.list_career_leads(uuid,text,text,uuid) from public,anon;
grant execute on function cms.list_career_leads(uuid,text,text,uuid) to authenticated;
commit;
