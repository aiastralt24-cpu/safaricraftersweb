begin;
create function cms.application_related_public_cards(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p_locale text;current_page jsonb;payload jsonb;target cms.records;source_id uuid;queue uuid[];seen uuid[]:='{}';node uuid;ref jsonb;kind text;delivered jsonb;title text;href text;cards jsonb:='[]';
begin
 select locale into p_locale from cms.records where website_id=p_site and id=p_record and content_type='application';if not found or p_locale<>'en' then return null;end if;
 source_id:=p_record;queue:=array[source_id];
 while cardinality(queue)>0 loop
  node:=queue[1];queue:=queue[2:];if node=any(seen) then continue;end if;
  seen:=array_append(seen,node);if cardinality(seen)>1000 then return null;end if;
  select * into target from cms.records where website_id=p_site and id=node and content_type='application' and locale=p_locale;
  if not found then return null;end if;
  if node=source_id then
   select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=node and v.id=p_revision;if not found then return null;end if;
  else
   current_page:=cms.get_public_application_snapshot(p_site,target.path,p_locale);if current_page is null then return null;end if;
   select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=node and v.id=(current_page->>'revisionId')::uuid;
  end if;
  foreach kind in array array['application','project','journalArticle','document'] loop
   for ref in select value from jsonb_array_elements(coalesce(payload#>array['relationships',case kind when 'application' then 'applications' when 'project' then 'projects' when 'journalArticle' then 'articles' else 'documents' end],'[]')) loop
    select * into target from cms.records where website_id=p_site and id=(ref->>'recordId')::uuid and content_type=kind and locale=p_locale and (published_revision_id is not null or id=source_id);
    if not found or target.id=node then return null;end if;href:=target.path;
    if kind='application' then
     if target.id=source_id then delivered:='{}';title:='Candidate root';else delivered:=cms.get_public_application_snapshot(p_site,target.path,p_locale);title:=delivered#>>'{payload,title}';end if;
     if not target.id=any(seen) and not target.id=any(queue) then queue:=array_append(queue,target.id);end if;
     if cardinality(seen)+cardinality(queue)>1000 then return null;end if;
    elsif kind='project' then delivered:=cms.get_public_project(p_site,target.path,p_locale);title:=delivered#>>'{payload,title}';
    elsif kind='journalArticle' then delivered:=cms.get_public_journal_article(p_site,target.path,p_locale);title:=delivered#>>'{payload,title}';
    else
     delivered:=cms.get_document_download(p_site,target.id);if delivered->>'access' is distinct from 'public' then return null;end if;
     select v.payload->>'title' into title from cms.revisions v where v.website_id=p_site and v.record_id=target.id and v.id=target.published_revision_id;
     href:='/api/documents/download?record='||target.id::text||'&revision='||target.published_revision_id::text;
    end if;
    if delivered is null or title is null or length(btrim(title))=0 or href is null then return null;end if;
    if node=source_id then cards:=cards||jsonb_build_array(jsonb_build_object('type',kind,'title',title,'href',href));if jsonb_array_length(cards)>150 then return null;end if;end if;
   end loop;
  end loop;
 end loop;
 return cards;
exception when invalid_text_representation or invalid_parameter_value then return null;
end $$;
revoke all on function cms.application_related_public_cards(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create or replace function cms.get_public_application(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare page jsonb;cards jsonb;
begin
 page:=cms.get_public_application_snapshot(p_site,p_path,p_locale);if page is null then return null;end if;
 cards:=cms.application_related_public_cards(p_site,(page->>'recordId')::uuid,(page->>'revisionId')::uuid);if cards is null then return null;end if;
 return page||jsonb_build_object('related',cards);
end $$;
-- Retain the trigger identity used by reader fixtures; replace the temporary stop.
create or replace function cms.enforce_application_draft_identity()
returns trigger language plpgsql security definer set search_path='' as $$
declare draft_payload jsonb;e jsonb;
begin
 if new.content_type<>'application' then return new;end if;
 if new.path is null or new.path !~ '^/(applications|industries)/[a-z0-9]+(-[a-z0-9]+)*$' or length(new.path)>114 then raise exception 'application_route_invalid';end if;
 if new.published_revision_id is null then return new;end if;
 -- Saving a newer draft must not require reapproval of the already published version.
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id
 and new.content_type is not distinct from old.content_type and new.path is not distinct from old.path
 and new.locale is not distinct from old.locale then return new;end if;
 if new.current_revision_id is distinct from new.published_revision_id or new.approved_revision_id is distinct from new.published_revision_id or new.review_status<>'approved' then raise exception 'approved_revision_required';end if;
 if not exists(select 1 from cms.validations v join cms.validation_policy p on p.content_type='application' and p.validator_version=v.validator_version
 where v.revision_id=new.published_revision_id and v.valid and v.validator_version='application-1' and v.expires_at>now()) then raise exception 'validated_revision_required';end if;
 select v.payload into draft_payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if draft_payload is null or draft_payload->>'schemaVersion' is distinct from '1' or new.locale is distinct from 'en'
 or new.path is null or new.path !~ '^/(applications|industries)/[a-z0-9]+(-[a-z0-9]+)*$' or draft_payload->>'kind' is null or draft_payload->>'kind' not in ('application','industry') or new.path is distinct from (case draft_payload->>'kind' when 'industry' then '/industries/' else '/applications/' end)||(draft_payload->>'slug') then raise exception 'application_publication_identity';end if;
 -- Pin directly selected records and media while validating the release.
 perform r.id from cms.records r where r.website_id=new.website_id and r.id<>new.id and r.id in (
  select (ref->>'recordId')::uuid from jsonb_each(coalesce(draft_payload->'relationships','{}')) groups
  cross join lateral jsonb_array_elements(groups.value) ref
  union select (ref->>'recordId')::uuid from jsonb_array_elements(coalesce(draft_payload->'claims','[]')) claim cross join lateral jsonb_array_elements(coalesce(claim->'evidence','[]')) ref
 ) order by r.id for share;
 perform m.id from cms.media_objects m where m.website_id=new.website_id and m.id in (
  select value#>>'{}' from jsonb_path_query(draft_payload,'$.**.assetId') value where jsonb_typeof(value)='string'
 ) order by m.id for share;
 -- Pin private evidence files and reviewer assignments during release.
 perform f.id from cms.document_files f where f.website_id=new.website_id and f.id in (
 select (v.payload#>>'{file,assetId}')::uuid from cms.records d join cms.revisions v on v.website_id=d.website_id and v.record_id=d.id and v.id=d.current_revision_id
 where d.website_id=new.website_id and d.id in(select (ref->>'recordId')::uuid from jsonb_array_elements(coalesce(draft_payload->'claims','[]')) c cross join lateral jsonb_array_elements(coalesce(c->'evidence','[]')) ref)
 ) order by f.id for share;
 perform o.claim_id from cms.application_claim_owners o where o.website_id=new.website_id and o.record_id=new.id and o.revision_id=new.published_revision_id order by o.claim_id for share;
 perform a.id from cms.application_claim_approvals a where a.website_id=new.website_id and a.record_id=new.id and a.revision_id=new.published_revision_id order by a.id for share;
 if jsonb_array_length(coalesce(draft_payload#>'{relationships,products}','[]'))>0 then raise exception 'application_product_delivery_not_ready';end if;
 -- A validation receipt is not permission to use evidence revoked since validation.
 e:=cms.get_application_validation_evidence(new.website_id,new.id,new.published_revision_id);
 if e is null or exists(select 1 from jsonb_array_elements(e->'claims') x where x->>'approved' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'media') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'links') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'references') x where x->>'available' is distinct from 'true' or x->>'published' is distinct from 'true' or x->>'locale' is distinct from new.locale)
 then raise exception 'application_publication_evidence_changed';end if;
 if cms.application_related_public_cards(new.website_id,new.id,new.published_revision_id) is null then raise exception 'application_publication_relationship_unavailable';end if;
 return new;
end $$;
revoke all on function cms.enforce_application_draft_identity() from public,anon,authenticated,service_role;
commit;
