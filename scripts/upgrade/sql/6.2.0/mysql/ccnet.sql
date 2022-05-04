alter table LDAPUsers add column reference_id VARCHAR(255);
alter table EmailUser add column reference_id VARCHAR(255);
ALTER TABLE `LDAPUsers` ADD UNIQUE (`reference_id`);
ALTER TABLE `EmailUser` ADD UNIQUE (`reference_id`);