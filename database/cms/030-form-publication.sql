begin;
-- Explicitly version the trusted validator; client advisory checks cannot mint receipts.
insert into cms.validation_policy(content_type,validator_version) values('form','form-1');
alter table cms.records add constraint cms_form_no_page_path check(content_type<>'form' or path is null);
create or replace function cms.accept_enquiry(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_answers jsonb,p_consents jsonb,p_attribution jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare existing cms.leads; rec cms.records; lead uuid;
begin
 if p_request is null or p_answers is null or p_consents is null or p_attribution is null
 or jsonb_typeof(p_answers)<>'object' or octet_length(p_answers::text)>300000
 or jsonb_typeof(p_consents)<>'array' or octet_length(p_consents::text)>300000
 or jsonb_typeof(p_attribution)<>'object' or octet_length(p_attribution::text)>10000 then raise exception 'invalid_enquiry'; end if;
 -- Serialize intake per website so simultaneous retry keys cannot double-insert.
 perform 1 from cms.websites where id=p_site for update;
 if not found then raise exception 'form_unavailable'; end if;
 select * into existing from cms.leads where website_id=p_site and request_key=p_request;
 if found then
  if existing.form_id is distinct from p_form or existing.form_revision_id is distinct from p_revision
   or existing.answers<>p_answers or existing.consents<>p_consents or existing.attribution<>p_attribution then raise exception 'idempotency_key_reused'; end if;
  return jsonb_build_object('leadId',existing.id,'receivedAt',existing.created_at,'replayed',true);
 end if;
 select * into rec from cms.records where website_id=p_site and id=p_form and content_type='form' for share;
 if not found or rec.published_revision_id is null or rec.published_revision_id is distinct from p_revision then raise exception 'form_unavailable'; end if;
 insert into cms.leads(website_id,request_key,form_id,form_revision_id,answers,consents,attribution)
 values(p_site,p_request,p_form,p_revision,p_answers,p_consents,p_attribution) returning id into lead;
 insert into cms.lead_events(website_id,lead_id,action) values(p_site,lead,'received');
 if exists(select 1 from cms.revisions where website_id=p_site and record_id=p_form and id=p_revision
  and payload->'notificationRouteIds' is distinct from '[]'::jsonb) then
  insert into cms.lead_notification_jobs(website_id,lead_id) values(p_site,lead);
 end if;
 return (select jsonb_build_object('leadId',id,'receivedAt',created_at,'replayed',false) from cms.leads where id=lead);
end $$;
commit;
