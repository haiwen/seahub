CREATE TABLE IF NOT EXISTS SeafileConf (cfg_group VARCHAR(255) NOT NULL, cfg_key VARCHAR(255) NOT NULL, value VARCHAR(255), property INTEGER);

CREATE TABLE IF NOT EXISTS RepoInfo (repo_id CHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, update_time INTEGER, version INTEGER, is_encrypted INTEGER, last_modifier VARCHAR(255));
