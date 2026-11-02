begin;
-- Draft checks can be queued and retained while delivery/publication is unfinished.
-- This validator is diagnostic only, including when called by the trusted worker.
alter table cms.validations add constraint document_draft_validation_cannot_pass
 check (validator_version <> 'document-draft-1' or valid = false);
insert into cms.validation_policy(content_type,validator_version)
 values('document','document-draft-1');
commit;
