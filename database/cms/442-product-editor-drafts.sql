begin;
-- Legacy product placeholders remain untouched. Adoption needs a compatible route and no live publication.
do $$ begin
 if exists(select 1 from cms.records r join cms.revisions v on v.record_id=r.id and v.id=r.current_revision_id where r.content_type='product' and v.payload->>'schemaVersion'='1' and (r.path is null or r.path !~ '^/products/[a-z0-9]+(-[a-z0-9]+)*$' or r.published_revision_id is not null)) then raise exception 'product_existing_records_need_review';end if;
end $$;
alter table cms.records drop constraint records_content_type_check;
alter table cms.records add constraint records_content_type_check check(content_type in ('page','homepage','destination','journey','photoExpedition','journalArticle','specialist','testimonial','navigation','settings','sharedSection','document','form','product','project','faq','news','event','leadership','application','location','career','certification','partner','productCategory'));
create function cms.enforce_product_editor_revision()
returns trigger language plpgsql security definer set search_path='' as $$
declare rec cms.records; managed boolean;
begin
 select * into rec from cms.records where id=new.record_id and website_id=new.website_id;
 managed:=rec.content_type='productCategory' or (rec.content_type='product' and (new.payload->>'schemaVersion'='1' or exists(select 1 from cms.revisions v where v.record_id=rec.id and v.payload->>'schemaVersion'='1')));
 if managed then
  if rec.published_revision_id is not null then raise exception 'product_editor_adoption_requires_withdrawal';end if;
  if new.payload->>'schemaVersion' is distinct from '1' or jsonb_typeof(new.payload->'slug') is distinct from 'string' or new.payload->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(new.payload->>'slug')>100 or rec.path is distinct from (case when rec.content_type='product' then '/products/' else '/product-categories/' end)||(new.payload->>'slug') then raise exception 'product_editor_identity_invalid';end if;
 end if;
 return new;
end $$;
revoke all on function cms.enforce_product_editor_revision() from public;
create trigger cms_product_editor_revision before insert on cms.revisions for each row execute function cms.enforce_product_editor_revision();
create function cms.enforce_product_editor_publication()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.published_revision_id is not null and (new.content_type='productCategory' or (new.content_type='product' and exists(select 1 from cms.revisions v where v.record_id=new.id and v.payload->>'schemaVersion'='1'))) then raise exception 'product_public_delivery_not_ready';end if;
 return new;
end $$;
revoke all on function cms.enforce_product_editor_publication() from public;
create trigger cms_product_editor_publication before insert or update of published_revision_id on cms.records for each row execute function cms.enforce_product_editor_publication();
create function cms.search_product_library(p_site uuid,p_type text,p_search text default '',p_status text default '',p_owned boolean default false,p_after uuid default null,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare matches jsonb;
begin
 if p_type is null or p_type not in ('product','productCategory') or p_site is null or p_search is null or length(p_search)>120 or p_status is null or p_status not in ('','draft','in_review','changes_requested','approved') or p_owned is null or p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_product_search';end if;
 if p_after is not null and not exists(select 1 from cms.records r join cms.revisions v on v.id=r.current_revision_id where r.website_id=p_site and r.id=p_after and r.content_type=p_type and v.payload->>'schemaVersion'='1' and cms.can(p_site,'view',p_type,r.id)) then raise exception 'invalid_product_cursor';end if;
 select coalesce(jsonb_agg(item order by id),'[]') into matches from (
 select r.id,jsonb_build_object('id',r.id,'type',r.content_type,'title',r.internal_title,'path',r.path,'locale',r.locale,'currentRevision',r.current_revision_id,'reviewStatus',r.review_status,'publishedRevision',r.published_revision_id,'ownerId',r.owner_id) item
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.content_type=p_type and v.payload->>'schemaVersion'='1' and cms.can(p_site,'view',p_type,r.id)
 and (p_after is null or r.id>p_after) and (p_status='' or r.review_status=p_status) and (not p_owned or r.owner_id=auth.uid())
 and (btrim(p_search)='' or position(lower(btrim(p_search)) in lower(concat_ws(' ',r.internal_title,v.payload->>'code',v.payload->>'brand',v.payload->>'summary')))>0)
 order by r.id limit p_limit+1) page;
 return jsonb_build_object('records',(select coalesce(jsonb_agg(value order by n),'[]') from jsonb_array_elements(matches) with ordinality x(value,n) where n<=p_limit),'next',case when jsonb_array_length(matches)>p_limit then matches->(p_limit-1)->>'id' else null end);
end $$;
revoke all on function cms.search_product_library(uuid,text,text,text,boolean,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function cms.search_product_library(uuid,text,text,text,boolean,uuid,integer) to authenticated;
create or replace function cms.cancel_draft_creation(p_site uuid,p_request uuid,p_type text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); receipt cms.draft_creation_receipts; rec cms.records;
begin
 if actor is null then raise exception 'unauthenticated' using errcode='42501'; end if;
 if p_site is null or p_request is null or p_type is null or p_type not in ('page','homepage','destination','journey','photoExpedition','journalArticle','specialist','testimonial','navigation','settings','sharedSection','document','form','product','project','faq','news','event','leadership','application','location','career','certification','partner','productCategory') then raise exception 'invalid_create_request'; end if;
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
create or replace function cms.restore_draft(p_site uuid,p_record uuid,p_revision uuid,p_expected uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec cms.records; old_payload jsonb; restored_title text;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found or not cms.can(p_site,'edit',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 select payload into old_payload from cms.revisions where website_id=p_site and record_id=p_record and id=p_revision;
 if not found then raise exception 'revision_not_found'; end if;
 restored_title:=rec.internal_title;
 if rec.content_type='photoExpedition' and jsonb_typeof(old_payload->'title')='string' and length(btrim(old_payload->>'title')) between 1 and 200 then restored_title:=old_payload->>'title'; end if;
 if rec.content_type='specialist' and jsonb_typeof(old_payload->'name')='string' and length(btrim(old_payload->>'name')) between 1 and 200 then restored_title:=old_payload->>'name'; end if;
 if rec.content_type='document' and jsonb_typeof(old_payload->'title')='string' and length(old_payload->>'title') between 1 and 200 and length(btrim(old_payload->>'title'))>0 then restored_title:=old_payload->>'title'; end if;
 if rec.content_type='faq' and jsonb_typeof(old_payload->'question')='string' and length(btrim(old_payload->>'question')) between 1 and 200 then restored_title:=btrim(old_payload->>'question'); end if;
 if rec.content_type in ('news','event','leadership','application','location','career','certification','partner','product','productCategory') and jsonb_typeof(old_payload->'title')='string' and length(btrim(old_payload->>'title')) between 1 and 200 then restored_title:=btrim(old_payload->>'title');end if;
 return cms.save_draft(p_site,p_record,p_expected,rec.content_type,rec.path,restored_title,old_payload,rec.locale);
end $$;

commit;
