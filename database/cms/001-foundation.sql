-- Staging migration. Requires managed auth.users/auth.uid() and anon/authenticated/service_role roles.
-- Apply only after the CMS environment is provisioned; this does not modify the legacy tables.
begin;
create schema if not exists cms;
revoke all on schema cms from public;
grant usage on schema cms to authenticated, anon, service_role;

create table cms.websites (
 id uuid primary key default gen_random_uuid(), name text not null,
 separate_approver boolean not null default true,
 created_at timestamptz not null default now()
);
create table cms.roles (
 id uuid primary key default gen_random_uuid(), website_id uuid not null references cms.websites(id),
 name text not null, unique(website_id,name), unique(website_id,id)
);
create table cms.memberships (
 website_id uuid not null references cms.websites(id), user_id uuid not null references auth.users(id),
 role_id uuid not null, expires_at timestamptz, revoked_at timestamptz,
 primary key(website_id,user_id), foreign key(website_id,role_id) references cms.roles(website_id,id)
);
create index cms_memberships_user on cms.memberships(user_id,website_id);
create table cms.permissions (
 id bigint generated always as identity primary key,
 website_id uuid not null, role_id uuid not null,
 action text not null check(action in ('view','create','edit','submit','approve','publish','export','delete','configure')),
 content_type text not null default '*', record_id uuid,
 foreign key(website_id,role_id) references cms.roles(website_id,id)
);
create index cms_permissions_lookup on cms.permissions(website_id,role_id,action,content_type);
create table cms.records (
 id uuid primary key default gen_random_uuid(), website_id uuid not null references cms.websites(id),
 content_type text not null check(content_type in ('page','homepage','destination','journey','photoExpedition','journalArticle','specialist','testimonial','navigation','settings','sharedSection','document','form','product')),
 locale text not null default 'en', path text, internal_title text not null,
 owner_id uuid not null references auth.users(id),
 current_revision_id uuid, approved_revision_id uuid, published_revision_id uuid,
 review_status text not null default 'draft' check(review_status in ('draft','in_review','changes_requested','approved')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(website_id,id), unique(website_id,locale,path),
 check(path is null or (path ~ '^/[a-z0-9/-]*$' and path not like '%//%' and path not like '%/../%'))
);
create index cms_records_site_type on cms.records(website_id,content_type,updated_at desc);
create table cms.revisions (
 id uuid primary key default gen_random_uuid(), website_id uuid not null, record_id uuid not null,
 parent_revision_id uuid, schema_version integer not null default 1 check(schema_version>0),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=1048576),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(website_id,record_id,id), foreign key(website_id,record_id) references cms.records(website_id,id),
 foreign key(website_id,record_id,parent_revision_id) references cms.revisions(website_id,record_id,id)
);
alter table cms.records add foreign key(website_id,id,current_revision_id) references cms.revisions(website_id,record_id,id);
alter table cms.records add foreign key(website_id,id,approved_revision_id) references cms.revisions(website_id,record_id,id);
alter table cms.records add foreign key(website_id,id,published_revision_id) references cms.revisions(website_id,record_id,id);
create index cms_revisions_record_history on cms.revisions(website_id,record_id,created_at desc);
create table cms.validations (
 revision_id uuid primary key references cms.revisions(id),
 validator_version text not null, valid boolean not null, findings jsonb not null default '[]',
 checked_at timestamptz not null default now()
);
create table cms.audit_events (
 id bigint generated always as identity primary key,
 website_id uuid not null references cms.websites(id), actor_id uuid references auth.users(id),
 action text not null, record_id uuid, revision_id uuid, details jsonb not null default '{}',
 created_at timestamptz not null default now(),
 foreign key(website_id,record_id) references cms.records(website_id,id),
 foreign key(website_id,record_id,revision_id) references cms.revisions(website_id,record_id,id)
);
create index cms_audit_site_time on cms.audit_events(website_id,created_at desc);
create table cms.delivery_jobs (
 id uuid primary key default gen_random_uuid(), website_id uuid not null references cms.websites(id),
 record_id uuid not null, revision_id uuid, operation text not null check(operation in ('publish','unpublish')),
 status text not null default 'pending' check(status in ('pending','running','succeeded','failed')),
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 lease_until timestamptz, last_error text, created_at timestamptz not null default now(),
 foreign key(website_id,record_id) references cms.records(website_id,id),
 foreign key(website_id,record_id,revision_id) references cms.revisions(website_id,record_id,id)
);
create index cms_delivery_due on cms.delivery_jobs(next_attempt_at) where status in ('pending','failed');

create function cms.can(p_site uuid,p_action text,p_type text default '*',p_record uuid default null)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
  where m.website_id=p_site and m.user_id=(select auth.uid()) and m.revoked_at is null
   and (m.expires_at is null or m.expires_at>now()) and p.action=p_action
   and (p.content_type='*' or p.content_type=p_type) and (p.record_id is null or p.record_id=p_record)
 );
$$;

alter table cms.websites enable row level security;
alter table cms.roles enable row level security;
alter table cms.memberships enable row level security;
alter table cms.permissions enable row level security;
alter table cms.records enable row level security;
alter table cms.revisions enable row level security;
alter table cms.validations enable row level security;
alter table cms.audit_events enable row level security;
alter table cms.delivery_jobs enable row level security;
create policy record_read on cms.records for select to authenticated using(cms.can(website_id,'view',content_type,id));
create policy revision_read on cms.revisions for select to authenticated using(exists(select 1 from cms.records r where r.website_id=revisions.website_id and r.id=revisions.record_id));
create policy site_read on cms.websites for select to authenticated using(exists(select 1 from cms.memberships m where m.website_id=websites.id and m.user_id=(select auth.uid()) and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())));
create policy own_membership_read on cms.memberships for select to authenticated using(user_id=(select auth.uid()));
create policy role_read on cms.roles for select to authenticated using(cms.can(website_id,'configure'));
create policy permission_read on cms.permissions for select to authenticated using(cms.can(website_id,'configure'));
create policy audit_read on cms.audit_events for select to authenticated using(cms.can(website_id,'configure'));
create policy job_read on cms.delivery_jobs for select to authenticated using(cms.can(website_id,'publish','*',record_id));
-- No direct editor INSERT/UPDATE/DELETE policies. All writes use narrow audited functions.
grant select on cms.websites,cms.memberships,cms.roles,cms.permissions,cms.records,cms.revisions,cms.audit_events,cms.delivery_jobs to authenticated;
grant select,insert,update on cms.validations to service_role;

create function cms.save_draft(p_site uuid,p_record uuid,p_expected uuid,p_type text,p_path text,p_title text,p_payload jsonb,p_locale text default 'en')
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec cms.records; revision uuid; actor uuid := auth.uid();
begin
 if actor is null then raise exception 'unauthenticated' using errcode='42501'; end if;
 if p_record is null then
  if not cms.can(p_site,'create',p_type) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_expected is not null then raise exception 'unexpected_revision'; end if;
  insert into cms.records(website_id,content_type,path,internal_title,owner_id,locale)
    values(p_site,p_type,p_path,p_title,actor,p_locale) returning * into rec;
 else
  select * into rec from cms.records where website_id=p_site and id=p_record for update;
  if not found or not cms.can(p_site,'edit',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_type is distinct from rec.content_type or p_path is distinct from rec.path or p_locale is distinct from rec.locale then raise exception 'route_or_type_change_requires_migration'; end if;
  if p_expected is distinct from rec.current_revision_id then raise exception 'revision_conflict' using errcode='40001'; end if;
 end if;
 insert into cms.revisions(website_id,record_id,parent_revision_id,payload,created_by)
   values(p_site,rec.id,rec.current_revision_id,p_payload,actor) returning id into revision;
 update cms.records set current_revision_id=revision,approved_revision_id=null,review_status='draft',internal_title=p_title,updated_at=now() where id=rec.id;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id) values(p_site,actor,'draft.saved',rec.id,revision);
 return jsonb_build_object('recordId',rec.id,'revisionId',revision);
end $$;

create function cms.review(p_site uuid,p_record uuid,p_revision uuid,p_action text)
returns void language plpgsql security definer set search_path='' as $$
declare rec cms.records; author uuid; separation boolean;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record for update;
 if not found or not cms.can(p_site,case when p_action='submit' then 'submit' else 'approve' end,rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_revision is distinct from rec.current_revision_id then raise exception 'revision_conflict' using errcode='40001'; end if;
 if p_action='submit' and rec.review_status in ('draft','changes_requested') then
  update cms.records set review_status='in_review',approved_revision_id=null where id=rec.id;
 elsif p_action in ('approve','request_changes') and rec.review_status='in_review' then
  select created_by into author from cms.revisions where id=p_revision;
  select separate_approver into separation from cms.websites where id=p_site;
  if p_action='approve' and separation and author=auth.uid() then raise exception 'self_approval_forbidden' using errcode='42501'; end if;
  update cms.records set review_status=case when p_action='approve' then 'approved' else 'changes_requested' end,
   approved_revision_id=case when p_action='approve' then p_revision else null end where id=rec.id;
 else raise exception 'invalid_review_transition'; end if;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id) values(p_site,auth.uid(),'review.'||p_action,rec.id,p_revision);
end $$;

create function cms.publish(p_site uuid,p_record uuid,p_revision uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare rec cms.records; job uuid;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record for update;
 if not found or not cms.can(p_site,'publish',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_revision is distinct from rec.current_revision_id or p_revision is distinct from rec.approved_revision_id or rec.review_status<>'approved' then raise exception 'approved_revision_required'; end if;
 if not exists(select 1 from cms.validations where revision_id=p_revision and valid) then raise exception 'validated_revision_required'; end if;
 if rec.published_revision_id=p_revision then
  select id into job from cms.delivery_jobs where website_id=p_site and record_id=rec.id and revision_id=p_revision and operation='publish' order by created_at desc limit 1;
  return job;
 end if;
 update cms.records set published_revision_id=p_revision,updated_at=now() where id=rec.id;
 insert into cms.delivery_jobs(website_id,record_id,revision_id,operation) values(p_site,rec.id,p_revision,'publish') returning id into job;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details) values(p_site,auth.uid(),'published',rec.id,p_revision,jsonb_build_object('deliveryJobId',job));
 return job;
end $$;

create function cms.restore_draft(p_site uuid,p_record uuid,p_revision uuid,p_expected uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec cms.records; old_payload jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found or not cms.can(p_site,'edit',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 select payload into old_payload from cms.revisions where website_id=p_site and record_id=p_record and id=p_revision;
 if not found then raise exception 'revision_not_found'; end if;
 return cms.save_draft(p_site,p_record,p_expected,rec.content_type,rec.path,rec.internal_title,old_payload,rec.locale);
end $$;

create function cms.get_public_page(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('recordId',r.id,'revisionId',v.id,'type',r.content_type,'payload',v.payload)
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
 where r.website_id=p_site and r.path=p_path and r.locale=p_locale;
$$;

revoke all on all functions in schema cms from public;
grant execute on function cms.can(uuid,text,text,uuid),cms.save_draft(uuid,uuid,uuid,text,text,text,jsonb,text),cms.review(uuid,uuid,uuid,text),cms.publish(uuid,uuid,uuid),cms.restore_draft(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function cms.get_public_page(uuid,text,text) to anon,authenticated;
comment on schema cms is 'Independent client CMS. Managed authentication, application validators and delivery workers must be configured before production use.';
commit;
