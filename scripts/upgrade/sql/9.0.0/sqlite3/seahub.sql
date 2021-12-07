CREATE TABLE IF NOT EXISTS "custom_share_permission" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "repo_id" varchar(36) NOT NULL, "name" varchar(255) NOT NULL, "description" varchar(500) NOT NULL, "permission" , "reporter" text NOT NULL);
CREATE INDEX IF NOT EXISTS "custom_share_permission_repo_id_578fe49f" ON "custom_share_permission" ("repo_id");

CREATE TABLE IF NOT EXISTS "ocm_via_webdav_received_shares" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "description" varchar(255) NULL, "name" varchar(255) NOT NULL, "owner" varchar(255) NOT NULL, "owner_display_name" varchar(255) NULL, "protocol_name" varchar(255) NOT NULL, "shared_secret" varchar(255) NOT NULL, "permissions" varchar(255) NOT NULL, "provider_id" varchar(255) NOT NULL, "resource_type" varchar(255) NOT NULL, "share_type" varchar(255) NOT NULL, "share_with" varchar(255) NOT NULL, "shared_by" varchar(255) NOT NULL, "shared_by_display_name" varchar(255) NOT NULL, "ctime" datetime NOT NULL, "is_dir" bool NOT NULL);
CREATE INDEX IF NOT EXISTS "ocm_via_webdav_share_received_owner_261eaa70" ON "ocm_via_webdav_received_shares" ("owner");
CREATE INDEX IF NOT EXISTS "ocm_via_webdav_share_received_shared_secret_fbb6be5a" ON "ocm_via_webdav_received_shares" ("shared_secret");
CREATE INDEX IF NOT EXISTS "ocm_via_webdav_share_received_provider_id_a55680e9" ON "ocm_via_webdav_received_shares" ("provider_id");
CREATE INDEX IF NOT EXISTS "ocm_via_webdav_share_received_resource_type_a3c71b57" ON "ocm_via_webdav_received_shares" ("resource_type");
CREATE INDEX IF NOT EXISTS "ocm_via_webdav_share_received_share_type_7615aaab" ON "ocm_via_webdav_received_shares" ("share_type");
CREATE INDEX IF NOT EXISTS "ocm_via_webdav_share_received_share_with_5a23eb17" ON "ocm_via_webdav_received_shares" ("share_with");
CREATE INDEX IF NOT EXISTS "ocm_via_webdav_share_received_shared_by_1786d580" ON "ocm_via_webdav_received_shares" ("shared_by");

CREATE TABLE IF NOT EXISTS "onlyoffice_onlyofficedockey" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "doc_key" varchar(36) NOT NULL, "username" varchar(255) NOT NULL, "repo_id" varchar(36) NULL, "file_path" TEXT NOT NULL, "repo_id_file_path_md5" varchar(100) NOT NULL, "created_time" datetime NOT NULL);
CREATE INDEX IF NOT EXISTS "onlyoffice_onlyofficedockey_doc_key_edba1352" ON "onlyoffice_onlyofficedockey" ("doc_key");
CREATE INDEX IF NOT EXISTS "onlyoffice_onlyofficedockey_repo_id_file_path_md5_52002073" ON "onlyoffice_onlyofficedockey" ("repo_id_file_path_md5");
