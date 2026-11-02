begin;
-- Local URL fields only. Free text and absolute URLs require separate review.
create function cms.payload_links_path(p_payload jsonb,p_path text)
returns boolean language sql immutable set search_path='' as $$
 select p_path is not null and exists(
  select 1 from (
   select v from jsonb_path_query(p_payload,'$.**.href') v union all
   select v from jsonb_path_query(p_payload,'$.**.url') v union all
   select v from jsonb_path_query(p_payload,'$.**.canonical') v union all
   select v from jsonb_path_query(p_payload,'$.**.redirectPath') v
  ) links where jsonb_typeof(v)='string' and split_part(split_part(v#>>'{}','?',1),'#',1)=p_path
 );
$$;
create function cms.review_page_url(p_site uuid,p_record uuid,p_revision uuid,p_path text,p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare target cms.records; matches jsonb; candidate_status text;
begin
 select * into target from cms.records where website_id=p_site and id=p_record;
 if not found or target.content_type<>'page' or not cms.can(p_site,'view','page',p_record) or not cms.can(p_site,'edit','page',p_record) then raise exception 'forbidden' using errcode='42501'; end if;
 if target.current_revision_id is distinct from p_revision then raise exception 'revision_conflict' using errcode='40001'; end if;
 if p_path is null or length(p_path)>500 then raise exception 'invalid_page_path'; end if;
 candidate_status:=case
  when not cms.is_custom_page_path(target.path) then 'fixed_route'
  when not cms.is_custom_page_path(p_path) then 'invalid_or_reserved'
  when p_path=target.path then 'unchanged'
  when exists(select 1 from cms.records where website_id=p_site and locale=target.locale and path=p_path and id<>p_record) then 'occupied'
  else 'eligible' end;
 select coalesce(jsonb_agg(item order by id),'[]'::jsonb) into matches from (
  select r.id,jsonb_build_object('recordId',r.id,'title',r.internal_title,'type',r.content_type,'path',r.path,'locale',r.locale,
   'draftLink',cms.payload_links_path(d.payload,target.path),'publishedLink',cms.payload_links_path(p.payload,target.path),
   'draftReference',cms.payload_references_record(d.payload,p_record),'publishedReference',cms.payload_references_record(p.payload,p_record)) item
  from cms.records r
  join cms.revisions d on d.website_id=r.website_id and d.record_id=r.id and d.id=r.current_revision_id
  left join cms.revisions p on p.website_id=r.website_id and p.record_id=r.id and p.id=r.published_revision_id
  where r.website_id=p_site and (p_after is null or r.id>p_after) and cms.can(p_site,'view',r.content_type,r.id)
   and (cms.payload_links_path(d.payload,target.path) or cms.payload_links_path(p.payload,target.path)
    or cms.payload_references_record(d.payload,p_record) or cms.payload_references_record(p.payload,p_record))
  order by r.id limit 51
 ) found;
 return jsonb_build_object('recordId',p_record,'revisionId',p_revision,'currentPath',target.path,'proposedPath',p_path,'locale',target.locale,
  'published',target.published_revision_id is not null,'status',candidate_status,'redirectDecisionRequired',target.published_revision_id is not null and p_path is distinct from target.path,
  'items',(select coalesce(jsonb_agg(v order by n),'[]'::jsonb) from jsonb_array_elements(matches) with ordinality entry(v,n) where n<=50),
  'nextCursor',case when jsonb_array_length(matches)>50 then matches#>>'{49,recordId}' else null end,
  'coverage','visible_saved_local_links_and_record_references');
end $$;
revoke all on function cms.payload_links_path(jsonb,text),cms.review_page_url(uuid,uuid,uuid,text,uuid) from public;
grant execute on function cms.review_page_url(uuid,uuid,uuid,text,uuid) to authenticated;
commit;
