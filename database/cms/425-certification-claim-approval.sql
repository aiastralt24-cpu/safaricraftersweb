begin;
create table cms.certification_claim_owners (
 website_id uuid not null,record_id uuid not null,revision_id uuid not null,claim_id uuid not null,
 owner_id uuid references auth.users(id),version integer not null check(version>0),
 assigned_by uuid not null references auth.users(id),assigned_at timestamptz not null default now(),
 primary key(website_id,record_id,revision_id,claim_id),
 foreign key(website_id,record_id,revision_id) references cms.revisions(website_id,record_id,id)
);
alter table cms.certification_claim_owners enable row level security;
revoke all on cms.certification_claim_owners from public,anon,authenticated;
create function cms.certification_claim_owner_eligible(p_site uuid,p_record uuid,p_revision uuid,p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=p_revision
 join cms.websites w on w.id=r.website_id join cms.memberships m on m.website_id=r.website_id and m.user_id=p_user
 where r.website_id=p_site and r.id=p_record and r.content_type='certification' and r.current_revision_id=p_revision
 and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())
 and (not w.separate_approver or v.created_by<>p_user)
 and not exists(select 1 from unnest(array['view','approve']) a(action) where not exists(
 select 1 from cms.permissions p where p.website_id=m.website_id and p.role_id=m.role_id and p.action=a.action
 and p.content_type in('*','certification') and (p.record_id is null or p.record_id=p_record))));
$$;
create function cms.get_certification_claim_owners(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb; owners jsonb; claims jsonb; editable boolean;
begin
 if not cms.can(p_site,'view','certification',p_record) then raise exception 'forbidden' using errcode='42501';end if;
 select v.payload into payload from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and r.content_type='certification' and r.current_revision_id=p_revision;
 if payload is null then raise exception 'certification_revision_changed' using errcode='40001';end if;
 if jsonb_typeof(coalesce(jsonb_build_array(payload||jsonb_build_object('id',p_record)),'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(jsonb_build_array(payload||jsonb_build_object('id',p_record)),'[]'::jsonb))>30 then raise exception 'invalid_certification_claims';end if;
 editable:=cms.can(p_site,'edit','certification',p_record);
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email) order by u.id),'[]'::jsonb) into owners from
 (select id,email from auth.users where editable and cms.certification_claim_owner_eligible(p_site,p_record,p_revision,id) order by id limit 201) u;
 if jsonb_array_length(owners)>200 then raise exception 'certification_owner_catalogue_too_large';end if;
 select coalesce(jsonb_agg(jsonb_build_object('claimId',c->>'id','ownerId',o.owner_id,'version',coalesce(o.version,0),
 'eligible',case when o.owner_id is null then false else cms.certification_claim_owner_eligible(p_site,p_record,p_revision,o.owner_id) end) order by n),'[]'::jsonb) into claims
 from jsonb_array_elements(coalesce(jsonb_build_array(payload||jsonb_build_object('id',p_record)),'[]'::jsonb)) with ordinality x(c,n)
 left join cms.certification_claim_owners o on o.website_id=p_site and o.record_id=p_record and o.revision_id=p_revision and o.claim_id=(c->>'id')::uuid;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'canAssign',editable,'owners',owners,'claims',claims);
end $$;
create function cms.assign_certification_claim_owner(p_site uuid,p_record uuid,p_revision uuid,p_claim uuid,p_owner uuid,p_expected integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare payload jsonb; current_owner cms.certification_claim_owners; matches integer;
begin
 if not cms.can(p_site,'view','certification',p_record) or not cms.can(p_site,'edit','certification',p_record) then raise exception 'forbidden' using errcode='42501';end if;
 perform 1 from cms.records where website_id=p_site and id=p_record and content_type='certification' and current_revision_id=p_revision for update;
 if not found then raise exception 'certification_revision_changed' using errcode='40001';end if;
 if not cms.can(p_site,'view','certification',p_record) or not cms.can(p_site,'edit','certification',p_record) then raise exception 'forbidden' using errcode='42501';end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if jsonb_typeof(jsonb_build_array(payload||jsonb_build_object('id',p_record))) is distinct from 'array' or jsonb_array_length(jsonb_build_array(payload||jsonb_build_object('id',p_record)))>30 then raise exception 'invalid_certification_claims';end if;
 select count(*) into matches from jsonb_array_elements(jsonb_build_array(payload||jsonb_build_object('id',p_record))) c where c->>'id'=p_claim::text;
 if matches<>1 or p_expected is null or p_expected<0 then raise exception 'invalid_certification_claim';end if;
 select * into current_owner from cms.certification_claim_owners where website_id=p_site and record_id=p_record and revision_id=p_revision and claim_id=p_claim;
 if p_owner is not null and not cms.certification_claim_owner_eligible(p_site,p_record,p_revision,p_owner) then raise exception 'certification_claim_owner_unavailable';end if;
 -- An immediate exact retry is safe; it cannot reset a later assignment generation.
 if current_owner.version=p_expected+1 and current_owner.owner_id is not distinct from p_owner and current_owner.assigned_by=auth.uid() then return cms.get_certification_claim_owners(p_site,p_record,p_revision);end if;
 if coalesce(current_owner.version,0)<>p_expected then raise exception 'certification_claim_assignment_changed' using errcode='40001';end if;
 insert into cms.certification_claim_owners(website_id,record_id,revision_id,claim_id,owner_id,version,assigned_by)
 values(p_site,p_record,p_revision,p_claim,p_owner,p_expected+1,auth.uid())
 on conflict(website_id,record_id,revision_id,claim_id) do update set owner_id=excluded.owner_id,version=excluded.version,assigned_by=excluded.assigned_by,assigned_at=now();
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(p_site,auth.uid(),'certification.claim_owner_assigned',p_record,p_revision,jsonb_build_object('claimId',p_claim,'ownerId',p_owner,'version',p_expected+1));
 return cms.get_certification_claim_owners(p_site,p_record,p_revision);
end $$;
revoke all on function cms.certification_claim_owner_eligible(uuid,uuid,uuid,uuid),cms.get_certification_claim_owners(uuid,uuid,uuid),cms.assign_certification_claim_owner(uuid,uuid,uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function cms.get_certification_claim_owners(uuid,uuid,uuid),cms.assign_certification_claim_owner(uuid,uuid,uuid,uuid,uuid,integer) to authenticated;
create table cms.certification_claim_approvals (
 id uuid primary key default gen_random_uuid(),website_id uuid not null,record_id uuid not null,revision_id uuid not null,claim_id uuid not null,
 assignment_version integer not null,approved_by uuid not null references auth.users(id),snapshot jsonb not null,approved_at timestamptz not null default now(),
 foreign key(website_id,record_id,revision_id,claim_id) references cms.certification_claim_owners(website_id,record_id,revision_id,claim_id)
);
create index certification_claim_approvals_lookup on cms.certification_claim_approvals(website_id,record_id,revision_id,claim_id,assignment_version);
alter table cms.certification_claim_approvals enable row level security;
revoke all on cms.certification_claim_approvals from public,anon,authenticated;
-- Internal evidence is intentionally independent of the caller. Public wrappers enforce document view access.
create function cms.certification_claim_snapshot(p_site uuid,p_record uuid,p_revision uuid,p_claim uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb; claim jsonb; ref jsonb; doc cms.records; v cms.revisions; f jsonb; evidence jsonb:='[]'; day text:=to_char(now() at time zone 'UTC','YYYY-MM-DD');d text;
begin
 select r.payload into payload from cms.records p join cms.revisions r on r.website_id=p.website_id and r.record_id=p.id and r.id=p.current_revision_id where p.website_id=p_site and p.id=p_record and p.content_type='certification' and p.current_revision_id=p_revision;
 if payload is null or jsonb_typeof(jsonb_build_array(payload||jsonb_build_object('id',p_record))) is distinct from 'array' then return null;end if;
 if (select count(*) from jsonb_array_elements(jsonb_build_array(payload||jsonb_build_object('id',p_record))) c where c->>'id'=p_claim::text)<>1 then return null;end if;
 select c into claim from jsonb_array_elements(jsonb_build_array(payload||jsonb_build_object('id',p_record))) c where c->>'id'=p_claim::text;
 if jsonb_typeof(claim->'statement') is distinct from 'string' or length(btrim(claim->>'statement')) not between 1 and 2000 or jsonb_typeof(claim->'evidence') is distinct from 'array' then return null;end if;
 d:=claim->>'reviewOn';if d is null or d!~'^\d{4}-\d{2}-\d{2}$' or to_char(d::date,'YYYY-MM-DD')<>d or d<=day then return null;end if;
 -- A certification's single claim uses the record identity, with all material
 -- issuer, scope and validity fields pinned in the approval snapshot.
 if claim->>'status' is distinct from 'active' or claim->>'validity' not in ('dated','noExpiry') or claim->>'validity' is null then return null;end if;
 foreach d in array array['issuer','scope','title'] loop
  if jsonb_typeof(claim->d) is distinct from 'string' or length(btrim(claim->>d))<1 then return null;end if;
 end loop;
 foreach d in array array[claim->>'issuedOn',claim->>'validFrom'] loop
  if d is null or d!~'^\d{4}-\d{2}-\d{2}$' or to_char(d::date,'YYYY-MM-DD')<>d then return null;end if;
 end loop;
 if claim->>'validFrom'<claim->>'issuedOn' or claim->>'validFrom'>day then return null;end if;
 d:=claim->>'expiresOn';
 if claim->>'validity'='dated' then
  if d is null or d!~'^\d{4}-\d{2}-\d{2}$' or to_char(d::date,'YYYY-MM-DD')<>d or d<day or d<claim->>'validFrom' then return null;end if;
 elsif d is distinct from '' then return null;end if;
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
 return jsonb_build_object('statement',claim->>'statement','reviewOn',claim->>'reviewOn','issuer',claim->>'issuer','certificateNumber',claim->>'certificateNumber','scope',claim->>'scope','issuedOn',claim->>'issuedOn','validFrom',claim->>'validFrom','validity',claim->>'validity','expiresOn',claim->>'expiresOn','evidence',evidence);
exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format then return null;
end $$;
create function cms.review_certification_claim(p_site uuid,p_record uuid,p_revision uuid,p_claim uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s jsonb;o cms.certification_claim_owners;a cms.certification_claim_approvals;eligible boolean;
begin
 if not cms.can(p_site,'view','certification',p_record) then raise exception 'forbidden' using errcode='42501';end if;
 if not exists(select 1 from cms.records where website_id=p_site and id=p_record and content_type='certification' and current_revision_id=p_revision) then raise exception 'certification_revision_changed' using errcode='40001';end if;
 select * into o from cms.certification_claim_owners where website_id=p_site and record_id=p_record and revision_id=p_revision and claim_id=p_claim;
 s:=cms.certification_claim_snapshot(p_site,p_record,p_revision,p_claim);
 if s is not null and exists(select 1 from jsonb_array_elements(s->'evidence') e where not cms.can(p_site,'view','document',(e->>'recordId')::uuid)) then s:=null;end if;
 eligible:=coalesce(cms.certification_claim_owner_eligible(p_site,p_record,p_revision,o.owner_id),false);
 if s is not null and eligible then eligible:=not exists(select 1 from jsonb_array_elements(s->'evidence') e where not exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id where m.website_id=p_site and m.user_id=o.owner_id and m.revoked_at is null and (m.expires_at is null or m.expires_at>now()) and p.action='view' and p.content_type in('*','document') and (p.record_id is null or p.record_id=(e->>'recordId')::uuid)));end if;
 if s is not null and eligible then select * into a from cms.certification_claim_approvals where website_id=p_site and record_id=p_record and revision_id=p_revision and claim_id=p_claim and assignment_version=o.version and approved_by=o.owner_id and snapshot=s order by approved_at desc,id limit 1;end if;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'claimId',p_claim,'assignmentVersion',coalesce(o.version,0),'snapshot',s,'canApprove',s is not null and eligible and o.owner_id is not distinct from auth.uid() and cms.can(p_site,'approve','certification',p_record),'approvalId',a.id);
end $$;
create function cms.approve_certification_claim(p_site uuid,p_record uuid,p_revision uuid,p_claim uuid,p_assignment integer,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare review jsonb;approval uuid;
begin
 if not cms.can(p_site,'view','certification',p_record) or not cms.can(p_site,'approve','certification',p_record) then raise exception 'forbidden' using errcode='42501';end if;
 perform 1 from cms.records where website_id=p_site and id=p_record and content_type='certification' and current_revision_id=p_revision for update;
 if not found then raise exception 'certification_revision_changed' using errcode='40001';end if;
 review:=cms.review_certification_claim(p_site,p_record,p_revision,p_claim);
 if not coalesce((review->>'canApprove')::boolean,false) then raise exception 'claim_approval_unavailable' using errcode='42501';end if;
 if p_assignment is distinct from (review->>'assignmentVersion')::integer or p_snapshot is null or p_snapshot is distinct from review->'snapshot' then raise exception 'claim_evidence_changed' using errcode='40001';end if;
 if review->>'approvalId' is not null then return review;end if;
 insert into cms.certification_claim_approvals(website_id,record_id,revision_id,claim_id,assignment_version,approved_by,snapshot)
 values(p_site,p_record,p_revision,p_claim,p_assignment,auth.uid(),p_snapshot) returning id into approval;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details) values(p_site,auth.uid(),'certification.claim_approved',p_record,p_revision,jsonb_build_object('claimId',p_claim,'approvalId',approval,'assignmentVersion',p_assignment));
 return cms.review_certification_claim(p_site,p_record,p_revision,p_claim);
end $$;
revoke all on function cms.certification_claim_snapshot(uuid,uuid,uuid,uuid),cms.review_certification_claim(uuid,uuid,uuid,uuid),cms.approve_certification_claim(uuid,uuid,uuid,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function cms.review_certification_claim(uuid,uuid,uuid,uuid),cms.approve_certification_claim(uuid,uuid,uuid,uuid,integer,jsonb) to authenticated;
create function cms.certification_claim_approval_current(p_site uuid,p_record uuid,p_revision uuid,p_claim uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare s jsonb;o cms.certification_claim_owners;
begin
 s:=cms.certification_claim_snapshot(p_site,p_record,p_revision,p_claim);if s is null then return false;end if;
 select * into o from cms.certification_claim_owners where website_id=p_site and record_id=p_record and revision_id=p_revision and claim_id=p_claim;
 if not coalesce(cms.certification_claim_owner_eligible(p_site,p_record,p_revision,o.owner_id),false) then return false;end if;
 if exists(select 1 from jsonb_array_elements(s->'evidence') e where not exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id where m.website_id=p_site and m.user_id=o.owner_id and m.revoked_at is null and (m.expires_at is null or m.expires_at>now()) and p.action='view' and p.content_type in('*','document') and (p.record_id is null or p.record_id=(e->>'recordId')::uuid))) then return false;end if;
 return exists(select 1 from cms.certification_claim_approvals where website_id=p_site and record_id=p_record and revision_id=p_revision and claim_id=p_claim and assignment_version=o.version and approved_by=o.owner_id and snapshot=s);
end $$;
revoke all on function cms.certification_claim_approval_current(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.certification_claim_approval_current(uuid,uuid,uuid,uuid) to service_role;
commit;
