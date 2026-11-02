begin;
alter table cms.enquiry_files add constraint enquiry_files_site_identity unique(website_id,id);
create table cms.enquiry_attachment_submissions (
 website_id uuid not null,request_key uuid not null,session_id uuid not null,form_id uuid not null,form_revision_id uuid not null,
 answers jsonb not null,consents jsonb not null,attribution jsonb not null,context jsonb not null,files jsonb not null,
 lead_id uuid,created_at timestamptz not null default clock_timestamp(),
 primary key(website_id,request_key),unique(website_id,session_id),
 foreign key(website_id,session_id) references cms.enquiry_file_sessions(website_id,id),
 foreign key(website_id,form_id,form_revision_id) references cms.revisions(website_id,record_id,id),
 foreign key(website_id,lead_id) references cms.leads(website_id,id)
);
create table cms.lead_attachments (
 website_id uuid not null,lead_id uuid not null,field_id text not null,upload_id uuid not null unique,snapshot jsonb not null,
 primary key(website_id,lead_id,field_id),
 foreign key(website_id,lead_id) references cms.leads(website_id,id),
 foreign key(website_id,upload_id) references cms.enquiry_files(website_id,id)
);
alter table cms.enquiry_attachment_submissions enable row level security;
alter table cms.lead_attachments enable row level security;
revoke all on cms.enquiry_attachment_submissions,cms.lead_attachments from public,anon,authenticated,service_role;

-- Legacy intake cannot bypass the attachment transaction. Its private original
-- remains callable only by the guarded definer; no session credential is a GUC.
alter function cms.accept_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) rename to accept_enquiry_before_attachment_guard;
revoke all on function cms.accept_enquiry_before_attachment_guard(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
create function cms.accept_enquiry(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_answers jsonb,p_consents jsonb,p_attribution jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform 1 from cms.websites where id=p_site for update;
 if exists(select 1 from cms.revisions v cross join lateral jsonb_array_elements(v.payload->'fields') f where v.website_id=p_site and v.record_id=p_form and v.id=p_revision and f->>'type'='file' and p_answers ? (f->>'id') and p_answers->(f->>'id') not in ('null'::jsonb,'""'::jsonb)) then
  if not exists(select 1 from cms.enquiry_attachment_submissions a where a.website_id=p_site and a.request_key=p_request and a.form_id=p_form and a.form_revision_id=p_revision and a.answers=p_answers and a.consents=p_consents and a.lead_id is null) then raise exception 'attachment_submission_required';end if;
 end if;
 return cms.accept_enquiry_before_attachment_guard(p_site,p_form,p_revision,p_request,p_answers,p_consents,p_attribution);
end $$;
revoke all on function cms.accept_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function cms.accept_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) to service_role;

create function cms.accept_enquiry_attachments(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_session uuid,p_token_hash text,p_answers jsonb,p_consents jsonb,p_attribution jsonb,p_context jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s cms.enquiry_file_sessions;a cms.enquiry_attachment_submissions;definition jsonb;f jsonb;answer_value jsonb;selected jsonb:='[]';evidence jsonb;receipt jsonb;lead uuid;
begin
 if p_answers is null or jsonb_typeof(p_answers)<>'object' or octet_length(p_answers::text)>300000 or p_consents is null or jsonb_typeof(p_consents)<>'array' or octet_length(p_consents::text)>300000
 or p_attribution is null or jsonb_typeof(p_attribution)<>'object' or octet_length(p_attribution::text)>10000 or p_context is null or jsonb_typeof(p_context)<>'object' or octet_length(p_context::text)>2000 then raise exception 'invalid_attachment_submission';end if;
 if p_context<>'{}'::jsonb and ((select count(*) from jsonb_object_keys(p_context))<>1 or not(p_context ? 'career' or p_context ? 'expedition')) then raise exception 'invalid_attachment_context';end if;
 perform 1 from cms.websites where id=p_site for update;
 select * into s from cms.enquiry_file_sessions where website_id=p_site and id=p_session for update;
 if not found or s.form_id is distinct from p_form or s.form_revision_id is distinct from p_revision or s.request_key is distinct from p_request or s.token_hash is distinct from p_token_hash then raise exception 'upload_session_unavailable';end if;
 select * into a from cms.enquiry_attachment_submissions where website_id=p_site and request_key=p_request;
 if found then
  if a.session_id<>p_session or a.form_id<>p_form or a.form_revision_id<>p_revision or a.answers<>p_answers or a.consents<>p_consents or a.attribution<>p_attribution or a.context<>p_context then raise exception 'idempotency_key_reused';end if;
  if a.lead_id is null or s.state<>'consumed' then raise exception 'attachment_submission_unconfirmed';end if;
  return (select jsonb_build_object('leadId',l.id,'receivedAt',l.created_at,'replayed',true) from cms.leads l where l.website_id=p_site and l.id=a.lead_id);
 end if;
 s:=cms.lock_active_enquiry_file_session(p_site,p_session);
 select payload into definition from cms.revisions where website_id=p_site and record_id=p_form and id=p_revision;
 for f in select entry from jsonb_array_elements(definition->'fields') as fields(entry) where entry->>'type'='file' loop
  answer_value:=p_answers->(f->>'id');
  if answer_value is null or answer_value='null'::jsonb or answer_value='""'::jsonb then continue;end if;
  if jsonb_typeof(answer_value)<>'string' then raise exception 'invalid_attachment_selection';end if;
  selected:=selected||jsonb_build_array(jsonb_build_object('fieldId',f->>'id','uploadId',p_answers->>(f->>'id')));
 end loop;
 evidence:=cms.get_enquiry_file_evidence(p_site,p_form,p_revision,p_request,p_session,p_token_hash,selected);
 if jsonb_array_length(evidence)<>jsonb_array_length(selected) then raise exception 'attachment_not_ready';end if;
 insert into cms.enquiry_attachment_submissions(website_id,request_key,session_id,form_id,form_revision_id,answers,consents,attribution,context,files)
 values(p_site,p_request,p_session,p_form,p_revision,p_answers,p_consents,p_attribution,p_context,evidence);
 if p_context ? 'career' then receipt:=cms.accept_career_enquiry(p_site,p_form,p_revision,p_request,p_answers,p_consents,p_attribution->>'sourcePath',p_context->'career');
 elsif p_context ? 'expedition' then receipt:=cms.accept_expedition_enquiry(p_site,p_form,p_revision,p_request,p_answers,p_consents,p_attribution->>'sourcePath',p_context->'expedition');
 else receipt:=cms.accept_enquiry(p_site,p_form,p_revision,p_request,p_answers,p_consents,p_attribution);end if;
 lead:=(receipt->>'leadId')::uuid;
 if lead is null then raise exception 'attachment_submission_unconfirmed';end if;
 insert into cms.lead_attachments(website_id,lead_id,field_id,upload_id,snapshot)
 select p_site,lead,u.field_id,u.id,jsonb_build_object('filename',u.filename,'originalMime',u.mime,'originalBytes',u.bytes,'storageKey',p_site::text||'/enquiries/'||p_request::text||'/'||u.id::text||'/delivery.'||case when u.mime='application/pdf' then 'pdf' else 'webp' end,'inspection',u.result)
 from cms.enquiry_files u join jsonb_array_elements(evidence) e on u.id=(e->>'uploadId')::uuid where u.website_id=p_site and u.session_id=p_session;
 update cms.enquiry_attachment_submissions set lead_id=lead where website_id=p_site and request_key=p_request;
 update cms.enquiry_file_sessions set state='consumed' where id=p_session;
 return receipt;
end $$;
revoke all on function cms.accept_enquiry_attachments(uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function cms.accept_enquiry_attachments(uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb) to service_role;
commit;
