begin;
-- Enables trusted review/publication of supported homepage compositions. Visitor
-- delivery remains separately opt-in; this does not change any publication pointer.
insert into cms.validation_policy(content_type,validator_version) values('homepage','homepage-1');
commit;
