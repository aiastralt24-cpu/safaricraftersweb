begin;
create table cms.project_claim_owners (
 website_id uuid not null,record_id uuid not null,revision_id uuid not null,claim_id uuid not null,
 owner_id uuid references auth.users(id),version integer not null check(version>0),
 assigned_by uuid not null references auth.users(id),assigned_at timestamptz not null default now(),
 primary key(website_id,record_id,revision_id,claim_id),
 foreign key(website_id,record_id,revision_id) references cms.revisions(website_id,record_id,id)
);
alter table cms.project_claim_owners enable row level security;
revoke all on cms.project_claim_owners from public,anon,authenticated;
create function cms.project_claim_owner_eligible(p_site uuid,p_record uuid,p_revision uuid,p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=p_revision
 join cms.websites w on w.id=r.website_id join cms.memberships m on m.website_id=r.website_id and m.user_id=p_user
 where r.website_id=p_site and r.id=p_record and r.content_type='project' and r.current_revision_id=p_revision
 and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())
 and (not w.separate_approver or v.created_by<>p_user)
 and not exists(select 1 from unnest(array['view','approve']) a(action) where not exists(
 select 1 from cms.permissions p where p.website_id=m.website_id and p.role_id=m.role_id and p.action=a.action
 and p.content_type in('*','project') and (p.record_id is null or p.record_id=p_record))));
$$;
create function cms.get_project_claim_owners(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb; owners jsonb; claims jsonb; editable boolean;
begin
 if not cms.can(p_site,'view','project',p_record) then raise exception 'forbidden' using errcode='42501';end if;
 select v.payload into payload from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and r.content_type='project' and r.current_revision_id=p_revision;
 if payload is null then raise exception 'project_revision_changed' using errcode='40001';end if;
 if jsonb_typeof(coalesce(payload->'claims','[]'::jsonb))<>'array' or jsonb_array_length(coalesce(payload->'claims','[]'::jsonb))>30 then raise exception 'invalid_project_claims';end if;
 editable:=cms.can(p_site,'edit','project',p_record);
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email) order by u.id),'[]'::jsonb) into owners from
 (select id,email from auth.users where editable and cms.project_claim_owner_eligible(p_site,p_record,p_revision,id) order by id limit 201) u;
 if jsonb_array_length(owners)>200 then raise exception 'project_owner_catalogue_too_large';end if;
 select coalesce(jsonb_agg(jsonb_build_object('claimId',c->>'id','ownerId',o.owner_id,'version',coalesce(o.version,0),
 'eligible',case when o.owner_id is null then false else cms.project_claim_owner_eligible(p_site,p_record,p_revision,o.owner_id) end) order by n),'[]'::jsonb) into claims
 from jsonb_array_elements(coalesce(payload->'claims','[]'::jsonb)) with ordinality x(c,n)
 left join cms.project_claim_owners o on o.website_id=p_site and o.record_id=p_record and o.revision_id=p_revision and o.claim_id=(c->>'id')::uuid;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'canAssign',editable,'owners',owners,'claims',claims);
end $$;
create function cms.assign_project_claim_owner(p_site uuid,p_record uuid,p_revision uuid,p_claim uuid,p_owner uuid,p_expected integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare payload jsonb; current_owner cms.project_claim_owners; matches integer;
begin
 if not cms.can(p_site,'view','project',p_record) or not cms.can(p_site,'edit','project',p_record) then raise exception 'forbidden' using errcode='42501';end if;
 perform 1 from cms.records where website_id=p_site and id=p_record and content_type='project' and current_revision_id=p_revision for update;
 if not found then raise exception 'project_revision_changed' using errcode='40001';end if;
 if not cms.can(p_site,'view','project',p_record) or not cms.can(p_site,'edit','project',p_record) then raise exception 'forbidden' using errcode='42501';end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if jsonb_typeof(payload->'claims') is distinct from 'array' or jsonb_array_length(payload->'claims')>30 then raise exception 'invalid_project_claims';end if;
 select count(*) into matches from jsonb_array_elements(payload->'claims') c where c->>'id'=p_claim::text;
 if matches<>1 or p_expected is null or p_expected<0 then raise exception 'invalid_project_claim';end if;
 select * into current_owner from cms.project_claim_owners where website_id=p_site and record_id=p_record and revision_id=p_revision and claim_id=p_claim;
 if p_owner is not null and not cms.project_claim_owner_eligible(p_site,p_record,p_revision,p_owner) then raise exception 'project_claim_owner_unavailable';end if;
 -- An immediate exact retry is safe; it cannot reset a later assignment generation.
 if current_owner.version=p_expected+1 and current_owner.owner_id is not distinct from p_owner and current_owner.assigned_by=auth.uid() then return cms.get_project_claim_owners(p_site,p_record,p_revision);end if;
 if coalesce(current_owner.version,0)<>p_expected then raise exception 'project_claim_assignment_changed' using errcode='40001';end if;
 insert into cms.project_claim_owners(website_id,record_id,revision_id,claim_id,owner_id,version,assigned_by)
 values(p_site,p_record,p_revision,p_claim,p_owner,p_expected+1,auth.uid())
 on conflict(website_id,record_id,revision_id,claim_id) do update set owner_id=excluded.owner_id,version=excluded.version,assigned_by=excluded.assigned_by,assigned_at=now();
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(p_site,auth.uid(),'project.claim_owner_assigned',p_record,p_revision,jsonb_build_object('claimId',p_claim,'ownerId',p_owner,'version',p_expected+1));
 return cms.get_project_claim_owners(p_site,p_record,p_revision);
end $$;
revoke all on function cms.project_claim_owner_eligible(uuid,uuid,uuid,uuid),cms.get_project_claim_owners(uuid,uuid,uuid),cms.assign_project_claim_owner(uuid,uuid,uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function cms.get_project_claim_owners(uuid,uuid,uuid),cms.assign_project_claim_owner(uuid,uuid,uuid,uuid,uuid,integer) to authenticated;
commit;
