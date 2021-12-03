CREATE TABLE IF NOT EXISTS Binding (email TEXT, peer_id TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS peer_index on Binding (peer_id);

CREATE TABLE IF NOT EXISTS EmailUser (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, email TEXT, passwd TEXT, is_staff bool NOT NULL, is_active bool NOT NULL, ctime INTEGER, reference_id TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS email_index on EmailUser (email);
CREATE UNIQUE INDEX IF NOT EXISTS reference_id_index on EmailUser (reference_id);

CREATE TABLE IF NOT EXISTS LDAPConfig (cfg_group VARCHAR(255) NOT NULL, cfg_key VARCHAR(255) NOT NULL, value VARCHAR(255), property INTEGER);

CREATE TABLE IF NOT EXISTS LDAPUsers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, password TEXT NOT NULL, is_staff BOOL NOT NULL, is_active BOOL NOT NULL, extra_attrs TEXT, reference_id TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS ldapusers_email_index on LDAPUsers(email);
CREATE UNIQUE INDEX IF NOT EXISTS ldapusers_reference_id_index on LDAPUsers(reference_id);

CREATE TABLE IF NOT EXISTS UserRole (email TEXT, role TEXT, is_manual_set INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS userrole_email_index on UserRole (email);
CREATE UNIQUE INDEX IF NOT EXISTS userrole_userrole_index on UserRole (email, role);
