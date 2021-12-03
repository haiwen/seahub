CREATE TABLE IF NOT EXISTS OrgGroup (org_id INTEGER, group_id INTEGER);
CREATE INDEX IF NOT EXISTS groupid_indx on OrgGroup (group_id);


CREATE TABLE IF NOT EXISTS Organization (org_id INTEGER PRIMARY KEY AUTOINCREMENT, org_name VARCHAR(255), url_prefix VARCHAR(255), creator VARCHAR(255), ctime BIGINT);
CREATE UNIQUE INDEX IF NOT EXISTS url_prefix_indx on Organization (url_prefix);

CREATE TABLE IF NOT EXISTS OrgUser (org_id INTEGER, email TEXT, is_staff bool NOT NULL);
CREATE INDEX IF NOT EXISTS email_indx on OrgUser (email);
CREATE UNIQUE INDEX IF NOT EXISTS orgid_email_indx on OrgUser (org_id, email);
