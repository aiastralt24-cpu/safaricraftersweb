begin;
alter table cms.records add column owner_version integer not null default 0 check(owner_version>=0);
alter table cms.records add column owner_changed_by uuid references auth.users(id);
create function cms.record_owner_eligible(p_site uuid,p_record uuid,p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.records r join cms.memberships m on m.website_id=r.website_id and m.user_id=p_user
 where r.website_id=p_site and r.id=p_record and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())
 and not exists(select 1 from unnest(array['view','edit']) a(action) where not exists(select 1 from cms.permissions p
 where p.website_id=m.website_id and p.role_id=m.role_id and p.action=a.action and p.content_type in('*',r.content_type) and (p.record_id is null or p.record_id=r.id))));
$$;
create function cms.get_record_ownership(p_site uuid,p_record uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r cms.records; editable boolean; eligible boolean; owners jsonb; email text;
begin
 select * into r from cms.records where website_id=p_site and id=p_record;
 if not found or not cms.can(p_site,'view',r.content_type,r.id) then raise exception 'forbidden' using errcode='42501';end if;
 editable:=cms.can(p_site,'edit',r.content_type,r.id);eligible:=cms.record_owner_eligible(p_site,p_record,r.owner_id);
 select u.email into email from auth.users u where u.id=r.owner_id and eligible;
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email) order by u.id),'[]') into owners
 from(select candidate.id,candidate.email from auth.users candidate where editable and cms.record_owner_eligible(p_site,p_record,candidate.id) order by candidate.id limit 201) u;
 if jsonb_array_length(owners)>200 then raise exception 'record_owner_catalogue_too_large';end if;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'ownerId',r.owner_id,'ownerEmail',email,'eligible',eligible,'version',r.owner_version,'canAssign',editable,'owners',owners);
end $$;
create function cms.assign_record_owner(p_site uuid,p_record uuid,p_owner uuid,p_expected integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r cms.records;
begin
 select * into r from cms.records where website_id=p_site and id=p_record for update;
 if not found or not cms.can(p_site,'view',r.content_type,r.id) or not cms.can(p_site,'edit',r.content_type,r.id) then raise exception 'forbidden' using errcode='42501';end if;
 if p_expected is null or p_expected<0 or p_owner is null then raise exception 'invalid_record_owner_assignment';end if;
 if not cms.record_owner_eligible(p_site,p_record,p_owner) then raise exception 'record_owner_unavailable';end if;
 if r.owner_version=p_expected+1 and r.owner_id=p_owner and r.owner_changed_by=auth.uid() then return cms.get_record_ownership(p_site,p_record);end if;
 if r.owner_version<>p_expected then raise exception 'record_owner_assignment_changed' using errcode='40001';end if;
 if r.owner_id=p_owner then return cms.get_record_ownership(p_site,p_record);end if;
 update cms.records set owner_id=p_owner,owner_version=owner_version+1,owner_changed_by=auth.uid() where id=r.id;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(p_site,auth.uid(),'record.owner_assigned',r.id,r.current_revision_id,jsonb_build_object('previousOwnerId',r.owner_id,'ownerId',p_owner,'version',r.owner_version+1));
 return cms.get_record_ownership(p_site,p_record);
end $$;
revoke all on function cms.record_owner_eligible(uuid,uuid,uuid),cms.get_record_ownership(uuid,uuid),cms.assign_record_owner(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function cms.get_record_ownership(uuid,uuid),cms.assign_record_owner(uuid,uuid,uuid,integer) to authenticated;
commit;
