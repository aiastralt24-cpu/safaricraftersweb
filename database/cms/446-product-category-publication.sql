begin;
-- Publication history is internal authority, never an editor-supplied approval flag.
create table cms.product_category_releases (
 website_id uuid not null, record_id uuid not null, revision_id uuid not null,
 parent_record_id uuid, parent_revision_id uuid,
 released_at timestamptz not null default now(), revoked_at timestamptz,
 primary key(website_id,record_id,revision_id),
 foreign key(website_id,record_id,revision_id) references cms.revisions(website_id,record_id,id),
 foreign key(website_id,parent_record_id,parent_revision_id) references cms.revisions(website_id,record_id,id),
 check((parent_record_id is null)=(parent_revision_id is null))
);
alter table cms.product_category_releases enable row level security;
revoke all on cms.product_category_releases from public,anon,authenticated,service_role;
create function cms.product_category_definition_eligible(p_site uuid,p_record uuid,p_revision uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
 select 1 from cms.product_category_releases h
 join cms.records r on r.website_id=h.website_id and r.id=h.record_id and r.content_type='productCategory' and r.locale='en' and r.published_revision_id is not null
 join cms.validations v on v.revision_id=h.revision_id and v.valid and v.validator_version='productCategory-1'
 join cms.validation_policy p on p.content_type='productCategory' and p.validator_version=v.validator_version
 where h.website_id=p_site and h.record_id=p_record and h.revision_id=p_revision and h.revoked_at is null
 and (h.parent_record_id is null or exists(
 select 1 from cms.product_category_releases ph
 join cms.records pr on pr.website_id=ph.website_id and pr.id=ph.record_id and pr.content_type='productCategory' and pr.locale=r.locale and pr.published_revision_id is not null
 join cms.validations pv on pv.revision_id=ph.revision_id and pv.valid and pv.validator_version=p.validator_version
 where ph.website_id=h.website_id and ph.record_id=h.parent_record_id and ph.revision_id=h.parent_revision_id and ph.revoked_at is null and ph.parent_record_id is null)));
$$;
revoke all on function cms.product_category_definition_eligible(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_product_category_revision_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;draft_payload jsonb;parent jsonb:=null;media jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='productCategory';
 if not found then return null;end if;
 select v.payload into draft_payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if draft_payload->'parent' is not null and draft_payload->'parent'<>'null'::jsonb then
  select jsonb_build_object('recordId',draft_payload#>>'{parent,recordId}','available',r.id is not null,'published',v.id is not null,'locale',r.locale,'payload',v.payload) into parent
  from (select 1) x left join cms.records r on r.website_id=p_site and r.id=(draft_payload#>>'{parent,recordId}')::uuid and r.content_type='productCategory' and r.id<>p_record
  left join cms.revisions v on v.website_id=p_site and v.record_id=r.id and v.id=r.published_revision_id;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',id,'available',exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=x.id and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and length(btrim(m.rights_evidence))>0 and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()))) order by id),'[]') into media
 from (select distinct value#>>'{}' id from jsonb_path_query(draft_payload,'$.**.assetId') value where jsonb_typeof(value)='string') x;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'parent',parent,'media',media);
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.get_product_category_revision_evidence(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_public_product_category(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r cms.records; body jsonb;e jsonb;parent jsonb:=null;
begin
 if p_locale is distinct from 'en' or p_path !~ '^/product-categories/[a-z0-9]+(-[a-z0-9]+)*$' then return null;end if;
 select * into r from cms.records where website_id=p_site and path=p_path and locale=p_locale and content_type='productCategory';
 if not found or not cms.product_category_definition_eligible(p_site,r.id,r.published_revision_id) then return null;end if;
 select payload into body from cms.revisions where website_id=p_site and record_id=r.id and id=r.published_revision_id;
 if body->>'schemaVersion' is distinct from '1' or p_path is distinct from '/product-categories/'||(body->>'slug') then return null;end if;
 e:=cms.get_product_category_revision_evidence(p_site,r.id,r.published_revision_id);
 if e is null or exists(select 1 from jsonb_array_elements(e->'media') m where m->>'available' is distinct from 'true') then return null;end if;
 if body->'parent'<>'null'::jsonb then
  select cms.get_public_product_category(p_site,pr.path,p_locale) into parent from cms.records pr where pr.website_id=p_site and pr.id=(body#>>'{parent,recordId}')::uuid and pr.id<>r.id
   and exists(select 1 from cms.revisions pv where pv.id=pr.published_revision_id and pv.payload->'parent'='null'::jsonb);
  if parent is null then return null;end if;
  parent:=jsonb_build_object('title',parent#>>'{payload,title}','href',parent->>'path');
 end if;
 return jsonb_build_object('recordId',r.id,'revisionId',r.published_revision_id,'type','productCategory','path',r.path,'locale',r.locale,'parent',parent,'payload',
 (select jsonb_object_agg(key,value) from jsonb_each(body) where key=any(array['schemaVersion','title','slug','summary','seo'])));
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.get_public_product_category(uuid,text,text) from public;
grant execute on function cms.get_public_product_category(uuid,text,text) to anon,authenticated,service_role;
create function cms.list_published_product_categories(p_site uuid,p_after uuid default null,p_limit integer default 100)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(item order by id),'[]') from (
 select r.id,jsonb_build_object('recordId',r.id,'revisionId',r.published_revision_id,'path',r.path,'modifiedAt',v.created_at,'title',p.value#>>'{payload,title}','summary',p.value#>>'{payload,summary}','seo',p.value#>'{payload,seo}','parent',p.value->'parent') item
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
 cross join lateral(select cms.get_public_product_category(p_site,r.path,'en') value) p
 where r.website_id=p_site and r.content_type='productCategory' and r.locale='en' and (p_after is null or r.id>p_after) and p.value is not null
 order by r.id limit greatest(1,least(coalesce(p_limit,100),100))) x;
$$;
revoke all on function cms.list_published_product_categories(uuid,uuid,integer) from public;
grant execute on function cms.list_published_product_categories(uuid,uuid,integer) to anon,authenticated,service_role;
create or replace function cms.enforce_product_editor_revision()
returns trigger language plpgsql security definer set search_path='' as $$
declare rec cms.records; managed boolean;
begin
 select * into rec from cms.records where id=new.record_id and website_id=new.website_id;
 managed:=rec.content_type='productCategory' or (rec.content_type='product' and (new.payload->>'schemaVersion'='1' or exists(select 1 from cms.revisions v where v.record_id=rec.id and v.payload->>'schemaVersion'='1')));
 if managed then
  if rec.content_type='product' and rec.published_revision_id is not null then raise exception 'product_editor_adoption_requires_withdrawal';end if;
  if new.payload->>'schemaVersion' is distinct from '1' or jsonb_typeof(new.payload->'slug') is distinct from 'string' or new.payload->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(new.payload->>'slug')>100 or rec.path is distinct from (case when rec.content_type='product' then '/products/' else '/product-categories/' end)||(new.payload->>'slug') then raise exception 'product_editor_identity_invalid';end if;
 end if;
 return new;
end $$;
create or replace function cms.enforce_product_editor_publication()
returns trigger language plpgsql security definer set search_path='' as $$
declare body jsonb;e jsonb;parent cms.records;
begin
 if new.content_type='product' and new.published_revision_id is not null and exists(select 1 from cms.revisions v where v.record_id=new.id and v.payload->>'schemaVersion'='1') then raise exception 'product_public_delivery_not_ready';end if;
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
drop trigger cms_product_editor_publication on cms.records;
create trigger cms_product_editor_publication before insert or update of published_revision_id,path,locale,content_type on cms.records for each row execute function cms.enforce_product_editor_publication();
create function cms.track_product_category_release()
returns trigger language plpgsql security definer set search_path='' as $$
declare parent_id uuid;parent_revision uuid;
begin
 if new.content_type<>'productCategory' then return new;end if;
 if new.published_revision_id is null then
  update cms.product_category_releases set revoked_at=coalesce(revoked_at,now()) where website_id=new.website_id and record_id=new.id;
 elsif tg_op='INSERT' or new.published_revision_id is distinct from old.published_revision_id then
  select (v.payload#>>'{parent,recordId}')::uuid into parent_id from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
  if parent_id is not null then select published_revision_id into parent_revision from cms.records where website_id=new.website_id and id=parent_id;end if;
  insert into cms.product_category_releases(website_id,record_id,revision_id,parent_record_id,parent_revision_id) values(new.website_id,new.id,new.published_revision_id,parent_id,parent_revision)
   on conflict(website_id,record_id,revision_id) do update set released_at=now(),revoked_at=null,parent_record_id=excluded.parent_record_id,parent_revision_id=excluded.parent_revision_id;
 end if;
 return new;
end $$;
revoke all on function cms.track_product_category_release() from public,anon,authenticated,service_role;
create trigger cms_product_category_release after insert or update of published_revision_id on cms.records for each row execute function cms.track_product_category_release();
create or replace function cms.get_product_validation_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;payload jsonb;refs jsonb;media jsonb;links jsonb;categories jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='product' and current_revision_id=p_revision;
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 select coalesce(jsonb_agg(jsonb_build_object('recordId',pin->>'recordId','revisionId',pin->>'revisionId','available',v.id is not null,'published',cms.product_category_definition_eligible(p_site,r.id,v.id),'locale',r.locale,'payload',v.payload) order by ord),'[]') into categories
 from jsonb_array_elements(jsonb_build_array(payload->'category',payload->'subcategory')) with ordinality x(pin,ord)
 left join cms.records r on r.website_id=p_site and r.id=(pin->>'recordId')::uuid and r.content_type='productCategory'
 left join cms.revisions v on v.website_id=p_site and v.record_id=r.id and v.id=(pin->>'revisionId')::uuid
 where pin is not null and pin<>'null'::jsonb;
 select coalesce(jsonb_agg(jsonb_build_object('group',t.key,'type',t.kind,'recordId',ref->>'recordId','available',r.id is not null,'published',coalesce(case t.kind when 'certification' then cms.get_public_certification(p_site,r.path,r.locale) is not null when 'application' then cms.get_public_application(p_site,r.path,r.locale) is not null when 'project' then cms.get_public_project(p_site,r.path,r.locale) is not null when 'faq' then cms.get_public_faq(p_site,r.id,r.locale) is not null when 'document' then cms.get_document_download(p_site,r.id)->>'access'='public' when 'product' then false else false end,false),'locale',r.locale) order by t.key,ref->>'recordId'),'[]') into refs
 from (values('applications','application'),('documents','document'),('projects','project'),('certifications','certification'),('faqs','faq'),('relatedProducts','product'),('accessories','product'),('compatibleSystems','product'),('replacements','product')) t(key,kind)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(payload#>array['relationships',t.key])='array' then payload#>array['relationships',t.key] else '[]'::jsonb end) ref
 left join cms.records r on r.website_id=p_site and r.id=(ref->>'recordId')::uuid and r.content_type=t.kind and r.id<>p_record;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',id,'available',exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=x.id and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and length(btrim(m.rights_evidence))>0 and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()))) order by id),'[]') into media
 from (select distinct value#>>'{}' id from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string') x;
 select coalesce(jsonb_agg(jsonb_build_object('href',href,'available',cms.tanzania_link_path(href) is not null and position('#' in href)=0 and (cms.tanzania_link_path(href)=rec.path or exists(select 1 from cms.navigation_public_paths where path=cms.tanzania_link_path(href)) or cms.concept_link_available(p_site,cms.tanzania_link_path(href),rec.locale))) order by href),'[]') into links
 from (select distinct value#>>'{}' href from jsonb_path_query(payload,'$.**.href') value where jsonb_typeof(value)='string' and (value#>>'{}' like '/%' or value#>>'{}' like '#%')) x;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'categories',categories,'references',refs,'media',media,'links',links,'commerce',jsonb_build_object('provider',payload#>>'{commerce,provider}','verified',payload#>>'{commerce,provider}'='none'));
exception when invalid_text_representation then return null;
end $$;
-- Hold writers while checking existing routes and installing ownership rules.
lock table cms.records,cms.page_redirects in share row exclusive mode;
do $$ begin
 if exists(select 1 from cms.records where path in('/product-categories') or ((path like '/product-categories/%') and content_type<>'productCategory')) or exists(select 1 from cms.page_redirects where source_path in('/product-categories') or source_path like '/product-categories/%') then raise exception 'product_category_namespace_occupied';end if;
end $$;
create or replace function cms.is_custom_page_path(p_path text)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(length(p_path)<=500
  and p_path !~ '[^a-z0-9/-]'
  and p_path ~ '^/[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'
  and split_part(p_path,'/',2) <> all(array['about','admin','api','assets','auth','blog','blogs','brand','cms','concept','conservation-commitment','contact','destinations','documents','enquire','guided-bespoke-safaris','itineraries','journal','journeys','legal','login','logout','languages','mice','photo-expeditions','plan','private-aviation','register','reviews','projects','news','events','leadership','applications','industries','locations','careers','certifications','partners','product-categories','search','specialists','store','studio','tours']::text[]),false);
$$;
create function cms.enforce_product_category_namespace()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.path in('/product-categories') or ((new.path like '/product-categories/%') and new.content_type<>'productCategory') then raise exception 'product_category_namespace_reserved';end if;return new;
end $$;
revoke all on function cms.enforce_product_category_namespace() from public;
create trigger cms_product_category_namespace before insert or update of path,content_type on cms.records for each row execute function cms.enforce_product_category_namespace();
alter function cms.media_is_published(uuid,text) rename to media_is_published_before_product_category;
revoke all on function cms.media_is_published_before_product_category(uuid,text) from public,anon,authenticated,service_role;
create function cms.media_is_published(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.media_is_published_before_product_category(p_site,p_asset) or exists(select 1 from cms.records r where r.website_id=p_site and r.content_type='productCategory' and r.published_revision_id is not null and cms.get_public_product_category(p_site,r.path,r.locale)#>>'{payload,seo,socialImage,assetId}'=p_asset);
$$;
revoke all on function cms.media_is_published(uuid,text) from public;
commit;
