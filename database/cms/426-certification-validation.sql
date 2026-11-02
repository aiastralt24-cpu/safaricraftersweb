begin;
create function cms.get_certification_validation_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;payload jsonb;refs jsonb;media jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='certification' and current_revision_id=p_revision;
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 select coalesce(jsonb_agg(jsonb_build_object('type',t.kind,'recordId',ref->>'recordId','available',r.id is not null,'published',r.published_revision_id is not null,'locale',r.locale) order by t.kind,ref->>'recordId'),'[]') into refs
 from (values('locations','location'),('pages','page')) t(key,kind)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(payload#>array['relationships',t.key])='array' then payload#>array['relationships',t.key] else '[]'::jsonb end) ref
 left join cms.records r on r.website_id=p_site and r.id=(ref->>'recordId')::uuid and r.content_type=t.kind and r.id<>p_record;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',id,'available',exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=x.id and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and length(btrim(m.rights_evidence))>0 and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()))) order by id),'[]') into media
 from (select distinct value#>>'{}' id from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string') x;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'references',refs,'media',media,'claimApproved',cms.certification_claim_approval_current(p_site,p_record,p_revision,p_record));
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.get_certification_validation_evidence(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_certification_validation_evidence(uuid,uuid,uuid) to service_role;
alter function cms.get_validation_input(uuid,uuid,uuid) rename to get_validation_input_before_certification;
revoke all on function cms.get_validation_input_before_certification(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare value jsonb;
begin
 value:=cms.get_validation_input_before_certification(p_site,p_record,p_revision);
 if value->>'type'='certification' then value:=value||jsonb_build_object('certificationEvidence',cms.get_certification_validation_evidence(p_site,p_record,p_revision));end if;
 return value;
end $$;
revoke all on function cms.get_validation_input(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_validation_input(uuid,uuid,uuid) to service_role;
insert into cms.validation_policy(content_type,validator_version) values('certification','certification-1');
commit;
