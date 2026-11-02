begin;
create function cms.get_notification_probe_context(p_site uuid,p_route uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r cms.notification_email_routes;b cms.website_notification_deployments;health jsonb;ready boolean;
begin
 if not cms.can_lead(p_site,'approve') then raise exception 'forbidden' using errcode='42501';end if;
 select * into r from cms.notification_email_routes where website_id=p_site and id=p_route;if not found then return null;end if;
 select * into b from cms.website_notification_deployments where website_id=p_site;
 health:=cms.get_notification_worker_health(b.deployment_id,b.cms_origin);
 ready:=coalesce((health->>'healthy')::boolean and (health->>'fresh')::boolean,false);
 return jsonb_build_object('websiteId',p_site,'routeId',p_route,'routeRevision',r.revision_id,'routeApproved',r.enabled and r.approved_at is not null and r.approved_by is not null,
 'bindingRevision',b.revision_id,'deploymentId',b.deployment_id,'cmsOrigin',b.cms_origin,'workerHealthy',ready);
end $$;
create function cms.get_notification_probe_status(p_site uuid,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare q cms.notification_probe_requests;status text;
begin
 if auth.uid() is null or not cms.can_lead(p_site,'approve') then raise exception 'forbidden' using errcode='42501';end if;
 select * into q from cms.notification_probe_requests where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if not found then return null;end if;
 status:=case when q.state='cancelled' then 'cancelled' when q.accepted_at is not null then 'accepted'
 when q.lease_until>clock_timestamp() then 'in_progress'
 when not cms.probe_delivery_available(q.id) then 'unavailable'
 when q.first_attempt_at<=clock_timestamp()-interval '23 hours 58 minutes' then 'reconciliation_required' else 'ready' end;
 return jsonb_build_object('receipt',q.receipt,'state',status,'firstAttemptAt',q.first_attempt_at,'providerMessageId',q.provider_message_id,'leaseUntil',q.lease_until);
end $$;
revoke all on function cms.get_notification_probe_context(uuid,uuid),cms.get_notification_probe_status(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function cms.get_notification_probe_context(uuid,uuid),cms.get_notification_probe_status(uuid,uuid) to authenticated;
commit;
