CREATE TABLE IF NOT EXISTS "org_saml_config" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "org_id" integer NOT NULL UNIQUE, "metadata_url" TEXT NOT NULL, "single_sign_on_service" TEXT NOT NULL, "single_logout_service" TEXT NOT NULL, "valid_days" integer NOT NULL);

CREATE TABLE IF NOT EXISTS "base_usermonitoredrepos" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "email" varchar(254) NOT NULL, "repo_id" varchar(36) NOT NULL, "timestamp" datetime NOT NULL, UNIQUE ("email", "repo_id"));
CREATE INDEX IF NOT EXISTS "base_usermonitoredrepos_email_55ead1b9" ON "base_usermonitoredrepos" ("email");
CREATE INDEX IF NOT EXISTS "base_usermonitoredrepos_repo_id_00e624c3" ON "base_usermonitoredrepos" ("repo_id");
