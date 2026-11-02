begin;
create function cms.project_claim_approval_current(p_site uuid,p_record uuid,p_revision uuid,p_claim uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare s jsonb;o cms.project_claim_owners;
begin
 s:=cms.project_claim_snapshot(p_site,p_record,p_revision,p_claim);if s is null then return false;end if;
 select * into o from cms.project_claim_owners where website_id=p_site and record_id=p_record and revision_id=p_revision and claim_id=p_claim;
 if not coalesce(cms.project_claim_owner_eligible(p_site,p_record,p_revision,o.owner_id),false) then return false;end if;
 if exists(select 1 from jsonb_array_elements(s->'evidence') e where not exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id where m.website_id=p_site and m.user_id=o.owner_id and m.revoked_at is null and (m.expires_at is null or m.expires_at>now()) and p.action='view' and p.content_type in('*','document') and (p.record_id is null or p.record_id=(e->>'recordId')::uuid))) then return false;end if;
 return exists(select 1 from cms.project_claim_approvals where website_id=p_site and record_id=p_record and revision_id=p_revision and claim_id=p_claim and assignment_version=o.version and approved_by=o.owner_id and snapshot=s);
end $$;
create function cms.get_project_validation_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;payload jsonb;claims jsonb;refs jsonb;media jsonb;links jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='project' and current_revision_id=p_revision;
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 select coalesce(jsonb_agg(jsonb_build_object('claimId',c->>'id','approved',cms.project_claim_approval_current(p_site,p_record,p_revision,(c->>'id')::uuid)) order by n),'[]') into claims
 from jsonb_array_elements(case when jsonb_typeof(payload->'claims')='array' then payload->'claims' else '[]'::jsonb end) with ordinality x(c,n);
 select coalesce(jsonb_agg(jsonb_build_object('type',t.kind,'recordId',ref->>'recordId','available',r.id is not null,'published',r.published_revision_id is not null,'locale',r.locale) order by t.kind,ref->>'recordId'),'[]') into refs
 from (values('projects','project'),('products','product'),('destinations','destination'),('documents','document')) t(key,kind)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(payload#>array['relationships',t.key])='array' then payload#>array['relationships',t.key] else '[]'::jsonb end) ref
 left join cms.records r on r.website_id=p_site and r.id=(ref->>'recordId')::uuid and r.content_type=t.kind and r.id<>p_record;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',id,'available',exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=x.id and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and length(btrim(m.rights_evidence))>0 and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()))) order by id),'[]') into media
 from (select distinct value#>>'{}' id from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string') x;
 select coalesce(jsonb_agg(jsonb_build_object('href',href,'available',cms.tanzania_link_path(href) is not null and position('#' in href)=0 and (cms.tanzania_link_path(href)=rec.path or exists(select 1 from cms.navigation_public_paths where path=cms.tanzania_link_path(href)) or cms.concept_link_available(p_site,cms.tanzania_link_path(href),rec.locale))) order by href),'[]') into links
 from (select distinct value#>>'{}' href from jsonb_path_query(payload,'$.**.href') value where jsonb_typeof(value)='string' and (value#>>'{}' like '/%' or value#>>'{}' like '#%')) x;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'claims',claims,'references',refs,'media',media,'links',links);
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.project_claim_approval_current(uuid,uuid,uuid,uuid),cms.get_project_validation_evidence(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_project_validation_evidence(uuid,uuid,uuid) to service_role;
alter function cms.get_validation_input(uuid,uuid,uuid) rename to get_validation_input_before_projects;
revoke all on function cms.get_validation_input_before_projects(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select value||case when value->>'type'='project' then jsonb_build_object('projectEvidence',cms.get_project_validation_evidence(p_site,p_record,p_revision)) else '{}'::jsonb end from (select cms.get_validation_input_before_projects(p_site,p_record,p_revision) value) x;
$$;
revoke all on function cms.get_validation_input(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_validation_input(uuid,uuid,uuid) to service_role;
insert into cms.validation_policy(content_type,validator_version) values('project','project-1');
-- Validation receipts must not enable a route before its publication and delivery contract exists.
create function cms.enforce_project_release_pending()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.content_type='project' and new.published_revision_id is not null then raise exception 'project_public_delivery_not_ready';end if;return new;
end $$;
revoke all on function cms.enforce_project_release_pending() from public;
create trigger cms_project_release_pending before insert or update of published_revision_id,content_type,path,locale on cms.records for each row execute function cms.enforce_project_release_pending();
commit;
