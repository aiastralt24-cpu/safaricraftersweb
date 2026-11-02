begin;
-- One version per content type, including invalid results for unsupported page routes.
-- Route-specific version mismatches must not turn ordinary invalid drafts into worker retries.
update cms.validation_policy set validator_version='composition-1' where content_type='page';
commit;
