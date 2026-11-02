begin;
create or replace function cms.list_reference_candidates(p_site uuid,p_type text,p_search text default '',p_after uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_type is null or p_type not in ('destination','journey','photoExpedition','journalArticle','specialist','testimonial','document','form','product','project','page','navigation','faq','leadership') then raise exception 'invalid_reference_type'; end if;
 if p_search is null or length(p_search)>200 then raise exception 'invalid_reference_search'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'type',r.content_type,'title',r.internal_title,'path',r.path,'locale',r.locale,
  'published',r.published_revision_id is not null,'reviewStatus',r.review_status) order by r.id),'[]') into result
 from (select * from cms.records where website_id=p_site and content_type=p_type and (p_after is null or id>p_after)
  and (p_search='' or position(lower(p_search) in lower(internal_title||' '||coalesce(path,'')))>0)
  order by id limit 50) r;
 return result;
end $$;

create or replace function cms.resolve_editor_references(p_site uuid,p_type text,p_records uuid[])
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_type is null or p_type not in ('destination','journey','photoExpedition','journalArticle','specialist','testimonial','document','form','product','project','page','navigation','faq','leadership') then raise exception 'invalid_reference_type'; end if;
 if p_records is null or cardinality(p_records)>100 or array_position(p_records,null) is not null
  or (select count(distinct item) from unnest(p_records) item)<>cardinality(p_records) then raise exception 'invalid_reference_list'; end if;
 select coalesce(jsonb_agg(case when r.id is null then jsonb_build_object('id',requested.id,'available',false)
  else jsonb_build_object('id',r.id,'available',true,'type',r.content_type,'title',r.internal_title,'path',r.path,'locale',r.locale,
   'published',r.published_revision_id is not null,'reviewStatus',r.review_status) end order by requested.ordinality),'[]') into result
 from unnest(p_records) with ordinality requested(id,ordinality)
 left join cms.records r on r.website_id=p_site and r.id=requested.id and r.content_type=p_type;
 return result;
end $$;
revoke all on function cms.list_reference_candidates(uuid,text,text,uuid),cms.resolve_editor_references(uuid,text,uuid[]) from public;
grant execute on function cms.list_reference_candidates(uuid,text,text,uuid),cms.resolve_editor_references(uuid,text,uuid[]) to authenticated;
create function cms.get_public_leadership_reference(p_site uuid,p_record uuid,p_locale text default 'en')
returns jsonb language sql stable security definer set search_path='' as $$
 select cms.get_public_leadership(p_site,r.path,p_locale) from cms.records r
 where r.website_id=p_site and r.id=p_record and r.content_type='leadership' and r.locale=p_locale and r.published_revision_id is not null;
$$;
revoke all on function cms.get_public_leadership_reference(uuid,uuid,text) from public;
grant execute on function cms.get_public_leadership_reference(uuid,uuid,text) to anon,authenticated,service_role;
commit;
