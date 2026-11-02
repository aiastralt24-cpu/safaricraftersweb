begin;
create function cms.list_page_parents(p_site uuid,p_record uuid,p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found or rec.content_type<>'page' or not cms.can(p_site,'view','page',p_record) or not cms.can(p_site,'edit','page',p_record) then raise exception 'forbidden' using errcode='42501'; end if;
 return (with recursive branch(id) as (
  select p_record union select h.record_id from cms.page_hierarchy h join branch b on h.parent_id=b.id where h.website_id=p_site
 ), candidates as (
  select r.id,r.internal_title,r.path,r.content_type from cms.records r
  where r.website_id=p_site and r.locale=rec.locale and r.content_type in ('page','homepage')
   and r.current_revision_id is not null and (p_after is null or r.id>p_after)
   and r.id not in(select id from branch)
   and cms.can(p_site,'view',r.content_type,r.id) and cms.can(p_site,'edit',r.content_type,r.id)
  order by r.id limit 51
 ), numbered as (select *,row_number() over(order by id) n from candidates)
 select jsonb_build_object('recordId',p_record,'revisionId',rec.current_revision_id,
  'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',internal_title,'path',path,'type',content_type) order by id) from numbered where n<=50),'[]'::jsonb),
  'nextCursor',case when (select count(*) from candidates)>50 then (select id from numbered where n=50) else null end));
end $$;
revoke all on function cms.list_page_parents(uuid,uuid,uuid) from public;
grant execute on function cms.list_page_parents(uuid,uuid,uuid) to authenticated;
commit;
