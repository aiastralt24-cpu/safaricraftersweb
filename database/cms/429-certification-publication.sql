begin;
create or replace function cms.enforce_certification_draft_identity()
returns trigger language plpgsql security definer set search_path='' as $$
declare draft_payload jsonb;e jsonb;
begin
 if new.content_type<>'certification' then return new;end if;
 if new.path is null or new.path !~ '^/certifications/[a-z0-9]+(-[a-z0-9]+)*$' or length(new.path)>116 then raise exception 'certification_route_invalid';end if;
 if new.published_revision_id is null then return new;end if;
 -- Saving a newer draft must not require reapproval of the already published version.
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id
 and new.content_type is not distinct from old.content_type and new.path is not distinct from old.path
 and new.locale is not distinct from old.locale then return new;end if;
 if new.current_revision_id is distinct from new.published_revision_id or new.approved_revision_id is distinct from new.published_revision_id or new.review_status<>'approved' then raise exception 'approved_revision_required';end if;
 if not exists(select 1 from cms.validations v join cms.validation_policy p on p.content_type='certification' and p.validator_version=v.validator_version
 where v.revision_id=new.published_revision_id and v.valid and v.validator_version='certification-1' and v.expires_at>now()) then raise exception 'validated_revision_required';end if;
 select v.payload into draft_payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if draft_payload is null or draft_payload->>'schemaVersion' is distinct from '1' or new.locale is distinct from 'en'
 or new.path is distinct from '/certifications/'||(draft_payload->>'slug') then raise exception 'certification_publication_identity';end if;
 -- Pin directly selected records and media while validating the release.
 perform r.id from cms.records r where r.website_id=new.website_id and r.id<>new.id and r.id in (
  select (ref->>'recordId')::uuid from jsonb_each(coalesce(draft_payload->'relationships','{}')) groups
  cross join lateral jsonb_array_elements(groups.value) ref
  union select (ref->>'recordId')::uuid from jsonb_array_elements(coalesce(draft_payload->'evidence','[]')) ref
 ) order by r.id for share;
 perform m.id from cms.media_objects m where m.website_id=new.website_id and m.id in (
  select value#>>'{}' from jsonb_path_query(draft_payload,'$.**.assetId') value where jsonb_typeof(value)='string'
 ) order by m.id for share;
 -- Pin private evidence files and reviewer assignments during release.
 perform f.id from cms.document_files f where f.website_id=new.website_id and f.id in (
 select (v.payload#>>'{file,assetId}')::uuid from cms.records d join cms.revisions v on v.website_id=d.website_id and v.record_id=d.id and v.id=d.current_revision_id
 where d.website_id=new.website_id and d.id in(select (ref->>'recordId')::uuid from jsonb_array_elements(coalesce(draft_payload->'evidence','[]')) ref)
 ) order by f.id for share;
 perform o.claim_id from cms.certification_claim_owners o where o.website_id=new.website_id and o.record_id=new.id and o.revision_id=new.published_revision_id order by o.claim_id for share;
 perform a.id from cms.certification_claim_approvals a where a.website_id=new.website_id and a.record_id=new.id and a.revision_id=new.published_revision_id order by a.id for share;
 -- A validation receipt is not permission to use evidence revoked since validation.
 e:=cms.get_certification_validation_evidence(new.website_id,new.id,new.published_revision_id);
 if e is null or e->>'claimApproved' is distinct from 'true'
 or exists(select 1 from jsonb_array_elements(e->'media') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'references') x where x->>'available' is distinct from 'true' or x->>'published' is distinct from 'true' or x->>'locale' is distinct from new.locale)
 then raise exception 'certification_publication_evidence_changed';end if;
 return new;
end $$;
revoke all on function cms.enforce_certification_draft_identity() from public,anon,authenticated,service_role;
-- Admit only assets in the currently deliverable, allowlisted Certification projection.
-- Existing page families retain their prior admission checks.
alter function cms.media_is_published(uuid,text) rename to media_is_published_before_certification;
revoke all on function cms.media_is_published_before_certification(uuid,text) from public,anon,authenticated,service_role;
create function cms.media_is_published(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.media_is_published_before_certification(p_site,p_asset) or exists(
  select 1 from cms.records r
  where r.website_id=p_site and r.content_type='certification' and r.locale='en'
   and r.published_revision_id is not null
   and exists(select 1 from jsonb_path_query(
    cms.get_public_certification(p_site,r.path,r.locale)->'payload','$.**.assetId') asset
    where asset=to_jsonb(p_asset)));
$$;
revoke all on function cms.media_is_published(uuid,text) from public;
commit;
