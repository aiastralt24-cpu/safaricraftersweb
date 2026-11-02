begin;
create table cms.page_branch_orders (
 website_id uuid not null references cms.websites(id), branch_key text not null,
 ordered_ids uuid[] not null default '{}',version bigint not null default 1 check(version>0),
 primary key(website_id,branch_key)
);
create table cms.page_order_receipts (
 website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_id uuid not null,
 manifest jsonb not null,result jsonb not null,created_at timestamptz not null default now(),
 primary key(website_id,actor_id,request_id)
);
alter table cms.page_branch_orders enable row level security;
alter table cms.page_order_receipts enable row level security;
revoke all on cms.page_branch_orders,cms.page_order_receipts from public,anon,authenticated;

create function cms.get_page_sibling_order(p_site uuid,p_locale text,p_parent uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare parent cms.records; saved cms.page_branch_orders; items jsonb; scope_key text; count_rows int;
begin
 if p_locale is null or p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then raise exception 'invalid_locale'; end if;
 if not exists(select 1 from cms.memberships where website_id=p_site and user_id=auth.uid() and revoked_at is null and (expires_at is null or expires_at>now())) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_parent is not null then
  select * into parent from cms.records where website_id=p_site and id=p_parent;
  if not found or parent.content_type not in ('page','homepage') or parent.locale<>p_locale
   or not cms.can(p_site,'view',parent.content_type,parent.id) or not cms.can(p_site,'edit',parent.content_type,parent.id) then raise exception 'page_order_unavailable' using errcode='42501'; end if;
 end if;
 -- Ordering a partial visible list could move or disclose inaccessible siblings.
 select count(*) into count_rows from cms.records r left join cms.page_hierarchy h on h.website_id=r.website_id and h.record_id=r.id
 where r.website_id=p_site and r.locale=p_locale and r.content_type in ('page','homepage') and r.current_revision_id is not null and h.parent_id is not distinct from p_parent;
 if count_rows>500 then raise exception 'page_order_branch_limit'; end if;
 if exists(select 1 from cms.records r left join cms.page_hierarchy h on h.website_id=r.website_id and h.record_id=r.id
 where r.website_id=p_site and r.locale=p_locale and r.content_type in ('page','homepage') and r.current_revision_id is not null and h.parent_id is not distinct from p_parent
 and (not cms.can(p_site,'view',r.content_type,r.id) or not cms.can(p_site,'edit',r.content_type,r.id))) then raise exception 'page_order_unavailable' using errcode='42501'; end if;
 scope_key:=p_locale||':'||coalesce(p_parent::text,'root');
 select * into saved from cms.page_branch_orders where website_id=p_site and branch_key=scope_key;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'title',r.internal_title,'path',r.path,'revisionId',r.current_revision_id,'hierarchyVersion',coalesce(h.version,0))
 order by array_position(saved.ordered_ids,r.id) nulls last,r.id),'[]'::jsonb) into items
 from cms.records r left join cms.page_hierarchy h on h.website_id=r.website_id and h.record_id=r.id
 where r.website_id=p_site and r.locale=p_locale and r.content_type in ('page','homepage') and r.current_revision_id is not null and h.parent_id is not distinct from p_parent;
 return jsonb_build_object('site',p_site,'locale',p_locale,'parentId',p_parent,'version',coalesce(saved.version,0),'snapshot',md5(jsonb_build_object('version',coalesce(saved.version,0),'items',items)::text),'items',items);
end $$;

create function cms.set_page_sibling_order(p_site uuid,p_locale text,p_parent uuid,p_snapshot text,p_ids uuid[],p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_state jsonb; request jsonb; prior cms.page_order_receipts; result jsonb; next_version bigint;
begin
 if p_request is null or p_snapshot is null or p_snapshot !~ '^[a-f0-9]{32}$' or p_ids is null or cardinality(p_ids)>500
  or array_ndims(p_ids)>1 or array_position(p_ids,null) is not null
  or cardinality(p_ids)<>(select count(distinct id) from unnest(p_ids) id) then raise exception 'invalid_page_order'; end if;
 -- Same site lock as hierarchy moves; a second order cannot overtake a stale review.
 perform 1 from cms.websites where id=p_site for update;
 current_state:=cms.get_page_sibling_order(p_site,p_locale,p_parent);
 request:=jsonb_build_object('locale',p_locale,'parent',p_parent,'snapshot',p_snapshot,'ids',to_jsonb(p_ids));
 select * into prior from cms.page_order_receipts where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if found then
  if prior.manifest<>request then raise exception 'page_order_request_mismatch'; end if;
  return prior.result;
 end if;
 if current_state->>'snapshot'<>p_snapshot then raise exception 'page_order_changed' using errcode='40001'; end if;
 if (select coalesce(array_agg(value->>'id' order by value->>'id'),'{}') from jsonb_array_elements(current_state->'items'))
   is distinct from (select coalesce(array_agg(id::text order by id::text),'{}') from unnest(p_ids) id) then raise exception 'page_order_members_changed' using errcode='40001'; end if;
 insert into cms.page_branch_orders(website_id,branch_key,ordered_ids) values(p_site,p_locale||':'||coalesce(p_parent::text,'root'),p_ids)
 on conflict(website_id,branch_key) do update set ordered_ids=excluded.ordered_ids,version=cms.page_branch_orders.version+1 returning version into next_version;
 result:=jsonb_build_object('site',p_site,'locale',p_locale,'parentId',p_parent,'version',next_version,'orderedIds',to_jsonb(p_ids),'requestKey',p_request);
 insert into cms.page_order_receipts(website_id,actor_id,request_id,manifest,result) values(p_site,auth.uid(),p_request,request,result);
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'page.order_changed',jsonb_build_object('locale',p_locale,'parent',p_parent,'orderedIds',to_jsonb(p_ids),'version',next_version));
 return result;
end $$;
revoke all on function cms.get_page_sibling_order(uuid,text,uuid),cms.set_page_sibling_order(uuid,text,uuid,text,uuid[],uuid) from public;
grant execute on function cms.get_page_sibling_order(uuid,text,uuid),cms.set_page_sibling_order(uuid,text,uuid,text,uuid[],uuid) to authenticated;
commit;
