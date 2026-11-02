begin;
-- Exact local paths only; resolve through each content type's public eligibility contract.
create function cms.concept_link_available(p_site uuid,p_path text,p_locale text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare kind text;
begin
 if p_path is null or p_path not like '/%' or p_path ~ '[?#]' or p_locale is distinct from 'en' then return false; end if;
 select content_type into kind from cms.records where website_id=p_site and path=p_path and locale=p_locale and published_revision_id is not null;
 if not found then return false; end if;
 return case kind
  when 'destination' then cms.get_public_destination(p_site,p_path,p_locale) is not null
  when 'photoExpedition' then cms.get_public_expedition(p_site,p_path,p_locale) is not null
  when 'journalArticle' then cms.get_public_journal_article(p_site,p_path,p_locale) is not null
  else cms.get_public_page(p_site,p_path,p_locale) is not null end;
end $$;
revoke all on function cms.concept_link_available(uuid,text,text) from public;
create or replace function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,'type',r.content_type,'path',r.path,'payload',v.payload,
  'locale',r.locale,'mediaStatus',cms.get_record_media_status(p_site,p_record,p_revision))
  ||case when r.content_type='page' and r.path='/concept' then jsonb_build_object('conceptPublishedPaths',coalesce((select jsonb_agg(href order by href) from (select distinct value #>> '{}' as href from jsonb_path_query(v.payload,'$.**.href') value where jsonb_typeof(value)='string') links where href like '/%' and href !~ '[?#]' and cms.concept_link_available(r.website_id,href,r.locale)),'[]'::jsonb),'conceptStatus',coalesce(cms.get_concept_reference_status(p_site,p_record,p_revision),'[]'::jsonb)) else '{}'::jsonb end
  ||case when r.content_type='page' and r.path='/contact' then jsonb_build_object('contactFormStatus',cms.get_contact_form_status(p_site,p_record,p_revision)) else '{}'::jsonb end
  ||case when r.content_type in ('page','homepage') then jsonb_build_object('downloadStatus',cms.get_download_reference_status(p_site,p_record,p_revision)) else '{}'::jsonb end
  ||case when r.content_type='destination' then jsonb_build_object('referenceStatus',cms.get_destination_reference_status(p_site,p_record,p_revision)) when r.content_type='navigation' then jsonb_build_object('navigationStatus',cms.get_navigation_reference_status(p_site,p_record,p_revision)) when r.content_type='settings' then jsonb_build_object('settingsStatus',cms.get_settings_reference_status(p_site,p_record,p_revision)) when r.content_type='specialist' then jsonb_build_object('specialistStatus',coalesce(cms.get_specialist_reference_status(p_site,p_record,p_revision),'[]'::jsonb)) when r.content_type='photoExpedition' then jsonb_build_object('expeditionStatus',coalesce(cms.get_expedition_reference_status(p_site,p_record,p_revision),'[]'::jsonb)) when r.content_type='homepage' then jsonb_build_object('homepageHeader',cms.get_public_header(r.website_id,r.locale),'homepageStatus',coalesce(cms.get_homepage_reference_status(p_site,p_record,p_revision),'[]'::jsonb),'homepagePublishedPaths',coalesce((select jsonb_agg(href order by href) from (select distinct value #>> '{}' as href from jsonb_path_query(v.payload,'$.**.href') value where jsonb_typeof(value)='string') links where href like '/%' and cms.get_public_page(r.website_id,href,r.locale) is not null),'[]'::jsonb)) when r.content_type='document' then jsonb_build_object('documentStatus',cms.get_document_validation_status(p_site,p_record,p_revision)) else '{}'::jsonb end
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision;
$$;
create or replace function cms.enforce_concept_publication_references()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; sections jsonb; section jsonb; item jsonb; target uuid; related cms.records; dependency jsonb; asset text; href text; expected text;
begin
 if new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and old.content_type='page' and old.path='/concept' and old.published_revision_id is not null and (new.path is distinct from old.path or new.content_type is distinct from old.content_type or new.locale is distinct from old.locale) then raise exception 'concept_route_not_ready'; end if;
 if new.path is distinct from '/concept' then return new; end if;
 if new.content_type is distinct from 'page' or new.locale is distinct from 'en' then raise exception 'concept_route_not_ready'; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.path is not distinct from old.path and new.locale is not distinct from old.locale and new.content_type is not distinct from old.content_type then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if jsonb_typeof(payload#>'{composition,sections}') is distinct from 'array' then raise exception 'concept_reference_verification_required'; end if;
 select coalesce(jsonb_agg(value),'[]') into sections from jsonb_array_elements(payload#>'{composition,sections}') where coalesce(value#>>'{controls,visible}','true')<>'false' and (value#>>'{controls,visibleUntil}' is null or (value#>>'{controls,visibleUntil}')::timestamptz>now());
 -- Future sections also need current published dependencies. Lock all direct
 -- reference and dynamic-link records in identity order before reading pointers.
 for target in select distinct r.id from cms.records r where r.website_id=new.website_id and (
  r.id in (select (value #>> '{}')::uuid from jsonb_path_query(sections,'$[*].data.**.recordId') value)
  or r.path in (select value #>> '{}' from jsonb_path_query(jsonb_build_object('sections',sections,'navigation',payload->'navigation'),'$.**.href') value)
 ) order by r.id loop
  if target=new.id then continue; end if;
  select * into related from cms.records where website_id=new.website_id and id=target for share;
  select v.payload into dependency from cms.revisions v where v.website_id=new.website_id and v.record_id=target and v.id=related.published_revision_id;
  for asset in select distinct value #>> '{}' from jsonb_path_query(dependency,'$.**.assetId') value where jsonb_typeof(value)='string' order by 1 loop
   perform 1 from cms.media_objects where website_id=new.website_id and id=asset for share;
  end loop;
 end loop;
 perform 1 from cms.navigation_public_paths order by path for share;
 for section in select value from jsonb_array_elements(sections) loop
  expected:=case section->>'kind' when 'homepageJourneys' then 'journey' when 'homepageGuestNotes' then 'testimonial' when 'homepageDepartures' then 'photoExpedition' else null end;
  if expected is not null then
   if jsonb_typeof(case when expected='photoExpedition' then section#>'{data,overrides}' else section#>'{data,items}' end) is distinct from 'array' then raise exception 'concept_reference_verification_required'; end if;
   for item in select value from jsonb_array_elements(case when expected='photoExpedition' then section#>'{data,overrides}' else section#>'{data,items}' end) loop
    target:=(item->>'recordId')::uuid;
    select * into related from cms.records where website_id=new.website_id and id=target and locale=new.locale and content_type=expected and published_revision_id is not null;
    if not found then raise exception 'concept_reference_verification_required'; end if;
    if expected='testimonial' then
     if cms.get_public_homepage_guest(new.website_id,target,new.locale) is null then raise exception 'concept_reference_verification_required'; end if;
    elsif expected='photoExpedition' then
     if cms.get_public_expedition(new.website_id,related.path,new.locale) is null then raise exception 'concept_reference_verification_required'; end if;
    else
     select v.payload into dependency from cms.revisions v where v.website_id=new.website_id and v.record_id=target and v.id=related.published_revision_id;
     if cms.get_public_page(new.website_id,related.path,new.locale) is null or not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(dependency->'media')='array' then dependency->'media' else '[]'::jsonb end) m where m->>'role'='hero' and length(trim(m->>'assetId'))>0 and length(trim(m->>'alt'))>0) then raise exception 'concept_reference_verification_required'; end if;
    end if;
   end loop;
  end if;
 end loop;
 for href in select distinct value #>> '{}' from jsonb_path_query(jsonb_build_object('sections',sections,'navigation',payload->'navigation'),'$.**.href') value loop
  -- Anchor schedules and mailto syntax remain the trusted editorial validator's responsibility.
  if href like '#%' or href like 'mailto:%' or cms.navigation_url_available(href) then continue; end if;
  if href not like '/%' or not cms.concept_link_available(new.website_id,href,new.locale) then raise exception 'concept_link_verification_required'; end if;
 end loop;
 return new;
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then raise exception 'concept_reference_verification_required';
end $$;
commit;
