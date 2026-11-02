begin;
-- Actor-scoped draft evidence only; publication has its own current-evidence gate.
create function cms.review_product_import_links(p_site uuid,p_create boolean,p_records uuid[],p_assets text[],p_references jsonb,p_categories jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare assets jsonb; refs jsonb; categories jsonb;
begin
 if p_create is null or p_records is null or cardinality(p_records)>25 or array_position(p_records,null) is not null then raise exception 'invalid_import_targets';end if;
 if not p_create and cardinality(p_records)=0 then raise exception 'forbidden' using errcode='42501';end if;
 if p_create and not cms.can(p_site,'create','product',null) then raise exception 'forbidden' using errcode='42501';end if;
 if exists(select 1 from unnest(p_records) q(id) where not exists(select 1 from cms.records r where r.id=q.id and r.website_id=p_site and r.content_type='product' and cms.can(p_site,'view','product',r.id) and cms.can(p_site,'edit','product',r.id))) then raise exception 'forbidden' using errcode='42501';end if;
 if p_assets is null or cardinality(p_assets)>500 or array_position(p_assets,null) is not null or (select count(distinct v) from unnest(p_assets) v)<>cardinality(p_assets) or exists(select 1 from unnest(p_assets) v where v !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$') then raise exception 'invalid_import_assets';end if;
 if p_references is null or jsonb_typeof(p_references)<>'array' then raise exception 'invalid_import_references';end if;
 if jsonb_array_length(p_references)>500 then raise exception 'invalid_import_references';end if;
 if exists(select 1 from jsonb_array_elements(p_references) x where jsonb_typeof(x)<>'object' or x->>'type' is null or x->>'type' not in('application','document','project','certification','faq','product') or x->>'recordId' is null or x->>'recordId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or x- 'type'- 'recordId'<>'{}'::jsonb)
 or (select count(distinct (x->>'type',x->>'recordId')) from jsonb_array_elements(p_references) x)<>jsonb_array_length(p_references) then raise exception 'invalid_import_references';end if;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',a.id,'available',coalesce(m.id is not null and cms.can(p_site,'view','document',null) and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and length(btrim(m.rights_evidence))>0 and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()),false)) order by a.n),'[]') into assets
 from unnest(p_assets) with ordinality a(id,n) left join cms.media_objects m on m.website_id=p_site and m.id=a.id;
 select coalesce(jsonb_agg(jsonb_build_object('recordId',x.value->>'recordId','type',x.value->>'type','available',r.current_revision_id is not null,'revision',r.current_revision_id,'locale',case when r.current_revision_id is not null then r.locale else null end) order by x.n),'[]') into refs
 from jsonb_array_elements(p_references) with ordinality x(value,n)
 left join cms.records r on r.website_id=p_site and r.id=(x.value->>'recordId')::uuid and r.content_type=x.value->>'type' and cms.can(p_site,'view',r.content_type,r.id)
 left join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id;
 if p_categories is null or jsonb_typeof(p_categories)<>'array' then raise exception 'invalid_import_categories';end if;
 if jsonb_array_length(p_categories)>50 then raise exception 'invalid_import_categories';end if;
 if exists(select 1 from jsonb_array_elements(p_categories) x where jsonb_typeof(x)<>'object' or x->>'recordId' is null or x->>'revisionId' is null
  or x->>'recordId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  or x->>'revisionId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  or x-'recordId'-'revisionId'<>'{}'::jsonb)
  or (select count(distinct (lower(x->>'recordId'),lower(x->>'revisionId'))) from jsonb_array_elements(p_categories) x)<>jsonb_array_length(p_categories) then raise exception 'invalid_import_categories';end if;
 -- A saved historical revision is intentional: never silently substitute current definitions.
 select coalesce(jsonb_agg(jsonb_build_object('recordId',x.value->>'recordId','revisionId',x.value->>'revisionId','available',v.id is not null,
  'locale',case when v.id is not null then r.locale else null end,'payload',v.payload) order by x.n),'[]') into categories
 from jsonb_array_elements(p_categories) with ordinality x(value,n)
 left join cms.records r on r.website_id=p_site and r.id=(x.value->>'recordId')::uuid and r.content_type='productCategory' and cms.can(p_site,'view','productCategory',r.id)
 left join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=(x.value->>'revisionId')::uuid;
 return jsonb_build_object('assets',assets,'references',refs,'categories',categories);
end $$;
revoke all on function cms.review_product_import_links(uuid,boolean,uuid[],text[],jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function cms.review_product_import_links(uuid,boolean,uuid[],text[],jsonb,jsonb) to authenticated;
commit;
