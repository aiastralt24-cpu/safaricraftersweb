begin;
create function cms.list_ordered_page_tree(p_site uuid,p_locale text default 'en',p_parent uuid default null,p_after uuid default null,p_snapshot text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare parent cms.records; rows jsonb; fingerprint text; offset_n bigint:=0; count_n bigint; page jsonb; stamp jsonb;
begin
 if p_locale is null or p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then raise exception 'invalid_locale'; end if;
 if p_parent is not null then
  select * into parent from cms.records where website_id=p_site and id=p_parent;
  if not found or parent.content_type not in ('page','homepage') or parent.locale<>p_locale or not cms.can(p_site,'view',parent.content_type,parent.id) then raise exception 'forbidden' using errcode='42501'; end if;
 end if;
 with candidates as (
  select r.*,h.parent_id,coalesce(h.version,0) hierarchy_version,coalesce(o.version,0) order_version,
   case when h.parent_id is not distinct from p_parent then array_position(o.ordered_ids,r.id) else null end rank,
   h.parent_id is not null and not coalesce(cms.can(p_site,'view',p.content_type,p.id),false) restricted
  from cms.records r left join cms.page_hierarchy h on h.website_id=r.website_id and h.record_id=r.id
  left join cms.records p on p.website_id=r.website_id and p.id=h.parent_id
  left join cms.page_branch_orders o on o.website_id=r.website_id and o.branch_key=p_locale||':'||coalesce(p_parent::text,'root')
  where r.website_id=p_site and r.locale=p_locale and r.content_type in ('page','homepage') and r.current_revision_id is not null and cms.can(p_site,'view',r.content_type,r.id)
   and (case when p_parent is null then h.parent_id is null or not coalesce(cms.can(p_site,'view',p.content_type,p.id),false) else h.parent_id=p_parent end)
 ) select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'title',r.internal_title,'path',r.path,'type',r.content_type,'revisionId',r.current_revision_id,
   'parentRestricted',r.restricted,'published',r.published_revision_id is not null,
   'hasChildren',exists(select 1 from cms.page_hierarchy edge join cms.records child on child.website_id=edge.website_id and child.id=edge.record_id
    where edge.website_id=p_site and edge.parent_id=r.id and child.locale=p_locale and child.current_revision_id is not null and child.content_type in ('page','homepage') and cms.can(p_site,'view',child.content_type,child.id))) order by r.rank nulls last,r.id),'[]'::jsonb),
  coalesce(jsonb_agg(jsonb_build_array(r.id,r.current_revision_id,r.hierarchy_version,r.order_version) order by r.rank nulls last,r.id),'[]'::jsonb)
 into rows,stamp from candidates r;
 fingerprint:=md5(jsonb_build_array(p_site,p_locale,p_parent,stamp)::text);count_n:=jsonb_array_length(rows);
 if p_after is not null then
  if p_snapshot is distinct from fingerprint then raise exception 'page_tree_changed'; end if;
  select n into offset_n from jsonb_array_elements(rows) with ordinality as entry(value,n) where value->>'id'=p_after::text;
  if offset_n is null then raise exception 'page_tree_changed'; end if;
 elsif p_snapshot is not null then raise exception 'invalid_page_tree_cursor'; end if;
 select coalesce(jsonb_agg(value order by n),'[]'::jsonb) into page from jsonb_array_elements(rows) with ordinality as entry(value,n) where n>offset_n and n<=offset_n+50;
 return jsonb_build_object('site',p_site,'locale',p_locale,'parentId',p_parent,'snapshot',fingerprint,'items',page,'nextCursor',case when count_n>offset_n+50 then page->49->>'id' else null end);
end $$;
revoke all on function cms.list_ordered_page_tree(uuid,text,uuid,uuid,text) from public;
grant execute on function cms.list_ordered_page_tree(uuid,text,uuid,uuid,text) to authenticated;
commit;
