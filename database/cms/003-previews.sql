begin;
create table cms.preview_sessions (
 id uuid primary key default gen_random_uuid(), website_id uuid not null,
 record_id uuid not null, revision_id uuid not null,
 created_by uuid not null references auth.users(id), recipient_id uuid not null references auth.users(id),
 expires_at timestamptz not null, revoked_at timestamptz, created_at timestamptz not null default now(),
 foreign key(website_id,record_id,revision_id) references cms.revisions(website_id,record_id,id)
);
alter table cms.preview_sessions enable row level security;
-- No direct table grants: previews are resolved through current permissions each time.
create function cms.create_preview(p_site uuid,p_record uuid,p_revision uuid,p_recipient uuid,p_minutes integer default 60)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec cms.records; session cms.preview_sessions;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found or not cms.can(p_site,'view',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_minutes is null or p_minutes not between 1 and 1440 then raise exception 'preview_duration_limit'; end if;
 if not exists(select 1 from cms.revisions where website_id=p_site and record_id=p_record and id=p_revision) then raise exception 'revision_not_found'; end if;
 if not exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
  where m.website_id=p_site and m.user_id=p_recipient and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())
  and p.action='view' and p.content_type in ('*',rec.content_type) and (p.record_id is null or p.record_id=rec.id)) then raise exception 'recipient_forbidden' using errcode='42501'; end if;
 insert into cms.preview_sessions(website_id,record_id,revision_id,created_by,recipient_id,expires_at)
 values(p_site,p_record,p_revision,auth.uid(),p_recipient,now()+make_interval(mins=>p_minutes)) returning * into session;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(p_site,auth.uid(),'preview.created',p_record,p_revision,jsonb_build_object('previewId',session.id,'recipientId',p_recipient,'expiresAt',session.expires_at));
 return jsonb_build_object('previewId',session.id,'expiresAt',session.expires_at);
end $$;
create function cms.get_preview(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('previewId',s.id,'expiresAt',s.expires_at,'recordId',r.id,'revisionId',v.id,'type',r.content_type,'path',r.path,'locale',r.locale,'payload',v.payload)
 from cms.preview_sessions s join cms.records r on r.website_id=s.website_id and r.id=s.record_id
 join cms.revisions v on v.website_id=s.website_id and v.record_id=s.record_id and v.id=s.revision_id
 where s.id=p_id and s.recipient_id=auth.uid() and s.revoked_at is null and s.expires_at>now()
 and cms.can(s.website_id,'view',r.content_type,r.id)
 and exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
  where m.website_id=s.website_id and m.user_id=s.created_by and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())
  and p.action='view' and p.content_type in ('*',r.content_type) and (p.record_id is null or p.record_id=r.id));
$$;
create function cms.revoke_preview(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare session cms.preview_sessions; rec cms.records;
begin
 select * into session from cms.preview_sessions where id=p_id for update;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 select * into rec from cms.records where id=session.record_id;
 if not ((session.created_by=auth.uid() and cms.can(session.website_id,'view',rec.content_type,rec.id)) or cms.can(session.website_id,'configure')) then raise exception 'forbidden' using errcode='42501'; end if;
 if session.revoked_at is not null then return; end if;
 update cms.preview_sessions set revoked_at=now() where id=p_id;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(session.website_id,auth.uid(),'preview.revoked',session.record_id,session.revision_id,jsonb_build_object('previewId',p_id));
end $$;
revoke all on function cms.create_preview(uuid,uuid,uuid,uuid,integer),cms.get_preview(uuid),cms.revoke_preview(uuid) from public;
grant execute on function cms.create_preview(uuid,uuid,uuid,uuid,integer),cms.get_preview(uuid),cms.revoke_preview(uuid) to authenticated;
commit;
