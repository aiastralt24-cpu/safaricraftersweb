begin;
-- Invoker functions retain table RLS; helpers never elevate a user's read scope.
create function cms.list_editor_sites()
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name,id),'[]') from cms.websites;
$$;
create function cms.list_editor_records(p_site uuid,p_type text default null,p_after uuid default null,p_limit integer default 50)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_page_size'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'type',r.content_type,'title',r.internal_title,'path',r.path,'locale',r.locale,
  'currentRevision',r.current_revision_id,'publishedRevision',r.published_revision_id,'reviewStatus',r.review_status,'updatedAt',r.updated_at,
  'canEdit',cms.can(r.website_id,'edit',r.content_type,r.id),'canPublish',cms.can(r.website_id,'publish',r.content_type,r.id)) order by r.id),'[]')
 into result from (select * from cms.records where website_id=p_site and (p_type is null or content_type=p_type)
  and (p_after is null or id>p_after) order by id limit p_limit) r;
 return result;
end $$;
create function cms.get_editor_record(p_site uuid,p_record uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',r.id,'type',r.content_type,'title',r.internal_title,'path',r.path,'locale',r.locale,
  'currentRevision',r.current_revision_id,'approvedRevision',r.approved_revision_id,'publishedRevision',r.published_revision_id,
  'reviewStatus',r.review_status,'payload',v.payload,'updatedAt',r.updated_at,
  'permissions',jsonb_build_object('edit',cms.can(p_site,'edit',r.content_type,r.id),'submit',cms.can(p_site,'submit',r.content_type,r.id),
   'approve',cms.can(p_site,'approve',r.content_type,r.id),'publish',cms.can(p_site,'publish',r.content_type,r.id)),
  'history',(select coalesce(jsonb_agg(h.value order by h.created_at desc,h.id desc),'[]') from
    (select hv.id,hv.created_at,jsonb_build_object('id',hv.id,'parentRevision',hv.parent_revision_id,'authorId',hv.created_by,'createdAt',hv.created_at) value
     from cms.revisions hv where hv.website_id=p_site and hv.record_id=p_record order by hv.created_at desc,hv.id desc limit 20) h))
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record;
$$;
revoke all on function cms.list_editor_sites(),cms.list_editor_records(uuid,text,uuid,integer),cms.get_editor_record(uuid,uuid) from public;
grant execute on function cms.list_editor_sites(),cms.list_editor_records(uuid,text,uuid,integer),cms.get_editor_record(uuid,uuid) to authenticated;
commit;
