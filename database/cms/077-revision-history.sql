begin;
-- Resolve the cursor inside the database to preserve timestamp precision.
create index cms_revision_history_cursor on cms.revisions(website_id,record_id,created_at desc,id desc);
create function cms.list_revision_history(p_site uuid,p_record uuid,p_before uuid default null,p_limit integer default 20)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare cursor_time timestamptz; entries jsonb; more boolean;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_page_size'; end if;
 if not exists(select 1 from cms.records where website_id=p_site and id=p_record) then return null; end if;
 if p_before is not null then
  select created_at into cursor_time from cms.revisions where website_id=p_site and record_id=p_record and id=p_before;
  if not found then raise exception 'invalid_history_cursor'; end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'parentRevision',v.parent_revision_id,'authorId',v.created_by,'createdAt',v.created_at) order by v.created_at desc,v.id desc),'[]') into entries
 from (select * from cms.revisions where website_id=p_site and record_id=p_record
  and (p_before is null or (created_at,id)<(cursor_time,p_before)) order by created_at desc,id desc limit p_limit+1) v;
 more:=jsonb_array_length(entries)>p_limit;
 if more then entries:=entries-p_limit; end if;
 return jsonb_build_object('recordId',p_record,'items',entries,'nextCursor',case when more then entries->(p_limit-1)->>'id' else null end);
end $$;
revoke all on function cms.list_revision_history(uuid,uuid,uuid,integer) from public;
grant execute on function cms.list_revision_history(uuid,uuid,uuid,integer) to authenticated;
commit;
