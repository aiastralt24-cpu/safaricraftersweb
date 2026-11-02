begin;
create function cms.list_page_url_proposals(p_site uuid,p_record uuid,p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare matches jsonb;
begin
 if not exists(select 1 from cms.records where website_id=p_site and id=p_record and content_type='page') or not cms.can(p_site,'view','page',p_record) then raise exception 'forbidden' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('proposalId',id,'oldPath',old_path,'newPath',new_path,'status',status,'redirectChoice',redirect_choice) order by id),'[]'::jsonb) into matches
 from (select * from cms.page_url_proposals where website_id=p_site and record_id=p_record and (p_after is null or id>p_after) order by id limit 51) proposals;
 return jsonb_build_object('site',p_site,'recordId',p_record,'items',(select coalesce(jsonb_agg(v order by n),'[]'::jsonb) from jsonb_array_elements(matches) with ordinality entry(v,n) where n<=50),
  'nextCursor',case when jsonb_array_length(matches)>50 then matches#>>'{49,proposalId}' else null end);
end $$;
revoke all on function cms.list_page_url_proposals(uuid,uuid,uuid) from public;
grant execute on function cms.list_page_url_proposals(uuid,uuid,uuid) to authenticated;
commit;
