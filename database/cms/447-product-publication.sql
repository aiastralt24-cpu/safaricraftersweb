begin;
create function cms.get_product_revision_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;payload jsonb;refs jsonb;media jsonb;links jsonb;categories jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='product';
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if not found then return null;end if;
 select coalesce(jsonb_agg(jsonb_build_object('recordId',pin->>'recordId','revisionId',pin->>'revisionId','available',v.id is not null,'published',cms.product_category_definition_eligible(p_site,r.id,v.id),'locale',r.locale,'payload',v.payload) order by ord),'[]') into categories
 from jsonb_array_elements(jsonb_build_array(payload->'category',payload->'subcategory')) with ordinality x(pin,ord)
 left join cms.records r on r.website_id=p_site and r.id=(pin->>'recordId')::uuid and r.content_type='productCategory'
 left join cms.revisions v on v.website_id=p_site and v.record_id=r.id and v.id=(pin->>'revisionId')::uuid
 where pin is not null and pin<>'null'::jsonb;
 select coalesce(jsonb_agg(jsonb_build_object('group',t.key,'type',t.kind,'recordId',ref->>'recordId','available',r.id is not null,'published',coalesce(case t.kind when 'certification' then cms.get_public_certification(p_site,r.path,r.locale) is not null when 'application' then cms.get_public_application(p_site,r.path,r.locale) is not null when 'project' then cms.get_public_project(p_site,r.path,r.locale) is not null when 'faq' then cms.get_public_faq(p_site,r.id,r.locale) is not null when 'document' then cms.get_document_download(p_site,r.id)->>'access'='public' when 'product' then r.published_revision_id is not null else false end,false),'locale',r.locale) order by t.key,ref->>'recordId'),'[]') into refs
 from (values('applications','application'),('documents','document'),('projects','project'),('certifications','certification'),('faqs','faq'),('relatedProducts','product'),('accessories','product'),('compatibleSystems','product'),('replacements','product')) t(key,kind)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(payload#>array['relationships',t.key])='array' then payload#>array['relationships',t.key] else '[]'::jsonb end) ref
 left join cms.records r on r.website_id=p_site and r.id=(ref->>'recordId')::uuid and r.content_type=t.kind and r.id<>p_record;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',id,'available',exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=x.id and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and length(btrim(m.rights_evidence))>0 and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()))) order by id),'[]') into media
 from (select distinct value#>>'{}' id from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string') x;
 select coalesce(jsonb_agg(jsonb_build_object('href',href,'available',cms.tanzania_link_path(href) is not null and position('#' in href)=0 and (cms.tanzania_link_path(href)=rec.path or exists(select 1 from cms.navigation_public_paths where path=cms.tanzania_link_path(href)) or cms.concept_link_available(p_site,cms.tanzania_link_path(href),rec.locale) or cms.get_public_product_category(p_site,cms.tanzania_link_path(href),rec.locale) is not null or exists(select 1 from cms.records linked where linked.website_id=p_site and linked.content_type='product' and linked.locale=rec.locale and linked.path=cms.tanzania_link_path(href) and linked.published_revision_id is not null))) order by href),'[]') into links
 from (select distinct value#>>'{}' href from jsonb_path_query(payload,'$.**.href') value where jsonb_typeof(value)='string' and (value#>>'{}' like '/%' or value#>>'{}' like '#%')) x;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'categories',categories,'references',refs,'media',media,'links',links,'commerce',jsonb_build_object('provider',payload#>>'{commerce,provider}','verified',payload#>>'{commerce,provider}'='none'));
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.get_product_revision_evidence(uuid,uuid,uuid) from public,anon,authenticated,service_role;
-- Iterate related-product graphs once per record, so cycles cannot recurse forever.
create function cms.product_revision_deliverable(p_site uuid,p_record uuid,p_revision uuid,p_require_published boolean default true)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare pending uuid[]:=array[p_record];seen uuid[]:='{}';target uuid;rec cms.records;revision uuid;body jsonb;e jsonb;ref jsonb;
begin
 while cardinality(pending)>0 loop
  target:=pending[1];pending:=pending[2:];if target=any(seen) then continue;end if;
  seen:=array_append(seen,target);if cardinality(seen)>1000 then return false;end if;
  select * into rec from cms.records where website_id=p_site and id=target and content_type='product' and locale='en';if not found then return false;end if;
  revision:=case when target=p_record then p_revision else rec.published_revision_id end;
  if revision is null or ((target<>p_record or p_require_published) and revision is distinct from rec.published_revision_id) then return false;end if;
  select v.payload into body from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=revision;
  if not found or body->>'schemaVersion' is distinct from '1' or rec.path is distinct from '/products/'||(body->>'slug') or body#>>'{commerce,provider}' is distinct from 'none' or jsonb_array_length(coalesce(body->'videos','[]'))<>0 then return false;end if;
  if not exists(select 1 from cms.validations v join cms.validation_policy p on p.content_type='product' and p.validator_version=v.validator_version where v.revision_id=revision and v.valid and v.validator_version='product-1') then return false;end if;
  e:=cms.get_product_revision_evidence(p_site,rec.id,revision);
  if e is null or jsonb_array_length(e->'categories') not between 1 and 2
   or exists(select 1 from jsonb_array_elements(e->'categories') c where c->>'available' is distinct from 'true' or c->>'published' is distinct from 'true' or c->>'locale' is distinct from rec.locale)
   or exists(select 1 from jsonb_array_elements(e->'media') m where m->>'available' is distinct from 'true')
   or exists(select 1 from jsonb_array_elements(e->'links') l where l->>'available' is distinct from 'true')
   or exists(select 1 from jsonb_array_elements(e->'references') r where r->>'available' is distinct from 'true' or r->>'published' is distinct from 'true' or r->>'locale' is distinct from rec.locale)
   then return false;end if;
  for ref in select jsonb_build_object('recordId',linked.id) from jsonb_array_elements(e->'links') l join cms.records linked on linked.website_id=p_site and linked.content_type='product' and linked.locale=rec.locale and linked.path=cms.tanzania_link_path(l->>'href') loop
   if not (ref->>'recordId')::uuid=any(seen) and not (ref->>'recordId')::uuid=any(pending) then pending:=array_append(pending,(ref->>'recordId')::uuid);end if;
  end loop;
  for ref in select value from jsonb_array_elements(e->'references') where value->>'type'='product' loop
   if not (ref->>'recordId')::uuid=any(seen) and not (ref->>'recordId')::uuid=any(pending) then pending:=array_append(pending,(ref->>'recordId')::uuid);end if;
  end loop;
 end loop;
 return true;
exception when invalid_text_representation or invalid_parameter_value then return false;
end $$;
revoke all on function cms.product_revision_deliverable(uuid,uuid,uuid,boolean) from public,anon,authenticated,service_role;
create or replace function cms.get_product_validation_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e jsonb;refs jsonb;links jsonb;
begin
 if not exists(select 1 from cms.records where website_id=p_site and id=p_record and content_type='product' and current_revision_id=p_revision) then return null;end if;
 e:=cms.get_product_revision_evidence(p_site,p_record,p_revision);if e is null then return null;end if;
 select coalesce(jsonb_agg(case when x.value->>'type'='product' then x.value||jsonb_build_object('published',coalesce(cms.product_revision_deliverable(p_site,r.id,r.published_revision_id),false)) else x.value end order by x.n),'[]') into refs
 from jsonb_array_elements(e->'references') with ordinality x(value,n) left join cms.records r on r.website_id=p_site and r.id=(x.value->>'recordId')::uuid;
 select coalesce(jsonb_agg(case when r.id is not null then x.value||jsonb_build_object('available',cms.product_revision_deliverable(p_site,r.id,r.published_revision_id)) else x.value end order by x.n),'[]') into links
 from jsonb_array_elements(e->'links') with ordinality x(value,n) left join cms.records r on r.website_id=p_site and r.content_type='product' and r.path=cms.tanzania_link_path(x.value->>'href') and r.id<>p_record and r.locale='en';
 return jsonb_set(jsonb_set(e,'{references}',refs),'{links}',links);
end $$;
create function cms.get_public_product(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;body jsonb;categories jsonb;cards jsonb:='[]';faqs jsonb:='[]';kind text;ref jsonb;target cms.records;target_payload jsonb;card_title text;href text;answer jsonb;
begin
 if p_locale is distinct from 'en' or p_path !~ '^/products/[a-z0-9]+(-[a-z0-9]+)*$' then return null;end if;
 select * into rec from cms.records where website_id=p_site and path=p_path and locale=p_locale and content_type='product';
 if not found or not cms.product_revision_deliverable(p_site,rec.id,rec.published_revision_id) then return null;end if;
 select v.payload into body from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 select jsonb_agg(jsonb_build_object('recordId',r.id,'revisionId',v.id,'title',v.payload->'title','slug',v.payload->'slug','parent',v.payload->'parent','attributeGroups',v.payload->'attributeGroups') order by x.n) into categories
 from jsonb_array_elements(jsonb_build_array(body->'category',body->'subcategory')) with ordinality x(pin,n)
 join cms.records r on r.website_id=p_site and r.id=(pin->>'recordId')::uuid and r.content_type='productCategory'
 join cms.revisions v on v.website_id=p_site and v.record_id=r.id and v.id=(pin->>'revisionId')::uuid;
 foreach kind in array array['applications','documents','projects','certifications','relatedProducts','accessories','compatibleSystems','replacements'] loop
  for ref in select value from jsonb_array_elements(body#>array['relationships',kind]) loop
   select * into target from cms.records where website_id=p_site and id=(ref->>'recordId')::uuid and published_revision_id is not null;
   if not found then return null;end if;
   select v.payload into target_payload from cms.revisions v where v.website_id=p_site and v.record_id=target.id and v.id=target.published_revision_id;
   card_title:=target_payload->>'title';href:=target.path;
   if kind='documents' then href:='/api/documents/download?record='||target.id::text||'&revision='||target.published_revision_id::text;end if;
   if card_title is null or length(btrim(card_title))=0 or href is null then return null;end if;
   cards:=cards||jsonb_build_array(jsonb_build_object('group',kind,'title',card_title,'href',href));
  end loop;
 end loop;
 for ref in select value from jsonb_array_elements(body#>'{relationships,faqs}') loop
  answer:=cms.get_public_faq(p_site,(ref->>'recordId')::uuid,p_locale);if answer is null then return null;end if;
  faqs:=faqs||jsonb_build_array(jsonb_build_object('question',answer->'question','answer',answer->'answer'));
 end loop;
 return jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',rec.published_revision_id,'type','product','path',rec.path,'locale',rec.locale,'categories',categories,'related',cards,'faqs',faqs,'payload',
 (select jsonb_object_agg(key,value) from jsonb_each(body) where key=any(array['schemaVersion','title','slug','code','brand','category','subcategory','summary','body','benefits','features','suitableUses','unsuitableUses','gallery','videos','specifications','variants','packaging','colours','finishes','installation','precautions','warranty','availability','lifecycle','lifecycleNote','enquiry','seo'])));
exception when invalid_text_representation or invalid_parameter_value then return null;
end $$;
revoke all on function cms.get_public_product(uuid,text,text) from public;
grant execute on function cms.get_public_product(uuid,text,text) to anon,authenticated,service_role;
create function cms.list_published_products(p_site uuid,p_after uuid default null,p_limit integer default 100,p_category uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(item order by id),'[]') from (
 select r.id,jsonb_build_object('recordId',r.id,'revisionId',r.published_revision_id,'path',r.path,'modifiedAt',v.created_at,'title',p.value#>>'{payload,title}','summary',p.value#>>'{payload,summary}','code',p.value#>>'{payload,code}','brand',p.value#>>'{payload,brand}','image',coalesce(p.value#>'{payload,gallery,0}','null'),'lifecycle',p.value#>>'{payload,lifecycle}','seo',p.value#>'{payload,seo}') item
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
 cross join lateral(select cms.get_public_product(p_site,r.path,'en') value) p
 where r.website_id=p_site and r.content_type='product' and r.locale='en' and (p_after is null or r.id>p_after) and p.value is not null
 and (p_category is null or v.payload#>>'{category,recordId}'=p_category::text or v.payload#>>'{subcategory,recordId}'=p_category::text)
 order by r.id limit greatest(1,least(coalesce(p_limit,100),100))) x;
$$;
revoke all on function cms.list_published_products(uuid,uuid,integer,uuid) from public;
grant execute on function cms.list_published_products(uuid,uuid,integer,uuid) to anon,authenticated,service_role;
create or replace function cms.enforce_product_editor_revision()
returns trigger language plpgsql security definer set search_path='' as $$
declare rec cms.records; managed boolean;
begin
 select * into rec from cms.records where id=new.record_id and website_id=new.website_id;
 managed:=rec.content_type='productCategory' or (rec.content_type='product' and (new.payload->>'schemaVersion'='1' or exists(select 1 from cms.revisions v where v.record_id=rec.id and v.payload->>'schemaVersion'='1')));
 if managed then
  if rec.content_type='product' and rec.published_revision_id is not null and not exists(select 1 from cms.revisions v where v.id=rec.published_revision_id and v.record_id=rec.id and v.payload->>'schemaVersion'='1') then raise exception 'product_editor_adoption_requires_withdrawal';end if;
  if new.payload->>'schemaVersion' is distinct from '1' or jsonb_typeof(new.payload->'slug') is distinct from 'string' or new.payload->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(new.payload->>'slug')>100 or rec.path is distinct from (case when rec.content_type='product' then '/products/' else '/product-categories/' end)||(new.payload->>'slug') then raise exception 'product_editor_identity_invalid';end if;
 end if;
 return new;
end $$;
create or replace function cms.enforce_product_editor_publication()
returns trigger language plpgsql security definer set search_path='' as $$
declare body jsonb;e jsonb;parent cms.records;
begin
 if new.content_type='product' and new.published_revision_id is not null and exists(select 1 from cms.revisions v where v.record_id=new.id and v.payload->>'schemaVersion'='1') then
  if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.path is not distinct from old.path and new.locale is not distinct from old.locale and new.content_type is not distinct from old.content_type then return new;end if;
  if new.current_revision_id is distinct from new.published_revision_id or new.approved_revision_id is distinct from new.published_revision_id or new.review_status<>'approved' then raise exception 'approved_revision_required';end if;
  if not exists(select 1 from cms.validations v join cms.validation_policy p on p.content_type='product' and p.validator_version=v.validator_version where v.revision_id=new.published_revision_id and v.valid and v.validator_version='product-1' and v.expires_at>now()) then raise exception 'validated_revision_required';end if;
  select v.payload into body from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
  if new.locale is distinct from 'en' or new.path is distinct from '/products/'||(body->>'slug') then raise exception 'product_publication_identity';end if;
  perform r.id from cms.records r where r.website_id=new.website_id and r.id<>new.id and r.id in (select (value#>>'{}')::uuid from jsonb_path_query(body,'$.**.recordId') value where jsonb_typeof(value)='string') order by r.id for share;
  perform m.id from cms.media_objects m where m.website_id=new.website_id and m.id in(select value#>>'{}' from jsonb_path_query(body,'$.**.assetId') value where jsonb_typeof(value)='string') order by m.id for share;
  if not cms.product_revision_deliverable(new.website_id,new.id,new.published_revision_id,false) then raise exception 'product_publication_evidence_changed';end if;
  return new;
 end if;
 if new.content_type<>'productCategory' or new.published_revision_id is null then return new;end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.path is not distinct from old.path and new.locale is not distinct from old.locale and new.content_type is not distinct from old.content_type then return new;end if;
 if new.current_revision_id is distinct from new.published_revision_id or new.approved_revision_id is distinct from new.published_revision_id or new.review_status<>'approved' then raise exception 'approved_revision_required';end if;
 if not exists(select 1 from cms.validations v join cms.validation_policy p on p.content_type='productCategory' and p.validator_version=v.validator_version where v.revision_id=new.published_revision_id and v.valid and v.validator_version='productCategory-1' and v.expires_at>now()) then raise exception 'validated_revision_required';end if;
 select v.payload into body from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if body is null or body->>'schemaVersion' is distinct from '1' or new.locale is distinct from 'en' or new.path is distinct from '/product-categories/'||(body->>'slug') then raise exception 'category_publication_identity';end if;
 if body->'parent'<>'null'::jsonb then
  select * into parent from cms.records where website_id=new.website_id and id=(body#>>'{parent,recordId}')::uuid and id<>new.id and content_type='productCategory' for share;
  if not found or parent.locale<>new.locale or not cms.product_category_definition_eligible(new.website_id,parent.id,parent.published_revision_id) then raise exception 'category_parent_unavailable';end if;
  if not exists(select 1 from cms.revisions v where v.id=parent.published_revision_id and v.payload->'parent'='null'::jsonb) then raise exception 'category_parent_unavailable';end if;
  if exists(select 1 from cms.revisions v cross join lateral jsonb_array_elements(v.payload->'attributeGroups') pg cross join lateral jsonb_array_elements(pg->'attributes') pa
   cross join lateral jsonb_array_elements(body->'attributeGroups') cg cross join lateral jsonb_array_elements(cg->'attributes') ca where v.id=parent.published_revision_id and pa->>'id'=ca->>'id') then raise exception 'category_attribute_collision';end if;
 end if;
 perform m.id from cms.media_objects m where m.website_id=new.website_id and m.id=body#>>'{seo,socialImage,assetId}' for share;
 e:=cms.get_product_category_revision_evidence(new.website_id,new.id,new.published_revision_id);
 if e is null or exists(select 1 from jsonb_array_elements(e->'media') m where m->>'available' is distinct from 'true') then raise exception 'category_publication_evidence_changed';end if;
 return new;
end $$;
-- Hold writers while checking existing routes and installing ownership rules.
lock table cms.records,cms.page_redirects in share row exclusive mode;
do $$ begin
 if exists(select 1 from cms.records where path in('/products') or ((path like '/products/%') and content_type<>'product')) or exists(select 1 from cms.page_redirects where source_path in('/products') or source_path like '/products/%') then raise exception 'product_namespace_occupied';end if;
end $$;
create or replace function cms.is_custom_page_path(p_path text)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(length(p_path)<=500
  and p_path !~ '[^a-z0-9/-]'
  and p_path ~ '^/[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'
  and split_part(p_path,'/',2) <> all(array['about','admin','api','assets','auth','blog','blogs','brand','cms','concept','conservation-commitment','contact','destinations','documents','enquire','guided-bespoke-safaris','itineraries','journal','journeys','legal','login','logout','languages','mice','photo-expeditions','plan','private-aviation','register','reviews','projects','news','events','leadership','applications','industries','locations','careers','certifications','partners','product-categories','products','search','specialists','store','studio','tours']::text[]),false);
$$;
create function cms.enforce_product_namespace()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.path in('/products') or ((new.path like '/products/%') and new.content_type<>'product') then raise exception 'product_namespace_reserved';end if;return new;
end $$;
revoke all on function cms.enforce_product_namespace() from public;
create trigger cms_product_namespace before insert or update of path,content_type on cms.records for each row execute function cms.enforce_product_namespace();
alter function cms.media_is_published(uuid,text) rename to media_is_published_before_product;
revoke all on function cms.media_is_published_before_product(uuid,text) from public,anon,authenticated,service_role;
create function cms.media_is_published(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.media_is_published_before_product(p_site,p_asset) or exists(select 1 from cms.records r where r.website_id=p_site and r.content_type='product' and r.published_revision_id is not null and exists(select 1 from jsonb_path_query(cms.get_public_product(p_site,r.path,r.locale)->'payload','$.**.assetId') asset where asset=to_jsonb(p_asset)));
$$;
revoke all on function cms.media_is_published(uuid,text) from public;
commit;
