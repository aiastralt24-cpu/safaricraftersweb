begin;
-- Shape arguments are deployment-owned and this recursive helper is private.
create function cms.project_settings_fields(p_value jsonb,p_shape jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb; field text; shape jsonb; child jsonb; value jsonb;
begin
 if p_shape='"scalar"'::jsonb then
  if jsonb_typeof(p_value) not in ('string','boolean','number') then return null; end if;
  return p_value;
 elsif jsonb_typeof(p_shape)='array' then
  if jsonb_typeof(p_value) is distinct from 'array' then return null; end if;
  if jsonb_array_length(p_value)>100 then return null; end if;
  result:='[]';
  for value in select v from jsonb_array_elements(p_value) v loop
   child:=cms.project_settings_fields(value,p_shape->0);if child is null then return null; end if;
   result:=result||jsonb_build_array(child);
  end loop;
  return result;
 elsif jsonb_typeof(p_shape)='object' then
  if jsonb_typeof(p_value) is distinct from 'object' then return null; end if;
  result:='{}';
  for field,shape in select entry.key,entry.value from jsonb_each(p_shape) entry loop
   if p_value ? field then
    child:=cms.project_settings_fields(p_value->field,shape);if child is null then return null; end if;
    result:=result||jsonb_build_object(field,child);
   end if;
  end loop;
  return result;
 end if;
 return null;
end $$;
create function cms.public_settings_payload(p_payload jsonb)
returns jsonb language sql immutable set search_path='' as $$
 select cms.project_settings_fields(p_payload, $shape${"schemaVersion":"scalar","brand":{"name":"scalar","tagline":"scalar","logo":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"mobileLogo":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"favicon":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"}},"contact":{"email":"scalar","phone":"scalar","addresses":[{"id":"scalar","label":"scalar","address":"scalar"}]},"header":{"variant":"scalar","sticky":"scalar","languageSelector":"scalar","mainMenu":{"recordId":"scalar"},"utilityMenu":{"recordId":"scalar"},"mobileMenu":{"recordId":"scalar"},"featuredContent":[{"recordId":"scalar"}],"cta":{"label":"scalar","href":"scalar","newWindow":"scalar"}},"footer":{"groups":[{"id":"scalar","title":"scalar","links":[{"id":"scalar","link":{"label":"scalar","href":"scalar","newWindow":"scalar"}}]}],"legalLinks":[{"id":"scalar","link":{"label":"scalar","href":"scalar","newWindow":"scalar"}}],"copyright":"scalar","disclaimer":"scalar","marks":[{"id":"scalar","label":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"}}]},"social":[{"id":"scalar","label":"scalar","url":"scalar"}],"announcement":{"enabled":"scalar","title":"scalar","body":"scalar","button":{"label":"scalar","href":"scalar","newWindow":"scalar"}},"stickyCta":{"enabled":"scalar","button":{"label":"scalar","href":"scalar","newWindow":"scalar"}},"cookies":{"title":"scalar","description":"scalar","acceptLabel":"scalar","rejectLabel":"scalar","preferencesLabel":"scalar","policy":{"label":"scalar","href":"scalar","newWindow":"scalar"}},"seo":{"titleTemplate":"scalar","description":"scalar","indexing":"scalar","socialImage":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"}},"fallbackImage":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"search":{"enabled":"scalar","placeholder":"scalar","emptyMessage":"scalar","contentTypes":["scalar"]},"errors":{"notFound":{"enabled":"scalar","title":"scalar","body":"scalar","button":{"label":"scalar","href":"scalar","newWindow":"scalar"}},"serverError":{"enabled":"scalar","title":"scalar","body":"scalar","button":{"label":"scalar","href":"scalar","newWindow":"scalar"}},"maintenance":{"enabled":"scalar","title":"scalar","body":"scalar","button":{"label":"scalar","href":"scalar","newWindow":"scalar"}}}}$shape$::jsonb);
$$;
create function cms.get_public_settings(p_site uuid,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb;
begin
 if p_locale is distinct from 'en' then return null; end if;
 select * into rec from cms.records where website_id=p_site and content_type='settings' and locale=p_locale and published_revision_id is not null;
 if not found then return null; end if;
 select cms.public_settings_payload(v.payload) into payload from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 if payload is null or payload->'schemaVersion' is distinct from '1'::jsonb or not cms.record_media_available(p_site,'settings',payload) then return null; end if;
 return jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',rec.published_revision_id,'locale',rec.locale,'payload',payload);
end $$;
revoke all on function cms.project_settings_fields(jsonb,jsonb),cms.public_settings_payload(jsonb),cms.get_public_settings(uuid,text) from public;
grant execute on function cms.get_public_settings(uuid,text) to anon,authenticated;
create or replace function cms.media_is_published(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=p_asset
  and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null
  and (m.rights_expires_at is null or m.rights_expires_at>now())
  and exists(select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
   where r.website_id=p_site and (r.path is not null or r.content_type='settings') and (
    (r.content_type='settings' and exists(select 1 from jsonb_path_query(cms.get_public_settings(p_site,r.locale)->'payload','$.**.assetId') value where value=to_jsonb(p_asset)))
    or (r.content_type in ('journey','page','homepage')
     and cms.record_media_available(p_site,r.content_type,v.payload)
     and exists(select 1 from jsonb_path_query(v.payload,'$.**.assetId') value where value=to_jsonb(p_asset)))
    or (r.content_type='destination'
     and (v.payload->'image'->>'assetId'=p_asset or v.payload->'heroImage'->>'assetId'=p_asset
      or v.payload->'seo'->'socialImage'->>'assetId'=p_asset
      or exists(select 1 from jsonb_path_query(v.payload,'$.gallery[*].assetId') value where value=to_jsonb(p_asset)))
     and cms.destination_delivery_references(p_site,r.id,r.locale) is not null)
    or (r.content_type='journalArticle'
     and exists(select 1 from jsonb_path_query(
      cms.get_public_journal_article(p_site,r.path,r.locale)->'payload','$.**.assetId') value
      where value=to_jsonb(p_asset)))
   )));
$$;
-- Settings publication remains disabled until all consumers and references are validated.
commit;
