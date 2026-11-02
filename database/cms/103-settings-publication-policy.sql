begin;
-- English settings now have shared website consumers. Release still requires
-- immutable revision validation, independent approval, configuration authority
-- for sensitive changes, processed media and current locked dependencies.
-- Application delivery flags remain deployment-owned and are not changed here.
insert into cms.validation_policy(content_type,validator_version) values('settings','settings-1');
commit;
