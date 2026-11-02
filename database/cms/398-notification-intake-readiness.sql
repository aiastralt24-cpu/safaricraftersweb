begin;
alter function cms.get_enquiry_input(uuid,uuid,uuid,uuid) rename to get_enquiry_input_before_notification_readiness;
revoke all on function cms.get_enquiry_input_before_notification_readiness(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_enquiry_input(p_site uuid,p_form uuid,p_revision uuid,p_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare value jsonb;
begin
 value:=cms.get_enquiry_input_before_notification_readiness(p_site,p_form,p_revision,p_request);
 if value is null then return null;end if;
 -- Existing receipts retain their original definition for exact replay validation.
 if exists(select 1 from cms.leads where website_id=p_site and request_key=p_request and form_id=p_form and form_revision_id=p_revision) then return value;end if;
 if not cms.form_notification_delivery_available(p_site,value->'definition') then return null;end if;
 return value;
end $$;
alter function cms.accept_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) rename to accept_enquiry_before_notification_readiness;
revoke all on function cms.accept_enquiry_before_notification_readiness(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
create function cms.accept_enquiry(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_answers jsonb,p_consents jsonb,p_attribution jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare payload jsonb;
begin
 -- Match the existing site's intake serialization and preserve exact durable retries.
 perform 1 from cms.websites where id=p_site for update;
 if not found then raise exception 'form_unavailable';end if;
 if not exists(select 1 from cms.leads where website_id=p_site and request_key=p_request) then
  select v.payload into payload from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=p_revision
  where r.website_id=p_site and r.id=p_form and r.content_type='form' and r.published_revision_id=p_revision for share of r;
  if not found then raise exception 'form_unavailable';end if;
  perform cms.assert_form_notification_delivery(p_site,payload);
 end if;
 -- This original path checks all answer/consent/attribution and identity equality on replay.
 return cms.accept_enquiry_before_notification_readiness(p_site,p_form,p_revision,p_request,p_answers,p_consents,p_attribution);
end $$;
revoke all on function cms.get_enquiry_input(uuid,uuid,uuid,uuid),cms.accept_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function cms.get_enquiry_input(uuid,uuid,uuid,uuid),cms.accept_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) to service_role;
commit;
