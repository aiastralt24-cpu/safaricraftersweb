begin;
create function cms.cancel_notification_route_request(p_site uuid,p_route uuid,p_expected uuid,p_request uuid,p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare previous cms.notification_route_requests;command jsonb;receipt jsonb;permission text;
begin
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>10000 then raise exception 'invalid_notification_route_command';end if;
 if p_route is null or p_request is null or p_action is null or p_action not in('save','approve','disable') then raise exception 'invalid_notification_route_command';end if;
 permission:=case when p_action='approve' then 'approve' else 'configure' end;
 if not cms.can_lead(p_site,permission) then raise exception 'forbidden' using errcode='42501';end if;
 perform 1 from cms.websites where id=p_site for update;
 if not found or not cms.can_lead(p_site,permission) then raise exception 'forbidden' using errcode='42501';end if;
 command:=jsonb_build_object('routeId',p_route,'expected',p_expected,'action',p_action,'payload',p_payload);
 select * into previous from cms.notification_route_requests where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if found then
  if previous.command is distinct from command then raise exception 'idempotency_key_reused';end if;
  return jsonb_build_object('websiteId',p_site,'requestId',p_request,'actorId',auth.uid(),'routeId',p_route,'cancelled',coalesce((previous.receipt->>'cancelled')::boolean,false),'receipt',case when previous.receipt->>'cancelled'='true' then null else previous.receipt end);
 end if;
 receipt:=jsonb_build_object('websiteId',p_site,'requestId',p_request,'actorId',auth.uid(),'routeId',p_route,'cancelled',true,'receipt',null);
 insert into cms.notification_route_requests values(p_site,auth.uid(),p_request,command,receipt);
 return receipt;
end $$;
revoke all on function cms.cancel_notification_route_request(uuid,uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function cms.cancel_notification_route_request(uuid,uuid,uuid,uuid,text,jsonb) to authenticated;
commit;
