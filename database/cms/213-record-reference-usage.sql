begin;
-- Direct structured references only: no claims about links or dynamic/global consumers.
create function cms.payload_references_record(p_payload jsonb,p_record uuid)
returns boolean language sql immutable set search_path='' as $$
 select exists(select 1 from jsonb_path_query(p_payload,'$.**.recordId') v
  where jsonb_typeof(v)='string' and lower(v#>>'{}')=p_record::text);
$$;
create function cms.record_reference_usage(p_site uuid,p_record uuid,p_revision uuid,p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare target cms.records; result jsonb;
begin
 select * into target from cms.records where website_id=p_site and id=p_record;
 if not found or not cms.can(p_site,'view',target.content_type,target.id) then raise exception 'forbidden' using errcode='42501'; end if;
 if target.current_revision_id is distinct from p_revision then raise exception 'revision_conflict' using errcode='40001'; end if;
 select coalesce(jsonb_agg(row_data order by id),'[]'::jsonb) into result from (
  select r.id,jsonb_build_object('recordId',r.id,'title',r.internal_title,'type',r.content_type,'path',r.path,'locale',r.locale,
   'draft',cms.payload_references_record(d.payload,p_record),'published',cms.payload_references_record(p.payload,p_record)) row_data
  from cms.records r
  join cms.revisions d on d.website_id=r.website_id and d.record_id=r.id and d.id=r.current_revision_id
  left join cms.revisions p on p.website_id=r.website_id and p.record_id=r.id and p.id=r.published_revision_id
  where r.website_id=p_site and r.id<>p_record and (p_after is null or r.id>p_after)
   and cms.can(p_site,'view',r.content_type,r.id)
   and (cms.payload_references_record(d.payload,p_record) or cms.payload_references_record(p.payload,p_record))
  order by r.id limit 51
 ) matches;
 return jsonb_build_object('recordId',p_record,'revisionId',p_revision,'items',(select coalesce(jsonb_agg(v),'[]'::jsonb) from jsonb_array_elements(result) with ordinality a(v,n) where n<=50),
  'nextCursor',case when jsonb_array_length(result)>50 then result#>>'{49,recordId}' else null end);
end $$;
revoke all on function cms.payload_references_record(jsonb,uuid),cms.record_reference_usage(uuid,uuid,uuid,uuid) from public;
grant execute on function cms.record_reference_usage(uuid,uuid,uuid,uuid) to authenticated;
commit;
