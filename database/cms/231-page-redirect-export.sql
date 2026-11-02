begin;
-- Export is independently permissioned and respects privileged MFA.
create function cms.export_page_redirects(p_site uuid,p_record uuid,p_after text default null,p_snapshot text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not cms.can(p_site,'export','page',p_record) then raise exception 'forbidden' using errcode='42501'; end if;
 result:=cms.list_page_redirects(p_site,p_record,p_after,p_snapshot);
 insert into cms.audit_events(website_id,actor_id,action,record_id,details) values(p_site,auth.uid(),'page.redirect_export_read',p_record,jsonb_build_object('snapshot',result->>'snapshot','after',p_after,'count',jsonb_array_length(result->'items'),'hasMore',result->>'nextCursor' is not null));
 return result;
end $$;
revoke all on function cms.export_page_redirects(uuid,uuid,text,text) from public;
grant execute on function cms.export_page_redirects(uuid,uuid,text,text) to authenticated;
create or replace function cms.get_editor_record(p_site uuid,p_record uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',r.id,'type',r.content_type,'title',r.internal_title,'path',r.path,'locale',r.locale,
  'currentRevision',r.current_revision_id,'approvedRevision',r.approved_revision_id,'publishedRevision',r.published_revision_id,
  'reviewStatus',r.review_status,'payload',v.payload,'updatedAt',r.updated_at,
  'permissions',jsonb_build_object('export',cms.can(p_site,'export',r.content_type,r.id),'edit',cms.can(p_site,'edit',r.content_type,r.id),'submit',cms.can(p_site,'submit',r.content_type,r.id),
   'approve',cms.can(p_site,'approve',r.content_type,r.id),'publish',cms.can(p_site,'publish',r.content_type,r.id)),
  'history',(select coalesce(jsonb_agg(h.value order by h.created_at desc,h.id desc),'[]') from
    (select hv.id,hv.created_at,jsonb_build_object('id',hv.id,'parentRevision',hv.parent_revision_id,'authorId',hv.created_by,'createdAt',hv.created_at) value
     from cms.revisions hv where hv.website_id=p_site and hv.record_id=p_record order by hv.created_at desc,hv.id desc limit 20) h))
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record;
$$;
commit;
