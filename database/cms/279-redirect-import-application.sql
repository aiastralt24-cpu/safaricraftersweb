begin;
alter table cms.redirect_import_requests drop constraint redirect_import_requests_status_check;
alter table cms.redirect_import_requests add constraint redirect_import_requests_status_check check(status in ('submitted','approved','rejected','cancelled','applied'));
create table cms.redirect_import_applications (
 proposal_id uuid primary key references cms.redirect_import_requests(proposal_id),website_id uuid not null references cms.websites(id),
 actor_id uuid not null references auth.users(id),transaction_id bigint not null,result jsonb,applied_at timestamptz not null default now()
);
alter table cms.redirect_import_applications enable row level security;
revoke all on cms.redirect_import_applications from public,anon,authenticated;
alter table cms.page_redirects alter column proposal_id drop not null;
alter table cms.page_redirects add column import_proposal_id uuid references cms.redirect_import_requests(proposal_id);
alter table cms.page_redirects add constraint redirect_single_origin check(num_nonnulls(proposal_id,import_proposal_id)=1);
create or replace function cms.enforce_page_redirect_ownership()
returns trigger language plpgsql security definer set search_path='' as $$
declare target cms.records; proposal cms.page_url_proposals;
begin
 perform cms.lock_page_route(new.website_id,new.locale,new.source_path);
 if exists(select 1 from cms.records where website_id=new.website_id and locale=new.locale and path=new.source_path) then raise exception 'redirect_source_occupied';end if;
 select * into target from cms.records where website_id=new.website_id and id=new.record_id;
 if target.id is null or target.content_type<>'page' or target.locale<>new.locale or not cms.is_custom_page_path(target.path) then raise exception 'invalid_page_redirect';end if;
 if new.import_proposal_id is not null and new.proposal_id is null then
  if not exists(select 1 from cms.redirect_import_requests r join cms.redirect_import_applications a on a.proposal_id=r.proposal_id
   where r.website_id=new.website_id and r.proposal_id=new.import_proposal_id and r.status='approved' and a.website_id=r.website_id and a.transaction_id=txid_current()
   and exists(select 1 from jsonb_array_elements(r.review->'items') x where x->>'sourcePath'=new.source_path and x->>'locale'=new.locale and (x->>'target')::uuid=target.id and x->>'destinationPath'=target.path and x->>'status'='new')) then raise exception 'approved_import_application_required';end if;
 else
  select * into proposal from cms.page_url_proposals where website_id=new.website_id and id=new.proposal_id and record_id=new.record_id;
  if proposal.id is null or proposal.new_path<>target.path or proposal.redirect_choice<>'permanent' or proposal.status<>'approved' or proposal.old_path<>new.source_path or proposal.locale<>new.locale then raise exception 'invalid_page_redirect';end if;
 end if;
 return new;
end $$;
create or replace function cms.get_redirect_import_proposal(p_site uuid,p_proposal uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r cms.redirect_import_requests; current_review jsonb;
begin
 if not cms.can(p_site,'view','page') or not (cms.can(p_site,'approve','page') or cms.can(p_site,'publish','page')) then raise exception 'forbidden' using errcode='42501';end if;
 select * into r from cms.redirect_import_requests where website_id=p_site and proposal_id=p_proposal;
 if not found then raise exception 'forbidden' using errcode='42501';end if;
 current_review:=cms.redirect_import_evidence(p_site,r.manifest->'items');
 return jsonb_build_object('site',p_site,'actor',r.actor_id,'requestKey',r.request_id,'proposalId',r.proposal_id,'status',r.status,'sourceDigest',r.source_digest,'review',r.review,
 'stale',r.status<>'applied' and current_review is distinct from r.review,'canDecide',r.status='submitted' and r.actor_id<>auth.uid() and cms.can(p_site,'approve','page'),'reviewedBy',r.reviewed_by,
 'canApply',r.status='approved' and current_review=r.review and cms.can(p_site,'publish','page') and not exists(select 1 from jsonb_array_elements(r.review->'items') x where x->>'locale'<>'en'),'application',(select result from cms.redirect_import_applications where proposal_id=r.proposal_id));
end $$;
create or replace function cms.list_redirect_import_proposals(p_site uuid,p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; cursor uuid;
begin
 if not cms.can(p_site,'view','page') or not (cms.can(p_site,'approve','page') or cms.can(p_site,'publish','page')) then raise exception 'forbidden' using errcode='42501';end if;
 select coalesce(jsonb_agg(x.item order by x.id),'[]'::jsonb) into items from (
 select proposal_id id,jsonb_build_object('proposalId',proposal_id,'status',status,'count',jsonb_array_length(review->'items')) item
 from cms.redirect_import_requests where website_id=p_site and proposal_id is not null and (p_after is null or proposal_id>p_after) order by proposal_id limit 21) x;
 if jsonb_array_length(items)>20 then cursor:=(items->19->>'proposalId')::uuid;items:=items-20;end if;
 return jsonb_build_object('site',p_site,'items',items,'nextCursor',cursor);
end $$;

create function cms.apply_redirect_import(p_site uuid,p_proposal uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r cms.redirect_import_requests; item jsonb; rec cms.records; current_review jsonb; jobs jsonb:='[]'; job uuid; changes integer:=0; receipt jsonb;
begin
 if not cms.can(p_site,'view','page') or not cms.can(p_site,'publish','page') then raise exception 'forbidden' using errcode='42501';end if;
 -- Prevent concurrent route insertion, state updates and authority revocation during application.
 lock table cms.records,cms.page_redirects,cms.page_redirect_states in share row exclusive mode;
 lock table cms.memberships,cms.permissions,cms.mfa_policies in share mode;
 perform 1 from cms.websites where id=p_site for update;
 if not cms.can(p_site,'view','page') or not cms.can(p_site,'publish','page') then raise exception 'forbidden' using errcode='42501';end if;
 select * into r from cms.redirect_import_requests where website_id=p_site and proposal_id=p_proposal for update;
 if not found then raise exception 'forbidden' using errcode='42501';end if;
 if r.status='applied' then return cms.get_redirect_import_proposal(p_site,p_proposal);end if;
 if r.status<>'approved' or r.reviewed_by is null or r.reviewed_by=r.actor_id then raise exception 'approved_redirect_import_required';end if;
 if exists(select 1 from (values('view'),('approve')) actions(action) where not exists(
  select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
  where m.website_id=p_site and m.user_id=r.reviewed_by and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())
  and p.action=actions.action and p.content_type in ('*','page') and p.record_id is null)) then raise exception 'redirect_reviewer_authority_required';end if;
 if exists(select 1 from cms.mfa_policies where website_id=p_site and require_privileged and updated_at>r.reviewed_at) then raise exception 'fresh_redirect_approval_required';end if;
 current_review:=cms.redirect_import_evidence(p_site,r.manifest->'items');
 if current_review is distinct from r.review then raise exception 'redirect_import_changed' using errcode='40001';end if;
 if exists(select 1 from jsonb_array_elements(r.review->'items') x where x->>'locale'<>'en') then raise exception 'redirect_locale_not_ready';end if;
 insert into cms.redirect_import_applications(proposal_id,website_id,actor_id,transaction_id) values(p_proposal,p_site,auth.uid(),txid_current());
 for item in select value from jsonb_array_elements(r.review->'items') loop
  if item->>'status'='unchanged' then continue;end if;
  if item->>'status'='new' then
   insert into cms.page_redirects(website_id,locale,source_path,record_id,import_proposal_id) values(p_site,item->>'locale',item->>'sourcePath',(item->>'target')::uuid,p_proposal);
   if not (item->>'enabled')::boolean then insert into cms.page_redirect_states(website_id,locale,source_path,enabled,version) values(p_site,item->>'locale',item->>'sourcePath',false,1);end if;
  else
   insert into cms.page_redirect_states(website_id,locale,source_path,enabled,version) values(p_site,item->>'locale',item->>'sourcePath',(item->>'enabled')::boolean,1)
   on conflict(website_id,locale,source_path) do update set enabled=excluded.enabled,version=cms.page_redirect_states.version+1,updated_at=now();
  end if;
  changes:=changes+1;
 end loop;
 for rec in select distinct t.* from cms.records t join jsonb_array_elements(r.review->'items') x on t.id=(x->>'target')::uuid
  where t.website_id=p_site and x->>'status'<>'unchanged' and t.published_revision_id is not null order by t.id loop
  insert into cms.delivery_jobs(website_id,record_id,revision_id,operation) values(p_site,rec.id,rec.published_revision_id,'publish') returning id into job;
  jobs:=jobs||jsonb_build_array(jsonb_build_object('jobId',job,'recordId',rec.id,'revisionId',rec.published_revision_id));
 end loop;
 receipt:=jsonb_build_object('site',p_site,'proposalId',p_proposal,'changes',changes,'jobs',jobs);
 update cms.redirect_import_applications a set result=receipt where a.proposal_id=p_proposal;
 update cms.redirect_import_requests set status='applied' where website_id=p_site and proposal_id=p_proposal;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'redirect_import.applied',jsonb_build_object('proposalId',p_proposal,'changes',changes,'jobCount',jsonb_array_length(jobs)));
 return cms.get_redirect_import_proposal(p_site,p_proposal);
end $$;
revoke all on function cms.apply_redirect_import(uuid,uuid) from public,anon;
grant execute on function cms.apply_redirect_import(uuid,uuid) to authenticated;
create or replace function cms.cancel_redirect_import_request(p_site uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r cms.redirect_import_requests;
begin
 if p_request is null then raise exception 'invalid_redirect_request';end if;
 perform 1 from cms.websites where id=p_site for update;
 if not cms.can(p_site,'view','page') or not cms.can(p_site,'edit','page') then raise exception 'forbidden' using errcode='42501';end if;
 select * into r from cms.redirect_import_requests where website_id=p_site and actor_id=auth.uid() and request_id=p_request for update;
 if found and r.status='applied' then raise exception 'applied_redirect_import_cannot_cancel';end if;
 if found and r.status='cancelled' then return cms.get_redirect_import_request(p_site,p_request);end if;
 if found then update cms.redirect_import_requests set status='cancelled' where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 else insert into cms.redirect_import_requests(website_id,actor_id,request_id,status) values(p_site,auth.uid(),p_request,'cancelled');end if;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'redirect_import.cancelled',jsonb_build_object('requestId',p_request,'proposalId',r.proposal_id));
 return cms.get_redirect_import_request(p_site,p_request);
end $$;
commit;
