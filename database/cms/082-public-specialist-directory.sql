begin;
create function cms.list_public_specialists(p_site uuid,p_locale text default 'en',p_after_order integer default null,p_after_id uuid default null,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; more boolean;
begin
 if p_locale is distinct from 'en' then return null; end if;
 if p_limit is null or p_limit not between 1 and 100 or (p_after_order is null)<>(p_after_id is null) or (p_after_order is not null and p_after_order not between 0 and 9999) then raise exception 'invalid_directory_cursor'; end if;
 with available as materialized (
  select r.id,cms.get_public_specialist(p_site,r.id,p_locale) value from cms.records r
  where r.website_id=p_site and r.content_type='specialist' and r.locale=p_locale and r.published_revision_id is not null
 ), page as (
  select id,value,(value->'payload'->>'sortOrder')::integer sort_order from available where value is not null
   and (p_after_order is null or ((value->'payload'->>'sortOrder')::integer,id)>(p_after_order,p_after_id))
  order by sort_order,id limit p_limit+1
 ) select coalesce(jsonb_agg(value order by sort_order,id),'[]') into items from page;
 more:=jsonb_array_length(items)>p_limit;if more then items:=items-p_limit;end if;
 return jsonb_build_object('websiteId',p_site,'locale',p_locale,'items',items,'nextCursor',case when more then jsonb_build_object('sortOrder',items->(p_limit-1)->'payload'->'sortOrder','recordId',items->(p_limit-1)->'recordId') else null end);
end $$;
revoke all on function cms.list_public_specialists(uuid,text,integer,uuid,integer) from public;
grant execute on function cms.list_public_specialists(uuid,text,integer,uuid,integer) to anon,authenticated;
-- Publication policy and page rollout remain disabled.
commit;
