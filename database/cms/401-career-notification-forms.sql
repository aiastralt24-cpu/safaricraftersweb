begin;
-- Published form evidence already enforces current notification readiness.
create or replace function cms.get_career_validation_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;payload jsonb;refs jsonb;media jsonb;links jsonb;form jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='career' and current_revision_id=p_revision;
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 select coalesce(jsonb_agg(jsonb_build_object('type',t.kind,'recordId',ref->>'recordId','available',r.id is not null,'published',r.published_revision_id is not null,'locale',r.locale) order by t.kind,ref->>'recordId'),'[]') into refs
 from (values('locations','location'),('documents','document'),('pages','page')) t(key,kind)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(payload#>array['relationships',t.key])='array' then payload#>array['relationships',t.key] else '[]'::jsonb end) ref
 left join cms.records r on r.website_id=p_site and r.id=(ref->>'recordId')::uuid and r.content_type=t.kind and r.id<>p_record;
 if payload#>>'{application,mode}'='form' then
  form:=cms.get_published_form(p_site,(payload#>>'{application,formId}')::uuid);
  refs:=refs||jsonb_build_array(jsonb_build_object('type','form','recordId',payload#>>'{application,formId}',
   'available',coalesce(form is not null and form->>'locale'=rec.locale and form->'definition'->'schemaVersion'='1'::jsonb
    and jsonb_typeof(form->'definition'->'fields')='array'
    and not jsonb_path_exists(form,'$.definition.fields[*] ? (@.type == "file")'),false),
   'published',form is not null and form->>'revisionId' is not null,'locale',form->>'locale'));
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',id,'available',exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=x.id and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and length(btrim(m.rights_evidence))>0 and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()))) order by id),'[]') into media
 from (select distinct value#>>'{}' id from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string') x;
 select coalesce(jsonb_agg(jsonb_build_object('href',href,'available',cms.tanzania_link_path(href) is not null and position('#' in href)=0 and (cms.tanzania_link_path(href)=rec.path or exists(select 1 from cms.navigation_public_paths where path=cms.tanzania_link_path(href)) or cms.concept_link_available(p_site,cms.tanzania_link_path(href),rec.locale))) order by href),'[]') into links
 from (select distinct value#>>'{}' href from jsonb_path_query(payload,'$.**.href') value where jsonb_typeof(value)='string' and (value#>>'{}' like '/%' or value#>>'{}' like '#%')) x;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'applicationForm',form,'references',refs,'media',media,'links',links);
exception when invalid_text_representation then return null;
end $$;
create or replace function cms.get_career_revision_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;payload jsonb;refs jsonb;media jsonb;links jsonb;form jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='career';
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if payload is null then return null;end if;
 select coalesce(jsonb_agg(jsonb_build_object('type',t.kind,'recordId',ref->>'recordId','available',r.id is not null,'published',r.published_revision_id is not null,'locale',r.locale) order by t.kind,ref->>'recordId'),'[]') into refs
 from (values('locations','location'),('documents','document'),('pages','page')) t(key,kind)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(payload#>array['relationships',t.key])='array' then payload#>array['relationships',t.key] else '[]'::jsonb end) ref
 left join cms.records r on r.website_id=p_site and r.id=(ref->>'recordId')::uuid and r.content_type=t.kind and r.id<>p_record;
 if payload#>>'{application,mode}'='form' then
  form:=cms.get_published_form(p_site,(payload#>>'{application,formId}')::uuid);
  refs:=refs||jsonb_build_array(jsonb_build_object('type','form','recordId',payload#>>'{application,formId}',
   'available',coalesce(form is not null and form->>'locale'=rec.locale and form->'definition'->'schemaVersion'='1'::jsonb
    and jsonb_typeof(form->'definition'->'fields')='array'
    and not jsonb_path_exists(form,'$.definition.fields[*] ? (@.type == "file")'),false),
   'published',form is not null and form->>'revisionId' is not null,'locale',form->>'locale'));
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',id,'available',exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=x.id and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and length(btrim(m.rights_evidence))>0 and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()))) order by id),'[]') into media
 from (select distinct value#>>'{}' id from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string') x;
 select coalesce(jsonb_agg(jsonb_build_object('href',href,'available',cms.tanzania_link_path(href) is not null and position('#' in href)=0 and (cms.tanzania_link_path(href)=rec.path or exists(select 1 from cms.navigation_public_paths where path=cms.tanzania_link_path(href)) or cms.concept_link_available(p_site,cms.tanzania_link_path(href),rec.locale))) order by href),'[]') into links
 from (select distinct value#>>'{}' href from jsonb_path_query(payload,'$.**.href') value where jsonb_typeof(value)='string' and (value#>>'{}' like '/%' or value#>>'{}' like '#%')) x;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'applicationForm',form,'references',refs,'media',media,'links',links);
exception when invalid_text_representation then return null;
end $$;
create or replace function cms.enforce_career_draft_identity()
returns trigger language plpgsql security definer set search_path='' as $$
declare draft_payload jsonb;e jsonb;
begin
 if new.content_type<>'career' then return new;end if;
 if new.path is null or new.path !~ '^/careers/[a-z0-9]+(-[a-z0-9]+)*$' or length(new.path)>109 then raise exception 'career_route_invalid';end if;
 if new.published_revision_id is null then return new;end if;
 -- Saving a newer draft must not require reapproval of the already published version.
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id
 and new.content_type is not distinct from old.content_type and new.path is not distinct from old.path
 and new.locale is not distinct from old.locale then return new;end if;
 if new.current_revision_id is distinct from new.published_revision_id or new.approved_revision_id is distinct from new.published_revision_id or new.review_status<>'approved' then raise exception 'approved_revision_required';end if;
 if not exists(select 1 from cms.validations v join cms.validation_policy p on p.content_type='career' and p.validator_version=v.validator_version
 where v.revision_id=new.published_revision_id and v.valid and v.validator_version='career-1' and v.expires_at>now()) then raise exception 'validated_revision_required';end if;
 select v.payload into draft_payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if draft_payload is null or draft_payload->>'schemaVersion' is distinct from '1' or new.locale is distinct from 'en'
 or new.path is null or new.path !~ '^/careers/[a-z0-9]+(-[a-z0-9]+)*$' or draft_payload->>'employment' is null or draft_payload->>'employment' not in ('fullTime','partTime','contract','temporary','internship','volunteer','other') or new.path is distinct from '/careers/'||(draft_payload->>'slug') then raise exception 'career_publication_identity';end if;
 -- Pin directly selected records and media while validating the release.
 perform r.id from cms.records r where r.website_id=new.website_id and r.id<>new.id and r.id in (
  select (ref->>'recordId')::uuid from jsonb_each(coalesce(draft_payload->'relationships','{}')) groups
  cross join lateral jsonb_array_elements(groups.value) ref
  union select (draft_payload#>>'{application,formId}')::uuid where draft_payload#>>'{application,mode}'='form'
 ) order by r.id for share;
 perform m.id from cms.media_objects m where m.website_id=new.website_id and m.id in (
  select value#>>'{}' from jsonb_path_query(draft_payload,'$.**.assetId') value where jsonb_typeof(value)='string'
 ) order by m.id for share;
 -- The selected form is locked above and checked against its current publication below.
 -- Unsupported files remain unavailable; notification readiness comes from the guarded form reader.
 -- A validation receipt is not permission to use evidence revoked since validation.
 e:=cms.get_career_validation_evidence(new.website_id,new.id,new.published_revision_id);
 if e is null or exists(select 1 from jsonb_array_elements(e->'media') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'links') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'references') x where x->>'available' is distinct from 'true' or x->>'published' is distinct from 'true' or x->>'locale' is distinct from new.locale)
 then raise exception 'career_publication_evidence_changed';end if;
 if draft_payload#>>'{application,mode}'='form' then perform cms.assert_form_notification_delivery(new.website_id,e#>'{applicationForm,definition}');end if;
 if cms.career_related_public_cards(new.website_id,new.id,new.published_revision_id) is null then raise exception 'career_publication_relationship_unavailable';end if;
 return new;
end $$;
commit;
