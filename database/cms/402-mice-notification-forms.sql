begin;
-- Retain the strict draft compatibility helper; combine structural mapping with
-- current notification eligibility only for server-side published-form use.
create function cms.mice_form_delivery_compatible(p_site uuid,p_definition jsonb)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(cms.form_notification_delivery_available(p_site,p_definition)
 and cms.mice_form_compatible(jsonb_set(p_definition,'{notificationRouteIds}','[]'::jsonb)),false);
$$;
revoke all on function cms.mice_form_delivery_compatible(uuid,jsonb) from public,anon,authenticated,service_role;
create or replace function cms.review_mice_migration_form(p_site uuid,p_form uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare form jsonb;
begin
 if auth.uid() is null or not cms.can(p_site,'view','form',p_form) then raise exception 'forbidden' using errcode='42501'; end if;
 form:=cms.get_published_form(p_site,p_form);
 return jsonb_build_object('recordId',p_form,'revisionId',form->'revisionId','locale',form->'locale','available',coalesce(form->>'locale'='en' and cms.mice_form_delivery_compatible(p_site,form->'definition'),false));
end $$;
create or replace function cms.get_mice_publication_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,
  'media',cms.get_record_media_status(p_site,p_record,p_revision),
  'forms',coalesce((select jsonb_agg(jsonb_build_object('recordId',refs.id,'revisionId',f->'revisionId','locale',f->'locale',
    'available',coalesce(f->>'locale'='en' and cms.mice_form_delivery_compatible(p_site,f->'definition'),false)) order by refs.id)
    from (select distinct (s->'data'->'form'->>'recordId')::uuid id from jsonb_array_elements(v.payload->'composition'->'sections') s
      where s->>'kind'='miceEnquiry' and s->'controls'->'visible'='true'::jsonb and s->'data'->'form'->>'recordId' is not null) refs
    left join lateral cms.get_published_form(r.website_id,refs.id) f on true),'[]'::jsonb),
  'publishedPaths',coalesce((select jsonb_agg(href order by href) from
    (select distinct value#>>'{}' href from jsonb_path_query(v.payload,'$.**.href') value where jsonb_typeof(value)='string') links
    where href ~ '^/[a-z0-9/-]*$' and href not like '%//%' and cms.concept_link_available(r.website_id,href,r.locale)),'[]'::jsonb))
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision and r.content_type='page' and r.path='/mice' and r.locale='en';
$$;
create or replace function cms.assert_mice_publication_dependencies(p_site uuid,p_payload jsonb,p_locale text)
returns void language plpgsql security definer set search_path='' as $$
declare sections jsonb; section jsonb; refs uuid[]:='{}'; form_id uuid; form jsonb; href text; target uuid; related cms.records; dependency jsonb; asset text;
begin
 if p_locale is distinct from 'en' or jsonb_typeof(p_payload) is distinct from 'object'
  or p_payload-'composition'-'seo'<>'{}'::jsonb or jsonb_typeof(p_payload#>'{composition,sections}') is distinct from 'array' then raise exception 'mice_content_invalid'; end if;
 select coalesce(jsonb_agg(value),'[]') into sections from jsonb_array_elements(p_payload#>'{composition,sections}') where value#>'{controls,visible}' is distinct from 'false'::jsonb;
 for section in select value from jsonb_array_elements(sections) loop
  if coalesce(section->>'kind','') not in ('miceHero','miceIntroduction','miceFormats','miceDestinations','miceProcess','miceEnquiry') then raise exception 'mice_section_unsupported'; end if;
  if coalesce(section#>'{controls,regions}','[]'::jsonb)<>'[]'::jsonb or coalesce(section#>>'{controls,animation}','none')<>'none' then raise exception 'mice_controls_unsupported'; end if;
  if section->>'kind'='miceEnquiry' then
   if coalesce(section#>>'{data,form,recordId}','')!~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then raise exception 'mice_form_unavailable'; end if;
   refs:=array_append(refs,(section#>>'{data,form,recordId}')::uuid);
  end if;
 end loop;
 if cardinality(refs)=0 then raise exception 'mice_form_unavailable'; end if;
 -- Include future sections and acquire all referenced record locks in ID order.
 for target in select r.id from cms.records r where r.website_id=p_site and
   (r.id=any(refs) or (r.locale=p_locale and r.path in(select value#>>'{}' from jsonb_path_query(sections,'$.**.href') value where jsonb_typeof(value)='string'))) order by r.id loop
  select * into related from cms.records where website_id=p_site and id=target for share;
  select v.payload into dependency from cms.revisions v where v.website_id=p_site and v.record_id=target and v.id=related.published_revision_id;
  for asset in select distinct value#>>'{}' from jsonb_path_query(dependency,'$.**.assetId') value where jsonb_typeof(value)='string' order by 1 loop
   perform 1 from cms.media_objects where website_id=p_site and id=asset for share;
  end loop;
 end loop;
 for form_id in select distinct id from unnest(refs) id loop
  form:=cms.get_published_form(p_site,form_id);
  if form is null or form->>'locale' is distinct from 'en' or not cms.mice_form_delivery_compatible(p_site,form->'definition') then raise exception 'mice_form_unavailable'; end if;
  perform cms.assert_form_notification_delivery(p_site,form->'definition');
 end loop;
 perform 1 from cms.navigation_public_paths order by path for share;
 for href in select value#>>'{}' from jsonb_path_query(sections,'$.**.href') value loop
  -- Anchor existence and visibility at every boundary belong to structural validation.
  if href ~ '^#[a-z][a-z0-9-]*$' or href ~ '^/mice(#[a-z][a-z0-9-]*)?$' then continue; end if;
  if href is null or href !~ '^/[a-z0-9/-]*$' or href like '%//%' then raise exception 'mice_link_unavailable'; end if;
  if not exists(select 1 from cms.navigation_public_paths where path=href) and not cms.concept_link_available(p_site,href,p_locale) then raise exception 'mice_link_unavailable'; end if;
 end loop;
end $$;
create or replace function cms.get_public_mice(p_site uuid,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; raw jsonb; payload jsonb; section jsonb; form jsonb; href text; anchor text;
begin
 if p_locale is distinct from 'en' then return null; end if;
 select * into rec from cms.records where website_id=p_site and content_type='page' and path='/mice' and locale=p_locale and published_revision_id is not null;
 if not found then return null; end if;
 if not exists(select 1 from cms.validations checked join cms.validation_policy policy on policy.content_type='page' and policy.validator_version=checked.validator_version where checked.revision_id=rec.published_revision_id and checked.valid and checked.validator_version='composition-5') then return null; end if;
 select v.payload into raw from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 payload:=cms.project_mice_payload(raw,p_locale);
 if payload is null or not cms.record_media_available(p_site,'page',payload) then return null; end if;
 for section in select value from jsonb_array_elements(payload#>'{composition,sections}') where value->>'kind'='miceEnquiry' loop
  form:=cms.get_published_form(p_site,(section#>>'{data,form,recordId}')::uuid);
  if form is null or form->>'locale' is distinct from p_locale or not cms.mice_form_delivery_compatible(p_site,form->'definition') then return null; end if;
 end loop;
 for href in select value#>>'{}' from jsonb_path_query(payload,'$.**.href') value loop
  if href ~ '^#[a-z][a-z0-9-]*$' or href ~ '^/mice#[a-z][a-z0-9-]*$' then
   anchor:=split_part(href,'#',2);
   if not exists(select 1 from jsonb_array_elements(payload#>'{composition,sections}') s where s#>>'{controls,anchor}'=anchor) then return null; end if;
  elsif href is null or href !~ '^/[a-z0-9/-]*$' or href like '%//%' then return null;
  elsif href<>'/mice' and not exists(select 1 from cms.navigation_public_paths where path=href) and not cms.concept_link_available(p_site,href,p_locale) then return null;
  end if;
 end loop;
 return jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',rec.published_revision_id,'type','page','path','/mice','locale',p_locale,'payload',payload);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then return null;
end $$;
commit;
