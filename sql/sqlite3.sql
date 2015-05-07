PRAGMA foreign_keys=OFF;
CREATE TABLE "django_content_type" (
    "id" integer NOT NULL PRIMARY KEY,
    "name" varchar(100) NOT NULL,
    "app_label" varchar(100) NOT NULL,
    "model" varchar(100) NOT NULL,
    UNIQUE ("app_label", "model")
);
INSERT INTO "django_content_type" VALUES(1,'content type','contenttypes','contenttype');
INSERT INTO "django_content_type" VALUES(2,'session','sessions','session');
INSERT INTO "django_content_type" VALUES(3,'registration profile','registration','registrationprofile');
INSERT INTO "django_content_type" VALUES(4,'captcha store','captcha','captchastore');
INSERT INTO "django_content_type" VALUES(5,'token','api2','token');
INSERT INTO "django_content_type" VALUES(6,'token v2','api2','tokenv2');
INSERT INTO "django_content_type" VALUES(7,'avatar','avatar','avatar');
INSERT INTO "django_content_type" VALUES(8,'group avatar','avatar','groupavatar');
INSERT INTO "django_content_type" VALUES(9,'group enabled module','base','groupenabledmodule');
INSERT INTO "django_content_type" VALUES(10,'uuid objid map','base','uuidobjidmap');
INSERT INTO "django_content_type" VALUES(11,'inner pub msg reply','base','innerpubmsgreply');
INSERT INTO "django_content_type" VALUES(12,'commands last check','base','commandslastcheck');
INSERT INTO "django_content_type" VALUES(13,'user enabled module','base','userenabledmodule');
INSERT INTO "django_content_type" VALUES(15,'device token','base','devicetoken');
INSERT INTO "django_content_type" VALUES(17,'file discuss','base','filediscuss');
INSERT INTO "django_content_type" VALUES(18,'inner pub msg','base','innerpubmsg');
INSERT INTO "django_content_type" VALUES(20,'user last login','base','userlastlogin');
INSERT INTO "django_content_type" VALUES(21,'user starred files','base','userstarredfiles');
INSERT INTO "django_content_type" VALUES(22,'contact','contacts','contact');
INSERT INTO "django_content_type" VALUES(23,'personal wiki','wiki','personalwiki');
INSERT INTO "django_content_type" VALUES(24,'group wiki','wiki','groupwiki');
INSERT INTO "django_content_type" VALUES(25,'public group','group','publicgroup');
INSERT INTO "django_content_type" VALUES(26,'group message','group','groupmessage');
INSERT INTO "django_content_type" VALUES(27,'message attachment','group','messageattachment');
INSERT INTO "django_content_type" VALUES(28,'message reply','group','messagereply');
INSERT INTO "django_content_type" VALUES(29,'user msg attachment','message','usermsgattachment');
INSERT INTO "django_content_type" VALUES(30,'user msg last check','message','usermsglastcheck');
INSERT INTO "django_content_type" VALUES(31,'user message','message','usermessage');
INSERT INTO "django_content_type" VALUES(32,'notification','notifications','notification');
INSERT INTO "django_content_type" VALUES(33,'user notification','notifications','usernotification');
INSERT INTO "django_content_type" VALUES(34,'user options','options','useroptions');
INSERT INTO "django_content_type" VALUES(35,'profile','profile','profile');
INSERT INTO "django_content_type" VALUES(36,'detailed profile','profile','detailedprofile');
INSERT INTO "django_content_type" VALUES(37,'private file dir share','share','privatefiledirshare');
INSERT INTO "django_content_type" VALUES(38,'upload link share','share','uploadlinkshare');
INSERT INTO "django_content_type" VALUES(39,'file share','share','fileshare');
INSERT INTO "django_content_type" VALUES(40,'anonymous share','share','anonymousshare');
INSERT INTO "django_content_type" VALUES(41,'org file share','share','orgfileshare');
INSERT INTO "django_content_type" VALUES(42,'group public file','pubfile','grouppublicfile');
INSERT INTO "django_content_type" VALUES(43,'user login log','sysadmin_extra','userloginlog');
INSERT INTO "django_content_type" VALUES(44,'client login token','base','clientlogintoken');
INSERT INTO "django_content_type" VALUES(45,'org member quota','organizations','orgmemberquota');
CREATE TABLE "django_session" (
    "session_key" varchar(40) NOT NULL PRIMARY KEY,
    "session_data" text NOT NULL,
    "expire_date" datetime NOT NULL
);
CREATE TABLE "registration_registrationprofile" (
    "id" integer NOT NULL PRIMARY KEY,
    "emailuser_id" integer NOT NULL,
    "activation_key" varchar(40) NOT NULL
);
CREATE TABLE "captcha_captchastore" (
    "id" integer NOT NULL PRIMARY KEY,
    "challenge" varchar(32) NOT NULL,
    "response" varchar(32) NOT NULL,
    "hashkey" varchar(40) NOT NULL UNIQUE,
    "expiration" datetime NOT NULL
);
CREATE TABLE "api2_token" (
    "key" varchar(40) NOT NULL PRIMARY KEY,
    "user" varchar(255) NOT NULL UNIQUE,
    "created" datetime NOT NULL
);
CREATE TABLE "api2_tokenv2" (
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
CREATE TABLE "avatar_avatar" (
    "id" integer NOT NULL PRIMARY KEY,
    "emailuser" varchar(255) NOT NULL,
    "primary" bool NOT NULL,
    "avatar" varchar(1024) NOT NULL,
    "date_uploaded" datetime NOT NULL
);
CREATE TABLE "avatar_groupavatar" (
    "id" integer NOT NULL PRIMARY KEY,
    "group_id" varchar(255) NOT NULL,
    "avatar" varchar(1024) NOT NULL,
    "date_uploaded" datetime NOT NULL
);
CREATE TABLE "base_uuidobjidmap" (
    "id" integer NOT NULL PRIMARY KEY,
    "uuid" varchar(40) NOT NULL,
    "obj_id" varchar(40) NOT NULL UNIQUE
);
CREATE TABLE "base_filediscuss" (
    "id" integer NOT NULL PRIMARY KEY,
    "group_message_id" integer NOT NULL,
    "repo_id" varchar(36) NOT NULL,
    "path" text NOT NULL,
    "path_hash" varchar(12) NOT NULL
);
CREATE TABLE "base_filecontributors" (
    "id" integer NOT NULL PRIMARY KEY,
    "repo_id" varchar(36) NOT NULL,
    "file_id" varchar(40) NOT NULL,
    "file_path" text NOT NULL,
    "file_path_hash" varchar(12) NOT NULL,
    "last_modified" bigint NOT NULL,
    "last_commit_id" varchar(40) NOT NULL,
    "emails" text NOT NULL
);
CREATE TABLE "base_userstarredfiles" (
    "id" integer NOT NULL PRIMARY KEY,
    "email" varchar(75) NOT NULL,
    "org_id" integer NOT NULL,
    "repo_id" varchar(36) NOT NULL,
    "path" text NOT NULL,
    "is_dir" bool NOT NULL
);
CREATE TABLE "base_dirfileslastmodifiedinfo" (
    "id" integer NOT NULL PRIMARY KEY,
    "repo_id" varchar(36) NOT NULL,
    "parent_dir" text NOT NULL,
    "parent_dir_hash" varchar(12) NOT NULL,
    "dir_id" varchar(40) NOT NULL,
    "last_modified_info" text NOT NULL,
    UNIQUE ("repo_id", "parent_dir_hash")
);
CREATE TABLE "base_filelastmodifiedinfo" (
    "id" integer NOT NULL PRIMARY KEY,
    "repo_id" varchar(36) NOT NULL,
    "file_id" varchar(40) NOT NULL,
    "file_path" text NOT NULL,
    "file_path_hash" varchar(12) NOT NULL,
    "last_modified" bigint NOT NULL,
    "email" varchar(75) NOT NULL,
    UNIQUE ("repo_id", "file_path_hash")
);
CREATE TABLE "base_userenabledmodule" (
    "id" integer NOT NULL PRIMARY KEY,
    "username" varchar(255) NOT NULL,
    "module_name" varchar(20) NOT NULL
);
CREATE TABLE "base_groupenabledmodule" (
    "id" integer NOT NULL PRIMARY KEY,
    "group_id" varchar(10) NOT NULL,
    "module_name" varchar(20) NOT NULL
);
CREATE TABLE "base_userlastlogin" (
    "id" integer NOT NULL PRIMARY KEY,
    "username" varchar(255) NOT NULL,
    "last_login" datetime NOT NULL
);
CREATE TABLE "base_commandslastcheck" (
    "id" integer NOT NULL PRIMARY KEY,
    "command_type" varchar(100) NOT NULL,
    "last_check" datetime NOT NULL
);
CREATE TABLE "base_innerpubmsg" (
    "id" integer NOT NULL PRIMARY KEY,
    "from_email" varchar(75) NOT NULL,
    "message" varchar(500) NOT NULL,
    "timestamp" datetime NOT NULL
);
CREATE TABLE "base_innerpubmsgreply" (
    "id" integer NOT NULL PRIMARY KEY,
    "reply_to_id" integer NOT NULL REFERENCES "base_innerpubmsg" ("id"),
    "from_email" varchar(75) NOT NULL,
    "message" varchar(150) NOT NULL,
    "timestamp" datetime NOT NULL
);
CREATE TABLE "base_devicetoken" (
    "id" integer NOT NULL PRIMARY KEY,
    "token" varchar(80) NOT NULL,
    "user" varchar(255) NOT NULL,
    "platform" varchar(32) NOT NULL,
    "version" varchar(16) NOT NULL,
    "pversion" varchar(16) NOT NULL,
    UNIQUE ("token", "user")
);
CREATE TABLE "contacts_contact" (
    "id" integer NOT NULL PRIMARY KEY,
    "user_email" varchar(255) NOT NULL,
    "contact_email" varchar(255) NOT NULL,
    "contact_name" varchar(255),
    "note" varchar(255)
);
CREATE TABLE "wiki_personalwiki" (
    "id" integer NOT NULL PRIMARY KEY,
    "username" varchar(255) NOT NULL UNIQUE,
    "repo_id" varchar(36) NOT NULL
);
CREATE TABLE "wiki_groupwiki" (
    "id" integer NOT NULL PRIMARY KEY,
    "group_id" integer NOT NULL UNIQUE,
    "repo_id" varchar(36) NOT NULL
);
CREATE TABLE "group_groupmessage" (
    "id" integer NOT NULL PRIMARY KEY,
    "group_id" integer NOT NULL,
    "from_email" varchar(255) NOT NULL,
    "message" varchar(2048) NOT NULL,
    "timestamp" datetime NOT NULL
);
CREATE TABLE "group_messagereply" (
    "id" integer NOT NULL PRIMARY KEY,
    "reply_to_id" integer NOT NULL REFERENCES "group_groupmessage" ("id"),
    "from_email" varchar(255) NOT NULL,
    "message" varchar(2048) NOT NULL,
    "timestamp" datetime NOT NULL
);
CREATE TABLE "group_messageattachment" (
    "id" integer NOT NULL PRIMARY KEY,
    "group_message_id" integer NOT NULL REFERENCES "group_groupmessage" ("id"),
    "repo_id" varchar(40) NOT NULL,
    "attach_type" varchar(5) NOT NULL,
    "path" text NOT NULL,
    "src" varchar(20) NOT NULL
);
CREATE TABLE "group_publicgroup" (
    "id" integer NOT NULL PRIMARY KEY,
    "group_id" integer NOT NULL
);
CREATE TABLE "message_usermessage" (
    "message_id" integer NOT NULL PRIMARY KEY,
    "message" varchar(512) NOT NULL,
    "from_email" varchar(255) NOT NULL,
    "to_email" varchar(255) NOT NULL,
    "timestamp" datetime NOT NULL,
    "ifread" bool NOT NULL,
    "sender_deleted_at" datetime,
    "recipient_deleted_at" datetime
);
CREATE TABLE "message_usermsglastcheck" (
    "id" integer NOT NULL PRIMARY KEY,
    "check_time" datetime NOT NULL
);
CREATE TABLE "message_usermsgattachment" (
    "id" integer NOT NULL PRIMARY KEY,
    "user_msg_id" integer NOT NULL REFERENCES "message_usermessage" ("message_id"),
    "priv_file_dir_share_id" integer
);
CREATE TABLE "notifications_notification" (
    "id" integer NOT NULL PRIMARY KEY,
    "message" varchar(512) NOT NULL,
    "primary" bool NOT NULL
);
CREATE TABLE "notifications_usernotification" (
    "id" integer NOT NULL PRIMARY KEY,
    "to_user" varchar(255) NOT NULL,
    "msg_type" varchar(30) NOT NULL,
    "detail" text NOT NULL,
    "timestamp" datetime NOT NULL,
    "seen" bool NOT NULL
);
CREATE TABLE "options_useroptions" (
    "id" integer NOT NULL PRIMARY KEY,
    "email" varchar(255) NOT NULL,
    "option_key" varchar(50) NOT NULL,
    "option_val" varchar(50) NOT NULL
);
CREATE TABLE "profile_profile" (
    "id" integer NOT NULL PRIMARY KEY,
    "user" varchar(75) NOT NULL UNIQUE,
    "nickname" varchar(64) NOT NULL,
    "intro" text NOT NULL,
    "lang_code" text
);
CREATE TABLE "profile_detailedprofile" (
    "id" integer NOT NULL PRIMARY KEY,
    "user" varchar(255) NOT NULL,
    "department" varchar(512) NOT NULL,
    "telephone" varchar(100) NOT NULL
);
CREATE TABLE "share_anonymousshare" (
    "id" integer NOT NULL PRIMARY KEY,
    "repo_owner" varchar(255) NOT NULL,
    "repo_id" varchar(36) NOT NULL,
    "anonymous_email" varchar(255) NOT NULL,
    "token" varchar(25) NOT NULL UNIQUE
);
CREATE TABLE "share_fileshare" (
    "id" integer NOT NULL PRIMARY KEY,
    "username" varchar(255) NOT NULL,
    "repo_id" varchar(36) NOT NULL,
    "path" text NOT NULL,
    "token" varchar(10) NOT NULL UNIQUE,
    "ctime" datetime NOT NULL,
    "view_cnt" integer NOT NULL,
    "s_type" varchar(2) NOT NULL,
    "password" varchar(128),
    "expire_date" datetime
);
CREATE TABLE "share_orgfileshare" (
    "id" integer NOT NULL PRIMARY KEY,
    "org_id" integer NOT NULL,
    "file_share_id" integer NOT NULL UNIQUE REFERENCES "share_fileshare" ("id")
);
CREATE TABLE "share_uploadlinkshare" (
    "id" integer NOT NULL PRIMARY KEY,
    "username" varchar(255) NOT NULL,
    "repo_id" varchar(36) NOT NULL,
    "path" text NOT NULL,
    "token" varchar(10) NOT NULL UNIQUE,
    "ctime" datetime NOT NULL,
    "view_cnt" integer NOT NULL,
    "password" varchar(128),
    "expire_date" datetime
);
CREATE TABLE "share_privatefiledirshare" (
    "id" integer NOT NULL PRIMARY KEY,
    "from_user" varchar(255) NOT NULL,
    "to_user" varchar(255) NOT NULL,
    "repo_id" varchar(36) NOT NULL,
    "path" text NOT NULL,
    "token" varchar(10) NOT NULL UNIQUE,
    "permission" varchar(5) NOT NULL,
    "s_type" varchar(5) NOT NULL
);
CREATE TABLE "pubfile_grouppublicfile" (
    "id" integer NOT NULL PRIMARY KEY,
    "group_id" integer NOT NULL,
    "repo_id" varchar(36) NOT NULL,
    "path" varchar(4096) NOT NULL,
    "is_dir" bool NOT NULL,
    "added_by" varchar(256) NOT NULL,
    "description" varchar(1024) NOT NULL,
    "download_count" integer NOT NULL
);
CREATE TABLE "sysadmin_extra_userloginlog" (
    "id" integer NOT NULL PRIMARY KEY,
    "username" varchar(255) NOT NULL,
    "login_date" datetime NOT NULL,
    "login_ip" varchar(20) NOT NULL
);
CREATE TABLE "base_clientlogintoken" (
    "token" varchar(32) NOT NULL PRIMARY KEY,
    "username" varchar(255) NOT NULL,
    "timestamp" datetime NOT NULL
);
CREATE TABLE "organizations_orgmemberquota" (
    "id" integer NOT NULL PRIMARY KEY,
    "org_id" integer NOT NULL,
    "quota" integer NOT NULL
);
CREATE INDEX "django_session_b7b81f0c" ON "django_session" ("expire_date");
CREATE INDEX "base_filediscuss_12d5396a" ON "base_filediscuss" ("group_message_id");
CREATE INDEX "base_filediscuss_656b4f4a" ON "base_filediscuss" ("path_hash");
CREATE INDEX "base_filecontributors_2059abe4" ON "base_filecontributors" ("repo_id");
CREATE INDEX "base_userstarredfiles_2059abe4" ON "base_userstarredfiles" ("repo_id");
CREATE INDEX "base_filelastmodifiedinfo_2059abe4" ON "base_filelastmodifiedinfo" ("repo_id");
CREATE INDEX "base_filelastmodifiedinfo_880f7193" ON "base_filelastmodifiedinfo" ("file_path_hash");
CREATE INDEX "base_userenabledmodule_ee0cafa2" ON "base_userenabledmodule" ("username");
CREATE INDEX "base_groupenabledmodule_dc00373b" ON "base_groupenabledmodule" ("group_id");
CREATE INDEX "base_userlastlogin_ee0cafa2" ON "base_userlastlogin" ("username");
CREATE INDEX "base_innerpubmsgreply_3fde75e6" ON "base_innerpubmsgreply" ("reply_to_id");
CREATE INDEX "contacts_contact_d3d8b136" ON "contacts_contact" ("user_email");
CREATE INDEX "group_groupmessage_dc00373b" ON "group_groupmessage" ("group_id");
CREATE INDEX "group_messagereply_3fde75e6" ON "group_messagereply" ("reply_to_id");
CREATE INDEX "group_messageattachment_12d5396a" ON "group_messageattachment" ("group_message_id");
CREATE INDEX "group_publicgroup_dc00373b" ON "group_publicgroup" ("group_id");
CREATE INDEX "message_usermessage_8b1dd4eb" ON "message_usermessage" ("from_email");
CREATE INDEX "message_usermessage_590d1560" ON "message_usermessage" ("to_email");
CREATE INDEX "message_usermsgattachment_72f290f5" ON "message_usermsgattachment" ("user_msg_id");
CREATE INDEX "message_usermsgattachment_cee41a9a" ON "message_usermsgattachment" ("priv_file_dir_share_id");
CREATE INDEX "notifications_usernotification_bc172800" ON "notifications_usernotification" ("to_user");
CREATE INDEX "notifications_usernotification_265e5521" ON "notifications_usernotification" ("msg_type");
CREATE INDEX "options_useroptions_830a6ccb" ON "options_useroptions" ("email");
CREATE INDEX "profile_detailedprofile_6340c63c" ON "profile_detailedprofile" ("user");
CREATE INDEX "share_fileshare_ee0cafa2" ON "share_fileshare" ("username");
CREATE INDEX "share_fileshare_2059abe4" ON "share_fileshare" ("repo_id");
CREATE INDEX "share_fileshare_44096fd5" ON "share_fileshare" ("s_type");
CREATE INDEX "share_orgfileshare_944dadb6" ON "share_orgfileshare" ("org_id");
CREATE INDEX "share_uploadlinkshare_ee0cafa2" ON "share_uploadlinkshare" ("username");
CREATE INDEX "share_uploadlinkshare_2059abe4" ON "share_uploadlinkshare" ("repo_id");
CREATE INDEX "share_privatefiledirshare_0e7efed3" ON "share_privatefiledirshare" ("from_user");
CREATE INDEX "share_privatefiledirshare_bc172800" ON "share_privatefiledirshare" ("to_user");
CREATE INDEX "share_privatefiledirshare_2059abe4" ON "share_privatefiledirshare" ("repo_id");
CREATE INDEX "pubfile_grouppublicfile_dc00373b" ON "pubfile_grouppublicfile" ("group_id");
CREATE INDEX "sysadmin_extra_userloginlog_ee0cafa2" ON "sysadmin_extra_userloginlog" ("username");
CREATE INDEX "sysadmin_extra_userloginlog_c8db99ec" ON "sysadmin_extra_userloginlog" ("login_date");
CREATE INDEX "base_clientlogintoken_ee0cafa2" ON "base_clientlogintoken" ("username");
CREATE INDEX "organizations_orgmemberquota_944dadb6" ON "organizations_orgmemberquota" ("org_id");
