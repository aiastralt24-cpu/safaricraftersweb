begin;
-- HTTP retains responsibility for origin, rate, challenge and answer validation.
-- Career form publication remains fenced until its reader and client are connected.
create function cms.accept_career_enquiry(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_answers jsonb,p_consents jsonb,p_source_path text,p_selection jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare existing cms.leads;rec cms.records;page jsonb;payload jsonb;context jsonb;attribution jsonb;target uuid;expected uuid;accepted_at timestamptz;
begin
 if p_selection is null or jsonb_typeof(p_selection)<>'object' or octet_length(p_selection::text)>1000
 or (select count(*) from jsonb_object_keys(p_selection))<>3 or not p_selection ?& array['recordId','revisionId','slug']
 or coalesce(p_selection->>'recordId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
 or coalesce(p_selection->>'revisionId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
 or coalesce(p_selection->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_selection->>'slug')>100 then raise exception 'invalid_career_selection';end if;
 if p_source_path is distinct from '/careers/'||(p_selection->>'slug') then raise exception 'career_source_mismatch';end if;
 target:=(p_selection->>'recordId')::uuid;expected:=(p_selection->>'revisionId')::uuid;
 perform 1 from cms.websites where id=p_site for update;if not found then raise exception 'career_unavailable';end if;
 select * into existing from cms.leads where website_id=p_site and request_key=p_request;
 if found then
  if existing.attribution->'careerSelection' is distinct from p_selection or existing.attribution->>'sourcePath' is distinct from p_source_path then raise exception 'idempotency_key_reused';end if;
  -- A retry recovers the immutable receipt even after the job closes or is withdrawn.
  return cms.accept_enquiry(p_site,p_form,p_revision,p_request,p_answers,p_consents,existing.attribution);
 end if;
 perform 1 from cms.records where website_id=p_site and id in(target,p_form) order by id for share;
 select * into rec from cms.records where website_id=p_site and id=target and content_type='career' and locale='en' and path=p_source_path and published_revision_id=expected;
 if not found then raise exception 'career_unavailable';end if;
 page:=cms.get_public_career(p_site,rec.path,'en');payload:=page->'payload';
 if page is null or payload#>>'{application,mode}' is distinct from 'form'
 or page#>>'{applicationForm,formId}' is distinct from p_form::text or page#>>'{applicationForm,revisionId}' is distinct from p_revision::text then raise exception 'career_form_unavailable';end if;
 accepted_at:=clock_timestamp();
 if payload->>'status' is distinct from 'open' or payload->>'opensAt' is null or payload->>'closesAt' is null
 or (payload->>'opensAt'<>'' and accepted_at<(payload->>'opensAt')::timestamptz)
 or (payload->>'closesAt'<>'' and accepted_at>=(payload->>'closesAt')::timestamptz) then raise exception 'career_applications_closed';end if;
 context:=jsonb_build_object('recordId',rec.id,'revisionId',expected,'path',rec.path,'title',payload->'title','organization',payload->'organization','referenceCode',payload->'referenceCode','formId',p_form,'formRevisionId',p_revision,'acceptedAt',accepted_at);
 attribution:=jsonb_build_object('careerSelection',p_selection,'career',context,'sourcePath',p_source_path);
 return cms.accept_enquiry(p_site,p_form,p_revision,p_request,p_answers,p_consents,attribution);
end $$;
revoke all on function cms.accept_career_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function cms.accept_career_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,text,jsonb) to service_role;
commit;
