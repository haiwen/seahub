CREATE TABLE IF NOT EXISTS "org_saml_config" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "org_id" integer NOT NULL UNIQUE, "metadata_url" TEXT NOT NULL, "domain" varchar(255) NOT NULL UNIQUE);

CREATE TABLE IF NOT EXISTS "base_usermonitoredrepos" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "email" varchar(254) NOT NULL, "repo_id" varchar(36) NOT NULL, "timestamp" datetime NOT NULL, UNIQUE ("email", "repo_id"));
CREATE INDEX IF NOT EXISTS "base_usermonitoredrepos_email_55ead1b9" ON "base_usermonitoredrepos" ("email");
CREATE INDEX IF NOT EXISTS "base_usermonitoredrepos_repo_id_00e624c3" ON "base_usermonitoredrepos" ("repo_id");

CREATE TABLE IF NOT EXISTS "organizations_orgadminsettings" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "org_id" integer NOT NULL, "key" varchar(255) NOT NULL, "value" TEXT NOT NULL, UNIQUE ("org_id", "key"));
CREATE INDEX IF NOT EXISTS "organizations_orgadminsettings_org_id_4f70d186" ON "organizations_orgadminsettings" ("org_id");
