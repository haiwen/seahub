CREATE TABLE IF NOT EXISTS "history_name" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "doc_uuid" varchar(36) NOT NULL, "obj_id" varchar(40) NOT NULL, "name" varchar(255) NOT NULL, UNIQUE ("doc_uuid", "obj_id"));
CREATE INDEX IF NOT EXISTS "history_name_doc_uuid" ON "history_name" ("doc_uuid");

CREATE TABLE IF NOT EXISTS "sdoc_draft" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "doc_uuid" varchar(36) NOT NULL UNIQUE, "repo_id" varchar(36) NOT NULL, "username" varchar(255) NOT NULL, "created_at" datetime NOT NULL);
CREATE INDEX IF NOT EXISTS "sdoc_draft_repo_id" ON "sdoc_draft" ("repo_id");
CREATE INDEX IF NOT EXISTS "sdoc_draft_username" ON "sdoc_draft" ("username");

CREATE TABLE IF NOT EXISTS "sdoc_revision" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "repo_id" varchar(36) NOT NULL, "revision_id" integer NOT NULL, "doc_uuid" varchar(36) NOT NULL UNIQUE, "origin_doc_uuid" varchar(36) NOT NULL, "origin_doc_path" text NOT NULL, "origin_file_version" varchar(100) NOT NULL, "publish_file_version" varchar(100) NULL, "username" varchar(255) NOT NULL, "publisher" varchar(255) NULL ,"is_published" integer NOT NULL, "created_at" datetime NOT NULL, "updated_at" datetime NOT NULL, UNIQUE ("repo_id", "revision_id"));
CREATE INDEX IF NOT EXISTS "sdoc_revision_repo_id" ON "sdoc_revision" ("repo_id");
CREATE INDEX IF NOT EXISTS "sdoc_revision_origin_doc_uuid" ON "sdoc_revision" ("origin_doc_uuid");
CREATE INDEX IF NOT EXISTS "sdoc_revision_username" ON "sdoc_revision" ("username");
CREATE INDEX IF NOT EXISTS "sdoc_revision_is_published" ON "sdoc_revision" ("is_published");

CREATE TABLE IF NOT EXISTS "sdoc_comment_reply" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "author" varchar(255) NOT NULL, "reply" text NOT NULL, "type" varchar(36) NOT NULL, "comment_id" integer NOT NULL, "doc_uuid" varchar(36) NOT NULL, "created_at" datetime NOT NULL, "updated_at" datetime NOT NULL);
CREATE INDEX IF NOT EXISTS "sdoc_comment_reply_comment_id" ON "sdoc_comment_reply" ("comment_id");
CREATE INDEX IF NOT EXISTS "sdoc_comment_reply_doc_uuid" ON "sdoc_comment_reply" ("doc_uuid");

CREATE TABLE IF NOT EXISTS "deleted_files_count" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "repo_id" varchar(36) NOT NULL, "deleted_time" datetime NOT NULL, "files_count" bigint NOT NULL);
CREATE INDEX IF NOT EXISTS "ix_deleted_files_count_repo_id" ON "deleted_files_count" ("repo_id");
CREATE INDEX IF NOT EXISTS "ix_deleted_files_count_deleted_time" ON "deleted_files_count" ("deleted_time");

CREATE INDEX IF NOT EXISTS "share_uploadlinkshare_expire_date" ON "share_uploadlinkshare" ("expire_date");

CREATE TABLE IF NOT EXISTS "sdoc_notification" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "doc_uuid" varchar(36) NOT NULL UNIQUE, "username" varchar(255) NOT NULL, "msg_type" varchar(36) NOT NULL, "created_at" datetime NOT NULL, "detail" text NOT NULL, "seen" integer NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS "sdoc_notification_doc_uuid_username" ON "sdoc_notification" ("doc_uuid", "username");
CREATE INDEX IF NOT EXISTS "sdoc_notification_created_at" ON "sdoc_notification" ("created_at");

DROP TABLE IF EXISTS "options_useroptions_old";
ALTER TABLE "options_useroptions" RENAME TO "options_useroptions_old";
CREATE TABLE IF NOT EXISTS "options_useroptions" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "email" varchar(255) NOT NULL, "option_val" varchar(512) NOT NULL, "option_key" varchar(50) NOT NULL);
INSERT INTO "options_useroptions" ("email", "option_val", "option_key") SELECT "email", "option_val", "option_key" FROM "options_useroptions_old";
DROP TABLE "options_useroptions_old";

DROP TABLE IF EXISTS "org_saml_config_old";
ALTER TABLE "org_saml_config" RENAME TO "org_saml_config_old";
CREATE TABLE IF NOT EXISTS "org_saml_config" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "org_id" integer NOT NULL UNIQUE, "metadata_url" TEXT NOT NULL, "domain" varchar(255) NULL UNIQUE, "dns_txt" varchar(64) NULL, "domain_verified" integer NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS "org_saml_config_domain_verified_398065b9" ON "org_saml_config" ("domain_verified");
INSERT INTO "org_saml_config" ("org_id", "metadata_url", "domain") SELECT "org_id", "metadata_url", "domain" FROM "org_saml_config_old";
UPDATE `org_saml_config` SET domain_verified=1 WHERE domain_verified=0;
DROP TABLE "org_saml_config_old";
