CREATE TABLE IF NOT EXISTS "pubfile_grouppublicfile" (
    "id" integer NOT NULL PRIMARY KEY,
    "group_id" integer NOT NULL,
    "repo_id" varchar(36) NOT NULL,
    "path" varchar(4096) NOT NULL,
    "is_dir" bool NOT NULL,
    "added_by" varchar(256) NOT NULL,
    "description" varchar(1024) NOT NULL,
    "download_count" integer NOT NULL
)
;
CREATE INDEX IF NOT EXISTS "pubfile_grouppublicfile_dc00373b" ON "pubfile_grouppublicfile" ("group_id");

CREATE TABLE IF NOT EXISTS "sysadmin_extra_userloginlog" (
    "id" integer NOT NULL PRIMARY KEY,
    "username" varchar(255) NOT NULL,
    "login_date" datetime NOT NULL,
    "login_ip" varchar(20) NOT NULL
);
CREATE INDEX IF NOT EXISTS "sysadmin_extra_userloginlog_c8db99ec" ON "sysadmin_extra_userloginlog" ("login_date");
CREATE INDEX IF NOT EXISTS "sysadmin_extra_userloginlog_ee0cafa2" ON "sysadmin_extra_userloginlog" ("username");
