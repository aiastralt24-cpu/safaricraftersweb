begin;
-- A receipt is credited only to a worker that actually acknowledges a provider call.
-- Merely reading an already accepted dispatch does not populate this table.
create table cms.notification_deployment_receipts(
 dispatch_id uuid not null references cms.notification_dispatches(id),deployment_id uuid not null,
 cms_origin text not null,provider_message_id uuid not null,observed_at timestamptz not null default clock_timestamp(),
 primary key(dispatch_id,deployment_id)
);
alter table cms.notification_deployment_receipts enable row level security;
create function cms.accept_notification_dispatch_for_deployment(p_job uuid,p_token uuid,p_dispatch uuid,p_provider_id uuid,p_deployment uuid,p_origin text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;message_text text;expected_suffix text;existing cms.notification_deployment_receipts;
begin
 if p_deployment is null or p_origin is null or length(p_origin)>2048 or p_origin !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$' then raise exception 'invalid_notification_deployment';end if;
 result:=cms.accept_notification_dispatch(p_job,p_token,p_dispatch,p_provider_id);
 select message->>'text' into message_text from cms.notification_dispatches where id=p_dispatch;
 -- Preserve delivery acknowledgement even if a retry carries an old CMS link,
 -- but never use it to certify delivery to the new configured origin.
 expected_suffix:=E'\nReview the submission in the CMS: '||p_origin||E'/cms\nSign in and open Enquiries to review submissions. Keep the reference above for follow-up.';
 if right(message_text,length(expected_suffix))=expected_suffix then
  select * into existing from cms.notification_deployment_receipts where dispatch_id=p_dispatch and deployment_id=p_deployment;
  if found and (existing.cms_origin<>p_origin or existing.provider_message_id<>p_provider_id) then raise exception 'notification_deployment_conflict';end if;
  insert into cms.notification_deployment_receipts(dispatch_id,deployment_id,cms_origin,provider_message_id)
  values(p_dispatch,p_deployment,p_origin,p_provider_id) on conflict do nothing;
 end if;
 return result;
end $$;
create function cms.get_notification_route_delivery_evidence(p_site uuid,p_route uuid,p_deployment uuid,p_origin text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r cms.notification_email_routes;health jsonb;accepted boolean;
begin
 select * into r from cms.notification_email_routes where website_id=p_site and id=p_route;
 if not found then return null;end if;
 health:=cms.get_notification_worker_health(p_deployment,p_origin);
 select exists(select 1 from cms.notification_deployment_receipts proof
 join cms.notification_dispatches d on d.id=proof.dispatch_id and d.provider_message_id=proof.provider_message_id
 join cms.lead_notification_jobs j on j.id=d.job_id and j.website_id=d.website_id
 where proof.deployment_id=p_deployment and proof.cms_origin=p_origin and d.website_id=p_site and d.route_id=p_route
 and d.route_revision=r.revision_id and d.accepted_at is not null and j.status='succeeded'
 and d.message->>'from'=r.sender and d.message->'to'=r.recipients) into accepted;
 return jsonb_build_object('websiteId',p_site,'routeId',p_route,'routeRevision',r.revision_id,'deploymentId',p_deployment,'cmsOrigin',p_origin,
 'routeApproved',r.enabled and r.approved_at is not null and r.approved_by is not null,
 'workerHealthy',coalesce((health->>'healthy')::boolean and (health->>'fresh')::boolean,false),
 'providerAcceptance',accepted);
end $$;
revoke all on function cms.get_notification_route_delivery_evidence(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function cms.get_notification_route_delivery_evidence(uuid,uuid,uuid,text) to service_role;
revoke all on function cms.accept_notification_dispatch_for_deployment(uuid,uuid,uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function cms.accept_notification_dispatch_for_deployment(uuid,uuid,uuid,uuid,uuid,text) to service_role;
commit;
