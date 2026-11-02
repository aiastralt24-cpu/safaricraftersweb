begin;
-- Read-time eligibility only: no locks, writes, sends or publication side effects.
create function cms.form_notification_delivery_available(p_site uuid,p_payload jsonb)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare routes uuid[];binding cms.website_notification_deployments;health cms.notification_worker_health;route uuid;evidence jsonb;
begin
 if jsonb_typeof(p_payload->'notificationRouteIds') is distinct from 'array' then return false;end if;
 if jsonb_array_length(p_payload->'notificationRouteIds')=0 then return true;end if;
 if jsonb_array_length(p_payload->'notificationRouteIds')>20 then return false;end if;
 select array_agg(value::uuid order by value::uuid) into routes from jsonb_array_elements_text(p_payload->'notificationRouteIds');
 if exists(select 1 from unnest(routes) x group by x having count(*)>1) or array_position(routes,null) is not null then return false;end if;
 select * into binding from cms.website_notification_deployments where website_id=p_site;
 if binding.deployment_id is null then return false;end if;
 select * into health from cms.notification_worker_health where deployment_id=binding.deployment_id;
 if not found or not health.healthy or health.cms_origin<>binding.cms_origin or health.worker_version<>'notification-1'
 or health.observed_at<=statement_timestamp()-interval '5 minutes' or health.observed_at>statement_timestamp()+interval '5 seconds' then return false;end if;
 foreach route in array routes loop
  evidence:=cms.get_notification_route_delivery_evidence(p_site,route,binding.deployment_id,binding.cms_origin);
  if evidence is null or evidence->>'routeApproved' is distinct from 'true' or evidence->>'providerAcceptance' is distinct from 'true' then return false;end if;
 end loop;
 return true;
exception when invalid_text_representation then return false;
end $$;
alter function cms.get_published_form(uuid,uuid) rename to get_published_form_before_notification_readiness;
revoke all on function cms.get_published_form_before_notification_readiness(uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_published_form(p_site uuid,p_form uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare value jsonb;
begin
 value:=cms.get_published_form_before_notification_readiness(p_site,p_form);
 if value is null or not cms.form_notification_delivery_available(p_site,value->'definition') then return null;end if;
 return value;
end $$;
revoke all on function cms.form_notification_delivery_available(uuid,jsonb),cms.get_published_form(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function cms.get_published_form(uuid,uuid) to service_role;
commit;
