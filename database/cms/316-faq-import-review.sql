begin;
-- Permission-scoped FAQ draft import review; this function never writes drafts.
create function cms.review_faq_import_links(p_site uuid,p_create boolean,p_records uuid[],p_references jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare refs jsonb;
begin
 if p_create is null or p_records is null or cardinality(p_records)>25 or array_position(p_records,null) is not null then raise exception 'invalid_import_targets';end if;
 if not p_create and cardinality(p_records)=0 then raise exception 'forbidden' using errcode='42501';end if;
 if p_create and not cms.can(p_site,'create','faq',null) then raise exception 'forbidden' using errcode='42501';end if;
 if exists(select 1 from unnest(p_records) q(id) where not exists(select 1 from cms.records r where r.id=q.id and r.website_id=p_site and r.content_type='faq' and cms.can(p_site,'view','faq',r.id) and cms.can(p_site,'edit','faq',r.id))) then raise exception 'forbidden' using errcode='42501';end if;
 if p_references is null or jsonb_typeof(p_references)<>'array' then raise exception 'invalid_import_references';end if;
 if jsonb_array_length(p_references)>500 then raise exception 'invalid_import_references';end if;
 if exists(select 1 from jsonb_array_elements(p_references) x where jsonb_typeof(x)<>'object' or x->>'type' is null or x->>'type' not in('page','product','destination','document') or x->>'recordId' is null or x->>'recordId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or x- 'type'- 'recordId'<>'{}'::jsonb)
 or (select count(distinct (x->>'type',x->>'recordId')) from jsonb_array_elements(p_references) x)<>jsonb_array_length(p_references) then raise exception 'invalid_import_references';end if;
 select coalesce(jsonb_agg(jsonb_build_object('recordId',x.value->>'recordId','type',x.value->>'type','available',r.current_revision_id is not null,'revision',r.current_revision_id) order by x.n),'[]') into refs
 from jsonb_array_elements(p_references) with ordinality x(value,n)
 left join cms.records r on r.website_id=p_site and r.id=(x.value->>'recordId')::uuid and r.content_type=x.value->>'type' and cms.can(p_site,'view',r.content_type,r.id);
 return jsonb_build_object('references',refs);
end $$;
revoke all on function cms.review_faq_import_links(uuid,boolean,uuid[],jsonb) from public,anon,authenticated,service_role;
grant execute on function cms.review_faq_import_links(uuid,boolean,uuid[],jsonb) to authenticated;
commit;
