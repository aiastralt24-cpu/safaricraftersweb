begin;
-- Use immutable submitted attribution, never the job's current revision.
create or replace function cms.get_lead_notification_input(p_job uuid,p_token uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('websiteId',l.website_id,'leadId',l.id,'formId',l.form_id,'formRevision',l.form_revision_id,'formTitle',v.payload->>'title','routeIds',coalesce(v.payload->'notificationRouteIds','[]'::jsonb),'answers',l.answers,'receivedAt',l.created_at,
 'careerAttribution',case when l.attribution ? 'career' or l.attribution ? 'careerSelection' then l.attribution else null end)
 from cms.lead_notification_jobs j join cms.leads l on l.website_id=j.website_id and l.id=j.lead_id
 join cms.revisions v on v.website_id=l.website_id and v.record_id=l.form_id and v.id=l.form_revision_id
 where j.id=p_job and j.status='running' and j.lease_token=p_token and j.lease_until>now();
$$;
revoke all on function cms.get_lead_notification_input(uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_lead_notification_input(uuid,uuid) to service_role;
commit;
