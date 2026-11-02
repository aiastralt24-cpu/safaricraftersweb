begin;
create function cms.get_public_specialist(p_site uuid,p_record uuid,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; raw jsonb; payload jsonb; refs jsonb; field text; max_length integer;
begin
 if p_locale is distinct from 'en' then return null; end if;
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='specialist' and locale=p_locale and path is null and published_revision_id is not null;
 if not found then return null; end if;
 select v.payload into raw from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 -- Film delivery is not implemented; do not silently omit a published film.
 if raw->'schemaVersion' is distinct from '1'::jsonb or raw->'visible' is distinct from 'true'::jsonb or raw ? 'video' then return null; end if;
 payload:=cms.project_settings_fields(raw,'{"schemaVersion":"scalar","name":"scalar","kind":"scalar","visible":"scalar","sortOrder":"scalar","role":"scalar","expertise":"scalar","bio":"scalar","moment":"scalar","image":{"assetId":"scalar","alt":"scalar","decorative":"scalar","caption":"scalar","credit":"scalar"},"planning":{"label":"scalar","enquiryName":"scalar"},"journeys":[{"recordId":"scalar"}],"expeditions":[{"recordId":"scalar"}]}'::jsonb);
 if payload is null or coalesce(payload->>'kind','') not in ('person','team') or jsonb_typeof(payload->'sortOrder') is distinct from 'number' or (payload->>'sortOrder') !~ '^[0-9]{1,4}$' then return null; end if;
 foreach field in array array['name','role','expertise','bio','moment'] loop
  max_length:=case field when 'name' then 200 when 'role' then 200 when 'expertise' then 2000 when 'bio' then 10000 else 5000 end;
  if jsonb_typeof(payload->field) is distinct from 'string' or length(payload->>field)>max_length or (field<>'moment' and length(btrim(payload->>field))=0) then return null; end if;
 end loop;
 if jsonb_typeof(payload->'planning'->'label') is distinct from 'string' or length(btrim(payload->'planning'->>'label')) not between 1 and 80
  or jsonb_typeof(payload->'planning'->'enquiryName') is distinct from 'string' or length(btrim(payload->'planning'->>'enquiryName')) not between 1 and 200 then return null; end if;
 if jsonb_typeof(payload->'image'->'assetId') is distinct from 'string' or jsonb_typeof(payload->'image'->'alt') is distinct from 'string' or length(payload->'image'->>'alt')>500
  or jsonb_typeof(payload->'image'->'decorative') is distinct from 'boolean' or (payload->'image'->'decorative'='false'::jsonb and length(btrim(payload->'image'->>'alt'))=0) then return null; end if;
 if not exists(select 1 from cms.media_objects where website_id=p_site and id=payload->'image'->>'assetId' and mime_type='image/webp' and inspection_status='ready' and rights_status='approved' and archived_at is null and (rights_expires_at is null or rights_expires_at>now())) then return null; end if;
 foreach field in array array['journeys','expeditions'] loop
  if jsonb_typeof(payload->field) is distinct from 'array' then return null; end if;
  if exists(select 1 from jsonb_array_elements(payload->field) v group by v->>'recordId' having count(*)>1) then return null; end if;
 end loop;
 -- Resolve only current published links; unsupported expedition delivery stays unavailable.
 refs:=cms.navigation_reference_evidence(p_site,jsonb_build_object('journeys',payload->'journeys','expeditions',payload->'expeditions'),p_locale);
 if refs is null or exists(select 1 from jsonb_array_elements(refs) v where v->'available' is distinct from 'true'::jsonb) then return null; end if;
 if exists(select 1 from jsonb_array_elements(payload->'journeys') j where not exists(select 1 from jsonb_array_elements(refs) r where r->>'recordId'=j->>'recordId' and r->>'type'='journey'))
  or jsonb_array_length(payload->'expeditions')>0 then return null; end if;
 return jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',rec.published_revision_id,'locale',rec.locale,'payload',payload,'references',refs);
end $$;
revoke all on function cms.get_public_specialist(uuid,uuid,text) from public;
grant execute on function cms.get_public_specialist(uuid,uuid,text) to anon,authenticated;
create or replace function cms.media_is_published(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=p_asset
  and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null
  and (m.rights_expires_at is null or m.rights_expires_at>now())
  and exists(select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
   where r.website_id=p_site and (r.path is not null or r.content_type in ('settings','specialist')) and (
    (r.content_type='settings' and exists(select 1 from jsonb_path_query(cms.get_public_settings(p_site,r.locale)->'payload','$.**.assetId') value where value=to_jsonb(p_asset)))
    or (r.content_type='specialist' and cms.get_public_specialist(p_site,r.id,r.locale)->'payload'->'image'->>'assetId'=p_asset)
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
-- No specialist validation policy or website rollout is enabled.
commit;
