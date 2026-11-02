begin;
-- Activate only with document-1 worker code and migrations through 149.
-- Existing diagnostic receipts do not qualify. Visitor delivery remains opt-in.
update cms.validation_policy set validator_version='document-1' where content_type='document';
commit;
