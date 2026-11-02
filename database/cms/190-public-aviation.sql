begin;
-- Allowlisted payload projection; independent of publishing authority.
create function cms.project_aviation_payload(p_raw jsonb,p_locale text)
returns jsonb language plpgsql stable set search_path='' as $$
declare selectors jsonb; section jsonb; projected jsonb; sections jsonb:='[]'; result jsonb; controls jsonb;
begin
 if p_locale is distinct from 'en' or jsonb_typeof(p_raw#>'{composition,sections}') is distinct from 'array' then return null; end if;
 selectors:='{"aviationHero":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"copy":"scalar","button":{"label":"scalar","href":"scalar","newWindow":"scalar"},"captions":{"primary":"scalar","secondary":"scalar","showSecondaryOnMobile":"scalar"},"media":{"poster":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"mobilePoster":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"background":{"kind":"scalar","desktopAssetId":"scalar","mobileAssetId":"scalar"},"desktopFraming":{"x":"scalar","y":"scalar","shape":"scalar"},"mobileFraming":{"x":"scalar","y":"scalar","shape":"scalar"}}},"aviationIntroduction":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"paragraphs":[{"id":"scalar","text":"scalar"}],"button":{"label":"scalar","href":"scalar","newWindow":"scalar"},"sequenceLabel":"scalar","steps":[{"id":"scalar","title":"scalar","copy":"scalar"}]},"aviationFleet":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"introduction":"scalar","aircraft":[{"id":"scalar","name":"scalar","type":"scalar","summary":"scalar","media":{"image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"mobileImage":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"desktopFraming":{"x":"scalar","y":"scalar","shape":"scalar"},"mobileFraming":{"x":"scalar","y":"scalar","shape":"scalar"}},"specifications":[{"id":"scalar","label":"scalar","value":"scalar"}]}],"sourceNote":"scalar"},"aviationJourney":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"media":{"image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"mobileImage":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"desktopFraming":{"x":"scalar","y":"scalar","shape":"scalar"},"mobileFraming":{"x":"scalar","y":"scalar","shape":"scalar"}},"steps":[{"id":"scalar","title":"scalar","copy":"scalar"}]},"aviationServices":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"introduction":"scalar","items":[{"id":"scalar","title":"scalar","copy":"scalar"}]}}'::jsonb;
 for section in select value from jsonb_array_elements(p_raw#>'{composition,sections}') loop
  if not cms.homepage_section_visible(section,p_locale) then continue; end if;
  if not(selectors ? (section->>'kind')) then return null; end if;
  projected:=cms.project_settings_fields(section->'data',selectors->(section->>'kind'));
  if section->>'kind'='aviationHero' and section#>>'{data,media,background,kind}'='image' then projected:=jsonb_set(projected,'{media,background}',jsonb_build_object('kind','image')); end if;
  controls:=cms.project_settings_fields(section->'controls','{"visible":"scalar","anchor":"scalar","background":"scalar","width":"scalar","spacing":"scalar","textAlign":"scalar","mediaAlign":"scalar","mobileOrder":"scalar","headingLevel":"scalar","animation":"scalar","visibleFrom":"scalar","visibleUntil":"scalar","locales":["scalar"],"regions":["scalar"]}'::jsonb)||jsonb_build_object('label',section->>'kind');
  sections:=sections||jsonb_build_array(cms.project_settings_fields(section,'{"id":"scalar","kind":"scalar"}'::jsonb)||jsonb_build_object('controls',controls,'data',projected));
 end loop;
 result:=jsonb_build_object('composition',cms.project_settings_fields(p_raw->'composition','{"schemaVersion":"scalar","title":"scalar"}'::jsonb)||jsonb_build_object('sections',sections));
 if p_raw ? 'seo' then result:=result||jsonb_build_object('seo',cms.project_settings_fields(p_raw->'seo','{"schemaVersion":"scalar","title":"scalar","description":"scalar","canonical":"scalar","indexing":"scalar","following":"scalar","socialTitle":"scalar","socialDescription":"scalar","breadcrumbLabel":"scalar","sitemap":"scalar","socialImage":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"}}'::jsonb));end if;
 return result;
end $$;
revoke all on function cms.project_aviation_payload(jsonb,text) from public;
create function cms.get_public_aviation(p_site uuid,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; raw jsonb; payload jsonb; href text;
begin
 if p_locale is distinct from 'en' then return null; end if;
 select * into rec from cms.records where website_id=p_site and content_type='page' and path='/private-aviation' and locale=p_locale and published_revision_id is not null;
 if not found then return null; end if;
 if not exists(select 1 from cms.validations checked join cms.validation_policy policy on policy.content_type='page' and policy.validator_version=checked.validator_version where checked.revision_id=rec.published_revision_id and checked.valid and checked.validator_version='composition-5') then return null; end if;
 select v.payload into raw from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 payload:=cms.project_aviation_payload(raw,p_locale);
 -- The explicit hero-video media profile still checks every current image/video;
 -- this getter does not relax the separate page publication gate.
 if payload is null or not cms.record_media_available(p_site,'homepage',payload) then return null; end if;
 for href in select value from cms.aviation_configured_links(payload#>'{composition,sections}') value loop
  if not cms.aviation_href_available(p_site,href,p_locale) then return null; end if;
 end loop;
 return jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',rec.published_revision_id,'type','page','path','/private-aviation','locale',p_locale,'payload',payload);
end $$;
revoke all on function cms.get_public_aviation(uuid,text) from public;
grant execute on function cms.get_public_aviation(uuid,text) to anon,authenticated;
commit;
