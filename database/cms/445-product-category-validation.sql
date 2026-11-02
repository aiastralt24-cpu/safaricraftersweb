begin;
create function cms.get_product_category_validation_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;draft_payload jsonb;parent jsonb:=null;media jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='productCategory' and current_revision_id=p_revision;
 if not found then return null;end if;
 select v.payload into draft_payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if draft_payload->'parent' is not null and draft_payload->'parent'<>'null'::jsonb then
  select jsonb_build_object('recordId',draft_payload#>>'{parent,recordId}','available',r.id is not null,'published',v.id is not null,'locale',r.locale,'payload',v.payload) into parent
  from (select 1) x left join cms.records r on r.website_id=p_site and r.id=(draft_payload#>>'{parent,recordId}')::uuid and r.content_type='productCategory' and r.id<>p_record
  left join cms.revisions v on v.website_id=p_site and v.record_id=r.id and v.id=r.published_revision_id;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',id,'available',exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=x.id and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and length(btrim(m.rights_evidence))>0 and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()))) order by id),'[]') into media
 from (select distinct value#>>'{}' id from jsonb_path_query(draft_payload,'$.**.assetId') value where jsonb_typeof(value)='string') x;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'parent',parent,'media',media);
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.get_product_category_validation_evidence(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_product_category_validation_evidence(uuid,uuid,uuid) to service_role;
alter function cms.get_validation_input(uuid,uuid,uuid) rename to get_validation_input_before_product_category;
revoke all on function cms.get_validation_input_before_product_category(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare value jsonb;
begin
 value:=cms.get_validation_input_before_product_category(p_site,p_record,p_revision);
 if value->>'type'='productCategory' then value:=value||jsonb_build_object('productCategoryEvidence',cms.get_product_category_validation_evidence(p_site,p_record,p_revision));end if;
 return value;
end $$;
revoke all on function cms.get_validation_input(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_validation_input(uuid,uuid,uuid) to service_role;
insert into cms.validation_policy(content_type,validator_version) values('productCategory','productCategory-1');
commit;
