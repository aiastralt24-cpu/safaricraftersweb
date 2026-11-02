begin;
-- Retain the trigger identity used by reader fixtures; replace the temporary stop.
create or replace function cms.enforce_event_draft_identity()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;e jsonb;
begin
 if new.content_type<>'event' then return new;end if;
 if new.path is null or new.path !~ '^/events/[a-z0-9]+(-[a-z0-9]+)*$' or length(new.path)>108 then raise exception 'event_route_invalid';end if;
 if new.published_revision_id is null then return new;end if;
 -- Saving a newer draft must not require reapproval of the already published version.
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id
 and new.content_type is not distinct from old.content_type and new.path is not distinct from old.path
 and new.locale is not distinct from old.locale then return new;end if;
 if new.current_revision_id is distinct from new.published_revision_id or new.approved_revision_id is distinct from new.published_revision_id or new.review_status<>'approved' then raise exception 'approved_revision_required';end if;
 if not exists(select 1 from cms.validations v join cms.validation_policy p on p.content_type='event' and p.validator_version=v.validator_version
 where v.revision_id=new.published_revision_id and v.valid and v.validator_version='event-1' and v.expires_at>now()) then raise exception 'validated_revision_required';end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if payload is null or payload->>'schemaVersion' is distinct from '1' or new.locale is distinct from 'en'
 or new.path is null or new.path !~ '^/events/[a-z0-9]+(-[a-z0-9]+)*$' or new.path is distinct from '/events/'||(payload->>'slug') then raise exception 'event_publication_identity';end if;
 -- Pin directly selected records and media while validating the release.
 perform r.id from cms.records r where r.website_id=new.website_id and r.id<>new.id and r.id in (
  select (ref->>'recordId')::uuid from jsonb_each(coalesce(payload->'relationships','{}')) groups
  cross join lateral jsonb_array_elements(groups.value) ref
 ) order by r.id for share;
 perform m.id from cms.media_objects m where m.website_id=new.website_id and m.id in (
  select value#>>'{}' from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string'
 ) order by m.id for share;
 -- A validation receipt is not permission to use evidence revoked since validation.
 e:=cms.get_event_validation_evidence(new.website_id,new.id,new.published_revision_id);
 if e is null or exists(select 1 from jsonb_array_elements(e->'media') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'links') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'references') x where x->>'available' is distinct from 'true' or x->>'published' is distinct from 'true' or x->>'locale' is distinct from new.locale)
 then raise exception 'event_publication_evidence_changed';end if;
 if cms.event_related_public_cards(new.website_id,new.id,new.published_revision_id) is null then raise exception 'event_publication_relationship_unavailable';end if;
 return new;
end $$;
revoke all on function cms.enforce_event_draft_identity() from public,anon,authenticated,service_role;
commit;
