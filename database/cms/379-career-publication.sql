begin;
create function cms.career_related_public_cards(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p_locale text;payload jsonb;ref jsonb;target cms.records;kind text;delivered jsonb;title text;href text;cards jsonb:='[]';
begin
 select locale into p_locale from cms.records where website_id=p_site and id=p_record and content_type='career';if not found or p_locale<>'en' then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;if not found then return null;end if;
 foreach kind in array array['location','page','document'] loop
  for ref in select value from jsonb_array_elements(coalesce(payload#>array['relationships',case kind when 'location' then 'locations' when 'page' then 'pages' else 'documents' end],'[]')) loop
   select * into target from cms.records where website_id=p_site and id=(ref->>'recordId')::uuid and content_type=kind and locale=p_locale and published_revision_id is not null;
   if not found then return null;end if;href:=target.path;
   if kind='location' then delivered:=cms.get_public_location(p_site,target.path,p_locale);title:=delivered#>>'{payload,title}';
   elsif kind='page' then delivered:=cms.get_public_page(p_site,target.path,p_locale);title:=coalesce(delivered#>>'{payload,title}',delivered#>>'{payload,composition,title}');
   else
    delivered:=cms.get_document_download(p_site,target.id);if delivered->>'access' is distinct from 'public' then return null;end if;
    select v.payload->>'title' into title from cms.revisions v where v.website_id=p_site and v.record_id=target.id and v.id=target.published_revision_id;
    href:='/api/documents/download?record='||target.id::text||'&revision='||target.published_revision_id::text;
   end if;
   if delivered is null or title is null or length(btrim(title))=0 or href is null then return null;end if;
   cards:=cards||jsonb_build_array(jsonb_build_object('type',kind,'recordId',target.id,'title',title,'href',href));if jsonb_array_length(cards)>90 then return null;end if;
  end loop;
 end loop;
 return cards;
exception when invalid_text_representation or invalid_parameter_value then return null;
end $$;
revoke all on function cms.career_related_public_cards(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create or replace function cms.get_public_career(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare page jsonb;cards jsonb;
begin
 page:=cms.get_public_career_snapshot(p_site,p_path,p_locale);if page is null then return null;end if;
 cards:=cms.career_related_public_cards(p_site,(page->>'recordId')::uuid,(page->>'revisionId')::uuid);if cards is null then return null;end if;
 return page||jsonb_build_object('related',cards);
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
 ) order by r.id for share;
 perform m.id from cms.media_objects m where m.website_id=new.website_id and m.id in (
  select value#>>'{}' from jsonb_path_query(draft_payload,'$.**.assetId') value where jsonb_typeof(value)='string'
 ) order by m.id for share;
 -- Form submissions must be bound to the published job and its application window.
 -- Keep this path fenced until that intake integration is implemented.
 if draft_payload#>>'{application,mode}'='form' then raise exception 'career_application_delivery_not_ready';end if;
 -- A validation receipt is not permission to use evidence revoked since validation.
 e:=cms.get_career_validation_evidence(new.website_id,new.id,new.published_revision_id);
 if e is null or exists(select 1 from jsonb_array_elements(e->'media') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'links') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'references') x where x->>'available' is distinct from 'true' or x->>'published' is distinct from 'true' or x->>'locale' is distinct from new.locale)
 then raise exception 'career_publication_evidence_changed';end if;
 if cms.career_related_public_cards(new.website_id,new.id,new.published_revision_id) is null then raise exception 'career_publication_relationship_unavailable';end if;
 return new;
end $$;
revoke all on function cms.enforce_career_draft_identity() from public,anon,authenticated,service_role;
commit;
