begin;
alter table cms.records drop constraint records_content_type_check;
alter table cms.records add constraint records_content_type_check check(content_type in ('page','homepage','destination','journey','photoExpedition','journalArticle','specialist','testimonial','navigation','settings','sharedSection','document','form','product','project','faq'));
create function cms.enforce_faq_draft_identity()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.content_type='faq' then
  if new.path is not null then raise exception 'faq_has_no_standalone_route';end if;
  if new.published_revision_id is not null then raise exception 'faq_public_delivery_not_ready';end if;
 end if;
 return new;
end $$;
revoke all on function cms.enforce_faq_draft_identity() from public;
create trigger cms_faq_draft_identity before insert or update of content_type,path,published_revision_id on cms.records for each row execute function cms.enforce_faq_draft_identity();
create or replace function cms.cancel_draft_creation(p_site uuid,p_request uuid,p_type text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); receipt cms.draft_creation_receipts; rec cms.records;
begin
 if actor is null then raise exception 'unauthenticated' using errcode='42501'; end if;
 if p_site is null or p_request is null or p_type is null or p_type not in ('page','homepage','destination','journey','photoExpedition','journalArticle','specialist','testimonial','navigation','settings','sharedSection','document','form','product','project','faq') then raise exception 'invalid_create_request'; end if;
 if cms.can(p_site,'create',p_type) is not true then raise exception 'forbidden' using errcode='42501'; end if;
 -- Insertion and the row lock serialize cancellation with an in-flight create.
 insert into cms.draft_creation_receipts(website_id,request_id,actor_id,input,cancelled_at)
 values(p_site,p_request,actor,jsonb_build_object('type',p_type),now()) on conflict(website_id,request_id) do nothing;
 select * into receipt from cms.draft_creation_receipts where website_id=p_site and request_id=p_request for update;
 if receipt.actor_id is distinct from actor or receipt.input->>'type' is distinct from p_type then raise exception 'forbidden' using errcode='42501'; end if;
 if receipt.result is not null then
  select * into rec from cms.records where website_id=p_site and id=(receipt.result->>'recordId')::uuid;
  if not found or cms.can(p_site,'edit',rec.content_type,rec.id) is not true then raise exception 'forbidden' using errcode='42501'; end if;
  return jsonb_build_object('status','created','result',receipt.result);
 end if;
 update cms.draft_creation_receipts set cancelled_at=coalesce(cancelled_at,now()) where website_id=p_site and request_id=p_request;
 return jsonb_build_object('status','cancelled');
end $$;
revoke all on function cms.cancel_draft_creation(uuid,uuid,text) from public,anon;
grant execute on function cms.cancel_draft_creation(uuid,uuid,text) to authenticated;
create function cms.search_faq_library(p_site uuid,p_search text default '',p_status text default '',p_owned boolean default false,p_publication text default '',p_after uuid default null,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare matches jsonb;
begin
 if p_site is null or p_search is null or length(p_search)>120 or p_status is null or p_status not in('','draft','in_review','changes_requested','approved') or p_owned is null or p_publication is null or p_publication not in('','published','unpublished') or p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_faq_search';end if;
 if p_after is not null and not exists(select 1 from cms.records r where r.website_id=p_site and r.id=p_after and r.content_type='faq' and cms.can(p_site,'view','faq',r.id)) then raise exception 'invalid_faq_cursor';end if;
 select coalesce(jsonb_agg(item order by id),'[]') into matches from(
  select r.id,jsonb_build_object('id',r.id,'type',r.content_type,'title',r.internal_title,'path',r.path,'locale',r.locale,'currentRevision',r.current_revision_id,'reviewStatus',r.review_status,'publishedRevision',r.published_revision_id,'ownerId',r.owner_id) item
  from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
  where r.website_id=p_site and r.content_type='faq' and cms.can(p_site,'view','faq',r.id)
  and (p_after is null or r.id>p_after) and (p_status='' or r.review_status=p_status) and (not p_owned or r.owner_id=auth.uid())
  and (p_publication='' or (p_publication='published' and r.published_revision_id is not null) or (p_publication='unpublished' and r.published_revision_id is null))
  and (btrim(p_search)='' or position(lower(btrim(p_search)) in lower(concat_ws(' ',r.internal_title,v.payload->>'question',v.payload->>'topic',v.payload->>'keywords',v.payload->>'answer')))>0)
  order by r.id limit p_limit+1
 ) page;
 return jsonb_build_object('records',(select coalesce(jsonb_agg(value order by n),'[]') from jsonb_array_elements(matches) with ordinality x(value,n) where n<=p_limit),
 'next',case when jsonb_array_length(matches)>p_limit then matches->(p_limit-1)->>'id' else null end);
end $$;
revoke all on function cms.search_faq_library(uuid,text,text,boolean,text,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function cms.search_faq_library(uuid,text,text,boolean,text,uuid,integer) to authenticated;
commit;
