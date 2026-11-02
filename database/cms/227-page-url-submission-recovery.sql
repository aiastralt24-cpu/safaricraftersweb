begin;
create table cms.page_url_submission_cancellations (
 website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_id uuid not null,record_id uuid not null,
 created_at timestamptz not null default now(),primary key(website_id,actor_id,request_id),foreign key(website_id,record_id) references cms.records(website_id,id)
);
alter table cms.page_url_submission_cancellations enable row level security;
revoke all on cms.page_url_submission_cancellations from public,anon,authenticated;
alter function cms.propose_page_url(uuid,uuid,uuid,text,text,text,text,uuid) rename to propose_page_url_v225;
revoke all on function cms.propose_page_url_v225(uuid,uuid,uuid,text,text,text,text,uuid) from authenticated;
create function cms.propose_page_url(p_site uuid,p_record uuid,p_revision uuid,p_path text,p_snapshot text,p_redirect text,p_reason text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform 1 from cms.websites where id=p_site for update;
 if exists(select 1 from cms.page_url_submission_cancellations where website_id=p_site and actor_id=auth.uid() and request_id=p_request) then raise exception 'url_submission_cancelled'; end if;
 return cms.propose_page_url_v225(p_site,p_record,p_revision,p_path,p_snapshot,p_redirect,p_reason,p_request);
end $$;
create function cms.get_page_url_submission(p_site uuid,p_record uuid,p_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare proposal cms.page_url_proposals; cancelled cms.page_url_submission_cancellations;
begin
 if p_request is null then raise exception 'invalid_url_request'; end if;
 if not exists(select 1 from cms.records where website_id=p_site and id=p_record and content_type='page') or not cms.can(p_site,'view','page',p_record) then raise exception 'forbidden' using errcode='42501'; end if;
 select * into proposal from cms.page_url_proposals where website_id=p_site and created_by=auth.uid() and request_id=p_request;
 if found then
  if proposal.record_id<>p_record then raise exception 'url_submission_scope_mismatch'; end if;
  return jsonb_build_object('status','completed','requestKey',p_request,'recordId',p_record,'proposal',cms.get_page_url_proposal(p_site,proposal.id));
 end if;
 select * into cancelled from cms.page_url_submission_cancellations where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if found then
  if cancelled.record_id<>p_record then raise exception 'url_submission_scope_mismatch'; end if;
  return jsonb_build_object('status','cancelled','requestKey',p_request,'recordId',p_record);
 end if;
 return jsonb_build_object('status','unconfirmed','requestKey',p_request,'recordId',p_record);
end $$;
create function cms.cancel_page_url_submission(p_site uuid,p_record uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform 1 from cms.websites where id=p_site for update;
 if not cms.can(p_site,'edit','page',p_record) then raise exception 'forbidden' using errcode='42501'; end if;
 result:=cms.get_page_url_submission(p_site,p_record,p_request);
 if result->>'status'<>'unconfirmed' then return result; end if;
 insert into cms.page_url_submission_cancellations(website_id,actor_id,request_id,record_id) values(p_site,auth.uid(),p_request,p_record);
 insert into cms.audit_events(website_id,actor_id,action,record_id,details) values(p_site,auth.uid(),'page.url_submission_cancelled',p_record,jsonb_build_object('requestKey',p_request));
 return cms.get_page_url_submission(p_site,p_record,p_request);
end $$;
revoke all on function cms.propose_page_url(uuid,uuid,uuid,text,text,text,text,uuid),cms.get_page_url_submission(uuid,uuid,uuid),cms.cancel_page_url_submission(uuid,uuid,uuid) from public;
grant execute on function cms.propose_page_url(uuid,uuid,uuid,text,text,text,text,uuid),cms.get_page_url_submission(uuid,uuid,uuid),cms.cancel_page_url_submission(uuid,uuid,uuid) to authenticated;
commit;
