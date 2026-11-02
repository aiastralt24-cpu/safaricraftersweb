begin;
create table cms.notification_worker_health(
 deployment_id uuid primary key,cms_origin text not null,worker_version text not null,
 healthy boolean not null,observed_at timestamptz not null default clock_timestamp()
);
alter table cms.notification_worker_health enable row level security;
create function cms.record_notification_worker_health(p_deployment uuid,p_origin text,p_version text,p_healthy boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare observed timestamptz:=clock_timestamp();
begin
 if p_deployment is null or p_healthy is null or p_version is distinct from 'notification-1' or p_origin is null or length(p_origin)>2048
 or p_origin !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$' then raise exception 'invalid_notification_worker_health';end if;
 insert into cms.notification_worker_health(deployment_id,cms_origin,worker_version,healthy,observed_at)
 values(p_deployment,p_origin,p_version,p_healthy,observed)
 on conflict(deployment_id) do update set cms_origin=excluded.cms_origin,worker_version=excluded.worker_version,healthy=excluded.healthy,observed_at=excluded.observed_at;
 return jsonb_build_object('deploymentId',p_deployment,'cmsOrigin',p_origin,'workerVersion',p_version,'healthy',p_healthy,'observedAt',observed);
end $$;
create function cms.get_notification_worker_health(p_deployment uuid,p_origin text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('deploymentId',deployment_id,'cmsOrigin',cms_origin,'workerVersion',worker_version,'healthy',healthy,
 'observedAt',observed_at,'fresh',observed_at>now()-interval '5 minutes' and observed_at<=now()+interval '5 seconds')
 from cms.notification_worker_health where deployment_id=p_deployment and cms_origin=p_origin and worker_version='notification-1';
$$;
revoke all on function cms.record_notification_worker_health(uuid,text,text,boolean),cms.get_notification_worker_health(uuid,text) from public,anon,authenticated,service_role;
grant execute on function cms.record_notification_worker_health(uuid,text,text,boolean),cms.get_notification_worker_health(uuid,text) to service_role;
commit;
