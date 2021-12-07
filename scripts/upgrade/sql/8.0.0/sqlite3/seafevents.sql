DROP TABLE IF EXISTS "VirusFile_old";
ALTER TABLE "VirusFile" RENAME TO "VirusFile_old";
CREATE TABLE IF NOT EXISTS "VirusFile" ("vid" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "repo_id" varchar(36) NOT NULL, "commit_id" varchar(40) NOT NULL, "file_path" text NOT NULL, "has_deleted" tinyint(1) NOT NULL, "has_ignored" TINYINT(1) NOT NULL DEFAULT 0);
INSERT INTO "VirusFile" ("vid", "repo_id", "commit_id", "file_path", "has_deleted") SELECT "vid", "repo_id", "commit_id", "file_path", "has_handle" FROM "VirusFile_old";
DROP TABLE "VirusFile_old";

CREATE INDEX IF NOT EXISTS "VirusFile_repo_id_yewnci4gd" ON "VirusFile" ("repo_id");
CREATE INDEX IF NOT EXISTS "VirusFile_has_deleted_834ndyts" ON "VirusFile" ("has_deleted");
CREATE INDEX IF NOT EXISTS "VirusFile_has_ignored_d84tvuwg" ON "VirusFile" ("has_ignored");
