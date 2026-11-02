begin;
-- Fail rather than delete or merge pre-existing duplicate settings during migration.
create unique index cms_settings_per_locale on cms.records(website_id,locale) where content_type='settings';
alter table cms.records add constraint cms_settings_no_page_path check(content_type<>'settings' or path is null);

create function cms.settings_sensitive_change(p_before jsonb,p_after jsonb)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(p_before #>> '{seo,indexing}','index') is distinct from (p_after #>> '{seo,indexing}')
  or coalesce(p_before #>> '{errors,maintenance,enabled}','false') is distinct from (p_after #>> '{errors,maintenance,enabled}');
$$;
create function cms.guard_settings_revision()
returns trigger language plpgsql security definer set search_path='' as $$
declare rec cms.records; previous jsonb;
begin
 select * into rec from cms.records where website_id=new.website_id and id=new.record_id;
 if rec.content_type<>'settings' then return new; end if;
 if new.payload->'schemaVersion' is distinct from '1'::jsonb
  or (new.payload #>> '{seo,indexing}') is null or (new.payload #>> '{seo,indexing}') not in ('index','noindex')
  or jsonb_typeof(new.payload #> '{errors,maintenance,enabled}') is distinct from 'boolean' then raise exception 'invalid_sensitive_settings'; end if;
 select payload into previous from cms.revisions where id=rec.current_revision_id and record_id=rec.id and website_id=rec.website_id;
 if cms.settings_sensitive_change(previous,new.payload) and not cms.can(rec.website_id,'configure','settings',rec.id) then raise exception 'settings_configuration_permission_required' using errcode='42501'; end if;
 return new;
end $$;
create trigger cms_settings_revision_guard before insert on cms.revisions for each row execute function cms.guard_settings_revision();

-- Compare with the published revision, so a subsequent harmless edit cannot
-- remove elevated review/publish requirements from a pending sensitive change.
create function cms.guard_settings_release()
returns trigger language plpgsql security definer set search_path='' as $$
declare previous jsonb; candidate jsonb; target uuid;
begin
 if new.content_type<>'settings' then return new; end if;
 if new.published_revision_id is distinct from old.published_revision_id and new.published_revision_id is not null then target:=new.published_revision_id;
 elsif new.review_status='approved' and (old.review_status is distinct from new.review_status or old.approved_revision_id is distinct from new.approved_revision_id) then target:=new.approved_revision_id;
 else return new; end if;
 select payload into previous from cms.revisions where id=old.published_revision_id and record_id=new.id and website_id=new.website_id;
 select payload into candidate from cms.revisions where id=target and record_id=new.id and website_id=new.website_id;
 if cms.settings_sensitive_change(previous,candidate) and not cms.can(new.website_id,'configure','settings',new.id) then raise exception 'settings_configuration_permission_required' using errcode='42501'; end if;
 return new;
end $$;
create trigger cms_settings_release_guard before update of review_status,approved_revision_id,published_revision_id on cms.records for each row execute function cms.guard_settings_release();
revoke all on function cms.settings_sensitive_change(jsonb,jsonb),cms.guard_settings_revision(),cms.guard_settings_release() from public;
commit;
