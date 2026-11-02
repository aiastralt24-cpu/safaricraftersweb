begin;
create function cms.partner_related_public_cards(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p_locale text;payload jsonb;ref jsonb;target cms.records;kind text;delivered jsonb;title text;href text;cards jsonb:='[]';
begin
 select locale into p_locale from cms.records where website_id=p_site and id=p_record and content_type='partner';if not found or p_locale<>'en' then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;if not found then return null;end if;
 foreach kind in array array['application','location','certification','document'] loop
  for ref in select value from jsonb_array_elements(coalesce(payload#>array['relationships',case kind when 'application' then 'applications' when 'location' then 'locations' when 'certification' then 'certifications' else 'documents' end],'[]')) loop
   select * into target from cms.records where website_id=p_site and id=(ref->>'recordId')::uuid and content_type=kind and locale=p_locale and published_revision_id is not null;
   if not found then return null;end if;href:=target.path;
   if kind='application' then delivered:=cms.get_public_application(p_site,target.path,p_locale);title:=delivered#>>'{payload,title}';
   elsif kind='location' then delivered:=cms.get_public_location(p_site,target.path,p_locale);title:=delivered#>>'{payload,title}';
   elsif kind='certification' then delivered:=cms.get_public_certification(p_site,target.path,p_locale);title:=delivered#>>'{payload,title}';
   else
    delivered:=cms.get_document_download(p_site,target.id);if delivered->>'access' is distinct from 'public' then return null;end if;
    select v.payload->>'title' into title from cms.revisions v where v.website_id=p_site and v.record_id=target.id and v.id=target.published_revision_id;
    href:='/api/documents/download?record='||target.id::text||'&revision='||target.published_revision_id::text;
   end if;
   if delivered is null or title is null or length(btrim(title))=0 or href is null then return null;end if;
   cards:=cards||jsonb_build_array(jsonb_build_object('type',kind,'title',title,'href',href));if jsonb_array_length(cards)>150 then return null;end if;
  end loop;
 end loop;
 return cards;
exception when invalid_text_representation or invalid_parameter_value then return null;
end $$;
revoke all on function cms.partner_related_public_cards(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create or replace function cms.get_public_partner(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare page jsonb;cards jsonb;
begin
 page:=cms.get_public_partner_snapshot(p_site,p_path,p_locale);if page is null then return null;end if;
 cards:=cms.partner_related_public_cards(p_site,(page->>'recordId')::uuid,(page->>'revisionId')::uuid);if cards is null then return null;end if;
 return page||jsonb_build_object('related',cards);
end $$;
create or replace function cms.enforce_partner_draft_identity()
returns trigger language plpgsql security definer set search_path='' as $$
declare draft_payload jsonb;e jsonb;
begin
 if new.content_type<>'partner' then return new;end if;
 if new.path is null or new.path !~ '^/partners/[a-z0-9]+(-[a-z0-9]+)*$' or length(new.path)>110 then raise exception 'partner_route_invalid';end if;
 if new.published_revision_id is null then return new;end if;
 -- Saving a newer draft must not require reapproval of the already published version.
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id
 and new.content_type is not distinct from old.content_type and new.path is not distinct from old.path
 and new.locale is not distinct from old.locale then return new;end if;
 if new.current_revision_id is distinct from new.published_revision_id or new.approved_revision_id is distinct from new.published_revision_id or new.review_status<>'approved' then raise exception 'approved_revision_required';end if;
 if not exists(select 1 from cms.validations v join cms.validation_policy p on p.content_type='partner' and p.validator_version=v.validator_version
 where v.revision_id=new.published_revision_id and v.valid and v.validator_version='partner-1' and v.expires_at>now()) then raise exception 'validated_revision_required';end if;
 select v.payload into draft_payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if draft_payload is null or draft_payload->>'status' is distinct from 'active' or draft_payload->>'schemaVersion' is distinct from '1' or new.locale is distinct from 'en'
 or new.path is null or new.path !~ '^/partners/[a-z0-9]+(-[a-z0-9]+)*$' or draft_payload->>'kind' is null or draft_payload->>'kind' not in ('dealer','servicePartner','both') or new.path is distinct from '/partners/'||(draft_payload->>'slug') then raise exception 'partner_publication_identity';end if;
 -- Pin directly selected records and media while validating the release.
 perform r.id from cms.records r where r.website_id=new.website_id and r.id<>new.id and r.id in (
  select (ref->>'recordId')::uuid from jsonb_each(coalesce(draft_payload->'relationships','{}')) groups
  cross join lateral jsonb_array_elements(groups.value) ref
 ) order by r.id for share;
 perform m.id from cms.media_objects m where m.website_id=new.website_id and m.id in (
  select value#>>'{}' from jsonb_path_query(draft_payload,'$.**.assetId') value where jsonb_typeof(value)='string'
 ) order by m.id for share;
 if jsonb_array_length(coalesce(draft_payload#>'{relationships,products}','[]'))>0 then raise exception 'partner_product_delivery_not_ready';end if;
 -- A validation receipt is not permission to use evidence revoked since validation.
 e:=cms.get_partner_validation_evidence(new.website_id,new.id,new.published_revision_id);
 if e is null or exists(select 1 from jsonb_array_elements(e->'media') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'links') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'references') x where x->>'available' is distinct from 'true' or x->>'published' is distinct from 'true' or x->>'locale' is distinct from new.locale)
 then raise exception 'partner_publication_evidence_changed';end if;
 if cms.partner_related_public_cards(new.website_id,new.id,new.published_revision_id) is null then raise exception 'partner_publication_relationship_unavailable';end if;
 return new;
end $$;
revoke all on function cms.enforce_partner_draft_identity() from public,anon,authenticated,service_role;
-- Admit only assets in the currently deliverable, allowlisted Partner projection.
-- Existing page families retain their prior admission checks.
alter function cms.media_is_published(uuid,text) rename to media_is_published_before_partner;
revoke all on function cms.media_is_published_before_partner(uuid,text) from public,anon,authenticated,service_role;
create function cms.media_is_published(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.media_is_published_before_partner(p_site,p_asset) or exists(
  select 1 from cms.records r
  where r.website_id=p_site and r.content_type='partner' and r.locale='en'
   and r.published_revision_id is not null
   and exists(select 1 from jsonb_path_query(
    cms.get_public_partner(p_site,r.path,r.locale)->'payload','$.**.assetId') asset
    where asset=to_jsonb(p_asset)));
$$;
revoke all on function cms.media_is_published(uuid,text) from public;
commit;
