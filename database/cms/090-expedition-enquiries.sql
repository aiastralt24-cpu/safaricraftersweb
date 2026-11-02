begin;
-- Service-only orchestration: HTTP still must verify challenge, rate and form answers.
create function cms.accept_expedition_enquiry(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_answers jsonb,p_consents jsonb,p_source_path text,p_selection jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare existing cms.leads; rec cms.records; page jsonb; payload jsonb; departure jsonb; context jsonb; attribution jsonb; target uuid; expected uuid;
begin
 if p_selection is null or jsonb_typeof(p_selection)<>'object' or octet_length(p_selection::text)>1000
  or (select count(*) from jsonb_object_keys(p_selection))<>4
  or not p_selection ?& array['recordId','revisionId','slug','departureId']
  or coalesce(p_selection->>'recordId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
  or coalesce(p_selection->>'revisionId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
  or coalesce(p_selection->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_selection->>'slug')>100
  or (p_selection->'departureId'<>'null'::jsonb and (jsonb_typeof(p_selection->'departureId')<>'string' or p_selection->>'departureId' !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$')) then raise exception 'invalid_expedition_selection'; end if;
 if p_source_path is not null and (length(p_source_path)>500 or p_source_path !~ '^/[a-z0-9/-]*$' or position('//' in p_source_path)>0) then raise exception 'invalid_source_path'; end if;
 target:=(p_selection->>'recordId')::uuid;expected:=(p_selection->>'revisionId')::uuid;
 perform 1 from cms.websites where id=p_site for update;if not found then raise exception 'form_unavailable'; end if;
 select * into existing from cms.leads where website_id=p_site and request_key=p_request;
 if found then
  if existing.attribution->'expeditionSelection' is distinct from p_selection or existing.attribution->>'sourcePath' is distinct from p_source_path then raise exception 'idempotency_key_reused'; end if;
  -- Reuse immutable original context even if the page/form is withdrawn or dates pass.
  return cms.accept_enquiry(p_site,p_form,p_revision,p_request,p_answers,p_consents,existing.attribution);
 end if;
 -- Prevent either publication pointer changing between resolution and insertion.
 perform 1 from cms.records where website_id=p_site and id in (target,p_form) order by id for share;
 select * into rec from cms.records where website_id=p_site and id=target and content_type='photoExpedition' and locale='en' and path='/photo-expeditions/'||(p_selection->>'slug') and published_revision_id=expected;
 if not found then raise exception 'expedition_unavailable'; end if;
 page:=cms.get_public_expedition(p_site,rec.path,'en');
 if page is null or page->'references'->'form'->>'recordId' is distinct from p_form::text or page->'references'->'form'->>'publishedRevisionId' is distinct from p_revision::text then raise exception 'expedition_unavailable'; end if;
 payload:=page->'page'->'payload';departure:=null;
 if p_selection->'departureId'<>'null'::jsonb then
  if jsonb_typeof(payload->'departures') is distinct from 'array' then raise exception 'departure_unavailable'; end if;
  if (select count(*) from jsonb_array_elements(payload->'departures') v where v->>'id'=p_selection->>'departureId')<>1 then raise exception 'departure_unavailable'; end if;
  select value into departure from jsonb_array_elements(payload->'departures') where value->>'id'=p_selection->>'departureId';
  if coalesce(departure->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' or (departure->>'date')::date<(now() at time zone 'UTC')::date or coalesce(departure->>'status','') not in ('New','Filling fast','Full','Available') then raise exception 'departure_unavailable'; end if;
  departure:=jsonb_build_object('id',departure->'id','date',departure->'date','status',departure->'status','availability',departure->'availability')||case when departure ? 'endDate' then jsonb_build_object('endDate',departure->'endDate') else '{}'::jsonb end;
 end if;
 context:=jsonb_build_object('recordId',rec.id,'revisionId',expected,'path',rec.path,'title',payload->'title','programmeStatus',payload->'programmeStatus','price',payload->'price','formId',p_form,'formRevisionId',p_revision,'departure',departure);
 attribution:=jsonb_build_object('expeditionSelection',p_selection,'expedition',context)||case when p_source_path is not null then jsonb_build_object('sourcePath',p_source_path) else '{}'::jsonb end;
 return cms.accept_enquiry(p_site,p_form,p_revision,p_request,p_answers,p_consents,attribution);
end $$;
revoke all on function cms.accept_expedition_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,text,jsonb) from public;
grant execute on function cms.accept_expedition_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,text,jsonb) to service_role;
commit;
