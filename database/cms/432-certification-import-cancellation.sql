begin;
create table cms.certification_import_cancellations (
 website_id uuid not null references cms.websites(id),actor_id uuid not null references auth.users(id),request_key uuid not null,
 source_digest text not null check(source_digest ~ '^[a-f0-9]{64}$'),review_digest text not null check(review_digest ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),primary key(website_id,actor_id,request_key)
);
alter table cms.certification_import_cancellations enable row level security;
create policy own_certification_import_cancellation on cms.certification_import_cancellations for select to authenticated using(actor_id=auth.uid() and exists(select 1 from cms.memberships m where m.website_id=certification_import_cancellations.website_id and m.user_id=auth.uid() and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())));
grant select on cms.certification_import_cancellations to authenticated;
alter function cms.apply_certification_import(uuid,uuid,text,text,jsonb,jsonb) rename to apply_certification_import_before_cancellation;
revoke all on function cms.apply_certification_import_before_cancellation(uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated,service_role;
create function cms.apply_certification_import(p_site uuid,p_request uuid,p_source text,p_review text,p_items jsonb,p_evidence jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_site is null or p_request is null then raise exception 'forbidden' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('certification-import:'||p_site::text||':'||auth.uid()::text||':'||p_request::text,0));
 if exists(select 1 from cms.certification_import_cancellations where website_id=p_site and actor_id=auth.uid() and request_key=p_request) then raise exception 'certification_import_cancelled' using errcode='40001';end if;
 return cms.apply_certification_import_before_cancellation(p_site,p_request,p_source,p_review,p_items,p_evidence);
end $$;
revoke all on function cms.apply_certification_import(uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function cms.apply_certification_import(uuid,uuid,text,text,jsonb,jsonb) to authenticated;
create or replace function cms.get_certification_import_receipt(p_site uuid,p_request uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(
 (select jsonb_build_object('requestKey',request_key,'sourceDigest',source_digest,'reviewDigest',review_digest,'result',result) from cms.certification_import_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request and result is not null),
 (select jsonb_build_object('status','cancelled','requestKey',request_key,'sourceDigest',source_digest,'reviewDigest',review_digest) from cms.certification_import_cancellations where website_id=p_site and actor_id=auth.uid() and request_key=p_request));
$$;
create function cms.cancel_certification_import(p_site uuid,p_request uuid,p_source text,p_review text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare batch cms.certification_import_batches; cancelled cms.certification_import_cancellations;
begin
 if auth.uid() is null or not exists(select 1 from cms.memberships m where m.website_id=p_site and m.user_id=auth.uid() and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())) then raise exception 'forbidden' using errcode='42501';end if;
 if p_request is null or p_source is null or p_source !~ '^[a-f0-9]{64}$' or p_review is null or p_review !~ '^[a-f0-9]{64}$' then raise exception 'invalid_import_identity';end if;
 perform pg_advisory_xact_lock(hashtextextended('certification-import:'||p_site::text||':'||auth.uid()::text||':'||p_request::text,0));
 select * into batch from cms.certification_import_batches where website_id=p_site and actor_id=auth.uid() and request_key=p_request;
 if found then
  if batch.source_digest<>p_source or batch.review_digest<>p_review then raise exception 'idempotency_key_reused';end if;
  if batch.result is null then raise exception 'import_outcome_unconfirmed';end if;
  return jsonb_build_object('requestKey',batch.request_key,'sourceDigest',batch.source_digest,'reviewDigest',batch.review_digest,'result',batch.result);
 end if;
 select * into cancelled from cms.certification_import_cancellations where website_id=p_site and actor_id=auth.uid() and request_key=p_request;
 if found then
  if cancelled.source_digest<>p_source or cancelled.review_digest<>p_review then raise exception 'idempotency_key_reused';end if;
 else
  insert into cms.certification_import_cancellations(website_id,actor_id,request_key,source_digest,review_digest) values(p_site,auth.uid(),p_request,p_source,p_review);
  insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'certification_import.cancelled',jsonb_build_object('requestKey',p_request));
 end if;
 return jsonb_build_object('status','cancelled','requestKey',p_request,'sourceDigest',p_source,'reviewDigest',p_review);
end $$;
revoke all on function cms.cancel_certification_import(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function cms.cancel_certification_import(uuid,uuid,text,text) to authenticated;
commit;
