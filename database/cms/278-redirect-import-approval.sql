begin;
alter table cms.redirect_import_requests drop constraint redirect_import_requests_status_check;
alter table cms.redirect_import_requests add constraint redirect_import_requests_status_check check(status in ('submitted','approved','rejected','cancelled'));
alter table cms.redirect_import_requests add column reviewed_by uuid references auth.users(id),add column reviewed_at timestamptz;
create function cms.redirect_import_evidence(p_site uuid,p_items jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare item jsonb; target cms.records; alias cms.page_redirects; state cms.page_redirect_states;
 items jsonb:='[]'; status text; reason text; stamp text; i integer:=0;
begin
 if not cms.can(p_site,'view','page') then raise exception 'forbidden' using errcode='42501'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'invalid_redirect_import'; end if;
 if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>100 then raise exception 'invalid_redirect_import'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x group by x->>'locale',x->>'sourcePath' having count(*)>1) then raise exception 'duplicate_redirect_source'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>5
   or not item ?& array['sourcePath','destinationPath','locale','enabled','recordId']
   or not coalesce(cms.is_custom_page_path(item->>'sourcePath'),false) or not coalesce(cms.is_custom_page_path(item->>'destinationPath'),false)
   or item->>'sourcePath'=item->>'destinationPath' or not coalesce(item->>'locale' ~ '^[a-z]{2,3}(-[A-Z]{2})?$',false)
   or jsonb_typeof(item->'enabled')<>'boolean' or jsonb_typeof(item->'recordId') not in ('null','string') then raise exception 'invalid_redirect_import'; end if;
  target:=null;alias:=null;state:=null;stamp:=null;status:='blocked';reason:='destination_unavailable';
  select * into target from cms.records where website_id=p_site and content_type='page' and locale=item->>'locale' and path=item->>'destinationPath';
  if target.id is not null and cms.can(p_site,'view','page',target.id) then
   if item->>'recordId' is not null and (item->>'recordId')::uuid<>target.id then reason:='identity_changed';
   elsif exists(select 1 from cms.records where website_id=p_site and locale=item->>'locale' and path=item->>'sourcePath') then reason:='source_unavailable';
   else
    select * into alias from cms.page_redirects where website_id=p_site and locale=item->>'locale' and source_path=item->>'sourcePath';
    if alias.record_id is not null and alias.record_id<>target.id then reason:='source_unavailable';
    else
     select * into state from cms.page_redirect_states where website_id=p_site and locale=item->>'locale' and source_path=item->>'sourcePath';
     reason:='eligible';status:=case when alias.record_id is null then 'new' when coalesce(state.enabled,true)=(item->>'enabled')::boolean then 'unchanged' else 'change_state' end;
     stamp:=md5(jsonb_build_object('input',item,'target',target.id,'revision',target.current_revision_id,'published',target.published_revision_id,'alias',alias.record_id,'version',coalesce(state.version,0),'enabled',coalesce(state.enabled,true))::text);
    end if;
   end if;
  end if;
  items:=items||jsonb_build_array(item||jsonb_build_object('index',i,'status',status,'reason',reason,'target',case when status<>'blocked' then target.id end,'published',case when status<>'blocked' then target.published_revision_id is not null end,'snapshot',stamp));i:=i+1;
 end loop;
 return jsonb_build_object('site',p_site,'items',items);
end $$;

revoke all on function cms.redirect_import_evidence(uuid,jsonb) from public,anon,authenticated;
create or replace function cms.review_redirect_import(p_site uuid,p_items jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not cms.can(p_site,'edit','page') then raise exception 'forbidden' using errcode='42501';end if;
 return cms.redirect_import_evidence(p_site,p_items);
end $$;
create function cms.get_redirect_import_proposal(p_site uuid,p_proposal uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r cms.redirect_import_requests; current_review jsonb;
begin
 if not cms.can(p_site,'view','page') or not cms.can(p_site,'approve','page') then raise exception 'forbidden' using errcode='42501';end if;
 select * into r from cms.redirect_import_requests where website_id=p_site and proposal_id=p_proposal;
 if not found then raise exception 'forbidden' using errcode='42501';end if;
 current_review:=cms.redirect_import_evidence(p_site,r.manifest->'items');
 return jsonb_build_object('site',p_site,'actor',r.actor_id,'requestKey',r.request_id,'proposalId',r.proposal_id,'status',r.status,'sourceDigest',r.source_digest,'review',r.review,
 'stale',current_review is distinct from r.review,'canDecide',r.status='submitted' and r.actor_id<>auth.uid(),'reviewedBy',r.reviewed_by);
end $$;
create function cms.list_redirect_import_proposals(p_site uuid,p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; cursor uuid;
begin
 if not cms.can(p_site,'view','page') or not cms.can(p_site,'approve','page') then raise exception 'forbidden' using errcode='42501';end if;
 select coalesce(jsonb_agg(x.item order by x.id),'[]'::jsonb) into items from (
 select proposal_id id,jsonb_build_object('proposalId',proposal_id,'status',status,'count',jsonb_array_length(review->'items')) item
 from cms.redirect_import_requests where website_id=p_site and proposal_id is not null and (p_after is null or proposal_id>p_after) order by proposal_id limit 21) x;
 if jsonb_array_length(items)>20 then cursor:=(items->19->>'proposalId')::uuid;items:=items-20;end if;
 return jsonb_build_object('site',p_site,'items',items,'nextCursor',cursor);
end $$;
create function cms.decide_redirect_import_proposal(p_site uuid,p_proposal uuid,p_decision text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r cms.redirect_import_requests; evidence jsonb;
begin
 if p_decision is null or p_decision not in ('approved','rejected') then raise exception 'invalid_redirect_decision';end if;
 perform 1 from cms.websites where id=p_site for update;
 if not cms.can(p_site,'view','page') or not cms.can(p_site,'approve','page') then raise exception 'forbidden' using errcode='42501';end if;
 select * into r from cms.redirect_import_requests where website_id=p_site and proposal_id=p_proposal for update;
 if not found or r.actor_id=auth.uid() then raise exception 'independent_review_required' using errcode='42501';end if;
 if r.status=p_decision and r.reviewed_by=auth.uid() then return cms.get_redirect_import_proposal(p_site,p_proposal);end if;
 if r.status<>'submitted' then raise exception 'redirect_proposal_already_decided';end if;
 evidence:=cms.redirect_import_evidence(p_site,r.manifest->'items');
 if p_decision='approved' and evidence is distinct from r.review then raise exception 'redirect_import_changed' using errcode='40001';end if;
 update cms.redirect_import_requests set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now() where website_id=p_site and proposal_id=p_proposal;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'redirect_import.'||p_decision,jsonb_build_object('proposalId',p_proposal));
 return cms.get_redirect_import_proposal(p_site,p_proposal);
end $$;
revoke all on function cms.get_redirect_import_proposal(uuid,uuid),cms.list_redirect_import_proposals(uuid,uuid),cms.decide_redirect_import_proposal(uuid,uuid,text) from public,anon;
grant execute on function cms.get_redirect_import_proposal(uuid,uuid),cms.list_redirect_import_proposals(uuid,uuid),cms.decide_redirect_import_proposal(uuid,uuid,text) to authenticated;
commit;
