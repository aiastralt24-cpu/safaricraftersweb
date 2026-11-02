begin;
create function cms.list_page_tree(p_site uuid,p_locale text default 'en',p_parent uuid default null,p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare parent cms.records;
begin
 if p_locale is null or p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then raise exception 'invalid_locale'; end if;
 if p_parent is not null then
  select * into parent from cms.records where website_id=p_site and id=p_parent;
  if not found or parent.content_type not in ('page','homepage') or parent.locale<>p_locale or not cms.can(p_site,'view',parent.content_type,parent.id) then raise exception 'forbidden' using errcode='42501'; end if;
 end if;
 return (with candidates as (
  select r.*,h.parent_id,(h.parent_id is not null and not coalesce(cms.can(p_site,'view',p.content_type,p.id),false)) restricted
  from cms.records r left join cms.page_hierarchy h on h.website_id=r.website_id and h.record_id=r.id
  left join cms.records p on p.website_id=r.website_id and p.id=h.parent_id
  where r.website_id=p_site and r.locale=p_locale and r.content_type in ('page','homepage') and r.current_revision_id is not null
   and (p_after is null or r.id>p_after) and cms.can(p_site,'view',r.content_type,r.id)
   and (case when p_parent is null then h.parent_id is null or not coalesce(cms.can(p_site,'view',p.content_type,p.id),false) else h.parent_id=p_parent end)
  order by r.id limit 51
 ), numbered as (select *,row_number() over(order by id) n from candidates)
 select jsonb_build_object('site',p_site,'locale',p_locale,'parentId',p_parent,
  'items',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'title',r.internal_title,'path',r.path,'type',r.content_type,'revisionId',r.current_revision_id,
   'parentRestricted',r.restricted,'published',r.published_revision_id is not null,
   'hasChildren',exists(select 1 from cms.page_hierarchy edge join cms.records child on child.website_id=edge.website_id and child.id=edge.record_id
    where edge.website_id=p_site and edge.parent_id=r.id and child.locale=p_locale and child.current_revision_id is not null and child.content_type in ('page','homepage') and cms.can(p_site,'view',child.content_type,child.id))) order by r.id) from numbered r where n<=50),'[]'::jsonb),
  'nextCursor',case when (select count(*) from candidates)>50 then (select id from numbered where n=50) else null end));
end $$;
revoke all on function cms.list_page_tree(uuid,text,uuid,uuid) from public;
grant execute on function cms.list_page_tree(uuid,text,uuid,uuid) to authenticated;
commit;
