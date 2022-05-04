CREATE TABLE IF NOT EXISTS "api2_tokenv2" (
    "key" varchar(40) NOT NULL PRIMARY KEY,
    "user" varchar(255) NOT NULL,
    "platform" varchar(32) NOT NULL,
    "device_id" varchar(40) NOT NULL,
    "device_name" varchar(40) NOT NULL,
    "platform_version" varchar(16) NOT NULL,
    "client_version" varchar(16) NOT NULL,
    "last_accessed" datetime NOT NULL,
    "last_login_ip" char(39),
    UNIQUE ("user", "platform", "device_id")
);

CREATE TABLE IF NOT EXISTS "sysadmin_extra_userloginlog" (
    "id" integer NOT NULL PRIMARY KEY,
    "username" varchar(255) NOT NULL,
    "login_date" datetime NOT NULL,
    "login_ip" varchar(20) NOT NULL
);
CREATE INDEX IF NOT EXISTS "sysadmin_extra_userloginlog_c8db99ec" ON "sysadmin_extra_userloginlog" ("login_date");
CREATE INDEX IF NOT EXISTS "sysadmin_extra_userloginlog_ee0cafa2" ON "sysadmin_extra_userloginlog" ("username");
