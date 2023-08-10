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
