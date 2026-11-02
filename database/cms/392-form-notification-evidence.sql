begin;
create function cms.get_form_notification_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb;routes jsonb;
begin
 select v.payload into payload from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=p_revision
 where r.website_id=p_site and r.id=p_record and r.content_type='form' and r.current_revision_id=p_revision;
 if not found then return null;end if;
 if jsonb_typeof(payload->'notificationRouteIds') is distinct from 'array' or jsonb_array_length(payload->'notificationRouteIds')>20 then return null;end if;
 select coalesce(jsonb_agg(jsonb_build_object('routeId',requested.id,'revisionId',r.revision_id,
 'approved',coalesce(r.enabled and r.approved_at is not null and r.approved_by is not null,false),
 'acceptedAt',(select max(d.accepted_at) from cms.notification_dispatches d join cms.lead_notification_jobs j on j.website_id=d.website_id and j.id=d.job_id
 where d.website_id=p_site and d.route_id=r.id and d.route_revision=r.revision_id and d.provider_message_id is not null
 and d.message->>'from'=r.sender and d.message->'to'=r.recipients and j.status='succeeded')) order by requested.position),'[]') into routes
 from(select value::uuid id,ordinality position from jsonb_array_elements_text(payload->'notificationRouteIds') with ordinality)requested
 left join cms.notification_email_routes r on r.website_id=p_site and r.id=requested.id;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'routes',routes);
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.get_form_notification_evidence(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function cms.get_form_notification_evidence(uuid,uuid,uuid) to service_role;
alter function cms.get_validation_input(uuid,uuid,uuid) rename to get_validation_input_before_form_notifications;
revoke all on function cms.get_validation_input_before_form_notifications(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare value jsonb;
begin
 value:=cms.get_validation_input_before_form_notifications(p_site,p_record,p_revision);
 if value->>'type'='form' then value:=value||jsonb_build_object('formNotificationEvidence',cms.get_form_notification_evidence(p_site,p_record,p_revision));end if;
 return value;
end $$;
revoke all on function cms.get_validation_input(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_validation_input(uuid,uuid,uuid) to service_role;
commit;
