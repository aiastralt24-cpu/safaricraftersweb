begin;
-- Only an accepted, frozen verification dispatch for the current binding counts.
create function cms.notification_probe_acceptance(p_site uuid,p_route uuid,p_deployment uuid,p_origin text)
returns timestamptz language sql stable security definer set search_path='' as $$
 select max(q.accepted_at) from cms.notification_probe_requests q
 join cms.notification_email_routes r on r.website_id=q.website_id and r.id=(q.command->>'routeId')::uuid
 join cms.website_notification_deployments b on b.website_id=q.website_id
 where q.website_id=p_site and r.id=p_route and q.state='pending'
 and q.accepted_at is not null and q.provider_message_id is not null and q.first_attempt_at is not null
 and b.revision_id=(q.command->>'bindingRevision')::uuid
 and b.deployment_id=p_deployment and b.cms_origin=p_origin
 and q.receipt->>'deploymentId'=p_deployment::text and q.receipt->>'cmsOrigin'=p_origin
 and r.revision_id=(q.command->>'routeRevision')::uuid
 and q.message->>'from'=r.sender and q.message->'to'=r.recipients
 and q.route_snapshot->>'from'=r.sender and q.route_snapshot->'to'=r.recipients;
$$;
revoke all on function cms.notification_probe_acceptance(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
create or replace function cms.get_notification_route_delivery_evidence(p_site uuid,p_route uuid,p_deployment uuid,p_origin text)
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
 accepted:=accepted or cms.notification_probe_acceptance(p_site,p_route,p_deployment,p_origin) is not null;
 return jsonb_build_object('websiteId',p_site,'routeId',p_route,'routeRevision',r.revision_id,'deploymentId',p_deployment,'cmsOrigin',p_origin,
 'routeApproved',r.enabled and r.approved_at is not null and r.approved_by is not null,
 'workerHealthy',coalesce((health->>'healthy')::boolean and (health->>'fresh')::boolean,false),
 'providerAcceptance',accepted);
end $$;
create or replace function cms.get_form_notification_evidence_before_binding(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb;routes jsonb;
begin
 select v.payload into payload from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=p_revision
 where r.website_id=p_site and r.id=p_record and r.content_type='form' and r.current_revision_id=p_revision;
 if not found then return null;end if;
 if jsonb_typeof(payload->'notificationRouteIds') is distinct from 'array' or jsonb_array_length(payload->'notificationRouteIds')>20 then return null;end if;
 select coalesce(jsonb_agg(jsonb_build_object('routeId',requested.id,'revisionId',r.revision_id,
 'approved',coalesce(r.enabled and r.approved_at is not null and r.approved_by is not null,false),
 'acceptedAt',greatest((select max(d.accepted_at) from cms.notification_dispatches d join cms.lead_notification_jobs j on j.website_id=d.website_id and j.id=d.job_id
 where d.website_id=p_site and d.route_id=r.id and d.route_revision=r.revision_id and d.provider_message_id is not null
 and d.message->>'from'=r.sender and d.message->'to'=r.recipients and j.status='succeeded'),(select cms.notification_probe_acceptance(p_site,r.id,b.deployment_id,b.cms_origin) from cms.website_notification_deployments b where b.website_id=p_site))) order by requested.position),'[]') into routes
 from(select value::uuid id,ordinality position from jsonb_array_elements_text(payload->'notificationRouteIds') with ordinality)requested
 left join cms.notification_email_routes r on r.website_id=p_site and r.id=requested.id;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'routes',routes);
exception when invalid_text_representation then return null;
end $$;
commit;
