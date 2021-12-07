alter table share_fileshare add column permission varchar(50) not null default 'view_download';

CREATE TABLE "admin_log_adminlog" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "email" varchar(254) NOT NULL, "operation" varchar(255) NOT NULL, "detail" text NOT NULL, "datetime" datetime NOT NULL);
                                   
CREATE TABLE "institutions_institutionquota" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "quota" bigint NOT NULL, "institution_id" integer NOT NULL REFERENCES "institutions_institution" ("id"));

CREATE INDEX "admin_log_adminlog_0c83f57c" ON "admin_log_adminlog" ("email");
CREATE INDEX "admin_log_adminlog_f7235a61" ON "admin_log_adminlog" ("operation");
CREATE INDEX "institutions_institutionquota_a964baeb" ON "institutions_institutionquota" ("institution_id");