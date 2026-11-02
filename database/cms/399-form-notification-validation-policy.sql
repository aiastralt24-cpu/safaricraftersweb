begin;
-- Only the trusted worker may mint this version. Previous form receipts no longer authorize publication.
update cms.validation_policy set validator_version='form-2' where content_type='form';
commit;
