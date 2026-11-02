begin;
-- Shared resolver for draft validation and published navigation. Not directly callable by editors or anonymous clients.
create function cms.navigation_reference_evidence(p_site uuid,p_payload jsonb,p_locale text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare refs jsonb:='[]'; ref_id uuid; related cms.records; available boolean; target_title text;
begin
 if p_locale is distinct from 'en' or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>1000000 then return null; end if;
 if exists(select 1 from jsonb_path_query(p_payload,'$.**.recordId') v where jsonb_typeof(v)<>'string' or (v #>> '{}') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$') then return null; end if;
 for ref_id in select distinct (v #>> '{}')::uuid from jsonb_path_query(p_payload,'$.**.recordId') v order by 1 loop
  select * into related from cms.records where website_id=p_site and id=ref_id and locale=p_locale and published_revision_id is not null;
  available:=false;
  if found then
   case related.content_type
    when 'journey' then available:=cms.get_public_page(p_site,related.path,p_locale) is not null;
    when 'destination' then available:=cms.get_public_destination(p_site,related.path,p_locale) is not null;
    when 'journalArticle' then available:=cms.get_public_journal_article(p_site,related.path,p_locale) is not null;
    else available:=false;
   end case;
  end if;
  target_title:=null;
  if available then
   select v.payload->>'title' into target_title from cms.revisions v where v.website_id=p_site and v.record_id=related.id and v.id=related.published_revision_id and jsonb_typeof(v.payload->'title')='string';
   if target_title is null or length(trim(target_title)) not between 1 and 200 then available:=false; end if;
  end if;
  refs:=refs||jsonb_build_array(case when available then jsonb_build_object('recordId',ref_id,'available',true,'type',related.content_type,'title',target_title,'path',related.path,'locale',related.locale) else jsonb_build_object('recordId',ref_id,'available',false) end);
 end loop;
 return refs;
end $$;
revoke all on function cms.navigation_reference_evidence(uuid,jsonb,text) from public;
create or replace function cms.get_public_navigation(p_site uuid,p_record uuid,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; safe jsonb; items jsonb:='[]'; node jsonb; target jsonb; visibility jsonb; featured jsonb; field text; refs jsonb:='[]'; ref_id uuid; related cms.records; available boolean; target_title text;
begin
 if p_locale is distinct from 'en' then return null; end if;
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='navigation' and locale=p_locale and published_revision_id is not null;
 if not found then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 safe:=cms.journal_public_scalars(payload,array['schemaVersion','title']);
 if safe is null or jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items')>200 then return null; end if;
 for node in select value from jsonb_array_elements(payload->'items') loop
  -- parentId is the only nullable scalar in the navigation item contract.
  if jsonb_typeof(node)<>'object' or not node ? 'parentId' or jsonb_typeof(node->'parentId') not in ('string','null') then return null; end if;
  target:=cms.journal_public_scalars(node->'target',case node->'target'->>'kind'
   when 'group' then array['kind'] when 'url' then array['kind','href','newWindow'] when 'record' then array['kind','recordId','contentType','newWindow'] else array[]::text[] end);
  visibility:=cms.journal_public_scalars(node->'visibility',array['visible','from','until']);
  if target is null or visibility is null then return null; end if;
  foreach field in array array['locales','regions'] loop
   if node->'visibility' ? field then
    if jsonb_typeof(node->'visibility'->field)<>'array' then return null; end if;
    if jsonb_array_length(node->'visibility'->field)>100 or exists(select 1 from jsonb_array_elements(node->'visibility'->field) v where jsonb_typeof(v)<>'string') then return null; end if;
    visibility:=visibility||jsonb_build_object(field,node->'visibility'->field);
   end if;
  end loop;
  featured:='[]';
  if node ? 'featuredContent' then
   if jsonb_typeof(node->'featuredContent')<>'array' then return null; end if;
   if jsonb_array_length(node->'featuredContent')>6 then return null; end if;
   select coalesce(jsonb_agg(cms.journal_public_scalars(v,array['recordId'])),'[]') into featured from jsonb_array_elements(node->'featuredContent') v;
  end if;
  node:=cms.journal_public_scalars(node,array['id','label','description','presentation'])||jsonb_build_object('parentId',node->'parentId','target',target,'visibility',visibility,'featuredContent',featured);
  if node is null then return null; end if;
  items:=items||jsonb_build_array(node);
 end loop;
 safe:=safe||jsonb_build_object('items',items);
 refs:=cms.navigation_reference_evidence(p_site,safe,p_locale);
 if refs is null then return null; end if;
 return jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',rec.published_revision_id,'locale',rec.locale,'payload',safe,'references',refs);
end $$;

create function cms.get_navigation_reference_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='navigation';
 if not found then return null; end if;
 if current_setting('role',true)<>'service_role' and not cms.can(p_site,'view','navigation',rec.id) then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=p_revision;
 if not found then return null; end if;
 return cms.navigation_reference_evidence(p_site,payload,rec.locale);
end $$;
revoke all on function cms.get_navigation_reference_status(uuid,uuid,uuid) from public;
grant execute on function cms.get_navigation_reference_status(uuid,uuid,uuid) to authenticated,service_role;
commit;
