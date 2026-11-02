begin;
create table cms.redirect_retarget_history (
 application_id uuid not null references cms.redirect_import_applications(proposal_id),website_id uuid not null references cms.websites(id),
 locale text not null,source_path text not null,prior_record_id uuid not null references cms.records(id),
 prior_url_proposal uuid references cms.page_url_proposals(id),prior_import_proposal uuid references cms.redirect_import_requests(proposal_id),
 primary key(application_id,website_id,locale,source_path),check(num_nonnulls(prior_url_proposal,prior_import_proposal)=1)
);
alter table cms.redirect_retarget_history enable row level security;
revoke all on cms.redirect_retarget_history from public,anon,authenticated;
create or replace function cms.redirect_import_evidence(p_site uuid,p_items jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare item jsonb; target cms.records; former cms.records; alias cms.page_redirects; state cms.page_redirect_states;
 items jsonb:='[]'; status text; reason text; stamp text; i integer:=0;
begin
 if not cms.can(p_site,'view','page') then raise exception 'forbidden' using errcode='42501'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'invalid_redirect_import'; end if;
 if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>100 then raise exception 'invalid_redirect_import'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x group by x->>'locale',x->>'sourcePath' having count(*)>1) then raise exception 'duplicate_redirect_source'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>(case when item ? 'retargetFrom' then 6 else 5 end)
   or not item ?& array['sourcePath','destinationPath','locale','enabled','recordId']
   or not coalesce(cms.is_custom_page_path(item->>'sourcePath'),false) or not coalesce(cms.is_custom_page_path(item->>'destinationPath'),false)
   or item->>'sourcePath'=item->>'destinationPath' or not coalesce(item->>'locale' ~ '^[a-z]{2,3}(-[A-Z]{2})?$',false)
   or jsonb_typeof(item->'enabled')<>'boolean' or jsonb_typeof(item->'recordId') not in ('null','string') then raise exception 'invalid_redirect_import'; end if;
  if item ? 'retargetFrom' then
   if jsonb_typeof(item->'retargetFrom')<>'object' or (select count(*) from jsonb_object_keys(item->'retargetFrom'))<>2
    or not (item->'retargetFrom') ?& array['recordId','path'] or jsonb_typeof(item->'retargetFrom'->'recordId')<>'string'
    or not coalesce(cms.is_custom_page_path(item->'retargetFrom'->>'path'),false) then raise exception 'invalid_retarget_source';end if;
  end if;
  former:=null;target:=null;alias:=null;state:=null;stamp:=null;status:='blocked';reason:='destination_unavailable';
  select * into target from cms.records where website_id=p_site and content_type='page' and locale=item->>'locale' and path=item->>'destinationPath';
  if target.id is not null and cms.can(p_site,'view','page',target.id) then
   if item->>'recordId' is not null and (item->>'recordId')::uuid<>target.id then reason:='identity_changed';
   elsif exists(select 1 from cms.records where website_id=p_site and locale=item->>'locale' and path=item->>'sourcePath') then reason:='source_unavailable';
   else
    select * into alias from cms.page_redirects where website_id=p_site and locale=item->>'locale' and source_path=item->>'sourcePath';
    if item ? 'retargetFrom' then select * into former from cms.records where website_id=p_site and id=(item->'retargetFrom'->>'recordId')::uuid and locale=item->>'locale' and path=item->'retargetFrom'->>'path';end if;
    if item ? 'retargetFrom' and (former.id is null or alias.record_id is distinct from former.id or former.id=target.id or not cms.can(p_site,'view','page',former.id)) then reason:='identity_changed';
    elsif alias.record_id is not null and alias.record_id<>target.id and not item ? 'retargetFrom' then reason:='source_unavailable';
    else
     select * into state from cms.page_redirect_states where website_id=p_site and locale=item->>'locale' and source_path=item->>'sourcePath';
     reason:='eligible';status:=case when item ? 'retargetFrom' then 'retarget' when alias.record_id is null then 'new' when coalesce(state.enabled,true)=(item->>'enabled')::boolean then 'unchanged' else 'change_state' end;
     stamp:=md5((jsonb_build_object('input',item,'target',target.id,'revision',target.current_revision_id,'published',target.published_revision_id,'alias',alias.record_id,'version',coalesce(state.version,0),'enabled',coalesce(state.enabled,true))||case when item ? 'retargetFrom' then jsonb_build_object('formerRevision',former.current_revision_id,'formerPublished',former.published_revision_id) else '{}'::jsonb end)::text);
    end if;
   end if;
  end if;
  items:=items||jsonb_build_array(item||jsonb_build_object('index',i,'status',status,'reason',reason,'target',case when status<>'blocked' then target.id end,'published',case when status<>'blocked' then target.published_revision_id is not null end,'snapshot',stamp));i:=i+1;
 end loop;
 return jsonb_build_object('site',p_site,'items',items);
end $$;

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
   and exists(select 1 from jsonb_array_elements(r.review->'items') x where x->>'sourcePath'=new.source_path and x->>'locale'=new.locale and (x->>'target')::uuid=target.id and x->>'destinationPath'=target.path and (x->>'status'='new' or x->>'status'='retarget' and exists(select 1 from cms.redirect_retarget_history h where h.application_id=r.proposal_id and h.website_id=new.website_id and h.locale=new.locale and h.source_path=new.source_path and h.prior_record_id=(x->'retargetFrom'->>'recordId')::uuid)))) then raise exception 'approved_import_application_required';end if;
 else
  select * into proposal from cms.page_url_proposals where website_id=new.website_id and id=new.proposal_id and record_id=new.record_id;
  if proposal.id is null or proposal.new_path<>target.path or proposal.redirect_choice<>'permanent' or proposal.status<>'approved' or proposal.old_path<>new.source_path or proposal.locale<>new.locale then raise exception 'invalid_page_redirect';end if;
 end if;
 return new;
end $$;
create or replace function cms.apply_redirect_import(p_site uuid,p_proposal uuid)
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
 insert into cms.redirect_import_applications(proposal_id,website_id,actor_id,transaction_id) values(p_proposal,p_site,auth.uid(),txid_current());
 for item in select value from jsonb_array_elements(r.review->'items') loop
  if item->>'status'='unchanged' then continue;end if;
  if item->>'status'='new' then
   insert into cms.page_redirects(website_id,locale,source_path,record_id,import_proposal_id) values(p_site,item->>'locale',item->>'sourcePath',(item->>'target')::uuid,p_proposal);
   if not (item->>'enabled')::boolean then insert into cms.page_redirect_states(website_id,locale,source_path,enabled,version) values(p_site,item->>'locale',item->>'sourcePath',false,1);end if;
  else
   if item->>'status'='retarget' then
    insert into cms.redirect_retarget_history(application_id,website_id,locale,source_path,prior_record_id,prior_url_proposal,prior_import_proposal)
     select p_proposal,website_id,locale,source_path,record_id,proposal_id,import_proposal_id from cms.page_redirects
     where website_id=p_site and locale=item->>'locale' and source_path=item->>'sourcePath';
    update cms.page_redirects set record_id=(item->>'target')::uuid,proposal_id=null,import_proposal_id=p_proposal
     where website_id=p_site and locale=item->>'locale' and source_path=item->>'sourcePath';
   end if;
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
commit;
