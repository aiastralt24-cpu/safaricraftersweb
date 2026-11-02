begin;
-- Lead access is explicit: broad website-content permissions do not expose enquiries.
create function cms.can_lead(p_site uuid,p_action text,p_lead uuid default null)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
 where m.website_id=p_site and m.user_id=auth.uid() and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())
 and p.content_type='lead' and p.action=p_action and (p.record_id is null or p.record_id=p_lead));
$$;
create table cms.leads (
 id uuid primary key default gen_random_uuid(),website_id uuid not null references cms.websites(id),request_key uuid not null,
 form_id uuid not null,form_revision_id uuid not null,answers jsonb not null,consents jsonb not null,attribution jsonb not null,
 status text not null default 'new' check(status in ('new','assigned','contacted','qualified','in_progress','won','lost','invalid')),
 priority text not null default 'normal' check(priority in ('low','normal','high')),assigned_to uuid references auth.users(id),
 next_follow_up timestamptz,outcome text not null default '',external_crm_reference text,version integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(website_id,id),unique(website_id,request_key),
 foreign key(website_id,form_id,form_revision_id) references cms.revisions(website_id,record_id,id),
 check(jsonb_typeof(answers)='object' and octet_length(answers::text)<=300000),
 check(jsonb_typeof(consents)='array' and octet_length(consents::text)<=300000),
 check(jsonb_typeof(attribution)='object' and octet_length(attribution::text)<=10000)
);
create index cms_leads_inbox on cms.leads(website_id,created_at desc,id);
create index cms_leads_follow_up on cms.leads(website_id,next_follow_up) where next_follow_up is not null;
create table cms.lead_events (
 id uuid primary key default gen_random_uuid(),website_id uuid not null,lead_id uuid not null,
 actor_id uuid references auth.users(id),action text not null,details jsonb not null default '{}',created_at timestamptz not null default now(),
 foreign key(website_id,lead_id) references cms.leads(website_id,id)
);
create table cms.lead_notification_jobs (
 id uuid primary key default gen_random_uuid(),website_id uuid not null,lead_id uuid not null,operation text not null default 'enquiry_received',
 status text not null default 'pending' check(status in ('pending','running','succeeded','failed')),attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),lease_token uuid,lease_until timestamptz,last_error_code text,finished_at timestamptz,
 created_at timestamptz not null default now(),unique(website_id,lead_id,operation),
 foreign key(website_id,lead_id) references cms.leads(website_id,id)
);
alter table cms.leads enable row level security;
alter table cms.lead_events enable row level security;
alter table cms.lead_notification_jobs enable row level security;
create policy lead_read on cms.leads for select to authenticated using(cms.can_lead(website_id,'view',id));
create policy lead_event_read on cms.lead_events for select to authenticated using(cms.can_lead(website_id,'view',lead_id));
create policy lead_job_read on cms.lead_notification_jobs for select to authenticated using(cms.can_lead(website_id,'view',lead_id));
grant select on cms.leads,cms.lead_events,cms.lead_notification_jobs to authenticated;

-- Trusted intake service only. The service must validate stored form fields,
-- abuse checks, consent evidence and upload ownership before this transaction.
create function cms.accept_enquiry(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_answers jsonb,p_consents jsonb,p_attribution jsonb)
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
 insert into cms.lead_notification_jobs(website_id,lead_id) values(p_site,lead);
 return (select jsonb_build_object('leadId',id,'receivedAt',created_at,'replayed',false) from cms.leads where id=lead);
end $$;
revoke all on function cms.can_lead(uuid,text,uuid),cms.accept_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) from public;
grant execute on function cms.can_lead(uuid,text,uuid) to authenticated;
grant execute on function cms.accept_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) to service_role;
commit;
