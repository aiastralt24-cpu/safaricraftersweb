begin;
create or replace function cms.enforce_faq_draft_identity()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.content_type<>'faq' then return new;end if;
 if new.path is not null then raise exception 'faq_has_no_standalone_route';end if;
 if new.published_revision_id is null then return new;end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.content_type is not distinct from old.content_type and new.locale is not distinct from old.locale and new.path is not distinct from old.path then return new;end if;
 if new.current_revision_id is distinct from new.published_revision_id or new.approved_revision_id is distinct from new.published_revision_id or new.review_status<>'approved' then raise exception 'approved_revision_required';end if;
 if not exists(select 1 from cms.validations v join cms.validation_policy p on p.content_type='faq' and p.validator_version=v.validator_version where v.revision_id=new.published_revision_id and v.valid and v.validator_version='faq-1' and v.expires_at>now()) then raise exception 'validated_revision_required';end if;
 if new.locale is distinct from 'en' or not cms.faq_release_evidence_current(new.website_id,new.id,new.published_revision_id) then raise exception 'faq_publication_evidence_changed';end if;
 return new;
end $$;
revoke all on function cms.enforce_faq_draft_identity() from public,anon,authenticated,service_role;
drop trigger cms_faq_draft_identity on cms.records;
create trigger cms_faq_draft_identity before insert or update of content_type,path,locale,published_revision_id on cms.records for each row execute function cms.enforce_faq_draft_identity();
commit;
