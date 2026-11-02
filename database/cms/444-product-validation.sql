begin;
create function cms.get_product_validation_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;payload jsonb;refs jsonb;media jsonb;links jsonb;categories jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='product' and current_revision_id=p_revision;
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 select coalesce(jsonb_agg(jsonb_build_object('recordId',pin->>'recordId','revisionId',pin->>'revisionId','available',v.id is not null,'published',coalesce(r.published_revision_id=v.id,false),'locale',r.locale,'payload',v.payload) order by ord),'[]') into categories
 from jsonb_array_elements(jsonb_build_array(payload->'category',payload->'subcategory')) with ordinality x(pin,ord)
 left join cms.records r on r.website_id=p_site and r.id=(pin->>'recordId')::uuid and r.content_type='productCategory'
 left join cms.revisions v on v.website_id=p_site and v.record_id=r.id and v.id=(pin->>'revisionId')::uuid
 where pin is not null and pin<>'null'::jsonb;
 select coalesce(jsonb_agg(jsonb_build_object('group',t.key,'type',t.kind,'recordId',ref->>'recordId','available',r.id is not null,'published',coalesce(case t.kind when 'certification' then cms.get_public_certification(p_site,r.path,r.locale) is not null when 'application' then cms.get_public_application(p_site,r.path,r.locale) is not null when 'project' then cms.get_public_project(p_site,r.path,r.locale) is not null when 'faq' then cms.get_public_faq(p_site,r.id,r.locale) is not null when 'document' then cms.get_document_download(p_site,r.id)->>'access'='public' when 'product' then false else false end,false),'locale',r.locale) order by t.key,ref->>'recordId'),'[]') into refs
 from (values('applications','application'),('documents','document'),('projects','project'),('certifications','certification'),('faqs','faq'),('relatedProducts','product'),('accessories','product'),('compatibleSystems','product'),('replacements','product')) t(key,kind)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(payload#>array['relationships',t.key])='array' then payload#>array['relationships',t.key] else '[]'::jsonb end) ref
 left join cms.records r on r.website_id=p_site and r.id=(ref->>'recordId')::uuid and r.content_type=t.kind and r.id<>p_record;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',id,'available',exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=x.id and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and length(btrim(m.rights_evidence))>0 and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()))) order by id),'[]') into media
 from (select distinct value#>>'{}' id from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string') x;
 select coalesce(jsonb_agg(jsonb_build_object('href',href,'available',cms.tanzania_link_path(href) is not null and position('#' in href)=0 and (cms.tanzania_link_path(href)=rec.path or exists(select 1 from cms.navigation_public_paths where path=cms.tanzania_link_path(href)) or cms.concept_link_available(p_site,cms.tanzania_link_path(href),rec.locale))) order by href),'[]') into links
 from (select distinct value#>>'{}' href from jsonb_path_query(payload,'$.**.href') value where jsonb_typeof(value)='string' and (value#>>'{}' like '/%' or value#>>'{}' like '#%')) x;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'categories',categories,'references',refs,'media',media,'links',links,'commerce',jsonb_build_object('provider',payload#>>'{commerce,provider}','verified',payload#>>'{commerce,provider}'='none'));
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.get_product_validation_evidence(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_product_validation_evidence(uuid,uuid,uuid) to service_role;
alter function cms.get_validation_input(uuid,uuid,uuid) rename to get_validation_input_before_product;
revoke all on function cms.get_validation_input_before_product(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare value jsonb;
begin
 value:=cms.get_validation_input_before_product(p_site,p_record,p_revision);
 if value->>'type'='product' then value:=value||jsonb_build_object('productEvidence',cms.get_product_validation_evidence(p_site,p_record,p_revision));end if;
 return value;
end $$;
revoke all on function cms.get_validation_input(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_validation_input(uuid,uuid,uuid) to service_role;
insert into cms.validation_policy(content_type,validator_version) values('product','product-1');
commit;
