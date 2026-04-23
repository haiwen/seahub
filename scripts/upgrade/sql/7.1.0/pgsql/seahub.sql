CREATE TABLE IF NOT EXISTS "base_reposecretkey"
(
    "id"         serial primary key,
    "repo_id"    varchar(36) NOT NULL,
    "secret_key" varchar(44) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "repo_id" ON "base_reposecretkey" ("repo_id");

ALTER TABLE "constance_config"
    ALTER COLUMN "value" TYPE TEXT,
    ALTER COLUMN "constance_key" TYPE varchar(255);

DROP INDEX "drafts_draft_origin_file_uuid_7c003c98_uniq";
CREATE UNIQUE INDEX "drafts_draft_origin_file_uuid_7c003c98_uniq" ON "drafts_draft" ("origin_file_uuid");
CREATE INDEX "drafts_draft_origin_repo_id_8978ca2c" ON "drafts_draft" ("origin_repo_id");


CREATE TABLE IF NOT EXISTS "file_participants_fileparticipant"
(
    "id"       serial primary key,
    "username" varchar(255) NOT NULL,
    "uuid_id"  char(32)     NOT NULL,
    CONSTRAINT "file_participants_fi_uuid_id_fk_tags_file" FOREIGN KEY ("uuid_id") REFERENCES "tags_fileuuidmap" ("uuid")
);
CREATE UNIQUE INDEX IF NOT EXISTS "file_participants_fileparticipant_uuid_id_username_c747dd36_uniq" ON "file_participants_fileparticipant" ("uuid_id", "username");


CREATE TABLE IF NOT EXISTS "repo_api_tokens"
(
    "id"           serial primary key,
    "repo_id"      varchar(36)  NOT NULL,
    "app_name"     varchar(255) NOT NULL,
    "token"        varchar(40)  NOT NULL,
    "generated_at" timestamptz  NOT NULL,
    "generated_by" varchar(255) NOT NULL,
    "last_access"  timestamptz  NOT NULL,
    "permission"   varchar(15)  NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "token" ON "repo_api_tokens" ("token");
CREATE INDEX IF NOT EXISTS "repo_api_tokens_repo_id_47a50fef" ON "repo_api_tokens" ("repo_id");
CREATE INDEX IF NOT EXISTS "repo_api_tokens_app_name_7c395c31" ON "repo_api_tokens" ("app_name");


CREATE TABLE IF NOT EXISTS "abuse_reports_abusereport"
(
    "id"          serial PRIMARY KEY,
    "reporter"    text DEFAULT NULL,
    "repo_id"     varchar(36)  NOT NULL,
    "repo_name"   varchar(255) NOT NULL,
    "file_path"   text DEFAULT NULL,
    "abuse_type"  varchar(255) NOT NULL,
    "description" text DEFAULT NULL,
    "handled"     boolean      NOT NULL,
    "time"        timestamptz  NOT NULL
);
CREATE INDEX IF NOT EXISTS "abuse_reports_abusereport_abuse_type_703d5335" ON abuse_reports_abusereport ("abuse_type");
CREATE INDEX IF NOT EXISTS "abuse_reports_abusereport_handled_94b8304c" ON abuse_reports_abusereport ("handled");


CREATE TABLE IF NOT EXISTS "repo_share_invitation"
(
    "id"            serial primary key,
    "repo_id"       varchar(36) NOT NULL,
    "path"          text        NOT NULL,
    "permission"    varchar(50) NOT NULL,
    "invitation_id" int         NOT NULL,
    CONSTRAINT "repo_share_invitatio_invitation_id_fk_invitatio" FOREIGN KEY ("invitation_id") REFERENCES "invitations_invitation" ("id")
);
CREATE INDEX IF NOT EXISTS "repo_share_invitatio_invitation_id_b71effd2_fk_invitatio" ON "repo_share_invitation" ("invitation_id");
CREATE INDEX IF NOT EXISTS "repo_share_invitation_repo_id_7bcf84fa" ON "repo_share_invitation" ("repo_id");

ALTER TABLE "post_office_attachment"
    add column "headers" TEXT DEFAULT NULL;

