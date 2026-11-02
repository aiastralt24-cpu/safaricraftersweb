begin;
-- Routes are provisioned only through trusted administration until the management API exists.
create table cms.notification_email_routes(
 website_id uuid not null references cms.websites(id),id uuid not null default gen_random_uuid(),revision_id uuid not null default gen_random_uuid(),
 enabled boolean not null default false,approved_at timestamptz, sender text not null,recipients jsonb not null,
 primary key(website_id,id),check(length(sender) between 3 and 254 and sender !~ '[[:space:]]'),
 check(jsonb_typeof(recipients)='array' and jsonb_array_length(recipients) between 1 and 20)
);
alter table cms.notification_email_routes enable row level security;
create table cms.notification_dispatches(
 id uuid primary key default gen_random_uuid(),website_id uuid not null,job_id uuid not null references cms.lead_notification_jobs(id),route_id uuid not null,route_revision uuid not null,
 message jsonb not null,first_attempt_at timestamptz not null default clock_timestamp(),provider_message_id uuid,accepted_at timestamptz,
 unique(job_id,route_id),foreign key(website_id,route_id) references cms.notification_email_routes(website_id,id),
 check(jsonb_typeof(message)='object' and octet_length(message::text)<=50000),check((provider_message_id is null)=(accepted_at is null))
);
alter table cms.notification_dispatches enable row level security;
create function cms.notification_dispatch_result(p_dispatch uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare d cms.notification_dispatches;state text;
begin
 select * into d from cms.notification_dispatches where id=p_dispatch;if not found then return null;end if;
 state:=case when d.accepted_at is not null then 'accepted'
 when not exists(select 1 from cms.notification_email_routes r where r.website_id=d.website_id and r.id=d.route_id and r.revision_id=d.route_revision and r.enabled and r.approved_at is not null and r.sender=d.message->>'from' and r.recipients=d.message->'to') then 'route_unavailable'
 when clock_timestamp()>=d.first_attempt_at+interval '24 hours' then 'reconciliation_required' else 'ready' end;
 return jsonb_build_object('dispatchId',d.id,'websiteId',d.website_id,'jobId',d.job_id,'routeId',d.route_id,'routeRevision',d.route_revision,'state',state,'idempotencyKey','cms-notification:'||d.id::text,'firstAttemptAt',d.first_attempt_at,'message',case when state='ready' then d.message else null end,'providerMessageId',d.provider_message_id);
end $$;
create function cms.get_notification_dispatch(p_job uuid,p_token uuid,p_route uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare job cms.lead_notification_jobs;dispatch uuid;
begin
 select * into job from cms.lead_notification_jobs where id=p_job;
 if not found or job.status<>'running' or job.lease_token is distinct from p_token or p_token is null or job.lease_until<=clock_timestamp() then raise exception 'notification_lease_lost' using errcode='40001';end if;
 select id into dispatch from cms.notification_dispatches where job_id=job.id and website_id=job.website_id and route_id=p_route;
 return cms.notification_dispatch_result(dispatch);
end $$;
create function cms.get_notification_email_route(p_job uuid,p_token uuid,p_route uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare job cms.lead_notification_jobs;result jsonb;
begin
 select * into job from cms.lead_notification_jobs where id=p_job;
 if not found or job.status<>'running' or job.lease_token is distinct from p_token or p_token is null or job.lease_until<=clock_timestamp() then raise exception 'notification_lease_lost' using errcode='40001';end if;
 select jsonb_build_object('websiteId',r.website_id,'routeId',r.id,'revisionId',r.revision_id,'enabled',r.enabled,'from',r.sender,'to',r.recipients) into result
 from cms.notification_email_routes r where r.website_id=job.website_id and r.id=p_route and r.enabled and r.approved_at is not null
 and exists(select 1 from cms.leads l join cms.revisions v on v.website_id=l.website_id and v.record_id=l.form_id and v.id=l.form_revision_id where l.website_id=job.website_id and l.id=job.lead_id and v.payload->'notificationRouteIds' @> jsonb_build_array(p_route::text));
 return result;
end $$;
create function cms.prepare_notification_dispatch(p_job uuid,p_token uuid,p_route uuid,p_revision uuid,p_message jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare job cms.lead_notification_jobs;route cms.notification_email_routes;d cms.notification_dispatches;
begin
 select * into job from cms.lead_notification_jobs where id=p_job for update;
 if not found or job.status<>'running' or job.lease_token is distinct from p_token or p_token is null or job.lease_until<=clock_timestamp() then raise exception 'notification_lease_lost' using errcode='40001';end if;
 select * into d from cms.notification_dispatches where job_id=p_job and route_id=p_route;
 if found then
  if d.route_revision is distinct from p_revision or d.message is distinct from p_message then raise exception 'notification_dispatch_changed';end if;
  return cms.notification_dispatch_result(d.id);
 end if;
 select * into route from cms.notification_email_routes where website_id=job.website_id and id=p_route and revision_id=p_revision and enabled and approved_at is not null for share;
 if not found then raise exception 'notification_route_unavailable';end if;
 if not exists(select 1 from cms.leads l join cms.revisions v on v.website_id=l.website_id and v.record_id=l.form_id and v.id=l.form_revision_id where l.website_id=job.website_id and l.id=job.lead_id and v.payload->'notificationRouteIds' @> jsonb_build_array(p_route::text)) then raise exception 'notification_route_mismatch';end if;
 if p_message is null or jsonb_typeof(p_message)<>'object' or octet_length(p_message::text)>50000 or p_message-array['from','to','subject','text']<>'{}'::jsonb
 or not p_message ?& array['from','to','subject','text'] or p_message->>'from' is distinct from route.sender or p_message->'to' is distinct from route.recipients
 or jsonb_typeof(p_message->'subject') is distinct from 'string' or length(p_message->>'subject') not between 1 and 200 or p_message->>'subject' ~ E'[\r\n]'
 or jsonb_typeof(p_message->'text') is distinct from 'string' or length(p_message->>'text') not between 1 and 10000 then raise exception 'invalid_notification_message';end if;
 insert into cms.notification_dispatches(website_id,job_id,route_id,route_revision,message) values(job.website_id,p_job,p_route,p_revision,p_message) returning * into d;
 return cms.notification_dispatch_result(d.id);
end $$;
create function cms.accept_notification_dispatch(p_job uuid,p_token uuid,p_dispatch uuid,p_provider_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare job cms.lead_notification_jobs;d cms.notification_dispatches;
begin
 select * into job from cms.lead_notification_jobs where id=p_job for update;
 if not found or job.status<>'running' or job.lease_token is distinct from p_token or p_token is null or job.lease_until<=clock_timestamp() then raise exception 'notification_lease_lost' using errcode='40001';end if;
 select * into d from cms.notification_dispatches where id=p_dispatch and job_id=p_job and website_id=job.website_id for update;
 if not found or p_provider_id is null then raise exception 'notification_dispatch_unavailable';end if;
 if d.provider_message_id is not null and d.provider_message_id<>p_provider_id then raise exception 'notification_receipt_conflict';end if;
 update cms.notification_dispatches set provider_message_id=p_provider_id,accepted_at=coalesce(accepted_at,clock_timestamp()) where id=d.id;
 return cms.notification_dispatch_result(d.id);
end $$;
revoke all on function cms.get_notification_email_route(uuid,uuid,uuid),cms.notification_dispatch_result(uuid),cms.get_notification_dispatch(uuid,uuid,uuid),cms.prepare_notification_dispatch(uuid,uuid,uuid,uuid,jsonb),cms.accept_notification_dispatch(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_notification_email_route(uuid,uuid,uuid),cms.get_notification_dispatch(uuid,uuid,uuid),cms.prepare_notification_dispatch(uuid,uuid,uuid,uuid,jsonb),cms.accept_notification_dispatch(uuid,uuid,uuid,uuid) to service_role;
commit;
