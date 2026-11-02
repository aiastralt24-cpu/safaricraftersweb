begin;
-- The receipt and first revision commit together. Retrying the exact request
-- returns the historical result without creating another record or revision.
create table cms.draft_creation_receipts (
 website_id uuid not null references cms.websites(id),
 request_id uuid not null,
 actor_id uuid not null references auth.users(id),
 input jsonb not null,
 result jsonb,
 created_at timestamptz not null default now(),
 primary key(website_id,request_id)
);
alter table cms.draft_creation_receipts enable row level security;
revoke all on cms.draft_creation_receipts from public,anon,authenticated;

create function cms.create_draft_once(p_site uuid,p_request uuid,p_type text,p_path text,p_title text,p_payload jsonb,p_locale text default 'en')
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); receipt cms.draft_creation_receipts; request_input jsonb; saved jsonb; rec cms.records;
begin
 if actor is null then raise exception 'unauthenticated' using errcode='42501'; end if;
 if p_site is null or p_request is null or p_type is null or p_title is null or p_locale is null
  or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>1100000 then raise exception 'invalid_create_request'; end if;
 if cms.can(p_site,'create',p_type) is not true then raise exception 'forbidden' using errcode='42501'; end if;
 request_input:=jsonb_build_object('type',p_type,'path',p_path,'title',p_title,'locale',p_locale,'payload',p_payload);
 insert into cms.draft_creation_receipts(website_id,request_id,actor_id,input)
 values(p_site,p_request,actor,request_input) on conflict(website_id,request_id) do nothing;
 select * into receipt from cms.draft_creation_receipts where website_id=p_site and request_id=p_request for update;
 if receipt.actor_id is distinct from actor then raise exception 'forbidden' using errcode='42501'; end if;
 if receipt.input is distinct from request_input then raise exception 'create_request_reused' using errcode='40001'; end if;
 if receipt.result is not null then
  select * into rec from cms.records where website_id=p_site and id=(receipt.result->>'recordId')::uuid;
  if not found or cms.can(p_site,'edit',rec.content_type,rec.id) is not true then raise exception 'forbidden' using errcode='42501'; end if;
  return receipt.result;
 end if;
 saved:=cms.save_draft(p_site,null,null,p_type,p_path,p_title,p_payload,p_locale);
 update cms.draft_creation_receipts set result=saved where website_id=p_site and request_id=p_request;
 return saved;
end $$;
revoke all on function cms.create_draft_once(uuid,uuid,text,text,text,jsonb,text) from public,anon;
grant execute on function cms.create_draft_once(uuid,uuid,text,text,text,jsonb,text) to authenticated;
commit;
