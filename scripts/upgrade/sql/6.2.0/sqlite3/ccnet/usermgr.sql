alter table LDAPUsers add column reference_id VARCHAR(255);
alter table EmailUser add column reference_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS reference_id_index on EmailUser (reference_id);
CREATE UNIQUE INDEX IF NOT EXISTS ldapusers_reference_id_index on LDAPUsers(reference_id);