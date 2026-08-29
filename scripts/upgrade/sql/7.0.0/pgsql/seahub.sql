CREATE TABLE IF NOT EXISTS "drafts_draft"
(
    "id"                   serial primary key,
    "created_at"           timestamptz   NOT NULL,
    "updated_at"           timestamptz   NOT NULL,
    "username"             varchar(255)  NOT NULL,
    "origin_repo_id"       varchar(36)   NOT NULL,
    "origin_file_version"  varchar(100)  NOT NULL,
    "draft_file_path"      varchar(1024) NOT NULL,
    "origin_file_uuid"     char(32)      NOT NULL,
    "publish_file_version" varchar(100) DEFAULT NULL,
    "status"               varchar(20)   NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "drafts_draft_origin_file_uuid_7c003c98_uniq" ON "drafts_draft" ("origin_file_uuid");
CREATE INDEX IF NOT EXISTS "drafts_draft_created_at_e9f4523f" ON "drafts_draft" ("created_at");
CREATE INDEX IF NOT EXISTS "drafts_draft_updated_at_0a144b05" ON "drafts_draft" ("updated_at");
CREATE INDEX IF NOT EXISTS "drafts_draft_username_73e6738b" ON "drafts_draft" ("username");
CREATE INDEX IF NOT EXISTS "drafts_draft_origin_repo_id_8978ca2c" ON "drafts_draft" ("origin_repo_id");

CREATE TABLE IF NOT EXISTS "drafts_draftreviewer"
(
    "id"       serial primary key,
    "reviewer" varchar(255) NOT NULL,
    "draft_id" int          NOT NULL,
    CONSTRAINT "drafts_draftreviewer_draft_id_fk_drafts_draft_id" FOREIGN KEY ("draft_id") REFERENCES "drafts_draft" ("id")
);
CREATE INDEX IF NOT EXISTS "drafts_draftreviewer_reviewer_e4c777ac" ON "drafts_draftreviewer" ("reviewer");
CREATE INDEX IF NOT EXISTS "drafts_draftreviewer_draft_id_4ea59775_fk_drafts_draft_id" ON "drafts_draftreviewer" ("draft_id");

CREATE INDEX IF NOT EXISTS "options_useroptions_option_key_7bf7ae4b" ON "options_useroptions" ("option_key");

DROP INDEX TotalStorageStat_pkey;
ALTER TABLE TotalStorageStat ADD COLUMN "id" BIGSERIAL PRIMARY KEY;
ALTER TABLE TotalStorageStat ADD COLUMN "org_id" INT NOT NULL DEFAULT -1;
CREATE INDEX "idx_storage_time_org" ON TotalStorageStat ("timestamp", "org_id");

ALTER TABLE FileOpsStat ADD COLUMN "org_id" INT NOT NULL DEFAULT -1;
CREATE INDEX "idx_file_ops_time_org" ON FileOpsStat ("timestamp", "org_id");

DROP INDEX UserActivityStat_pkey;
ALTER TABLE UserActivityStat ADD COLUMN "id" BIGSERIAL PRIMARY KEY ;
CREATE UNIQUE INDEX ON UserActivityStat (name_time_md5);
ALTER TABLE UserActivityStat ADD COLUMN "org_id" INT NOT NULL DEFAULT -1;
CREATE INDEX "idx_activity_time_org" ON UserActivityStat ("timestamp", "org_id");

DROP TABLE UserTrafficStat;


CREATE TABLE IF NOT EXISTS "repo_tags_repotags"
(
    "id"      serial primary key,
    "repo_id" varchar(36)  NOT NULL,
    "name"    varchar(255) NOT NULL,
    "color"   varchar(255) NOT NULL
    );
CREATE INDEX IF NOT EXISTS "repo_tags_repotags_repo_id_1163a48f" ON "repo_tags_repotags" ("repo_id");
CREATE INDEX IF NOT EXISTS "repo_tags_repotags_name_3f4c9027" ON "repo_tags_repotags" ("name");
CREATE INDEX IF NOT EXISTS "repo_tags_repotags_color_1292b6c1" ON "repo_tags_repotags" ("color");



CREATE TABLE IF NOT EXISTS "file_tags_filetags"
(
    "id"           serial primary key,
    "file_uuid_id" char(32) NOT NULL,
    "repo_tag_id"  int      NOT NULL,
    CONSTRAINT "file_tags_filetags_file_uuid_id_fk_tags_file" FOREIGN KEY ("file_uuid_id") REFERENCES "tags_fileuuidmap" ("uuid"),
    CONSTRAINT "file_tags_filetags_repo_tag_id_fk_repo_tags_repotags_id" FOREIGN KEY ("repo_tag_id") REFERENCES "repo_tags_repotags" ("id")
);
CREATE INDEX IF NOT EXISTS "file_tags_filetags_file_uuid_id_e30f0ec8_fk_tags_file" ON "file_tags_filetags" ("file_uuid_id");
CREATE INDEX IF NOT EXISTS "file_tags_filetags_repo_tag_id_c39660cb_fk_repo_tags_repotags_id" ON "file_tags_filetags" ("repo_tag_id");



CREATE TABLE IF NOT EXISTS "related_files_relatedfiles"
(
    "id"        serial primary key,
    "o_uuid_id" char(32) NOT NULL,
    "r_uuid_id" char(32) NOT NULL,
    CONSTRAINT "related_files_relate_r_uuid_id_fk_tags_file" FOREIGN KEY ("r_uuid_id") REFERENCES "tags_fileuuidmap" ("uuid"),
    CONSTRAINT "related_files_relate_o_uuid_id_fk_tags_file" FOREIGN KEY ("o_uuid_id") REFERENCES "tags_fileuuidmap" ("uuid")
);
CREATE INDEX IF NOT EXISTS "related_files_relate_o_uuid_id_aaa8e613_fk_tags_file" ON "related_files_relatedfiles" ("o_uuid_id");
CREATE INDEX IF NOT EXISTS "related_files_relate_r_uuid_id_031751df_fk_tags_file" ON "related_files_relatedfiles" ("r_uuid_id");



CREATE TABLE IF NOT EXISTS "organizations_orgsettings"
(
    "id"     serial primary key,
    "org_id" int NOT NULL,
    "role"   varchar(100) DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_orgsettings_org_id_630f6843_uniq" ON "organizations_orgsettings" ("org_id");

DROP INDEX "profile_profile_contact_email_0975e4bf_uniq";
CREATE UNIQUE INDEX IF NOT EXISTS "profile_profile_contact_email_0975e4bf_uniq" ON "profile_profile" ("contact_email");

CREATE TABLE IF NOT EXISTS "social_auth_usersocialauth"
(
    "id"         serial primary key,
    "username"   varchar(255) NOT NULL,
    "provider"   varchar(32)  NOT NULL,
    "uid"        varchar(255) NOT NULL,
    "extra_data" text         NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "social_auth_usersocialauth_provider_uid_e6b5e668_uniq" ON "social_auth_usersocialauth" ("provider", "uid");
CREATE INDEX IF NOT EXISTS "social_auth_usersocialauth_username_3f06b5cf" ON "social_auth_usersocialauth" ("username");



ALTER TABLE "base_filecomment" ADD "detail" TEXT DEFAULT NULL;
ALTER TABLE "base_filecomment" ADD "resolved" BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX "resolved" ON "base_filecomment" ("resolved");


CREATE TABLE IF NOT EXISTS "base_reposecretkey"
(
    "id"         serial primary key,
    "repo_id"    varchar(36) NOT NULL,
    "secret_key" varchar(44) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "repo_id" ON "base_reposecretkey" ("repo_id");

