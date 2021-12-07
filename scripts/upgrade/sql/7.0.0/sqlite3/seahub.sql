CREATE TABLE IF NOT EXISTS "drafts_draft" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "created_at" datetime NOT NULL, "updated_at" datetime NOT NULL, "username" varchar(255) NOT NULL, "origin_repo_id" varchar(36) NOT NULL, "origin_file_version" varchar(100) NOT NULL, "draft_file_path" varchar(1024) NOT NULL, "publish_file_version" varchar(100) NULL, "status" varchar(20) NOT NULL, "origin_file_uuid" char(32) NOT NULL);
CREATE INDEX IF NOT EXISTS "drafts_draft_created_at_e9f4523f" ON "drafts_draft" ("created_at");
CREATE INDEX IF NOT EXISTS "drafts_draft_updated_at_0a144b05" ON "drafts_draft" ("updated_at");
CREATE INDEX IF NOT EXISTS "drafts_draft_username_73e6738b" ON "drafts_draft" ("username");
CREATE INDEX IF NOT EXISTS "drafts_draft_origin_file_uuid_7c003c98" ON "drafts_draft" ("origin_file_uuid");

CREATE TABLE IF NOT EXISTS "drafts_draftreviewer" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "reviewer" varchar(255) NOT NULL, "draft_id" integer NOT NULL REFERENCES "drafts_draft" ("id"));
CREATE INDEX IF NOT EXISTS "drafts_draftreviewer_reviewer_e4c777ac" ON "drafts_draftreviewer" ("reviewer");
CREATE INDEX IF NOT EXISTS "drafts_draftreviewer_draft_id_4ea59775" ON "drafts_draftreviewer" ("draft_id");

CREATE TABLE IF NOT EXISTS "social_auth_association" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "server_url" varchar(255) NOT NULL, "handle" varchar(255) NOT NULL, "secret" varchar(255) NOT NULL, "issued" integer NOT NULL, "lifetime" integer NOT NULL, "assoc_type" varchar(64) NOT NULL);
CREATE TABLE IF NOT EXISTS "social_auth_code" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "email" varchar(254) NOT NULL, "code" varchar(32) NOT NULL, "verified" bool NOT NULL, "timestamp" datetime NOT NULL);
CREATE TABLE IF NOT EXISTS "social_auth_nonce" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "server_url" varchar(255) NOT NULL, "timestamp" integer NOT NULL, "salt" varchar(65) NOT NULL);
CREATE TABLE IF NOT EXISTS "social_auth_partial" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "token" varchar(32) NOT NULL, "next_step" smallint unsigned NOT NULL, "backend" varchar(32) NOT NULL, "data" text NOT NULL, "timestamp" datetime NOT NULL);
CREATE TABLE IF NOT EXISTS "social_auth_usersocialauth" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "username" varchar(255) NOT NULL, "provider" varchar(32) NOT NULL, "uid" varchar(255) NOT NULL, "extra_data" text NOT NULL);


CREATE TABLE IF NOT EXISTS "repo_tags_repotags" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "repo_id" varchar(36) NOT NULL, "name" varchar(255) NOT NULL, "color" varchar(255) NOT NULL);
CREATE INDEX IF NOT EXISTS "repo_tags_repotags_repo_id_1163a48f" ON "repo_tags_repotags" ("repo_id");
CREATE INDEX IF NOT EXISTS "repo_tags_repotags_name_3f4c9027" ON "repo_tags_repotags" ("name");
CREATE INDEX IF NOT EXISTS "repo_tags_repotags_color_1292b6c1" ON "repo_tags_repotags" ("color");


CREATE TABLE IF NOT EXISTS "file_tags_filetags" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "file_uuid_id" char(32) NOT NULL REFERENCES "tags_fileuuidmap" ("uuid"), "repo_tag_id" integer NOT NULL REFERENCES "repo_tags_repotags" ("id"));
CREATE INDEX IF NOT EXISTS "file_tags_filetags_file_uuid_id_e30f0ec8" ON "file_tags_filetags" ("file_uuid_id");
CREATE INDEX IF NOT EXISTS "file_tags_filetags_repo_tag_id_c39660cb" ON "file_tags_filetags" ("repo_tag_id");


CREATE TABLE IF NOT EXISTS "related_files_relatedfiles" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "o_uuid_id" char(32) NOT NULL REFERENCES "tags_fileuuidmap" ("uuid"), "r_uuid_id" char(32) NOT NULL REFERENCES "tags_fileuuidmap" ("uuid"));
CREATE INDEX IF NOT EXISTS "related_files_relatedfiles_o_uuid_id_aaa8e613" ON "related_files_relatedfiles" ("o_uuid_id");
CREATE INDEX IF NOT EXISTS "related_files_relatedfiles_r_uuid_id_031751df" ON "related_files_relatedfiles" ("r_uuid_id");


ALTER TABLE "base_filecomment" ADD COLUMN "detail" text DEFAULT NULL;
ALTER TABLE "base_filecomment" ADD COLUMN "resolved" bool NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "base_filecomment_resolved_e0717eca" ON "base_filecomment" ("resolved");


CREATE TABLE IF NOT EXISTS "base_reposecretkey" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "repo_id" varchar(36) NOT NULL UNIQUE, "secret_key" varchar(44) NOT NULL);

