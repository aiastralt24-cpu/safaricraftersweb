begin;
create function cms.list_lead_notification_dispatches(p_site uuid,p_lead uuid,p_job uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare job cms.lead_notification_jobs;items jsonb;
begin
 if not cms.can_lead(p_site,'view',p_lead) or not(cms.can_lead(p_site,'configure') or cms.can_lead(p_site,'approve')) then raise exception 'forbidden' using errcode='42501';end if;
 select * into job from cms.lead_notification_jobs where website_id=p_site and lead_id=p_lead and id=p_job;if not found then return null;end if;
 select coalesce(jsonb_agg(jsonb_build_object('dispatchId',d.id,'routeId',d.route_id,'routeRevision',d.route_revision,'state',cms.notification_dispatch_result(d.id)->>'state',
 'firstAttemptAt',d.first_attempt_at,'acceptedAt',d.accepted_at,'providerMessageId',d.provider_message_id,'idempotencyKey','cms-notification:'||d.id::text,
 'needsReconciliation',d.accepted_at is null and clock_timestamp()>=d.first_attempt_at+interval '24 hours','from',d.message->>'from','to',d.message->'to') order by d.id),'[]') into items
 from(select * from cms.notification_dispatches where website_id=p_site and job_id=p_job order by id limit 21)d;
 if jsonb_array_length(items)>20 then raise exception 'notification_dispatch_limit';end if;
 return jsonb_build_object('websiteId',p_site,'leadId',p_lead,'jobId',p_job,'items',items);
end $$;
revoke all on function cms.list_lead_notification_dispatches(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.list_lead_notification_dispatches(uuid,uuid,uuid) to authenticated;
commit;
