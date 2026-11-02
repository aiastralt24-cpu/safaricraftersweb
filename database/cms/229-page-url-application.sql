begin;
create table cms.page_url_applications (
 proposal_id uuid primary key references cms.page_url_proposals(id),
 website_id uuid not null,record_id uuid not null,actor_id uuid not null references auth.users(id),
 transaction_id bigint not null,delivery_job_id uuid references cms.delivery_jobs(id),applied_at timestamptz not null default now(),
 foreign key(website_id,record_id) references cms.records(website_id,id)
);
alter table cms.page_url_applications enable row level security;
revoke all on cms.page_url_applications from public,anon,authenticated;
alter table cms.page_url_proposals drop constraint page_url_proposals_status_check;
alter table cms.page_url_proposals add constraint page_url_proposals_status_check check(status in ('submitted','approved','rejected','cancelled','applied'));
create or replace function cms.enforce_custom_page_release()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; node jsonb;
begin
 if new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and old.content_type='page' and cms.is_custom_page_path(old.path) and old.published_revision_id is not null and (new.content_type is distinct from old.content_type or new.path is distinct from old.path or new.locale is distinct from old.locale) and not exists(select 1 from cms.page_url_applications a join cms.page_url_proposals p on p.id=a.proposal_id
  where a.transaction_id=txid_current() and a.website_id=new.website_id and a.record_id=new.id
   and p.old_path=old.path and p.new_path=new.path and p.status='approved'
   and new.locale=old.locale and new.content_type=old.content_type and new.published_revision_id=old.published_revision_id
   and new.current_revision_id=p.revision_id)
 then raise exception 'custom_page_route_not_ready'; end if;
 if new.content_type<>'page' or new.path in ('/mice','/private-aviation','/guided-bespoke-safaris','/concept','/contact','/conservation-commitment','/about','/specialists','/photo-expeditions','/legal/privacy','/legal/terms','/legal/cookies') then return new; end if;
 if not cms.is_custom_page_path(new.path) or new.locale<>'en' then raise exception 'custom_page_route_not_ready'; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path and new.content_type is not distinct from old.content_type then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 perform 1 from cms.navigation_public_paths order by path for share;
 for node in select value from jsonb_path_query(payload,'$.composition.sections[*].data.**.href') as links(value) loop
  if jsonb_typeof(node) is distinct from 'string' then raise exception 'custom_page_link_unavailable'; end if;
  -- Local anchors and their visibility intervals are checked by the trusted validator.
  if (node #>> '{}') ~ '^mailto:[A-Za-z0-9.!#$&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' and (node #>> '{}') !~ '[?%,[:space:]\\]' then continue; end if;
  if left((node #>> '{}'),1)<>'#' and not cms.navigation_url_available((node #>> '{}')) then raise exception 'custom_page_link_unavailable'; end if;
 end loop;
 return new;
end $$;


create or replace function cms.get_page_url_proposal(p_site uuid,p_proposal uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare proposal cms.page_url_proposals;
begin
 select * into proposal from cms.page_url_proposals where website_id=p_site and id=p_proposal;
 if not found or not cms.can(p_site,'view','page',proposal.record_id) then raise exception 'forbidden' using errcode='42501'; end if;
 return jsonb_build_object('proposalId',proposal.id,'site',p_site,'recordId',proposal.record_id,'revisionId',proposal.revision_id,'oldPath',proposal.old_path,'newPath',proposal.new_path,'locale',proposal.locale,
  'redirectChoice',proposal.redirect_choice,'noRedirectReason',proposal.no_redirect_reason,'status',proposal.status,
  'stale',proposal.status<>'applied' and proposal.impact_snapshot is distinct from cms.page_url_impact_snapshot(p_site,proposal.record_id,proposal.new_path),
  'createdBy',proposal.created_by,'reviewedBy',proposal.reviewed_by);
end $$;

create function cms.apply_page_url_proposal(p_site uuid,p_proposal uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare proposal cms.page_url_proposals; rec cms.records; job uuid; expected_version text;
begin
 select * into proposal from cms.page_url_proposals where website_id=p_site and id=p_proposal;
 if not found or not cms.can(p_site,'view','page',proposal.record_id) or not cms.can(p_site,'publish','page',proposal.record_id) then raise exception 'forbidden' using errcode='42501'; end if;
 -- Serialize source edits, new source insertion, and ownership changes while checking impact.
 -- Locks are held only for this atomic operation. Callers retry deadlock/timeout failures.
 lock table cms.records in share row exclusive mode;
 lock table cms.page_redirects in share row exclusive mode;
 lock table cms.memberships,cms.permissions in share mode;
 perform 1 from cms.websites where id=p_site for update;
 select * into proposal from cms.page_url_proposals where website_id=p_site and id=p_proposal for update;
 if not found or not cms.can(p_site,'view','page',proposal.record_id) or not cms.can(p_site,'publish','page',proposal.record_id) then raise exception 'forbidden' using errcode='42501'; end if;
 if proposal.status='applied' then return cms.get_page_url_proposal(p_site,p_proposal); end if;
 if proposal.status<>'approved' then raise exception 'approved_url_proposal_required'; end if;
 -- A review by a removed/expired reviewer must not authorize a later route change.
 if not exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
  where m.website_id=p_site and m.user_id=proposal.reviewed_by and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())
   and p.action='approve' and p.content_type in ('*','page') and (p.record_id is null or p.record_id=proposal.record_id)) then raise exception 'url_reviewer_authority_required'; end if;
 if exists(select 1 from cms.websites w join cms.revisions v on v.id=proposal.revision_id where w.id=p_site and w.separate_approver and proposal.reviewed_by in (proposal.created_by,v.created_by)) then raise exception 'self_approval_forbidden' using errcode='42501'; end if;
 if exists(select 1 from cms.mfa_policies where website_id=p_site and require_privileged and updated_at>proposal.reviewed_at) then raise exception 'fresh_url_approval_required'; end if;
 select * into rec from cms.records where website_id=p_site and id=proposal.record_id for update;
 if rec.content_type<>'page' or rec.locale<>'en' or not cms.is_custom_page_path(rec.path) or not cms.is_custom_page_path(proposal.new_path)
  or rec.path<>proposal.old_path or rec.locale<>proposal.locale or rec.current_revision_id<>proposal.revision_id
  or proposal.impact_snapshot is distinct from cms.page_url_impact_snapshot(p_site,rec.id,proposal.new_path) then raise exception 'url_impact_changed' using errcode='40001'; end if;
 if exists(select 1 from cms.records where website_id=p_site and locale=rec.locale and path=proposal.new_path)
  or exists(select 1 from cms.page_redirects where website_id=p_site and locale=rec.locale and source_path=proposal.new_path) then raise exception 'url_proposal_path_unavailable'; end if;
 if rec.published_revision_id is not null then
  if rec.published_revision_id<>rec.current_revision_id or rec.approved_revision_id is distinct from rec.current_revision_id or rec.review_status<>'approved' then raise exception 'approved_published_revision_required'; end if;
  select validator_version into expected_version from cms.validation_policy where content_type='page' for share;
  if not exists(select 1 from cms.validations where revision_id=rec.current_revision_id and valid and validator_version=expected_version and expires_at>now()) then raise exception 'validated_revision_required'; end if;
 end if;
 insert into cms.page_url_applications(proposal_id,website_id,record_id,actor_id,transaction_id) values(proposal.id,p_site,rec.id,auth.uid(),txid_current());
 update cms.records set path=proposal.new_path,updated_at=now() where id=rec.id;
 if proposal.redirect_choice='permanent' then
  insert into cms.page_redirects(website_id,locale,source_path,record_id,proposal_id) values(p_site,rec.locale,proposal.old_path,rec.id,proposal.id);
 end if;
 if rec.published_revision_id is not null then
  insert into cms.delivery_jobs(website_id,record_id,revision_id,operation) values(p_site,rec.id,rec.published_revision_id,'publish') returning id into job;
 end if;
 update cms.page_url_applications set delivery_job_id=job where proposal_id=proposal.id;
 update cms.page_url_proposals set status='applied' where id=proposal.id;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details) values(p_site,auth.uid(),'page.url_applied',rec.id,rec.current_revision_id,jsonb_build_object('proposalId',proposal.id,'oldPath',proposal.old_path,'newPath',proposal.new_path,'redirect',proposal.redirect_choice,'deliveryJobId',job));
 return cms.get_page_url_proposal(p_site,p_proposal);
end $$;
revoke all on function cms.apply_page_url_proposal(uuid,uuid) from public;
grant execute on function cms.apply_page_url_proposal(uuid,uuid) to authenticated;
commit;
