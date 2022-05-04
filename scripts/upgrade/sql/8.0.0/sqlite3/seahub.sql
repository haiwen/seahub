CREATE TABLE IF NOT EXISTS "ocm_share" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "shared_secret" varchar(36) NOT NULL UNIQUE, "from_user" varchar(255) NOT NULL, "to_user" varchar(255) NOT NULL, "to_server_url" varchar(200) NOT NULL, "repo_id" varchar(36) NOT NULL, "repo_name" varchar(255) NOT NULL, "permission" varchar(50) NOT NULL, "path" text NOT NULL, "ctime" datetime(6) NOT NULL);
CREATE INDEX IF NOT EXISTS "ocm_share_from_user_7fbb7bb6" ON "ocm_share" ("from_user");
CREATE INDEX IF NOT EXISTS "ocm_share_to_user_4e255523" ON "ocm_share" ("to_user");
CREATE INDEX IF NOT EXISTS "ocm_share_to_server_url_43f0e89b" ON "ocm_share" ("to_server_url");
CREATE INDEX IF NOT EXISTS "ocm_share_repo_id_51937581" ON "ocm_share" ("repo_id");

CREATE TABLE IF NOT EXISTS "ocm_share_received" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "shared_secret" varchar(36) NOT NULL UNIQUE, "from_user" varchar(255) NOT NULL, "to_user" varchar(255) NOT NULL, "from_server_url" varchar(200) NOT NULL, "repo_id" varchar(36) NOT NULL, "repo_name" varchar(255) NOT NULL, "permission" varchar(50) NOT NULL, "path" text NOT NULL, "provider_id" varchar(40) NOT NULL, "ctime" datetime(6) NOT NULL);
CREATE INDEX IF NOT EXISTS "ocm_share_received_from_user_8137d8eb" ON "ocm_share_received" ("from_user");
CREATE INDEX IF NOT EXISTS "ocm_share_received_to_user_0921d09a" ON "ocm_share_received" ("to_user");
CREATE INDEX IF NOT EXISTS "ocm_share_received_from_server_url_10527b80" ON "ocm_share_received" ("from_server_url");
CREATE INDEX IF NOT EXISTS "ocm_share_received_repo_id_9e77a1b9" ON "ocm_share_received" ("repo_id");
CREATE INDEX IF NOT EXISTS "ocm_share_received_provider_id_60c873e0" ON "ocm_share_received" ("provider_id");

CREATE TABLE IF NOT EXISTS "repo_auto_delete" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "repo_id" varchar(36) NOT NULL UNIQUE, "days" integer NOT NULL);

CREATE TABLE  IF NOT EXISTS "external_department" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "group_id" integer NOT NULL UNIQUE, "provider" varchar(32) NOT NULL, "outer_id" bigint NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS "external_department_provider_outer_id_8dns6vkw_uniq" ON "external_department" (`provider`,`outer_id`);
