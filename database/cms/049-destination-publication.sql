begin;
-- Trusted worker receipts use the complete destination v1 validator.
insert into cms.validation_policy(content_type,validator_version) values('destination','destination-1');
commit;
