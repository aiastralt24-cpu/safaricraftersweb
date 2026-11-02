begin;
-- Cancellation and execution share the same site lock and actor-bound receipt.
create or replace function cms.move_page(p_site uuid,p_record uuid,p_revision uuid,p_version bigint,p_parent uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec cms.records; parent cms.records; h cms.page_hierarchy; old_parent cms.records;
 request jsonb; prior cms.page_move_receipts; cursor_id uuid; depth int:=0; result jsonb; next_version bigint;
begin
 if p_request is null or p_version is null or p_version<0 then raise exception 'invalid_page_move'; end if;
 -- Serialize hierarchy changes within a site, including cross-branch cycle checks.
 perform 1 from cms.websites where id=p_site for update;
 select * into rec from cms.records where website_id=p_site and id=p_record for update;
 if not found or rec.content_type<>'page' or not cms.can(p_site,'view',rec.content_type,rec.id) or not cms.can(p_site,'edit',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_parent is not null then
  select * into parent from cms.records where website_id=p_site and id=p_parent for share;
  if not found or parent.content_type not in ('page','homepage') or parent.locale<>rec.locale
   or not cms.can(p_site,'view',parent.content_type,parent.id) or not cms.can(p_site,'edit',parent.content_type,parent.id) then raise exception 'page_parent_unavailable'; end if;
 end if;
 request:=jsonb_build_object('record',p_record,'revision',p_revision,'version',p_version,'parent',p_parent);
 select * into prior from cms.page_move_receipts where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if found then
  if prior.manifest<>request then raise exception 'page_move_request_mismatch'; end if;
  if prior.result->>'cancelled'='true' then raise exception 'page_move_cancelled'; end if;
  return prior.result;
 end if;
 select * into h from cms.page_hierarchy where website_id=p_site and record_id=p_record;
 if rec.current_revision_id is distinct from p_revision or coalesce(h.version,0)<>p_version then raise exception 'revision_conflict' using errcode='40001'; end if;
 if h.parent_id is not null then
  select * into old_parent from cms.records where website_id=p_site and id=h.parent_id;
  if not cms.can(p_site,'view',old_parent.content_type,old_parent.id) or not cms.can(p_site,'edit',old_parent.content_type,old_parent.id) then raise exception 'page_parent_unavailable'; end if;
 end if;
 cursor_id:=p_parent;
 while cursor_id is not null loop
  depth:=depth+1;
  if cursor_id=p_record then raise exception 'page_hierarchy_cycle'; end if;
  if depth>100 then raise exception 'page_hierarchy_depth'; end if;
  select parent_id into cursor_id from cms.page_hierarchy where website_id=p_site and record_id=cursor_id;
 end loop;
 -- Moving a branch must not push its existing descendants beyond the same bound.
 if (with recursive descendants(id,level) as (
   select p_record,0 union all
   select edge.record_id,d.level+1 from descendants d join cms.page_hierarchy edge on edge.website_id=p_site and edge.parent_id=d.id where d.level<=100
  ) select coalesce(max(level),0)+depth>100 from descendants) then raise exception 'page_hierarchy_depth'; end if;
 next_version:=coalesce(h.version,0);
 if h.parent_id is distinct from p_parent then
  insert into cms.page_hierarchy(website_id,record_id,parent_id,version) values(p_site,p_record,p_parent,1)
   on conflict(website_id,record_id) do update set parent_id=excluded.parent_id,version=cms.page_hierarchy.version+1 returning version into next_version;
  insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
   values(p_site,auth.uid(),'page.moved',p_record,p_revision,jsonb_build_object('oldParent',h.parent_id,'parent',p_parent,'version',next_version));
 end if;
 result:=jsonb_build_object('recordId',p_record,'revisionId',p_revision,'parentId',p_parent,'version',next_version);
 insert into cms.page_move_receipts(website_id,actor_id,request_id,manifest,result) values(p_site,auth.uid(),p_request,request,result);
 return result;
end $$;

create function cms.cancel_page_move(p_site uuid,p_record uuid,p_revision uuid,p_version bigint,p_parent uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec cms.records; request jsonb; prior cms.page_move_receipts;
begin
 if p_request is null or p_version is null or p_version<0 then raise exception 'invalid_page_move'; end if;
 perform 1 from cms.websites where id=p_site for update;
 select * into rec from cms.records where website_id=p_site and id=p_record for update;
 if not found or rec.content_type<>'page' or not cms.can(p_site,'view','page',p_record) or not cms.can(p_site,'edit','page',p_record) then raise exception 'forbidden' using errcode='42501'; end if;
 request:=jsonb_build_object('record',p_record,'revision',p_revision,'version',p_version,'parent',p_parent);
 select * into prior from cms.page_move_receipts where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if found then
  if prior.manifest<>request then raise exception 'page_move_request_mismatch'; end if;
  if prior.result->>'cancelled' is distinct from 'true' then return jsonb_build_object('status','completed','result',prior.result); end if;
 else
  insert into cms.page_move_receipts(website_id,actor_id,request_id,manifest,result) values(p_site,auth.uid(),p_request,request,jsonb_build_object('cancelled',true));
  insert into cms.audit_events(website_id,actor_id,action,record_id,details) values(p_site,auth.uid(),'page.move_cancelled',p_record,jsonb_build_object('requestKey',p_request));
 end if;
 return jsonb_build_object('status','cancelled','requestKey',p_request,'recordId',p_record);
end $$;
revoke all on function cms.cancel_page_move(uuid,uuid,uuid,bigint,uuid,uuid) from public;
grant execute on function cms.cancel_page_move(uuid,uuid,uuid,bigint,uuid,uuid) to authenticated;
commit;
