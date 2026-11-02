begin;
create function cms.get_career_validation_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;payload jsonb;refs jsonb;media jsonb;links jsonb;form jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='career' and current_revision_id=p_revision;
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 select coalesce(jsonb_agg(jsonb_build_object('type',t.kind,'recordId',ref->>'recordId','available',r.id is not null,'published',r.published_revision_id is not null,'locale',r.locale) order by t.kind,ref->>'recordId'),'[]') into refs
 from (values('locations','location'),('documents','document'),('pages','page')) t(key,kind)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(payload#>array['relationships',t.key])='array' then payload#>array['relationships',t.key] else '[]'::jsonb end) ref
 left join cms.records r on r.website_id=p_site and r.id=(ref->>'recordId')::uuid and r.content_type=t.kind and r.id<>p_record;
 if payload#>>'{application,mode}'='form' then
  form:=cms.get_published_form(p_site,(payload#>>'{application,formId}')::uuid);
  refs:=refs||jsonb_build_array(jsonb_build_object('type','form','recordId',payload#>>'{application,formId}',
   'available',coalesce(form is not null and form->>'locale'=rec.locale and form->'definition'->'schemaVersion'='1'::jsonb
    and jsonb_typeof(form->'definition'->'fields')='array'
    and not jsonb_path_exists(form,'$.definition.fields[*] ? (@.type == "file")')
    and coalesce(form->'definition'->'notificationRouteIds','[]'::jsonb)='[]'::jsonb,false),
   'published',form is not null and form->>'revisionId' is not null,'locale',form->>'locale'));
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',id,'available',exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=x.id and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and length(btrim(m.rights_evidence))>0 and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()))) order by id),'[]') into media
 from (select distinct value#>>'{}' id from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string') x;
 select coalesce(jsonb_agg(jsonb_build_object('href',href,'available',cms.tanzania_link_path(href) is not null and position('#' in href)=0 and (cms.tanzania_link_path(href)=rec.path or exists(select 1 from cms.navigation_public_paths where path=cms.tanzania_link_path(href)) or cms.concept_link_available(p_site,cms.tanzania_link_path(href),rec.locale))) order by href),'[]') into links
 from (select distinct value#>>'{}' href from jsonb_path_query(payload,'$.**.href') value where jsonb_typeof(value)='string' and (value#>>'{}' like '/%' or value#>>'{}' like '#%')) x;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'applicationForm',form,'references',refs,'media',media,'links',links);
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.get_career_validation_evidence(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_career_validation_evidence(uuid,uuid,uuid) to service_role;
alter function cms.get_validation_input(uuid,uuid,uuid) rename to get_validation_input_before_career;
revoke all on function cms.get_validation_input_before_career(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare value jsonb;
begin
 value:=cms.get_validation_input_before_career(p_site,p_record,p_revision);
 if value->>'type'='career' then value:=value||jsonb_build_object('careerEvidence',cms.get_career_validation_evidence(p_site,p_record,p_revision));end if;
 return value;
end $$;
revoke all on function cms.get_validation_input(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_validation_input(uuid,uuid,uuid) to service_role;
insert into cms.validation_policy(content_type,validator_version) values('career','career-1');
commit;
