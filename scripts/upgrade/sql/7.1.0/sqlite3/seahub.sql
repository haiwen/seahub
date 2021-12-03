CREATE TABLE IF NOT EXISTS "base_reposecretkey" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "repo_id" varchar(36) NOT NULL UNIQUE, "secret_key" varchar(44) NOT NULL);


DROP TABLE IF EXISTS "constance_config_old";
ALTER TABLE "constance_config" RENAME TO "constance_config_old";
CREATE TABLE IF NOT EXISTS "constance_config" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "constance_key" varchar(255) NOT NULL UNIQUE, "value" text NULL);
INSERT INTO "constance_config" ("id", "constance_key", "value") SELECT "id", "key", "value" FROM "constance_config_old";
DROP TABLE "constance_config_old";



DROP TABLE IF EXISTS "drafts_draft_old";
ALTER TABLE "drafts_draft" RENAME TO "drafts_draft_old";
CREATE TABLE IF NOT EXISTS "drafts_draft" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "created_at" datetime NOT NULL, "updated_at" datetime NOT NULL, "username" varchar(255) NOT NULL, "origin_file_version" varchar(100) NOT NULL, "draft_file_path" varchar(1024) NOT NULL, "origin_file_uuid" char(32) NOT NULL UNIQUE, "publish_file_version" varchar(100) NULL, "status" varchar(20) NOT NULL, "origin_repo_id" varchar(36) NOT NULL);
INSERT INTO "drafts_draft" ("id", "created_at", "updated_at", "username", "origin_file_version", "draft_file_path", "origin_file_uuid", "publish_file_version", "status", "origin_repo_id") SELECT "id", "created_at", "updated_at", "username", "origin_file_version", "draft_file_path", "origin_file_uuid", "publish_file_version", "status", "origin_repo_id" FROM "drafts_draft_old";
DROP TABLE "drafts_draft_old";

CREATE INDEX IF NOT EXISTS "drafts_draft_created_at_e9f4523f" ON "drafts_draft" ("created_at");
CREATE INDEX IF NOT EXISTS "drafts_draft_origin_repo_id_8978ca2c" ON "drafts_draft" ("origin_repo_id");
CREATE INDEX IF NOT EXISTS "drafts_draft_updated_at_0a144b05" ON "drafts_draft" ("updated_at");
CREATE INDEX IF NOT EXISTS "drafts_draft_username_73e6738b" ON "drafts_draft" ("username");


CREATE TABLE IF NOT EXISTS "abuse_reports_abusereport" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "reporter" text NULL, "repo_id" varchar(36) NOT NULL, "repo_name" varchar(255) NOT NULL, "file_path" text NULL, "abuse_type" varchar(255) NOT NULL, "description" text NULL, "handled" bool NOT NULL, "time" datetime NOT NULL);
CREATE INDEX IF NOT EXISTS "abuse_reports_abusereport_abuse_type_703d5335" ON "abuse_reports_abusereport" ("abuse_type");
CREATE INDEX IF NOT EXISTS "abuse_reports_abusereport_handled_94b8304c" ON "abuse_reports_abusereport" ("handled");


CREATE TABLE IF NOT EXISTS "file_participants_fileparticipant" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "username" varchar(255) NOT NULL, "uuid_id" char(32) NOT NULL REFERENCES "tags_fileuuidmap" ("uuid"));
CREATE UNIQUE INDEX IF NOT EXISTS "file_participants_fileparticipant_uuid_id_username_c747dd36_uniq" ON "file_participants_fileparticipant" ("uuid_id", "username");
CREATE INDEX IF NOT EXISTS "file_participants_fileparticipant_uuid_id_861b7339" ON "file_participants_fileparticipant" ("uuid_id");


CREATE TABLE IF NOT EXISTS "repo_share_invitation" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "repo_id" varchar(36) NOT NULL, "path" text NOT NULL, "permission" varchar(50) NOT NULL, "invitation_id" integer NOT NULL REFERENCES "invitations_invitation" ("id"));
CREATE INDEX IF NOT EXISTS "repo_share_invitation_repo_id_7bcf84fa" ON "repo_share_invitation" ("repo_id");
CREATE INDEX IF NOT EXISTS "repo_share_invitation_invitation_id_b71effd2" ON "repo_share_invitation" ("invitation_id");

CREATE TABLE IF NOT EXISTS "repo_api_tokens" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "repo_id" varchar(36) NOT NULL, "app_name" varchar(255) NOT NULL, "token" varchar(40) NOT NULL UNIQUE, "generated_at" datetime NOT NULL, "generated_by" varchar(255) NOT NULL, "last_access" datetime NOT NULL, "permission" varchar(15) NOT NULL);
CREATE INDEX IF NOT EXISTS "repo_api_tokens_repo_id_47a50fef" ON "repo_api_tokens" ("repo_id");
CREATE INDEX IF NOT EXISTS "repo_api_tokens_app_name_7c395c31" ON "repo_api_tokens" ("app_name");

ALTER TABLE "post_office_attachment" add column "headers" text DEFAULT NULL;

