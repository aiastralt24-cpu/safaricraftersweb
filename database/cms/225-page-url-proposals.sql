begin;
create table cms.page_url_proposals (
 id uuid primary key default gen_random_uuid(),website_id uuid not null,record_id uuid not null,revision_id uuid not null,
 old_path text not null,new_path text not null,locale text not null,impact_snapshot text not null,
 redirect_choice text not null check(redirect_choice in ('permanent','none')),no_redirect_reason text,
 status text not null default 'submitted' check(status in ('submitted','approved','rejected','cancelled')),
 created_by uuid not null references auth.users(id),request_id uuid not null,manifest jsonb not null,
 reviewed_by uuid references auth.users(id),created_at timestamptz not null default now(),reviewed_at timestamptz,
 unique(website_id,created_by,request_id),
 foreign key(website_id,record_id,revision_id) references cms.revisions(website_id,record_id,id)
);
alter table cms.page_url_proposals enable row level security;
revoke all on cms.page_url_proposals from public,anon,authenticated;
-- Opaque change detector: includes restricted sources without exposing their identities.
create function cms.page_url_impact_snapshot(p_site uuid,p_record uuid,p_path text)
returns text language sql stable security definer set search_path='' as $$
 select md5(jsonb_build_object('record',r.id,'revision',r.current_revision_id,'published',r.published_revision_id,'oldPath',r.path,'locale',r.locale,'newPath',p_path,
  'occupant',(select id from cms.records where website_id=p_site and locale=r.locale and path=p_path and id<>p_record),
  'references',(select coalesce(jsonb_agg(jsonb_build_array(s.id,s.current_revision_id,s.published_revision_id) order by s.id),'[]'::jsonb)
   from cms.records s left join cms.revisions d on d.id=s.current_revision_id left join cms.revisions p on p.id=s.published_revision_id
   where s.website_id=p_site and (cms.payload_links_path(d.payload,r.path) or cms.payload_links_path(p.payload,r.path) or cms.payload_references_record(d.payload,p_record) or cms.payload_references_record(p.payload,p_record))))::text)
 from cms.records r where r.website_id=p_site and r.id=p_record;
$$;
alter function cms.review_page_url(uuid,uuid,uuid,text,uuid) rename to review_page_url_v224;
revoke all on function cms.review_page_url_v224(uuid,uuid,uuid,text,uuid) from authenticated;
create function cms.review_page_url(p_site uuid,p_record uuid,p_revision uuid,p_path text,p_after uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select cms.review_page_url_v224(p_site,p_record,p_revision,p_path,p_after)||jsonb_build_object('snapshot',cms.page_url_impact_snapshot(p_site,p_record,p_path));
$$;

create function cms.get_page_url_proposal(p_site uuid,p_proposal uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare proposal cms.page_url_proposals;
begin
 select * into proposal from cms.page_url_proposals where website_id=p_site and id=p_proposal;
 if not found or not cms.can(p_site,'view','page',proposal.record_id) then raise exception 'forbidden' using errcode='42501'; end if;
 return jsonb_build_object('proposalId',proposal.id,'site',p_site,'recordId',proposal.record_id,'revisionId',proposal.revision_id,'oldPath',proposal.old_path,'newPath',proposal.new_path,'locale',proposal.locale,
  'redirectChoice',proposal.redirect_choice,'noRedirectReason',proposal.no_redirect_reason,'status',proposal.status,
  'stale',proposal.impact_snapshot is distinct from cms.page_url_impact_snapshot(p_site,proposal.record_id,proposal.new_path),
  'createdBy',proposal.created_by,'reviewedBy',proposal.reviewed_by);
end $$;

create function cms.propose_page_url(p_site uuid,p_record uuid,p_revision uuid,p_path text,p_snapshot text,p_redirect text,p_reason text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare evidence jsonb; prior cms.page_url_proposals; request jsonb; proposal_id uuid;
begin
 if p_request is null or p_snapshot is null or p_snapshot !~ '^[a-f0-9]{32}$' or p_redirect is null or p_redirect not in ('permanent','none')
  or p_path is null or length(p_path)>500 or p_reason is not null and length(p_reason)>2000 then raise exception 'invalid_url_proposal'; end if;
 perform 1 from cms.websites where id=p_site for update;
 if not cms.can(p_site,'view','page',p_record) or not cms.can(p_site,'edit','page',p_record) or not cms.can(p_site,'submit','page',p_record) then raise exception 'forbidden' using errcode='42501'; end if;
 request:=jsonb_build_object('record',p_record,'revision',p_revision,'path',p_path,'snapshot',p_snapshot,'redirect',p_redirect,'reason',p_reason);
 select * into prior from cms.page_url_proposals where website_id=p_site and created_by=auth.uid() and request_id=p_request;
 if found then
  if prior.manifest<>request then raise exception 'url_proposal_request_mismatch'; end if;
  return cms.get_page_url_proposal(p_site,prior.id);
 end if;
 evidence:=cms.review_page_url(p_site,p_record,p_revision,p_path);
 if evidence->>'status'<>'eligible' then raise exception 'url_proposal_path_unavailable'; end if;
 if evidence->>'snapshot'<>p_snapshot then raise exception 'url_impact_changed' using errcode='40001'; end if;
 if p_redirect='none' and (evidence->>'published')::boolean and coalesce(length(btrim(p_reason)),0)<10 then raise exception 'no_redirect_reason_required'; end if;
 if p_redirect='permanent' and p_reason is not null then raise exception 'invalid_url_proposal'; end if;
 insert into cms.page_url_proposals(website_id,record_id,revision_id,old_path,new_path,locale,impact_snapshot,redirect_choice,no_redirect_reason,created_by,request_id,manifest)
 values(p_site,p_record,p_revision,evidence->>'currentPath',p_path,evidence->>'locale',p_snapshot,p_redirect,p_reason,auth.uid(),p_request,request) returning id into proposal_id;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details) values(p_site,auth.uid(),'page.url_proposed',p_record,p_revision,jsonb_build_object('proposalId',proposal_id,'oldPath',evidence->>'currentPath','newPath',p_path,'redirect',p_redirect));
 return cms.get_page_url_proposal(p_site,proposal_id);
end $$;

create function cms.review_page_url_proposal(p_site uuid,p_proposal uuid,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare proposal cms.page_url_proposals; separation boolean; author uuid;
begin
 if p_action is null or p_action not in ('approve','reject','cancel') then raise exception 'invalid_url_review'; end if;
 perform 1 from cms.websites where id=p_site for update;
 select * into proposal from cms.page_url_proposals where website_id=p_site and id=p_proposal for update;
 if not found or not cms.can(p_site,'view','page',proposal.record_id) or not cms.can(p_site,case when p_action='cancel' then 'edit' else 'approve' end,'page',proposal.record_id)
  or p_action='cancel' and proposal.created_by<>auth.uid() then raise exception 'forbidden' using errcode='42501'; end if;
 if proposal.status=(case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'cancelled' end) then return cms.get_page_url_proposal(p_site,p_proposal); end if;
 if proposal.status<>'submitted' and not (proposal.status='approved' and p_action='cancel') then raise exception 'invalid_url_review_transition'; end if;
 if p_action='approve' then
  select separate_approver into separation from cms.websites where id=p_site;
  select created_by into author from cms.revisions where id=proposal.revision_id;
  if separation and auth.uid() in (proposal.created_by,author) then raise exception 'self_approval_forbidden' using errcode='42501'; end if;
  if proposal.impact_snapshot is distinct from cms.page_url_impact_snapshot(p_site,proposal.record_id,proposal.new_path) then raise exception 'url_impact_changed' using errcode='40001'; end if;
 end if;
 update cms.page_url_proposals set status=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'cancelled' end,reviewed_by=auth.uid(),reviewed_at=now() where id=p_proposal;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details) values(p_site,auth.uid(),'page.url_'||p_action,proposal.record_id,proposal.revision_id,jsonb_build_object('proposalId',p_proposal));
 return cms.get_page_url_proposal(p_site,p_proposal);
end $$;
revoke all on function cms.page_url_impact_snapshot(uuid,uuid,text),cms.review_page_url(uuid,uuid,uuid,text,uuid),cms.get_page_url_proposal(uuid,uuid),cms.propose_page_url(uuid,uuid,uuid,text,text,text,text,uuid),cms.review_page_url_proposal(uuid,uuid,text) from public;
grant execute on function cms.review_page_url(uuid,uuid,uuid,text,uuid),cms.get_page_url_proposal(uuid,uuid),cms.propose_page_url(uuid,uuid,uuid,text,text,text,text,uuid),cms.review_page_url_proposal(uuid,uuid,text) to authenticated;
commit;
