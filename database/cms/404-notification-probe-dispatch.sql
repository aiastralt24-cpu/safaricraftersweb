begin;
alter table cms.notification_probe_requests
 add column lease_token uuid,add column lease_until timestamptz,
 add column first_attempt_at timestamptz,add column message jsonb,
 add column provider_message_id uuid,add column accepted_at timestamptz,
 add check((first_attempt_at is null)=(message is null)),
 add check((provider_message_id is null)=(accepted_at is null));
-- Cancellation is definitive only before a message has been prepared for sending.
create function cms.guard_probe_cancellation() returns trigger language plpgsql set search_path='' as $$
begin
 if new.state='cancelled' and old.state<>'cancelled' and old.first_attempt_at is not null then raise exception 'notification_probe_delivery_started';end if;
 return new;
end $$;
create trigger probe_cancellation before update on cms.notification_probe_requests for each row execute function cms.guard_probe_cancellation();

create function cms.probe_delivery_available(p_probe uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select coalesce(exists(select 1 from cms.notification_probe_requests q
 join cms.website_notification_deployments b on b.website_id=q.website_id
 join cms.notification_email_routes r on r.website_id=q.website_id and r.id=(q.command->>'routeId')::uuid
 join cms.notification_worker_health h on h.deployment_id=b.deployment_id
 where q.id=p_probe and q.state='pending' and b.revision_id=(q.command->>'bindingRevision')::uuid
 and b.deployment_id=(q.receipt->>'deploymentId')::uuid and b.cms_origin=q.receipt->>'cmsOrigin'
 and r.revision_id=(q.command->>'routeRevision')::uuid and r.enabled and r.approved_at is not null and r.approved_by is not null
 and r.sender=q.route_snapshot->>'from' and r.recipients=q.route_snapshot->'to'
 and h.cms_origin=b.cms_origin and h.worker_version='notification-1' and h.healthy
 and h.observed_at>clock_timestamp()-interval '5 minutes' and h.observed_at<=clock_timestamp()+interval '5 seconds'
 and exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
 where m.website_id=q.website_id and m.user_id=q.actor_id and m.revoked_at is null and (m.expires_at is null or m.expires_at>clock_timestamp())
 and p.content_type='lead' and p.action='approve' and p.record_id is null)),false);
$$;
create function cms.claim_notification_probe(p_probe uuid,p_deployment uuid,p_origin text) returns jsonb language plpgsql security definer set search_path='' as $$
declare q cms.notification_probe_requests;token uuid:=gen_random_uuid();
begin
 select * into q from cms.notification_probe_requests where id=p_probe for update;
 if not found or q.state<>'pending' or q.receipt->>'deploymentId' is distinct from p_deployment::text or q.receipt->>'cmsOrigin' is distinct from p_origin then raise exception 'notification_probe_unavailable';end if;
 if q.lease_until>clock_timestamp() then raise exception 'notification_probe_leased';end if;
 update cms.notification_probe_requests set lease_token=token,lease_until=clock_timestamp()+interval '120 seconds' where id=p_probe;
 return jsonb_build_object('probeId',p_probe,'leaseToken',token);
end $$;
create function cms.get_notification_probe_dispatch(p_probe uuid,p_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare q cms.notification_probe_requests;status text;
begin
 select * into q from cms.notification_probe_requests where id=p_probe;
 if not found or p_token is null or q.lease_token is distinct from p_token or q.lease_until<=clock_timestamp() then raise exception 'notification_probe_lease_lost';end if;
 if q.first_attempt_at is null then
  if not cms.probe_delivery_available(p_probe) then raise exception 'notification_probe_unavailable';end if;
  return null;
 end if;
 status:=case when q.accepted_at is not null then 'accepted'
 when not cms.probe_delivery_available(p_probe) then 'unavailable'
 when q.first_attempt_at<=clock_timestamp()-interval '23 hours 58 minutes' then 'reconciliation_required' else 'ready' end;
 return (q.receipt-array['actorId','requestId','bindingRevision','state'])||jsonb_build_object('state',status,
 'firstAttemptAt',q.first_attempt_at,'idempotencyKey','cms-notification:'||q.id,
 'message',case when status='ready' then q.message else null end,'providerMessageId',q.provider_message_id);
end $$;
create function cms.prepare_notification_probe(p_probe uuid,p_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare q cms.notification_probe_requests;result jsonb;body text;
begin
 -- Same site -> request order as administrator cancellation/configuration.
 perform 1 from cms.websites where id=(select website_id from cms.notification_probe_requests where id=p_probe) for update;
 select * into q from cms.notification_probe_requests where id=p_probe for update;
 result:=cms.get_notification_probe_dispatch(p_probe,p_token);
 if result is not null then return result;end if;
 body:=E'CMS notification delivery verification\nAn administrator requested this message to verify the configured notification recipients.\nThis is a setup check, not a customer enquiry or job application.\nVerification reference: '||q.id||E'\n\nOpen the CMS: '||(q.receipt->>'cmsOrigin')||E'/cms\nReport receipt to the administrator who requested the check. Provider acceptance alone does not confirm inbox delivery.';
 update cms.notification_probe_requests set first_attempt_at=clock_timestamp(),message=jsonb_build_object('from',q.route_snapshot->>'from','to',q.route_snapshot->'to','subject','CMS notification delivery verification','text',body) where id=p_probe;
 return cms.get_notification_probe_dispatch(p_probe,p_token);
end $$;
create function cms.accept_notification_probe(p_probe uuid,p_token uuid,p_provider uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare q cms.notification_probe_requests;
begin
 select * into q from cms.notification_probe_requests where id=p_probe for update;
 if not found or p_token is null or q.lease_token is distinct from p_token or q.lease_until<=clock_timestamp() then raise exception 'notification_probe_lease_lost';end if;
 if p_provider is null or q.first_attempt_at is null then raise exception 'invalid_notification_probe_receipt';end if;
 if q.provider_message_id is not null and q.provider_message_id<>p_provider then raise exception 'notification_probe_receipt_conflict';end if;
 -- Record a completed provider call even if approval was revoked while it ran.
 update cms.notification_probe_requests set provider_message_id=p_provider,accepted_at=coalesce(accepted_at,clock_timestamp()) where id=p_probe;
 return cms.get_notification_probe_dispatch(p_probe,p_token);
end $$;
revoke all on function cms.guard_probe_cancellation(),cms.probe_delivery_available(uuid),cms.claim_notification_probe(uuid,uuid,text),cms.get_notification_probe_dispatch(uuid,uuid),cms.prepare_notification_probe(uuid,uuid),cms.accept_notification_probe(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function cms.claim_notification_probe(uuid,uuid,text),cms.get_notification_probe_dispatch(uuid,uuid),cms.prepare_notification_probe(uuid,uuid),cms.accept_notification_probe(uuid,uuid,uuid) to service_role;
commit;
