begin;
create table cms.redirect_import_requests (
 website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_id uuid not null,
 proposal_id uuid unique,manifest jsonb,source_digest text,review jsonb,
 status text not null check(status in ('submitted','cancelled')),created_at timestamptz not null default now(),
 primary key(website_id,actor_id,request_id)
);
alter table cms.redirect_import_requests enable row level security;
revoke all on cms.redirect_import_requests from public,anon,authenticated;
create function cms.get_redirect_import_request(p_site uuid,p_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r cms.redirect_import_requests;
begin
 if not cms.can(p_site,'view','page') or not cms.can(p_site,'edit','page') then raise exception 'forbidden' using errcode='42501';end if;
 select * into r from cms.redirect_import_requests where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if not found then return null;end if;
 return jsonb_build_object('site',p_site,'actor',r.actor_id,'requestKey',r.request_id,'proposalId',r.proposal_id,'status',r.status,'sourceDigest',r.source_digest,'review',r.review);
end $$;
create function cms.submit_redirect_import(p_site uuid,p_request uuid,p_source text,p_items jsonb,p_snapshots jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prior cms.redirect_import_requests; manifest jsonb; review jsonb; proposal uuid;
begin
 if p_request is null or p_source is null or p_source !~ '^[a-f0-9]{64}$' then raise exception 'invalid_redirect_proposal';end if;
 perform 1 from cms.websites where id=p_site for update;
 if not cms.can(p_site,'view','page') or not cms.can(p_site,'edit','page') or not cms.can(p_site,'submit','page') then raise exception 'forbidden' using errcode='42501';end if;
 manifest:=jsonb_build_object('source',p_source,'items',p_items,'snapshots',p_snapshots);
 select * into prior from cms.redirect_import_requests where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if found then
  if prior.status='cancelled' then raise exception 'redirect_import_cancelled';end if;
  if prior.manifest is distinct from manifest then raise exception 'redirect_import_request_mismatch';end if;
  return cms.get_redirect_import_request(p_site,p_request);
 end if;
 review:=cms.review_redirect_import(p_site,p_items);
 if exists(select 1 from jsonb_array_elements(review->'items') x where x->>'status'='blocked') then raise exception 'redirect_import_blocked';end if;
 if not exists(select 1 from jsonb_array_elements(review->'items') x where x->>'status'<>'unchanged') then raise exception 'redirect_import_no_changes';end if;
 if p_snapshots is distinct from (select jsonb_agg(x->'snapshot' order by n) from jsonb_array_elements(review->'items') with ordinality t(x,n)) then raise exception 'redirect_import_changed' using errcode='40001';end if;
 proposal:=gen_random_uuid();
 insert into cms.redirect_import_requests(website_id,actor_id,request_id,proposal_id,manifest,source_digest,review,status)
 values(p_site,auth.uid(),p_request,proposal,manifest,p_source,review,'submitted');
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'redirect_import.submitted',jsonb_build_object('proposalId',proposal,'count',jsonb_array_length(p_items)));
 return cms.get_redirect_import_request(p_site,p_request);
end $$;
create function cms.cancel_redirect_import_request(p_site uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r cms.redirect_import_requests;
begin
 if p_request is null then raise exception 'invalid_redirect_request';end if;
 perform 1 from cms.websites where id=p_site for update;
 if not cms.can(p_site,'view','page') or not cms.can(p_site,'edit','page') then raise exception 'forbidden' using errcode='42501';end if;
 select * into r from cms.redirect_import_requests where website_id=p_site and actor_id=auth.uid() and request_id=p_request for update;
 if found and r.status='cancelled' then return cms.get_redirect_import_request(p_site,p_request);end if;
 if found then update cms.redirect_import_requests set status='cancelled' where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 else insert into cms.redirect_import_requests(website_id,actor_id,request_id,status) values(p_site,auth.uid(),p_request,'cancelled');end if;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'redirect_import.cancelled',jsonb_build_object('requestId',p_request,'proposalId',r.proposal_id));
 return cms.get_redirect_import_request(p_site,p_request);
end $$;
revoke all on function cms.get_redirect_import_request(uuid,uuid),cms.submit_redirect_import(uuid,uuid,text,jsonb,jsonb),cms.cancel_redirect_import_request(uuid,uuid) from public,anon;
grant execute on function cms.get_redirect_import_request(uuid,uuid),cms.submit_redirect_import(uuid,uuid,text,jsonb,jsonb),cms.cancel_redirect_import_request(uuid,uuid) to authenticated;
commit;
