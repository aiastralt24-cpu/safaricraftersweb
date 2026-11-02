begin;
alter table cms.notification_email_routes add column label text not null default 'Notification recipients' check(length(label) between 1 and 100);
alter table cms.notification_email_routes add column updated_by uuid references auth.users(id);
alter table cms.notification_email_routes add column approved_by uuid references auth.users(id);
create table cms.notification_route_history(
 website_id uuid not null,route_id uuid not null,revision_id uuid not null,actor_id uuid not null references auth.users(id),action text not null,created_at timestamptz not null default clock_timestamp(),snapshot jsonb not null,
 primary key(website_id,route_id,revision_id),foreign key(website_id,route_id) references cms.notification_email_routes(website_id,id)
);
create table cms.notification_route_requests(
 website_id uuid not null,actor_id uuid not null references auth.users(id),request_id uuid not null,command jsonb not null,receipt jsonb not null,
 primary key(website_id,actor_id,request_id)
);
alter table cms.notification_route_history enable row level security;
alter table cms.notification_route_requests enable row level security;
create function cms.notification_route_view(p_site uuid,p_route uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('websiteId',r.website_id,'routeId',r.id,'revisionId',r.revision_id,'label',r.label,'from',r.sender,'to',r.recipients,'enabled',r.enabled,'approvedAt',r.approved_at,'approvedBy',r.approved_by) from cms.notification_email_routes r where r.website_id=p_site and r.id=p_route;
$$;
create function cms.list_notification_routes(p_site uuid,p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb;
begin
 if not(cms.can_lead(p_site,'configure') or cms.can_lead(p_site,'approve')) then raise exception 'forbidden' using errcode='42501';end if;
 if p_after is not null and not exists(select 1 from cms.notification_email_routes where website_id=p_site and id=p_after) then raise exception 'invalid_notification_cursor';end if;
 select coalesce(jsonb_agg(cms.notification_route_view(p_site,r.id) order by r.id),'[]') into items from(select id from cms.notification_email_routes where website_id=p_site and(p_after is null or id>p_after) order by id limit 50)r;
 return jsonb_build_object('websiteId',p_site,'after',p_after,'canEdit',cms.can_lead(p_site,'configure'),'canApprove',cms.can_lead(p_site,'approve'),'items',items);
end $$;
create function cms.manage_notification_route(p_site uuid,p_route uuid,p_expected uuid,p_request uuid,p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare permission text;previous cms.notification_route_requests;r cms.notification_email_routes;command jsonb;receipt jsonb;snapshot jsonb;next_revision uuid;
begin
 if p_route is null or p_request is null or p_action is null or p_action not in('save','approve','disable') then raise exception 'invalid_notification_route_command';end if;
 permission:=case when p_action='approve' then 'approve' else 'configure' end;
 if not cms.can_lead(p_site,permission) then raise exception 'forbidden' using errcode='42501';end if;
 perform 1 from cms.websites where id=p_site for update;if not found then raise exception 'forbidden' using errcode='42501';end if;
 if not cms.can_lead(p_site,permission) then raise exception 'forbidden' using errcode='42501';end if;
 command:=jsonb_build_object('routeId',p_route,'expected',p_expected,'action',p_action,'payload',p_payload);
 select * into previous from cms.notification_route_requests where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if found then if previous.command is distinct from command then raise exception 'idempotency_key_reused';end if;return previous.receipt;end if;
 select * into r from cms.notification_email_routes where website_id=p_site and id=p_route for update;
 if found then if p_expected is null or r.revision_id<>p_expected then raise exception 'notification_route_conflict' using errcode='40001';end if;
 elsif p_expected is not null or p_action<>'save' then raise exception 'notification_route_conflict' using errcode='40001';end if;
 if p_action='save' then
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or p_payload-array['label','from','to']<>'{}'::jsonb or not p_payload ?& array['label','from','to']
  or jsonb_typeof(p_payload->'label') is distinct from 'string' or length(btrim(p_payload->>'label')) not between 1 and 100
  or jsonb_typeof(p_payload->'from') is distinct from 'string' or length(p_payload->>'from')>254 or p_payload->>'from' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  or jsonb_typeof(p_payload->'to') is distinct from 'array' then raise exception 'invalid_notification_recipients';end if;
  if jsonb_array_length(p_payload->'to') not between 1 and 20 or exists(select 1 from jsonb_array_elements(p_payload->'to') x where jsonb_typeof(x)<>'string' or length(x#>>'{}')>254 or x#>>'{}' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  or(select count(distinct lower(x#>>'{}')) from jsonb_array_elements(p_payload->'to')x)<>jsonb_array_length(p_payload->'to') then raise exception 'invalid_notification_recipients';end if;
 else
  if p_payload is distinct from '{}'::jsonb then raise exception 'invalid_notification_route_command';end if;
 end if;
 next_revision:=gen_random_uuid();
 if p_action='save' then
  insert into cms.notification_email_routes(website_id,id,revision_id,label,sender,recipients,enabled,approved_at,approved_by,updated_by)
  values(p_site,p_route,next_revision,btrim(p_payload->>'label'),p_payload->>'from',p_payload->'to',false,null,null,auth.uid())
  on conflict(website_id,id) do update set revision_id=excluded.revision_id,label=excluded.label,sender=excluded.sender,recipients=excluded.recipients,enabled=false,approved_at=null,approved_by=null,updated_by=auth.uid();
 elsif p_action='approve' then
  update cms.notification_email_routes set revision_id=next_revision,enabled=true,approved_at=clock_timestamp(),approved_by=auth.uid(),updated_by=auth.uid() where website_id=p_site and id=p_route;
 else
  update cms.notification_email_routes set revision_id=next_revision,enabled=false,approved_at=null,approved_by=null,updated_by=auth.uid() where website_id=p_site and id=p_route;
 end if;
 snapshot:=cms.notification_route_view(p_site,p_route);
 insert into cms.notification_route_history(website_id,route_id,revision_id,actor_id,action,snapshot) values(p_site,p_route,next_revision,auth.uid(),p_action,snapshot);
 receipt:=jsonb_build_object('websiteId',p_site,'requestId',p_request,'actorId',auth.uid(),'action',p_action,'route',snapshot);
 insert into cms.notification_route_requests values(p_site,auth.uid(),p_request,command,receipt);
 return receipt;
end $$;
revoke all on function cms.notification_route_view(uuid,uuid),cms.list_notification_routes(uuid,uuid),cms.manage_notification_route(uuid,uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function cms.list_notification_routes(uuid,uuid),cms.manage_notification_route(uuid,uuid,uuid,uuid,text,jsonb) to authenticated;
commit;
