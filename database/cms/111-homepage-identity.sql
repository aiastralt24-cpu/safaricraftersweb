begin;
-- Preserve legacy rows in place. New rows and future updates must use the root
-- route. Audit and explicitly migrate any old non-root homepage before editing;
-- never silently relocate it or overwrite another record's route.
alter table cms.records add constraint cms_homepage_root_path
 check (content_type <> 'homepage' or path is not distinct from '/') not valid;
commit;
