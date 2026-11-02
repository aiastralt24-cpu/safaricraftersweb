begin;
-- Service-only credentials. Public callers must pass abuse/challenge checks in
-- the server before creation; a submission UUID is never an access credential.
create table cms.enquiry_file_sessions (
 id uuid primary key,
 website_id uuid not null references cms.websites(id),
 form_id uuid not null,form_revision_id uuid not null,request_key uuid not null,
 token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'),
 state text not null default 'active' check(state in ('active','cancelled','consumed')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 minutes',
 unique(website_id,request_key),unique(website_id,id),
 foreign key(website_id,form_id,form_revision_id) references cms.revisions(website_id,record_id,id),
 check(expires_at>created_at and expires_at<=created_at+interval '30 minutes')
);
alter table cms.enquiry_file_sessions enable row level security;
revoke all on cms.enquiry_file_sessions from public,anon,authenticated,service_role;

create function cms.enquiry_file_session_response(s cms.enquiry_file_sessions)
returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',s.id,'site',s.website_id,'form',s.form_id,'revision',s.form_revision_id,'request',s.request_key,'state',s.state,'createdAt',s.created_at,'expiresAt',s.expires_at);
$$;
revoke all on function cms.enquiry_file_session_response(cms.enquiry_file_sessions) from public,anon,authenticated,service_role;

create function cms.create_enquiry_file_session(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_session uuid,p_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s cms.enquiry_file_sessions;
begin
 if p_site is null or p_form is null or p_revision is null or p_request is null or p_session is null or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_upload_session';end if;
 -- Same lock order as intake, so completed submissions cannot gain new sessions.
 perform 1 from cms.websites where id=p_site for update;
 if not found then raise exception 'form_unavailable';end if;
 select * into s from cms.enquiry_file_sessions where website_id=p_site and request_key=p_request for update;
 if found then
  if s.id<>p_session or s.form_id<>p_form or s.form_revision_id<>p_revision or s.token_hash<>p_token_hash then raise exception 'upload_session_conflict';end if;
  -- Exact retry never rotates the secret or extends expiry, including terminal states.
  return cms.enquiry_file_session_response(s);
 end if;
 if exists(select 1 from cms.leads where website_id=p_site and request_key=p_request) then raise exception 'submission_already_received';end if;
 perform 1 from cms.records where website_id=p_site and id=p_form and content_type='form' and published_revision_id=p_revision for share;
 if not found or cms.get_enquiry_input(p_site,p_form,p_revision,p_request) is null then raise exception 'form_unavailable';end if;
 if not exists(select 1 from cms.revisions v cross join lateral jsonb_array_elements(v.payload->'fields') f where v.website_id=p_site and v.record_id=p_form and v.id=p_revision and f->>'type'='file') then raise exception 'form_has_no_uploads';end if;
 insert into cms.enquiry_file_sessions(id,website_id,form_id,form_revision_id,request_key,token_hash)
 values(p_session,p_site,p_form,p_revision,p_request,p_token_hash) returning * into s;
 return cms.enquiry_file_session_response(s);
end $$;

-- Recovery/status read only: terminal/expired records remain observable by the
-- original credential. This result does not authorize an upload. Mutations must
-- lock this row and recheck active state, expiry and current form eligibility.
create function cms.get_enquiry_file_session(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_session uuid,p_token_hash text)
returns jsonb language sql stable security definer set search_path='' as $$
 select cms.enquiry_file_session_response(s) from cms.enquiry_file_sessions s
 where s.website_id=p_site and s.form_id=p_form and s.form_revision_id=p_revision and s.request_key=p_request and s.id=p_session and s.token_hash=p_token_hash;
$$;

create function cms.cancel_enquiry_file_session(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_session uuid,p_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s cms.enquiry_file_sessions;
begin
 perform 1 from cms.websites where id=p_site for update;
 select * into s from cms.enquiry_file_sessions where website_id=p_site and form_id=p_form and form_revision_id=p_revision and request_key=p_request and id=p_session and token_hash=p_token_hash for update;
 if not found then raise exception 'upload_session_unavailable';end if;
 if s.state='consumed' or exists(select 1 from cms.leads where website_id=p_site and request_key=p_request) then raise exception 'submission_already_received';end if;
 update cms.enquiry_file_sessions set state='cancelled' where id=s.id returning * into s;
 return cms.enquiry_file_session_response(s);
end $$;
revoke all on function cms.create_enquiry_file_session(uuid,uuid,uuid,uuid,uuid,text),cms.get_enquiry_file_session(uuid,uuid,uuid,uuid,uuid,text),cms.cancel_enquiry_file_session(uuid,uuid,uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function cms.create_enquiry_file_session(uuid,uuid,uuid,uuid,uuid,text),cms.get_enquiry_file_session(uuid,uuid,uuid,uuid,uuid,text),cms.cancel_enquiry_file_session(uuid,uuid,uuid,uuid,uuid,text) to service_role;
commit;
