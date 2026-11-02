begin;
create function cms.assert_form_notification_delivery(p_site uuid,p_payload jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare routes uuid[];binding cms.website_notification_deployments;health cms.notification_worker_health;route uuid;evidence jsonb;
begin
 if jsonb_typeof(p_payload->'notificationRouteIds') is distinct from 'array' then raise exception 'notification_routes_invalid';end if;
 if jsonb_array_length(p_payload->'notificationRouteIds')=0 then return;end if;
 if jsonb_array_length(p_payload->'notificationRouteIds')>20 then raise exception 'notification_routes_invalid';end if;
 begin select array_agg(value::uuid order by value::uuid) into routes from jsonb_array_elements_text(p_payload->'notificationRouteIds');exception when invalid_text_representation then raise exception 'notification_routes_invalid';end;
 if exists(select 1 from unnest(routes) x group by x having count(*)>1) or array_position(routes,null) is not null then raise exception 'notification_routes_invalid';end if;
 -- Lock existing dependencies directly; a missing binding or route fails closed.
 -- Avoid taking a website lock after the publication record lock.
 select * into binding from cms.website_notification_deployments where website_id=p_site for share;
 if binding.deployment_id is null then raise exception 'notification_deployment_unbound';end if;
 select * into health from cms.notification_worker_health where deployment_id=binding.deployment_id for share;
 if not found or not health.healthy or health.cms_origin<>binding.cms_origin or health.worker_version<>'notification-1'
 or health.observed_at<=clock_timestamp()-interval '5 minutes' or health.observed_at>clock_timestamp()+interval '5 seconds' then raise exception 'notification_worker_not_ready';end if;
 perform id from cms.notification_email_routes where website_id=p_site and id=any(routes) order by id for share;
 foreach route in array routes loop
  evidence:=cms.get_notification_route_delivery_evidence(p_site,route,binding.deployment_id,binding.cms_origin);
  if evidence is null or evidence->>'routeApproved' is distinct from 'true' then raise exception 'notification_route_not_approved';end if;
  if evidence->>'providerAcceptance' is distinct from 'true' then raise exception 'notification_deployment_unproven';end if;
 end loop;
 -- Waiting for route locks must not extend the health validity window.
 if health.observed_at<=clock_timestamp()-interval '5 minutes' then raise exception 'notification_worker_not_ready';end if;
end $$;
alter function cms.publish(uuid,uuid,uuid) rename to publish_before_notification_guard;
revoke all on function cms.publish_before_notification_guard(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.publish(p_site uuid,p_record uuid,p_revision uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare rec cms.records;payload jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record for update;
 if not found or not cms.can(p_site,'publish',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501';end if;
 if rec.content_type='form' then
  if rec.current_revision_id is distinct from p_revision or rec.approved_revision_id is distinct from p_revision or rec.review_status<>'approved' then raise exception 'approved_revision_required';end if;
  select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
  perform cms.assert_form_notification_delivery(p_site,payload);
 end if;
 return cms.publish_before_notification_guard(p_site,p_record,p_revision);
end $$;
revoke all on function cms.assert_form_notification_delivery(uuid,jsonb),cms.publish(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function cms.publish(uuid,uuid,uuid) to authenticated;
commit;
