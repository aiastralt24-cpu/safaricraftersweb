begin;
create table cms.project_claim_approvals (
 id uuid primary key default gen_random_uuid(),website_id uuid not null,record_id uuid not null,revision_id uuid not null,claim_id uuid not null,
 assignment_version integer not null,approved_by uuid not null references auth.users(id),snapshot jsonb not null,approved_at timestamptz not null default now(),
 foreign key(website_id,record_id,revision_id,claim_id) references cms.project_claim_owners(website_id,record_id,revision_id,claim_id)
);
create index project_claim_approvals_lookup on cms.project_claim_approvals(website_id,record_id,revision_id,claim_id,assignment_version);
alter table cms.project_claim_approvals enable row level security;
revoke all on cms.project_claim_approvals from public,anon,authenticated;
-- Internal evidence is intentionally independent of the caller. Public wrappers enforce document view access.
create function cms.project_claim_snapshot(p_site uuid,p_record uuid,p_revision uuid,p_claim uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb; claim jsonb; ref jsonb; doc cms.records; v cms.revisions; f jsonb; evidence jsonb:='[]'; day text:=to_char(now() at time zone 'UTC','YYYY-MM-DD');d text;
begin
 select r.payload into payload from cms.records p join cms.revisions r on r.website_id=p.website_id and r.record_id=p.id and r.id=p.current_revision_id where p.website_id=p_site and p.id=p_record and p.content_type='project' and p.current_revision_id=p_revision;
 if payload is null or jsonb_typeof(payload->'claims') is distinct from 'array' then return null;end if;
 if (select count(*) from jsonb_array_elements(payload->'claims') c where c->>'id'=p_claim::text)<>1 then return null;end if;
 select c into claim from jsonb_array_elements(payload->'claims') c where c->>'id'=p_claim::text;
 if jsonb_typeof(claim->'statement') is distinct from 'string' or length(btrim(claim->>'statement')) not between 1 and 2000 or jsonb_typeof(claim->'evidence') is distinct from 'array' then return null;end if;
 d:=claim->>'reviewOn';if d is null or d!~'^\d{4}-\d{2}-\d{2}$' or to_char(d::date,'YYYY-MM-DD')<>d or d<day then return null;end if;
 if jsonb_array_length(claim->'evidence') not between 1 and 30 or exists(select 1 from jsonb_array_elements(claim->'evidence') x group by lower(x->>'recordId') having count(*)>1) then return null;end if;
 for ref in select value from jsonb_array_elements(claim->'evidence') order by value->>'recordId' loop
  select * into doc from cms.records where website_id=p_site and id=(ref->>'recordId')::uuid and content_type='document';
  if doc.id is null or doc.current_revision_id is null then return null;end if;
  select * into v from cms.revisions where website_id=p_site and record_id=doc.id and id=doc.current_revision_id;
  foreach d in array array[v.payload->>'effectiveOn',v.payload->>'expiresOn',v.payload->>'reviewOn'] loop
   if d is not null and (d!~'^\d{4}-\d{2}-\d{2}$' or to_char(d::date,'YYYY-MM-DD')<>d) then return null;end if;
  end loop;
  if v.payload->>'effectiveOn'>day or v.payload->>'expiresOn'<day or v.payload->>'reviewOn'<day then return null;end if;
  f:=cms.get_document_validation_status(p_site,doc.id,v.id)->'file';
  if f is null or not coalesce((f->>'processed')::boolean,false) or not coalesce((f->>'rightsApproved')::boolean,false) or not coalesce((f->>'rightsCurrent')::boolean,false) or coalesce((f->>'archived')::boolean,true) or f->>'revision' is null then return null;end if;
  evidence:=evidence||jsonb_build_array(jsonb_build_object('recordId',doc.id,'revisionId',v.id,'title',coalesce(v.payload->>'title',doc.internal_title),'assetId',f->>'assetId','fileRevision',(f->>'revision')::bigint));
 end loop;
 return jsonb_build_object('statement',claim->>'statement','reviewOn',claim->>'reviewOn','evidence',evidence);
exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format then return null;
end $$;
create function cms.review_project_claim(p_site uuid,p_record uuid,p_revision uuid,p_claim uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s jsonb;o cms.project_claim_owners;a cms.project_claim_approvals;eligible boolean;
begin
 if not cms.can(p_site,'view','project',p_record) then raise exception 'forbidden' using errcode='42501';end if;
 if not exists(select 1 from cms.records where website_id=p_site and id=p_record and content_type='project' and current_revision_id=p_revision) then raise exception 'project_revision_changed' using errcode='40001';end if;
 select * into o from cms.project_claim_owners where website_id=p_site and record_id=p_record and revision_id=p_revision and claim_id=p_claim;
 s:=cms.project_claim_snapshot(p_site,p_record,p_revision,p_claim);
 if s is not null and exists(select 1 from jsonb_array_elements(s->'evidence') e where not cms.can(p_site,'view','document',(e->>'recordId')::uuid)) then s:=null;end if;
 eligible:=coalesce(cms.project_claim_owner_eligible(p_site,p_record,p_revision,o.owner_id),false);
 if s is not null and eligible then eligible:=not exists(select 1 from jsonb_array_elements(s->'evidence') e where not exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id where m.website_id=p_site and m.user_id=o.owner_id and m.revoked_at is null and (m.expires_at is null or m.expires_at>now()) and p.action='view' and p.content_type in('*','document') and (p.record_id is null or p.record_id=(e->>'recordId')::uuid)));end if;
 if s is not null and eligible then select * into a from cms.project_claim_approvals where website_id=p_site and record_id=p_record and revision_id=p_revision and claim_id=p_claim and assignment_version=o.version and approved_by=o.owner_id and snapshot=s order by approved_at desc,id limit 1;end if;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'claimId',p_claim,'assignmentVersion',coalesce(o.version,0),'snapshot',s,'canApprove',s is not null and eligible and o.owner_id is not distinct from auth.uid() and cms.can(p_site,'approve','project',p_record),'approvalId',a.id);
end $$;
create function cms.approve_project_claim(p_site uuid,p_record uuid,p_revision uuid,p_claim uuid,p_assignment integer,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare review jsonb;approval uuid;
begin
 if not cms.can(p_site,'view','project',p_record) or not cms.can(p_site,'approve','project',p_record) then raise exception 'forbidden' using errcode='42501';end if;
 perform 1 from cms.records where website_id=p_site and id=p_record and content_type='project' and current_revision_id=p_revision for update;
 if not found then raise exception 'project_revision_changed' using errcode='40001';end if;
 review:=cms.review_project_claim(p_site,p_record,p_revision,p_claim);
 if not coalesce((review->>'canApprove')::boolean,false) then raise exception 'claim_approval_unavailable' using errcode='42501';end if;
 if p_assignment is distinct from (review->>'assignmentVersion')::integer or p_snapshot is null or p_snapshot is distinct from review->'snapshot' then raise exception 'claim_evidence_changed' using errcode='40001';end if;
 if review->>'approvalId' is not null then return review;end if;
 insert into cms.project_claim_approvals(website_id,record_id,revision_id,claim_id,assignment_version,approved_by,snapshot)
 values(p_site,p_record,p_revision,p_claim,p_assignment,auth.uid(),p_snapshot) returning id into approval;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details) values(p_site,auth.uid(),'project.claim_approved',p_record,p_revision,jsonb_build_object('claimId',p_claim,'approvalId',approval,'assignmentVersion',p_assignment));
 return cms.review_project_claim(p_site,p_record,p_revision,p_claim);
end $$;
revoke all on function cms.project_claim_snapshot(uuid,uuid,uuid,uuid),cms.review_project_claim(uuid,uuid,uuid,uuid),cms.approve_project_claim(uuid,uuid,uuid,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function cms.review_project_claim(uuid,uuid,uuid,uuid),cms.approve_project_claim(uuid,uuid,uuid,uuid,integer,jsonb) to authenticated;
commit;
