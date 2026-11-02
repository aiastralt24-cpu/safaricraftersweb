begin;
-- Public homepage delivery remains policy-gated. Selectors allow only known
-- presentation fields; internal statistic evidence never crosses this boundary.
create function cms.homepage_section_visible(p_section jsonb,p_locale text)
returns boolean language plpgsql stable set search_path='' as $$
declare c jsonb; start_at timestamptz; end_at timestamptz;
begin
 c:=p_section->'controls';
 if c->'visible' is distinct from 'true'::jsonb or jsonb_typeof(c->'locales') is distinct from 'array'
 or jsonb_typeof(c->'regions') is distinct from 'array' then return false; end if;
 -- Region-restricted delivery requires an authenticated audience context not yet implemented.
 if jsonb_array_length(c->'regions')<>0 then return false; end if;
 if jsonb_array_length(c->'locales')<>0 and not (c->'locales' ? p_locale) then return false; end if;
 if c ? 'visibleFrom' then
  if jsonb_typeof(c->'visibleFrom')<>'string' or c->>'visibleFrom' !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then return false; end if;
  start_at:=(c->>'visibleFrom')::timestamptz;
 end if;
 if c ? 'visibleUntil' then
  if jsonb_typeof(c->'visibleUntil')<>'string' or c->>'visibleUntil' !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then return false; end if;
  end_at:=(c->>'visibleUntil')::timestamptz;
 end if;
 return (start_at is null or start_at<=now()) and (end_at is null or end_at>now()) and (start_at is null or end_at is null or start_at<end_at);
exception when others then return false;
end $$;
create function cms.get_public_homepage(p_site uuid,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; raw jsonb; section jsonb; projected jsonb; selectors jsonb; sections jsonb:='[]'; payload jsonb;
begin
 if p_locale is distinct from 'en' then return null; end if;
 select * into rec from cms.records where website_id=p_site and content_type='homepage' and path='/' and locale=p_locale and published_revision_id is not null;
 if not found then return null; end if;
 if not exists(select 1 from cms.validations checked join cms.validation_policy policy on policy.content_type='homepage' and policy.validator_version=checked.validator_version where checked.revision_id=rec.published_revision_id and checked.valid and checked.validator_version='homepage-1') then return null; end if;
 select v.payload into raw from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 if jsonb_typeof(raw#>'{composition,sections}') is distinct from 'array' or not cms.record_media_available(p_site,'homepage',raw) then return null; end if;
 selectors:='{"homepageHero":{"navigationLabel":"scalar","frames":[{"id":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]}}],"copy":"scalar","poster":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"mobilePoster":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"framing":{"x":"scalar","y":"scalar","shape":"scalar"},"mobileFraming":{"x":"scalar","y":"scalar","shape":"scalar"},"background":{"kind":"scalar","desktopAssetId":"scalar","mobileAssetId":"scalar"}},"homepageStory":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"copy":"scalar","button":{"label":"scalar","href":"scalar","newWindow":"scalar"},"ledgerTitle":"scalar","statistics":[{"id":"scalar","value":"scalar","suffix":"scalar","label":"scalar"}]},"homepageJourneyTypes":{"heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"items":[{"id":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"copy":{"runs":[{"text":"scalar","strong":"scalar"}]},"image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"link":{"label":"scalar","href":"scalar","newWindow":"scalar"}}]},"homepageJourneys":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"introduction":"scalar","button":{"label":"scalar","href":"scalar","newWindow":"scalar"},"cardActionLabel":"scalar","items":[{"recordId":"scalar","kicker":"scalar"}]},"homepageDepartures":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"button":{"label":"scalar","href":"scalar","newWindow":"scalar"},"cardActionLabel":"scalar","boardLabel":"scalar","emptyMessage":"scalar","overrides":[{"recordId":"scalar","title":"scalar","location":"scalar"}]},"homepageCorporate":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"paragraphs":[{"id":"scalar","text":"scalar"}],"formats":[{"id":"scalar","label":"scalar","title":"scalar","href":"scalar"}],"button":{"label":"scalar","href":"scalar","newWindow":"scalar"},"mainImage":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"insetImage":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"mainFocalPoint":{"x":"scalar","y":"scalar"},"mainMobileFocalPoint":{"x":"scalar","y":"scalar"},"insetFocalPoint":{"x":"scalar","y":"scalar"},"insetMobileFocalPoint":{"x":"scalar","y":"scalar"}},"homepageAviation":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"copy":"scalar","benefitsLabel":"scalar","benefits":[{"id":"scalar","text":"scalar"}],"button":{"label":"scalar","href":"scalar","newWindow":"scalar"},"image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"desktopFraming":{"x":"scalar","y":"scalar","shape":"scalar"},"mobileFraming":{"x":"scalar","y":"scalar","shape":"scalar"}},"homepagePartners":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"defaultRegionId":"scalar","regions":[{"id":"scalar","label":"scalar","items":[{"id":"scalar","name":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"}}]}]},"homepageGuestNotes":{"eyebrow":"scalar","heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"button":{"label":"scalar","href":"scalar","newWindow":"scalar"},"cardActionLabel":"scalar","previousLabel":"scalar","nextLabel":"scalar","items":[{"recordId":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"href":"scalar"}]},"homepageConcierge":{"heading":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"prompt":{"lines":[{"runs":[{"text":"scalar","emphasis":"scalar"}]}]},"choices":[{"id":"scalar","link":{"label":"scalar","href":"scalar","newWindow":"scalar"}}],"contact":{"label":"scalar","href":"scalar","newWindow":"scalar"}}}'::jsonb;
 for section in select value from jsonb_array_elements(raw#>'{composition,sections}') loop
  if not cms.homepage_section_visible(section,p_locale) then continue; end if;
  if not (selectors ? (section->>'kind')) then return null; end if;
  projected:=cms.project_settings_fields(section->'data',selectors->(section->>'kind'));
  sections:=sections||jsonb_build_array(jsonb_build_object('id',section->'id','kind',section->'kind','controls',cms.project_settings_fields(section->'controls','{"label":"scalar","visible":"scalar","anchor":"scalar","background":"scalar","width":"scalar","spacing":"scalar","textAlign":"scalar","mediaAlign":"scalar","mobileOrder":"scalar","headingLevel":"scalar","animation":"scalar","visibleFrom":"scalar","visibleUntil":"scalar","locales":["scalar"],"regions":["scalar"]}'::jsonb),'data',projected));
 end loop;
 payload:=jsonb_build_object('composition',jsonb_build_object('schemaVersion',raw#>'{composition,schemaVersion}','title',raw#>'{composition,title}','sections',sections));
 if raw ? 'seo' then payload:=payload||jsonb_build_object('seo',cms.project_settings_fields(raw->'seo','{"schemaVersion":"scalar","title":"scalar","description":"scalar","canonical":"scalar","indexing":"scalar","following":"scalar","socialTitle":"scalar","socialDescription":"scalar","socialImage":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"breadcrumbLabel":"scalar","sitemap":"scalar"}'::jsonb));end if;
 return jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',rec.published_revision_id,'type','homepage','payload',payload);
end $$;
revoke all on function cms.homepage_section_visible(jsonb,text),cms.get_public_homepage(uuid,text) from public;
grant execute on function cms.get_public_homepage(uuid,text) to anon,authenticated;
commit;
