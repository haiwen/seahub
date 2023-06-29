CREATE TABLE IF NOT EXISTS "history_name" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "doc_uuid" varchar(36) NOT NULL, "obj_id" varchar(40) NOT NULL, "name" varchar(255) NOT NULL, UNIQUE ("doc_uuid", "obj_id"));
CREATE INDEX IF NOT EXISTS "history_name_doc_uuid" ON "history_name" ("doc_uuid");

CREATE TABLE IF NOT EXISTS "sdoc_draft" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "doc_uuid" varchar(36) NOT NULL UNIQUE, "repo_id" varchar(36) NOT NULL, "username" varchar(255) NOT NULL, "created_at" datetime NOT NULL);
CREATE INDEX IF NOT EXISTS "sdoc_draft_repo_id" ON "sdoc_draft" ("repo_id");
CREATE INDEX IF NOT EXISTS "sdoc_draft_username" ON "sdoc_draft" ("username");
