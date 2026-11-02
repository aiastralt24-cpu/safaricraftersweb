begin;
-- Separate from customer enquiries. No delivery proof is granted by requesting a check.
create table cms.notification_probe_requests(
 id uuid primary key default gen_random_uuid(),website_id uuid not null references cms.websites(id),
 actor_id uuid not null references auth.users(id),request_id uuid not null,
 command jsonb not null,receipt jsonb not null,route_snapshot jsonb,
 state text not null check(state in('pending','cancelled')),
 created_at timestamptz not null default clock_timestamp(),
 unique(website_id,actor_id,request_id)
);
alter table cms.notification_probe_requests enable row level security;
revoke all on cms.notification_probe_requests from public,anon,authenticated,service_role;

create function cms.request_notification_probe(p_site uuid,p_route uuid,p_route_revision uuid,p_binding_revision uuid,p_request uuid,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prior cms.notification_probe_requests;r cms.notification_email_routes;b cms.website_notification_deployments;
 command jsonb;receipt jsonb;probe uuid:=gen_random_uuid();snapshot jsonb;health cms.notification_worker_health;
begin
 if p_route is null or p_route_revision is null or p_binding_revision is null or p_request is null or p_action is null or p_action not in('request','cancel') then raise exception 'invalid_notification_probe';end if;
 if auth.uid() is null or not cms.can_lead(p_site,'approve') then raise exception 'forbidden' using errcode='42501';end if;
 perform 1 from cms.websites where id=p_site for update;
 if not found or not cms.can_lead(p_site,'approve') then raise exception 'forbidden' using errcode='42501';end if;
 command:=jsonb_build_object('routeId',p_route,'routeRevision',p_route_revision,'bindingRevision',p_binding_revision);
 select * into prior from cms.notification_probe_requests where website_id=p_site and actor_id=auth.uid() and request_id=p_request for update;
 if found then
  if prior.command is distinct from command then raise exception 'idempotency_key_reused';end if;
  if p_action='cancel' and prior.state='pending' then
   update cms.notification_probe_requests set state='cancelled',receipt=prior.receipt||jsonb_build_object('state','cancelled') where id=prior.id returning notification_probe_requests.receipt into receipt;
   return receipt;
  end if;
  return prior.receipt;
 end if;
 receipt:=jsonb_build_object('websiteId',p_site,'actorId',auth.uid(),'requestId',p_request,'probeId',probe,
  'routeId',p_route,'routeRevision',p_route_revision,'bindingRevision',p_binding_revision,
  'deploymentId',null,'cmsOrigin',null,'state',case when p_action='cancel' then 'cancelled' else 'pending' end);
 if p_action='request' then
  select * into b from cms.website_notification_deployments where website_id=p_site for share;
  if b.revision_id is distinct from p_binding_revision or b.deployment_id is null then raise exception 'notification_binding_conflict' using errcode='40001';end if;
  select * into r from cms.notification_email_routes where website_id=p_site and id=p_route for share;
  if r.revision_id is distinct from p_route_revision or r.enabled is distinct from true or r.approved_at is null or r.approved_by is null then raise exception 'notification_route_unavailable';end if;
  select * into health from cms.notification_worker_health where deployment_id=b.deployment_id for share;
  if health.healthy is distinct from true or health.cms_origin is distinct from b.cms_origin or health.worker_version is distinct from 'notification-1'
   or health.observed_at<clock_timestamp()-interval '5 minutes' or health.observed_at>clock_timestamp()+interval '5 seconds' then raise exception 'notification_worker_not_ready';end if;
  snapshot:=jsonb_build_object('websiteId',p_site,'routeId',p_route,'revisionId',p_route_revision,'enabled',true,'from',r.sender,'to',r.recipients);
  receipt:=receipt||jsonb_build_object('deploymentId',b.deployment_id,'cmsOrigin',b.cms_origin);
 end if;
 insert into cms.notification_probe_requests(id,website_id,actor_id,request_id,command,receipt,route_snapshot,state)
 values(probe,p_site,auth.uid(),p_request,command,receipt,snapshot,receipt->>'state');
 return receipt;
end $$;
revoke all on function cms.request_notification_probe(uuid,uuid,uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function cms.request_notification_probe(uuid,uuid,uuid,uuid,uuid,text) to authenticated;
commit;
