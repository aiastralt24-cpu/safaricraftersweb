begin;
create table cms.website_notification_deployments(
 website_id uuid primary key references cms.websites(id),revision_id uuid not null,
 deployment_id uuid,cms_origin text,updated_at timestamptz not null default clock_timestamp(),
 check((deployment_id is null)=(cms_origin is null))
);
create table cms.notification_deployment_requests(
 website_id uuid not null references cms.websites(id),request_id uuid not null,command jsonb not null,receipt jsonb not null,
 created_at timestamptz not null default clock_timestamp(),primary key(website_id,request_id)
);
alter table cms.website_notification_deployments enable row level security;
alter table cms.notification_deployment_requests enable row level security;
create function cms.bind_notification_deployment(p_site uuid,p_expected uuid,p_request uuid,p_deployment uuid,p_origin text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_config cms.website_notification_deployments;prior cms.notification_deployment_requests;command jsonb;receipt jsonb;health jsonb;next_revision uuid:=gen_random_uuid();
begin
 if p_request is null or (p_deployment is null)<>(p_origin is null) then raise exception 'invalid_notification_binding';end if;
 perform 1 from cms.websites where id=p_site for update;if not found then raise exception 'website_unavailable';end if;
 command:=jsonb_build_object('expected',p_expected,'deploymentId',p_deployment,'cmsOrigin',p_origin);
 select * into prior from cms.notification_deployment_requests where website_id=p_site and request_id=p_request;
 if found then if prior.command<>command then raise exception 'idempotency_key_reused';end if;return prior.receipt;end if;
 select * into current_config from cms.website_notification_deployments where website_id=p_site;
 if current_config.revision_id is distinct from p_expected then raise exception 'notification_binding_conflict' using errcode='40001';end if;
 if p_deployment is not null then
  health:=cms.get_notification_worker_health(p_deployment,p_origin);
  if health is null or health->>'healthy' is distinct from 'true' or health->>'fresh' is distinct from 'true' then raise exception 'notification_worker_not_ready';end if;
 end if;
 insert into cms.website_notification_deployments(website_id,revision_id,deployment_id,cms_origin) values(p_site,next_revision,p_deployment,p_origin)
 on conflict(website_id) do update set revision_id=excluded.revision_id,deployment_id=excluded.deployment_id,cms_origin=excluded.cms_origin,updated_at=clock_timestamp();
 receipt:=jsonb_build_object('websiteId',p_site,'revisionId',next_revision,'requestId',p_request,'deploymentId',p_deployment,'cmsOrigin',p_origin);
 insert into cms.notification_deployment_requests(website_id,request_id,command,receipt) values(p_site,p_request,command,receipt);
 return receipt;
end $$;
alter function cms.get_form_notification_evidence(uuid,uuid,uuid) rename to get_form_notification_evidence_before_binding;
revoke all on function cms.get_form_notification_evidence_before_binding(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_form_notification_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare value jsonb;binding cms.website_notification_deployments;health jsonb;routes jsonb:='[]';
begin
 value:=cms.get_form_notification_evidence_before_binding(p_site,p_record,p_revision);if value is null then return null;end if;
 select * into binding from cms.website_notification_deployments where website_id=p_site;
 if binding.deployment_id is not null then
  health:=cms.get_notification_worker_health(binding.deployment_id,binding.cms_origin);
  select coalesce(jsonb_agg(jsonb_build_object('routeId',x->>'routeId','routeRevision',x->'revisionId',
   'providerAcceptance',coalesce((cms.get_notification_route_delivery_evidence(p_site,(x->>'routeId')::uuid,binding.deployment_id,binding.cms_origin)->>'providerAcceptance')::boolean,false)) order by position),'[]') into routes
  from jsonb_array_elements(value->'routes') with ordinality as items(x,position);
 end if;
 return value||jsonb_build_object('delivery',jsonb_build_object('bindingRevision',binding.revision_id,'deploymentId',binding.deployment_id,'cmsOrigin',binding.cms_origin,
 'workerHealthy',coalesce((health->>'healthy')::boolean and (health->>'fresh')::boolean,false),'routes',routes));
end $$;
revoke all on function cms.bind_notification_deployment(uuid,uuid,uuid,uuid,text),cms.get_form_notification_evidence(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function cms.bind_notification_deployment(uuid,uuid,uuid,uuid,text),cms.get_form_notification_evidence(uuid,uuid,uuid) to service_role;
commit;
