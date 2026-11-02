begin;
-- Resolve only an exact language; paused aliases and withdrawn targets remain private.
create or replace function cms.get_public_page_redirect(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('from',a.source_path,'to',r.path,'status',308)
 from cms.page_redirects a join cms.records r on r.website_id=a.website_id and r.id=a.record_id
 left join cms.page_redirect_states s on s.website_id=a.website_id and s.locale=a.locale and s.source_path=a.source_path
 where a.website_id=p_site and a.locale=p_locale and a.source_path=p_path and r.locale=p_locale
 and p_locale ~ '^[a-z]{2,3}(-[A-Z]{2})?$' and coalesce(s.enabled,true) and r.content_type='page'
 and r.published_revision_id is not null and cms.is_custom_page_path(r.path) and r.path<>a.source_path;
$$;
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
 'canApply',r.status='approved' and current_review=r.review and cms.can(p_site,'publish','page'),'application',(select result from cms.redirect_import_applications where proposal_id=r.proposal_id));
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
commit;
