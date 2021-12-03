CREATE TABLE IF NOT EXISTS "auth_group" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "name" varchar(80) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS "auth_group_permissions" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "group_id" integer NOT NULL REFERENCES "auth_group" ("id"), "permission_id" integer NOT NULL REFERENCES "auth_permission" ("id"));
CREATE TABLE IF NOT EXISTS "auth_user_groups" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "user_id" integer NOT NULL REFERENCES "auth_user" ("id"), "group_id" integer NOT NULL REFERENCES "auth_group" ("id"));
CREATE TABLE IF NOT EXISTS "auth_user_user_permissions" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "user_id" integer NOT NULL REFERENCES "auth_user" ("id"), "permission_id" integer NOT NULL REFERENCES "auth_permission" ("id"));
CREATE TABLE IF NOT EXISTS "auth_permission" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "content_type_id" integer NOT NULL REFERENCES "django_content_type" ("id"), "codename" varchar(100) NOT NULL, "name" varchar(255) NOT NULL);
CREATE TABLE IF NOT EXISTS "auth_user" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "password" varchar(128) NOT NULL, "last_login" datetime NULL, "is_superuser" bool NOT NULL, "first_name" varchar(30) NOT NULL, "last_name" varchar(30) NOT NULL, "email" varchar(254) NOT NULL, "is_staff" bool NOT NULL, "is_active" bool NOT NULL, "date_joined" datetime NOT NULL, "username" varchar(150) NOT NULL UNIQUE);

CREATE TABLE IF NOT EXISTS "organizations_orgmemberquota" (
    "id" integer NOT NULL PRIMARY KEY,
    "org_id" integer NOT NULL,
    "quota" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "django_cas_ng_sessionticket" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "session_key" varchar(255) NOT NULL, "ticket" varchar(255) NOT NULL);
CREATE TABLE IF NOT EXISTS "django_cas_ng_proxygrantingticket" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "session_key" varchar(255) NULL, "pgtiou" varchar(255) NULL, "pgt" varchar(255) NULL, "date" datetime NOT NULL, "user" varchar(255) NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_group_permissions_group_id_permission_id_0cd325b0_uniq" ON "auth_group_permissions" ("group_id", "permission_id");
CREATE INDEX IF NOT EXISTS "auth_group_permissions_group_id_b120cbf9" ON "auth_group_permissions" ("group_id");
CREATE INDEX IF NOT EXISTS "auth_group_permissions_permission_id_84c5c92e" ON "auth_group_permissions" ("permission_id");
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_groups_user_id_group_id_94350c0c_uniq" ON "auth_user_groups" ("user_id", "group_id");
CREATE INDEX IF NOT EXISTS "auth_user_groups_user_id_6a12ed8b" ON "auth_user_groups" ("user_id");
CREATE INDEX IF NOT EXISTS "auth_user_groups_group_id_97559544" ON "auth_user_groups" ("group_id");
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_user_permissions_user_id_permission_id_14a6b632_uniq" ON "auth_user_user_permissions" ("user_id", "permission_id");
CREATE INDEX IF NOT EXISTS "auth_user_user_permissions_user_id_a95ead1b" ON "auth_user_user_permissions" ("user_id");
CREATE INDEX IF NOT EXISTS "auth_user_user_permissions_permission_id_1fbb5f2c" ON "auth_user_user_permissions" ("permission_id");
CREATE UNIQUE INDEX IF NOT EXISTS "auth_permission_content_type_id_codename_01ab375a_uniq" ON "auth_permission" ("content_type_id", "codename");
CREATE INDEX IF NOT EXISTS "auth_permission_content_type_id_2f476e4b" ON "auth_permission" ("content_type_id");

CREATE TABLE IF NOT EXISTS "wiki_wiki" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "username" varchar(255) NOT NULL, "name" varchar(255) NOT NULL, "slug" varchar(255) NOT NULL UNIQUE, "repo_id" varchar(36) NOT NULL, "permission" varchar(50) NOT NULL, "created_at" datetime NOT NULL, UNIQUE ("username", "repo_id"));

CREATE INDEX IF NOT EXISTS "wiki_wiki_fde81f11" ON "wiki_wiki" ("created_at");

CREATE INDEX IF NOT EXISTS "notifications_notification_386bba5a" ON "notifications_notification" ("primary");
CREATE INDEX IF NOT EXISTS "institutions_institutionadmin_ee11cbb1" ON "institutions_institutionadmin" ("user");

CREATE INDEX IF NOT EXISTS "organizations_orgmemberquota_944dadb6" ON "organizations_orgmemberquota" ("org_id");
CREATE UNIQUE INDEX IF NOT EXISTS "django_cas_ng_proxygrantingticket_session_key_user_8a4ec2bc_uniq" ON "django_cas_ng_proxygrantingticket" ("session_key", "user");
CREATE INDEX IF NOT EXISTS "django_cas_ng_proxygrantingticket_user_1f42619d" ON "django_cas_ng_proxygrantingticket" ("user");

ALTER TABLE "post_office_attachment" add column "mimetype" varchar(255);
