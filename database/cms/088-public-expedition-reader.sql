begin;
-- This reader does not enable expedition publication policy or route rollout.
create function cms.get_public_expedition(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; raw jsonb; payload jsonb; field text; asset text; related jsonb; form_value jsonb; form_id uuid; target uuid; refs jsonb:='[]';
begin
 if p_locale is distinct from 'en' or p_path is null or p_path !~ '^/photo-expeditions/[a-z0-9]+(-[a-z0-9]+)*$' or length(p_path)>119 then return null; end if;
 select * into rec from cms.records where website_id=p_site and path=p_path and locale=p_locale and content_type='photoExpedition' and published_revision_id is not null;
 if not found then return null; end if;
 select v.payload into raw from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 if raw->'schemaVersion' is distinct from '1'::jsonb or raw ? 'video' or p_path is distinct from '/photo-expeditions/'||(raw->>'slug') then return null; end if;
 payload:=cms.project_settings_fields(raw,'{"schemaVersion":"scalar","slug":"scalar","title":"scalar","geography":"scalar","programmeStatus":"scalar","availabilityReviewedAt":"scalar","category":"scalar","skill":"scalar","groupSize":"scalar","duration":"scalar","bestMonths":"scalar","species":"scalar","equipment":"scalar","description":"scalar","intro":"scalar","mentor":"scalar","guide":"scalar","dateLabel":"scalar","price":"scalar","route":"scalar","heroTitle":"scalar","heroCopy":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"heroImage":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"mobileHeroImage":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"gallery":[{"id":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"}}],"departures":[{"id":"scalar","date":"scalar","endDate":"scalar","status":"scalar","availability":"scalar"}],"days":[{"id":"scalar","label":"scalar","title":"scalar","copy":"scalar","stay":"scalar"}],"highlights":[{"id":"scalar","text":"scalar"}],"inclusions":[{"id":"scalar","text":"scalar"}],"exclusions":[{"id":"scalar","text":"scalar"}],"body":[{"id":"scalar","text":"scalar"}],"faqs":[{"id":"scalar","question":"scalar","answer":"scalar"}],"specialists":[{"recordId":"scalar","role":"scalar"}],"labels":{"heroEyebrow":"scalar","introductionHeading":"scalar","highlightsHeading":"scalar","itineraryHeading":"scalar","inclusionsHeading":"scalar","exclusionsHeading":"scalar","duration":"scalar","route":"scalar","skill":"scalar","groupSize":"scalar","season":"scalar","species":"scalar","price":"scalar","equipment":"scalar","departuresHeading":"scalar","emptyDepartures":"scalar","departureAction":"scalar","previewNote":"scalar","galleryEyebrow":"scalar","galleryHeading":"scalar","galleryCopy":"scalar","galleryLabel":"scalar","faqEyebrow":"scalar","faqHeading":"scalar","faqCopy":"scalar"},"booking":{"eyebrow":"scalar","heading":"scalar","introduction":"scalar","paymentHeading":"scalar","cancellationPolicy":"scalar","paymentNote":"scalar","priceHeading":"scalar","priceCopy":"scalar","button":{"label":"scalar","href":"scalar","newWindow":"scalar"}},"enquiry":{"heading":"scalar","introduction":"scalar","form":{"recordId":"scalar"},"specialistName":"scalar"},"seo":{"schemaVersion":"scalar","title":"scalar","description":"scalar","canonical":"scalar","indexing":"scalar","following":"scalar","socialTitle":"scalar","socialDescription":"scalar","socialImage":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"breadcrumbLabel":"scalar","sitemap":"scalar"}}'::jsonb);
 if payload is null then return null; end if;
 foreach field in array array['title','category','skill','groupSize','duration','description','intro','mentor','heroTitle','heroCopy','price'] loop
  if jsonb_typeof(payload->field) is distinct from 'string' or length(btrim(payload->>field))=0 then return null; end if;
 end loop;
 if jsonb_typeof(payload->'image'->'assetId') is distinct from 'string' or jsonb_typeof(payload->'heroImage'->'assetId') is distinct from 'string' then return null; end if;
 if exists(select 1 from jsonb_path_query(payload,'$.**.assetId') v where jsonb_typeof(v)<>'string') then return null; end if;
 for asset in select distinct value #>> '{}' from jsonb_path_query(payload,'$.**.assetId') value loop
  if not exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=asset and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now())) then return null; end if;
 end loop;
 if jsonb_typeof(payload->'specialists') is distinct from 'array' or jsonb_array_length(payload->'specialists')>20 then return null; end if;
 if exists(select 1 from jsonb_array_elements(payload->'specialists') v where jsonb_typeof(v)<>'object' or coalesce(v->>'recordId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' or coalesce(v->>'role','') not in ('mentor','guide'))
  or exists(select 1 from jsonb_array_elements(payload->'specialists') v group by v->>'recordId',v->>'role' having count(*)>1) then return null; end if;
 for target in select distinct (v->>'recordId')::uuid from jsonb_array_elements(payload->'specialists') v loop
  related:=cms.get_public_specialist(p_site,target,p_locale);if related is null then return null; end if;
  refs:=refs||jsonb_build_array(jsonb_build_object('websiteId',p_site,'recordId',target,'publishedRevisionId',related->'revisionId','type','specialist','locale',p_locale,'name',related->'payload'->'name'));
 end loop;
 if coalesce(payload->'enquiry'->'form'->>'recordId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then return null; end if;
 form_id:=(payload->'enquiry'->'form'->>'recordId')::uuid;
 form_value:=cms.get_published_form(p_site,form_id);
 if form_value is null or form_value->>'locale' is distinct from p_locale or form_value->'definition'->'schemaVersion' is distinct from '1'::jsonb or jsonb_typeof(form_value->'definition'->'fields') is distinct from 'array' then return null; end if;
 if jsonb_array_length(form_value->'definition'->'fields') not between 1 and 50 or exists(select 1 from jsonb_array_elements(form_value->'definition'->'fields') f where f->>'type'='file') then return null; end if;
 return jsonb_build_object('page',jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',rec.published_revision_id,'type','photoExpedition','locale',p_locale,'payload',payload),
  'references',jsonb_build_object('specialists',refs,'form',jsonb_build_object('websiteId',p_site,'recordId',form_id,'publishedRevisionId',form_value->'revisionId','type','form','locale',p_locale)));
end $$;
revoke all on function cms.get_public_expedition(uuid,text,text) from public;
grant execute on function cms.get_public_expedition(uuid,text,text) to anon,authenticated;
commit;
