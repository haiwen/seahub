CREATE TABLE IF NOT EXISTS "RoleUploadRateLimit" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "role" varchar(255) UNIQUE, "upload_limit" bigint);

CREATE TABLE IF NOT EXISTS "RoleDownloadRateLimit" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "role" varchar(255) UNIQUE, "download_limit" bigint);

CREATE TABLE IF NOT EXISTS "UserUploadRateLimit" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "user" varchar(255) UNIQUE, "upload_limit" bigint);

CREATE TABLE IF NOT EXISTS "UserDownloadRateLimit" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "user" varchar(255) UNIQUE, "download_limit" bigint);

CREATE INDEX IF NOT EXISTS "repo_id" ON "WebUploadTempFiles" ("repo_id");

DROP TABLE IF EXISTS "RepoTokenPeerInfo_old";
ALTER TABLE "RepoTokenPeerInfo" RENAME TO "RepoTokenPeerInfo_old";
CREATE TABLE IF NOT EXISTS RepoTokenPeerInfo (token CHAR(41) PRIMARY KEY, peer_id CHAR(41), peer_ip VARCHAR(50), peer_name VARCHAR(255), sync_time BIGINT, client_ver VARCHAR(20));
INSERT INTO "RepoTokenPeerInfo" ("token", "peer_id", "peer_ip", "peer_name", "sync_time", "client_ver") SELECT "token", "peer_id", "peer_ip", "peer_name", "sync_time", "client_ver" FROM "RepoTokenPeerInfo_old";
DROP TABLE "RepoTokenPeerInfo_old";
