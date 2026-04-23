CREATE TABLE IF NOT EXISTS "abuse_reports_abusereport"
(
    "id"          serial PRIMARY KEY,
    "reporter"    text DEFAULT NULL,
    "repo_id"     varchar(36)  NOT NULL,
    "repo_name"   varchar(255) NOT NULL,
    "file_path"   text DEFAULT NULL,
    "abuse_type"  varchar(255) NOT NULL,
    "description" text DEFAULT NULL,
    "handled"     boolean      NOT NULL,
    "time"        timestamptz  NOT NULL
);
CREATE INDEX IF NOT EXISTS "abuse_reports_abusereport_abuse_type_703d5335" ON abuse_reports_abusereport ("abuse_type");
CREATE INDEX IF NOT EXISTS "abuse_reports_abusereport_handled_94b8304c" ON abuse_reports_abusereport ("handled");

CREATE TABLE IF NOT EXISTS "admin_log_adminlog"
(
    "id"        serial PRIMARY KEY,
    "email"     varchar(254) NOT NULL,
    "operation" varchar(255) NOT NULL,
    "detail"    TEXT         NOT NULL,
    "datetime"  timestamptz  NOT NULL
);
CREATE INDEX IF NOT EXISTS "admin_log_adminlog_email_7213c993" ON "admin_log_adminlog" ("email");
CREATE INDEX IF NOT EXISTS "admin_log_adminlog_operation_4bad7bd1" ON "admin_log_adminlog" ("operation");

CREATE TABLE IF NOT EXISTS "api2_token"
(
    "key"     varchar(40)  NOT NULL PRIMARY KEY,
    "user"    varchar(255) NOT NULL,
    "created" timestamptz  NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "user" ON "api2_token" ("user");

CREATE TABLE IF NOT EXISTS "api2_tokenv2"
(
    "key"              varchar(40)  NOT NULL PRIMARY KEY,
    "user"             varchar(255) NOT NULL,
    "platform"         varchar(32)  NOT NULL,
    "device_id"        varchar(40)  NOT NULL,
    "device_name"      varchar(40)  NOT NULL,
    "platform_version" varchar(16)  NOT NULL,
    "client_version"   varchar(16)  NOT NULL,
    "last_accessed"    timestamptz  NOT NULL,
    "last_login_ip"    char(39)    DEFAULT NULL,
    "created_at"       timestamptz  NOT NULL,
    "wiped_at"         timestamptz DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "api2_tokenv2_user_platform_device_id_37005c24_uniq" ON "api2_tokenv2" ("user", "platform", "device_id");

CREATE TABLE IF NOT EXISTS "auth_group"
(
    "id"   serial PRIMARY KEY,
    "name" varchar(80) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "name" ON "auth_group" ("name");

CREATE TABLE IF NOT EXISTS "auth_group_permissions"
(
    "id"            serial PRIMARY KEY,
    "group_id"      int NOT NULL,
    "permission_id" int NOT NULL,
    CONSTRAINT "auth_group_permissio_permission_id_fk_auth_perm" FOREIGN KEY ("permission_id") REFERENCES "auth_permission" ("id"),
    CONSTRAINT "auth_group_permissions_group_id_fk_auth_group_id" FOREIGN KEY ("group_id") REFERENCES "auth_group" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_group_permissions_group_id_permission_id_0cd325b0_uniq" ON "auth_group_permissions" ("group_id", "permission_id");
CREATE INDEX IF NOT EXISTS "auth_group_permissio_permission_id_84c5c92e_fk_auth_perm" ON "auth_group_permissions" ("permission_id");

CREATE TABLE IF NOT EXISTS "auth_permission"
(
    "id"              serial PRIMARY KEY,
    "name"            varchar(255) NOT NULL,
    "content_type_id" int          NOT NULL,
    "codename"        varchar(100) NOT NULL,
    CONSTRAINT "auth_permission_content_type_id_fk_django_co" FOREIGN KEY ("content_type_id") REFERENCES "django_content_type" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_permission_content_type_id_codename_01ab375a_uniq" ON "auth_permission" ("content_type_id", "codename");
INSERT INTO "auth_permission"
VALUES (1, 'Can add content type', 1, 'add_contenttype'),
       (2, 'Can change content type', 1, 'change_contenttype'),
       (3, 'Can delete content type', 1, 'delete_contenttype'),
       (4, 'Can change config', 2, 'change_config'),
       (5, 'Can add session', 3, 'add_session'),
       (6, 'Can change session', 3, 'change_session'),
       (7, 'Can delete session', 3, 'delete_session'),
       (8, 'Can add client login token', 4, 'add_clientlogintoken'),
       (9, 'Can change client login token', 4, 'change_clientlogintoken'),
       (10, 'Can delete client login token', 4, 'delete_clientlogintoken'),
       (11, 'Can add commands last check', 5, 'add_commandslastcheck'),
       (12, 'Can change commands last check', 5, 'change_commandslastcheck'),
       (13, 'Can delete commands last check', 5, 'delete_commandslastcheck'),
       (14, 'Can add device token', 6, 'add_devicetoken'),
       (15, 'Can change device token', 6, 'change_devicetoken'),
       (16, 'Can delete device token', 6, 'delete_devicetoken'),
       (17, 'Can add file comment', 7, 'add_filecomment'),
       (18, 'Can change file comment', 7, 'change_filecomment'),
       (19, 'Can delete file comment', 7, 'delete_filecomment'),
       (20, 'Can add file discuss', 8, 'add_filediscuss'),
       (21, 'Can change file discuss', 8, 'change_filediscuss'),
       (22, 'Can delete file discuss', 8, 'delete_filediscuss'),
       (23, 'Can add group enabled module', 9, 'add_groupenabledmodule'),
       (24, 'Can change group enabled module', 9, 'change_groupenabledmodule'),
       (25, 'Can delete group enabled module', 9, 'delete_groupenabledmodule'),
       (26, 'Can add inner pub msg', 10, 'add_innerpubmsg'),
       (27, 'Can change inner pub msg', 10, 'change_innerpubmsg'),
       (28, 'Can delete inner pub msg', 10, 'delete_innerpubmsg'),
       (29, 'Can add inner pub msg reply', 11, 'add_innerpubmsgreply'),
       (30, 'Can change inner pub msg reply', 11, 'change_innerpubmsgreply'),
       (31, 'Can delete inner pub msg reply', 11, 'delete_innerpubmsgreply'),
       (32, 'Can add user enabled module', 12, 'add_userenabledmodule'),
       (33, 'Can change user enabled module', 12, 'change_userenabledmodule'),
       (34, 'Can delete user enabled module', 12, 'delete_userenabledmodule'),
       (35, 'Can add user last login', 13, 'add_userlastlogin'),
       (36, 'Can change user last login', 13, 'change_userlastlogin'),
       (37, 'Can delete user last login', 13, 'delete_userlastlogin'),
       (38, 'Can add user starred files', 14, 'add_userstarredfiles'),
       (39, 'Can change user starred files', 14, 'change_userstarredfiles'),
       (40, 'Can delete user starred files', 14, 'delete_userstarredfiles'),
       (41, 'Can add repo secret key', 15, 'add_reposecretkey'),
       (42, 'Can change repo secret key', 15, 'change_reposecretkey'),
       (43, 'Can delete repo secret key', 15, 'delete_reposecretkey'),
       (44, 'Can add permission', 16, 'add_permission'),
       (45, 'Can change permission', 16, 'change_permission'),
       (46, 'Can delete permission', 16, 'delete_permission'),
       (47, 'Can add group', 17, 'add_group'),
       (48, 'Can change group', 17, 'change_group'),
       (49, 'Can delete group', 17, 'delete_group'),
       (50, 'Can add user', 18, 'add_user'),
       (51, 'Can change user', 18, 'change_user'),
       (52, 'Can delete user', 18, 'delete_user'),
       (53, 'Can add registration profile', 19, 'add_registrationprofile'),
       (54, 'Can change registration profile', 19, 'change_registrationprofile'),
       (55, 'Can delete registration profile', 19, 'delete_registrationprofile'),
       (56, 'Can add captcha store', 20, 'add_captchastore'),
       (57, 'Can change captcha store', 20, 'change_captchastore'),
       (58, 'Can delete captcha store', 20, 'delete_captchastore'),
       (59, 'Can add constance', 21, 'add_constance'),
       (60, 'Can change constance', 21, 'change_constance'),
       (61, 'Can delete constance', 21, 'delete_constance'),
       (62, 'Can add Attachment', 22, 'add_attachment'),
       (63, 'Can change Attachment', 22, 'change_attachment'),
       (64, 'Can delete Attachment', 22, 'delete_attachment'),
       (65, 'Can add Email', 23, 'add_email'),
       (66, 'Can change Email', 23, 'change_email'),
       (67, 'Can delete Email', 23, 'delete_email'),
       (68, 'Can add Email Template', 24, 'add_emailtemplate'),
       (69, 'Can change Email Template', 24, 'change_emailtemplate'),
       (70, 'Can delete Email Template', 24, 'delete_emailtemplate'),
       (71, 'Can add Log', 25, 'add_log'),
       (72, 'Can change Log', 25, 'change_log'),
       (73, 'Can delete Log', 25, 'delete_log'),
       (74, 'Can add Terms and Conditions', 26, 'add_termsandconditions'),
       (75, 'Can change Terms and Conditions', 26, 'change_termsandconditions'),
       (76, 'Can delete Terms and Conditions', 26, 'delete_termsandconditions'),
       (77, 'Can add User Terms and Conditions', 27, 'add_usertermsandconditions'),
       (78, 'Can change User Terms and Conditions', 27, 'change_usertermsandconditions'),
       (79, 'Can delete User Terms and Conditions', 27, 'delete_usertermsandconditions'),
       (80, 'Can add token', 28, 'add_token'),
       (81, 'Can change token', 28, 'change_token'),
       (82, 'Can delete token', 28, 'delete_token'),
       (83, 'Can add token v2', 29, 'add_tokenv2'),
       (84, 'Can change token v2', 29, 'change_tokenv2'),
       (85, 'Can delete token v2', 29, 'delete_tokenv2'),
       (86, 'Can add avatar', 30, 'add_avatar'),
       (87, 'Can change avatar', 30, 'change_avatar'),
       (88, 'Can delete avatar', 30, 'delete_avatar'),
       (89, 'Can add group avatar', 31, 'add_groupavatar'),
       (90, 'Can change group avatar', 31, 'change_groupavatar'),
       (91, 'Can delete group avatar', 31, 'delete_groupavatar'),
       (92, 'Can add contact', 32, 'add_contact'),
       (93, 'Can change contact', 32, 'change_contact'),
       (94, 'Can delete contact', 32, 'delete_contact'),
       (95, 'Can add draft', 33, 'add_draft'),
       (96, 'Can change draft', 33, 'change_draft'),
       (97, 'Can delete draft', 33, 'delete_draft'),
       (98, 'Can add draft reviewer', 34, 'add_draftreviewer'),
       (99, 'Can change draft reviewer', 34, 'change_draftreviewer'),
       (100, 'Can delete draft reviewer', 34, 'delete_draftreviewer'),
       (101, 'Can add institution', 35, 'add_institution'),
       (102, 'Can change institution', 35, 'change_institution'),
       (103, 'Can delete institution', 35, 'delete_institution'),
       (104, 'Can add institution admin', 36, 'add_institutionadmin'),
       (105, 'Can change institution admin', 36, 'change_institutionadmin'),
       (106, 'Can delete institution admin', 36, 'delete_institutionadmin'),
       (107, 'Can add institution quota', 37, 'add_institutionquota'),
       (108, 'Can change institution quota', 37, 'change_institutionquota'),
       (109, 'Can delete institution quota', 37, 'delete_institutionquota'),
       (110, 'Can add invitation', 38, 'add_invitation'),
       (111, 'Can change invitation', 38, 'change_invitation'),
       (112, 'Can delete invitation', 38, 'delete_invitation'),
       (113, 'Can add group wiki', 39, 'add_groupwiki'),
       (114, 'Can change group wiki', 39, 'change_groupwiki'),
       (115, 'Can delete group wiki', 39, 'delete_groupwiki'),
       (116, 'Can add personal wiki', 40, 'add_personalwiki'),
       (117, 'Can change personal wiki', 40, 'change_personalwiki'),
       (118, 'Can delete personal wiki', 40, 'delete_personalwiki'),
       (119, 'Can add wiki', 41, 'add_wiki'),
       (120, 'Can change wiki', 41, 'change_wiki'),
       (121, 'Can delete wiki', 41, 'delete_wiki'),
       (122, 'Can add notification', 42, 'add_notification'),
       (123, 'Can change notification', 42, 'change_notification'),
       (124, 'Can delete notification', 42, 'delete_notification'),
       (125, 'Can add user notification', 43, 'add_usernotification'),
       (126, 'Can change user notification', 43, 'change_usernotification'),
       (127, 'Can delete user notification', 43, 'delete_usernotification'),
       (128, 'Can add user options', 44, 'add_useroptions'),
       (129, 'Can change user options', 44, 'change_useroptions'),
       (130, 'Can delete user options', 44, 'delete_useroptions'),
       (131, 'Can add detailed profile', 45, 'add_detailedprofile'),
       (132, 'Can change detailed profile', 45, 'change_detailedprofile'),
       (133, 'Can delete detailed profile', 45, 'delete_detailedprofile'),
       (134, 'Can add profile', 46, 'add_profile'),
       (135, 'Can change profile', 46, 'change_profile'),
       (136, 'Can delete profile', 46, 'delete_profile'),
       (137, 'Can add anonymous share', 47, 'add_anonymousshare'),
       (138, 'Can change anonymous share', 47, 'change_anonymousshare'),
       (139, 'Can delete anonymous share', 47, 'delete_anonymousshare'),
       (140, 'Can add extra groups share permission', 48, 'add_extragroupssharepermission'),
       (141, 'Can change extra groups share permission', 48, 'change_extragroupssharepermission'),
       (142, 'Can delete extra groups share permission', 48, 'delete_extragroupssharepermission'),
       (143, 'Can add extra share permission', 49, 'add_extrasharepermission'),
       (144, 'Can change extra share permission', 49, 'change_extrasharepermission'),
       (145, 'Can delete extra share permission', 49, 'delete_extrasharepermission'),
       (146, 'Can add file share', 50, 'add_fileshare'),
       (147, 'Can change file share', 50, 'change_fileshare'),
       (148, 'Can delete file share', 50, 'delete_fileshare'),
       (149, 'Can add org file share', 51, 'add_orgfileshare'),
       (150, 'Can change org file share', 51, 'change_orgfileshare'),
       (151, 'Can delete org file share', 51, 'delete_orgfileshare'),
       (152, 'Can add private file dir share', 52, 'add_privatefiledirshare'),
       (153, 'Can change private file dir share', 52, 'change_privatefiledirshare'),
       (154, 'Can delete private file dir share', 52, 'delete_privatefiledirshare'),
       (155, 'Can add upload link share', 53, 'add_uploadlinkshare'),
       (156, 'Can change upload link share', 53, 'change_uploadlinkshare'),
       (157, 'Can delete upload link share', 53, 'delete_uploadlinkshare'),
       (158, 'Can add admin log', 54, 'add_adminlog'),
       (159, 'Can change admin log', 54, 'change_adminlog'),
       (160, 'Can delete admin log', 54, 'delete_adminlog'),
       (161, 'Can add file tag', 55, 'add_filetag'),
       (162, 'Can change file tag', 55, 'change_filetag'),
       (163, 'Can delete file tag', 55, 'delete_filetag'),
       (164, 'Can add file uuid map', 56, 'add_fileuuidmap'),
       (165, 'Can change file uuid map', 56, 'change_fileuuidmap'),
       (166, 'Can delete file uuid map', 56, 'delete_fileuuidmap'),
       (167, 'Can add tags', 57, 'add_tags'),
       (168, 'Can change tags', 57, 'change_tags'),
       (169, 'Can delete tags', 57, 'delete_tags'),
       (170, 'Can add revision tags', 58, 'add_revisiontags'),
       (171, 'Can change revision tags', 58, 'change_revisiontags'),
       (172, 'Can delete revision tags', 58, 'delete_revisiontags'),
       (173, 'Can add tags', 59, 'add_tags'),
       (174, 'Can change tags', 59, 'change_tags'),
       (175, 'Can delete tags', 59, 'delete_tags'),
       (176, 'Can add phone device', 60, 'add_phonedevice'),
       (177, 'Can change phone device', 60, 'change_phonedevice'),
       (178, 'Can delete phone device', 60, 'delete_phonedevice'),
       (179, 'Can add static device', 61, 'add_staticdevice'),
       (180, 'Can change static device', 61, 'change_staticdevice'),
       (181, 'Can delete static device', 61, 'delete_staticdevice'),
       (182, 'Can add static token', 62, 'add_statictoken'),
       (183, 'Can change static token', 62, 'change_statictoken'),
       (184, 'Can delete static token', 62, 'delete_statictoken'),
       (185, 'Can add TOTP device', 63, 'add_totpdevice'),
       (186, 'Can change TOTP device', 63, 'change_totpdevice'),
       (187, 'Can delete TOTP device', 63, 'delete_totpdevice'),
       (188, 'Can add admin role', 64, 'add_adminrole'),
       (189, 'Can change admin role', 64, 'change_adminrole'),
       (190, 'Can delete admin role', 64, 'delete_adminrole'),
       (191, 'Can add trusted ip', 65, 'add_trustedip'),
       (192, 'Can change trusted ip', 65, 'change_trustedip'),
       (193, 'Can delete trusted ip', 65, 'delete_trustedip'),
       (194, 'Can add repo tags', 66, 'add_repotags'),
       (195, 'Can change repo tags', 66, 'change_repotags'),
       (196, 'Can delete repo tags', 66, 'delete_repotags'),
       (197, 'Can add file tags', 67, 'add_filetags'),
       (198, 'Can change file tags', 67, 'change_filetags'),
       (199, 'Can delete file tags', 67, 'delete_filetags'),
       (200, 'Can add related files', 68, 'add_relatedfiles'),
       (201, 'Can change related files', 68, 'change_relatedfiles'),
       (202, 'Can delete related files', 68, 'delete_relatedfiles'),
       (203, 'Can add file participant', 69, 'add_fileparticipant'),
       (204, 'Can change file participant', 69, 'change_fileparticipant'),
       (205, 'Can delete file participant', 69, 'delete_fileparticipant'),
       (206, 'Can add repo api tokens', 70, 'add_repoapitokens'),
       (207, 'Can change repo api tokens', 70, 'change_repoapitokens'),
       (208, 'Can delete repo api tokens', 70, 'delete_repoapitokens'),
       (209, 'Can add abuse report', 71, 'add_abusereport'),
       (210, 'Can change abuse report', 71, 'change_abusereport'),
       (211, 'Can delete abuse report', 71, 'delete_abusereport'),
       (212, 'Can add user login log', 72, 'add_userloginlog'),
       (213, 'Can change user login log', 72, 'change_userloginlog'),
       (214, 'Can delete user login log', 72, 'delete_userloginlog'),
       (215, 'Can add org member quota', 73, 'add_orgmemberquota'),
       (216, 'Can change org member quota', 73, 'change_orgmemberquota'),
       (217, 'Can delete org member quota', 73, 'delete_orgmemberquota'),
       (218, 'Can add org settings', 74, 'add_orgsettings'),
       (219, 'Can change org settings', 74, 'change_orgsettings'),
       (220, 'Can delete org settings', 74, 'delete_orgsettings'),
       (221, 'Can add proxy granting ticket', 75, 'add_proxygrantingticket'),
       (222, 'Can change proxy granting ticket', 75, 'change_proxygrantingticket'),
       (223, 'Can delete proxy granting ticket', 75, 'delete_proxygrantingticket'),
       (224, 'Can add session ticket', 76, 'add_sessionticket'),
       (225, 'Can change session ticket', 76, 'change_sessionticket'),
       (226, 'Can delete session ticket', 76, 'delete_sessionticket'),
       (227, 'Can add user plan', 77, 'add_userplan'),
       (228, 'Can change user plan', 77, 'change_userplan'),
       (229, 'Can delete user plan', 77, 'delete_userplan'),
       (230, 'Can add org plan', 78, 'add_orgplan'),
       (231, 'Can change org plan', 78, 'change_orgplan'),
       (232, 'Can delete org plan', 78, 'delete_orgplan'),
       (233, 'Can add social auth user', 79, 'add_socialauthuser'),
       (234, 'Can change social auth user', 79, 'change_socialauthuser'),
       (235, 'Can delete social auth user', 79, 'delete_socialauthuser'),
       (236, 'Can add repo share invitation', 80, 'add_reposhareinvitation'),
       (237, 'Can change repo share invitation', 80, 'change_reposhareinvitation'),
       (238, 'Can delete repo share invitation', 80, 'delete_reposhareinvitation');

CREATE TABLE IF NOT EXISTS "auth_user"
(
    "id"           serial primary key,
    "password"     varchar(128) NOT NULL,
    "last_login"   timestamptz DEFAULT NULL,
    "is_superuser" boolean      NOT NULL,
    "username"     varchar(150) NOT NULL,
    "first_name"   varchar(30)  NOT NULL,
    "last_name"    varchar(30)  NOT NULL,
    "email"        varchar(254) NOT NULL,
    "is_staff"     boolean      NOT NULL,
    "is_active"    boolean      NOT NULL,
    "date_joined"  timestamptz  NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "username" ON "auth_user" ("username");

CREATE TABLE IF NOT EXISTS "auth_user_groups"
(
    "id"       serial PRIMARY KEY,
    "user_id"  int NOT NULL,
    "group_id" int NOT NULL,
    CONSTRAINT "auth_user_groups_group_id_fk_auth_group_id" FOREIGN KEY ("group_id") REFERENCES "auth_group" ("id"),
    CONSTRAINT "auth_user_groups_user_id_fk_auth_user_id" FOREIGN KEY ("user_id") REFERENCES "auth_user" ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_groups_user_id_group_id_94350c0c_uniq" ON "auth_user_groups" ("user_id", "group_id");
CREATE INDEX IF NOT EXISTS "auth_user_groups_group_id_97559544_fk_auth_group_id" ON "auth_user_groups" ("group_id");

CREATE TABLE IF NOT EXISTS "auth_user_user_permissions"
(
    "id"            serial primary key,
    "user_id"       int NOT NULL,
    "permission_id" int NOT NULL,
    CONSTRAINT "auth_user_user_permi_permission_id_fk_auth_perm" FOREIGN KEY ("permission_id") REFERENCES "auth_permission" ("id"),
    CONSTRAINT "auth_user_user_permissions_user_id_fk_auth_user_id" FOREIGN KEY ("user_id") REFERENCES "auth_user" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_user_permissions_user_id_permission_id_14a6b632_uniq" ON "auth_user_user_permissions" ("user_id", "permission_id");
CREATE INDEX IF NOT EXISTS "auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm" ON "auth_user_user_permissions" ("permission_id");

CREATE TABLE IF NOT EXISTS "avatar_avatar"
(
    "id"            serial PRIMARY KEY,
    "emailuser"     varchar(255)  NOT NULL,
    "primary"       boolean       NOT NULL,
    "avatar"        varchar(1024) NOT NULL,
    "date_uploaded" timestamptz   NOT NULL
);

CREATE TABLE IF NOT EXISTS "avatar_groupavatar"
(
    "id"            serial PRIMARY KEY,
    "group_id"      varchar(255)  NOT NULL,
    "avatar"        varchar(1024) NOT NULL,
    "date_uploaded" timestamptz   NOT NULL
);

CREATE TABLE IF NOT EXISTS "base_clientlogintoken"
(
    "token"     varchar(32)  NOT NULL PRIMARY KEY,
    "username"  varchar(255) NOT NULL,
    "timestamp" timestamptz  NOT NULL
);
CREATE INDEX IF NOT EXISTS "base_clientlogintoken_username_4ad5d42c" ON "base_clientlogintoken" ("username");

CREATE TABLE IF NOT EXISTS "base_commandslastcheck"
(
    "id"           serial primary key,
    "command_type" varchar(100) NOT NULL,
    "last_check"   timestamptz  NOT NULL
);

CREATE TABLE IF NOT EXISTS "base_devicetoken"
(
    "id"       serial primary key,
    "token"    varchar(80)  NOT NULL,
    "user"     varchar(255) NOT NULL,
    "platform" varchar(32)  NOT NULL,
    "version"  varchar(16)  NOT NULL,
    "pversion" varchar(16)  NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "base_devicetoken_token_user_38535636_uniq" ON "base_devicetoken" ("token", "user");

CREATE TABLE IF NOT EXISTS "base_filecomment"
(
    "id"         serial primary key,
    "author"     varchar(255) NOT NULL,
    "comment"    text         NOT NULL,
    "created_at" timestamptz  NOT NULL,
    "updated_at" timestamptz  NOT NULL,
    "uuid_id"    char(32)     NOT NULL,
    "detail"     text         NOT NULL,
    "resolved"   boolean      NOT NULL,
    CONSTRAINT "base_filecomment_uuid_id_fk_tags_fileuuidmap_uuid" FOREIGN KEY ("uuid_id") REFERENCES "tags_fileuuidmap" ("uuid")
);
CREATE INDEX IF NOT EXISTS "base_filecomment_uuid_id_4f9a2ca2_fk_tags_fileuuidmap_uuid" ON "base_filecomment" ("uuid_id");
CREATE INDEX IF NOT EXISTS "base_filecomment_author_8a4d7e91" ON "base_filecomment" ("author");
CREATE INDEX IF NOT EXISTS "base_filecomment_resolved_e0717eca" ON "base_filecomment" ("resolved");

CREATE TABLE IF NOT EXISTS "base_reposecretkey"
(
    "id"         serial primary key,
    "repo_id"    varchar(36) NOT NULL,
    "secret_key" varchar(44) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "repo_id" ON "base_reposecretkey" ("repo_id");

CREATE TABLE IF NOT EXISTS "base_userlastlogin"
(
    "id"         serial primary key,
    "username"   varchar(255) NOT NULL,
    "last_login" timestamptz  NOT NULL
);
CREATE INDEX IF NOT EXISTS "base_userlastlogin_username_270de06f" ON "base_userlastlogin" ("username");

CREATE TABLE IF NOT EXISTS "base_userstarredfiles"
(
    "id"      serial primary key,
    "email"   varchar(254) NOT NULL,
    "org_id"  int          NOT NULL,
    "repo_id" varchar(36)  NOT NULL,
    "path"    text         NOT NULL,
    "is_dir"  boolean      NOT NULL
);
CREATE INDEX IF NOT EXISTS "base_userstarredfiles_email_29e69053" ON "base_userstarredfiles" ("email");
CREATE INDEX IF NOT EXISTS "base_userstarredfiles_repo_id_f5ecc00a" ON "base_userstarredfiles" ("repo_id");

CREATE TABLE IF NOT EXISTS "captcha_captchastore"
(
    "id"         serial primary key,
    "challenge"  varchar(32) NOT NULL,
    "response"   varchar(32) NOT NULL,
    "hashkey"    varchar(40) NOT NULL,
    "expiration" timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "hashkey" ON "captcha_captchastore" ("hashkey");

CREATE TABLE IF NOT EXISTS "constance_config"
(
    "id"            serial primary key,
    "constance_key" varchar(255) NOT NULL,
    "value"         text DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "constance_key" ON "constance_config" ("constance_key");

CREATE TABLE IF NOT EXISTS "contacts_contact"
(
    "id"            serial primary key,
    "user_email"    varchar(255) NOT NULL,
    "contact_email" varchar(255) NOT NULL,
    "contact_name"  varchar(255) DEFAULT NULL,
    "note"          varchar(255) DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS "contacts_contact_user_email_149035d4" ON "contacts_contact" ("user_email");

CREATE TABLE IF NOT EXISTS "django_cas_ng_proxygrantingticket"
(
    "id"          serial primary key,
    "session_key" varchar(255) DEFAULT NULL,
    "pgtiou"      varchar(255) DEFAULT NULL,
    "pgt"         varchar(255) DEFAULT NULL,
    "date"        timestamptz  NOT NULL,
    "user"        varchar(255) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "django_cas_ng_proxygrant_session_key_user_id_4cd2ea19_uniq" ON "django_cas_ng_proxygrantingticket" ("session_key", "user");
CREATE INDEX IF NOT EXISTS "django_cas_ng_proxyg_user_id_f833edd2_fk_auth_user" ON "django_cas_ng_proxygrantingticket" ("user");

CREATE TABLE IF NOT EXISTS "django_cas_ng_sessionticket"
(
    "id"          serial primary key,
    "session_key" varchar(255) NOT NULL,
    "ticket"      varchar(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "django_content_type"
(
    "id"        serial primary key,
    "app_label" varchar(100) NOT NULL,
    "model"     varchar(100) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "django_content_type_app_label_model_76bd3d3b_uniq" ON "django_content_type" ("app_label", "model");

INSERT INTO "django_content_type"
VALUES (71, 'abuse_reports', 'abusereport'),
       (54, 'admin_log', 'adminlog'),
       (28, 'api2', 'token'),
       (29, 'api2', 'tokenv2'),
       (17, 'auth', 'group'),
       (16, 'auth', 'permission'),
       (18, 'auth', 'user'),
       (30, 'avatar', 'avatar'),
       (31, 'avatar', 'groupavatar'),
       (4, 'base', 'clientlogintoken'),
       (5, 'base', 'commandslastcheck'),
       (6, 'base', 'devicetoken'),
       (7, 'base', 'filecomment'),
       (8, 'base', 'filediscuss'),
       (9, 'base', 'groupenabledmodule'),
       (10, 'base', 'innerpubmsg'),
       (11, 'base', 'innerpubmsgreply'),
       (15, 'base', 'reposecretkey'),
       (79, 'base', 'socialauthuser'),
       (12, 'base', 'userenabledmodule'),
       (13, 'base', 'userlastlogin'),
       (14, 'base', 'userstarredfiles'),
       (20, 'captcha', 'captchastore'),
       (2, 'constance', 'config'),
       (32, 'contacts', 'contact'),
       (1, 'contenttypes', 'contenttype'),
       (21, 'database', 'constance'),
       (75, 'django_cas_ng', 'proxygrantingticket'),
       (76, 'django_cas_ng', 'sessionticket'),
       (33, 'drafts', 'draft'),
       (34, 'drafts', 'draftreviewer'),
       (69, 'file_participants', 'fileparticipant'),
       (67, 'file_tags', 'filetags'),
       (35, 'institutions', 'institution'),
       (36, 'institutions', 'institutionadmin'),
       (37, 'institutions', 'institutionquota'),
       (38, 'invitations', 'invitation'),
       (80, 'invitations', 'reposhareinvitation'),
       (42, 'notifications', 'notification'),
       (43, 'notifications', 'usernotification'),
       (44, 'options', 'useroptions'),
       (73, 'organizations', 'orgmemberquota'),
       (74, 'organizations', 'orgsettings'),
       (78, 'plan', 'orgplan'),
       (77, 'plan', 'userplan'),
       (22, 'post_office', 'attachment'),
       (23, 'post_office', 'email'),
       (24, 'post_office', 'emailtemplate'),
       (25, 'post_office', 'log'),
       (45, 'profile', 'detailedprofile'),
       (46, 'profile', 'profile'),
       (19, 'registration', 'registrationprofile'),
       (68, 'related_files', 'relatedfiles'),
       (70, 'repo_api_tokens', 'repoapitokens'),
       (66, 'repo_tags', 'repotags'),
       (58, 'revision_tag', 'revisiontags'),
       (59, 'revision_tag', 'tags'),
       (64, 'role_permissions', 'adminrole'),
       (3, 'sessions', 'session'),
       (47, 'share', 'anonymousshare'),
       (48, 'share', 'extragroupssharepermission'),
       (49, 'share', 'extrasharepermission'),
       (50, 'share', 'fileshare'),
       (51, 'share', 'orgfileshare'),
       (52, 'share', 'privatefiledirshare'),
       (53, 'share', 'uploadlinkshare'),
       (72, 'sysadmin_extra', 'userloginlog'),
       (55, 'tags', 'filetag'),
       (56, 'tags', 'fileuuidmap'),
       (57, 'tags', 'tags'),
       (26, 'termsandconditions', 'termsandconditions'),
       (27, 'termsandconditions', 'usertermsandconditions'),
       (65, 'trusted_ip', 'trustedip'),
       (60, 'two_factor', 'phonedevice'),
       (61, 'two_factor', 'staticdevice'),
       (62, 'two_factor', 'statictoken'),
       (63, 'two_factor', 'totpdevice'),
       (39, 'wiki', 'groupwiki'),
       (40, 'wiki', 'personalwiki'),
       (41, 'wiki', 'wiki');

CREATE TABLE IF NOT EXISTS "django_migrations"
(
    "id"      serial primary key,
    "app"     varchar(255) NOT NULL,
    "name"    varchar(255) NOT NULL,
    "applied" timestamptz  NOT NULL
);

INSERT INTO "django_migrations"
VALUES (1, 'abuse_reports', '0001_initial', '2019-11-25 14:33:59.365443'),
       (2, 'admin_log', '0001_initial', '2019-11-25 14:33:59.469182'),
       (3, 'api2', '0001_initial', '2019-11-25 14:33:59.693836'),
       (4, 'contenttypes', '0001_initial', '2019-11-25 14:33:59.777749'),
       (5, 'contenttypes', '0002_remove_content_type_name', '2019-11-25 14:33:59.858901'),
       (6, 'auth', '0001_initial', '2019-11-25 14:34:00.633824'),
       (7, 'auth', '0002_alter_permission_name_max_length', '2019-11-25 14:34:00.680928'),
       (8, 'auth', '0003_alter_user_email_max_length', '2019-11-25 14:34:00.733661'),
       (9, 'auth', '0004_alter_user_username_opts', '2019-11-25 14:34:00.752616'),
       (10, 'auth', '0005_alter_user_last_login_null', '2019-11-25 14:34:00.801604'),
       (11, 'auth', '0006_require_contenttypes_0002', '2019-11-25 14:34:00.810103'),
       (12, 'auth', '0007_alter_validators_add_error_messages', '2019-11-25 14:34:00.825053'),
       (13, 'auth', '0008_alter_user_username_max_length', '2019-11-25 14:34:00.890617'),
       (14, 'avatar', '0001_initial', '2019-11-25 14:34:01.063878'),
       (15, 'tags', '0001_initial', '2019-11-25 14:34:01.557738'),
       (16, 'group', '0001_initial', '2019-11-25 14:34:02.025435'),
       (17, 'base', '0001_initial', '2019-11-25 14:34:03.226703'),
       (18, 'base', '0002_reposecretkey', '2019-11-25 14:34:03.319120'),
       (19, 'base', '0003_auto_1242', '2019-11-25 14:34:03.417627'),
       (20, 'captcha', '0001_initial', '2019-11-25 14:34:03.542585'),
       (21, 'contacts', '0001_initial', '2019-11-25 14:34:03.652793'),
       (22, 'database', '0001_initial', '2019-11-25 14:34:03.725390'),
       (23, 'database', '0002_auto_2304', '2019-11-25 14:34:03.776378'),
       (24, 'django_cas_ng', '0001_initial', '2019-11-25 14:34:04.033039'),
       (25, 'django_cas_ng', '0002_auto_0948', '2019-11-25 14:34:04.169581'),
       (26, 'drafts', '0001_initial', '2019-11-25 14:34:10.856324'),
       (27, 'drafts', '0002_draftreview_author', '2019-11-25 14:34:10.929413'),
       (28, 'drafts', '0003_auto_0648', '2019-11-25 14:34:11.432905'),
       (29, 'drafts', '0004_auto_0628', '2019-11-25 14:34:11.577308'),
       (30, 'file_participants', '0001_initial', '2019-11-25 14:34:11.763284'),
       (31, 'repo_tags', '0001_initial', '2019-11-25 14:34:11.903061'),
       (32, 'file_tags', '0001_initial', '2019-11-25 14:34:12.191192'),
       (33, 'file_tags', '0002_remove_filetags_parent_folder_uuid', '2019-11-25 14:34:12.272233'),
       (34, 'institutions', '0001_initial', '2019-11-25 14:34:12.508609'),
       (35, 'institutions', '0002_institutionquota', '2019-11-25 14:34:12.666828'),
       (36, 'institutions', '0003_auto_0710', '2019-11-25 14:34:12.713231'),
       (37, 'invitations', '0001_initial', '2019-11-25 14:34:12.865889'),
       (38, 'invitations', '0002_invitation_invite_type', '2019-11-25 14:34:12.922193'),
       (39, 'invitations', '0003_auto_1703', '2019-11-25 14:34:12.982345'),
       (40, 'invitations', '0004_auto_1610', '2019-11-25 14:34:13.064011'),
       (41, 'invitations', '0005_auto_1614', '2019-11-25 14:34:13.096590'),
       (42, 'notifications', '0001_initial', '2019-11-25 14:34:13.310594'),
       (43, 'notifications', '0002_auto_0710', '2019-11-25 14:34:13.355493'),
       (44, 'notifications', '0003_auto_0825', '2019-11-25 14:34:13.404819'),
       (45, 'options', '0001_initial', '2019-11-25 14:34:13.560917'),
       (46, 'options', '0002_auto_0811', '2019-11-25 14:34:13.621244'),
       (47, 'organizations', '0001_initial', '2019-11-25 14:34:13.735566'),
       (48, 'organizations', '0002_orgsettings', '2019-11-25 14:34:13.846286'),
       (49, 'organizations', '0003_auto_0323', '2019-11-25 14:34:13.891216'),
       (50, 'post_office', '0001_initial', '2019-11-25 14:34:14.814213'),
       (51, 'post_office', '0002_add_i18n_and_backend_alias', '2019-11-25 14:34:15.077736'),
       (52, 'post_office', '0003_longer_subject', '2019-11-25 14:34:15.116500'),
       (53, 'post_office', '0004_auto_0901', '2019-11-25 14:34:15.488007'),
       (54, 'post_office', '0005_auto_0013', '2019-11-25 14:34:15.531781'),
       (55, 'post_office', '0006_attachment_mimetype', '2019-11-25 14:34:15.590856'),
       (56, 'post_office', '0007_auto_1342', '2019-11-25 14:34:15.622814'),
       (57, 'post_office', '0008_attachment_headers', '2019-11-25 14:34:15.675049'),
       (58, 'profile', '0001_initial', '2019-11-25 14:34:15.884625'),
       (59, 'profile', '0002_auto_0225', '2019-11-25 14:34:15.922660'),
       (60, 'registration', '0001_initial', '2019-11-25 14:34:16.012897'),
       (61, 'related_files', '0001_initial', '2019-11-25 14:34:16.156173'),
       (62, 'repo_api_tokens', '0001_initial', '2019-11-25 14:34:16.290298'),
       (63, 'revision_tag', '0001_initial', '2019-11-25 14:34:16.522331'),
       (64, 'role_permissions', '0001_initial', '2019-11-25 14:34:16.607236'),
       (65, 'sessions', '0001_initial', '2019-11-25 14:34:16.695390'),
       (66, 'share', '0001_initial', '2019-11-25 14:34:17.428416'),
       (67, 'sysadmin_extra', '0001_initial', '2019-11-25 14:34:17.556464'),
       (68, 'termsandconditions', '0001_initial', '2019-11-25 14:34:17.895240'),
       (69, 'trusted_ip', '0001_initial', '2019-11-25 14:34:17.991415'),
       (70, 'two_factor', '0001_initial', '2019-11-25 14:34:18.432226'),
       (71, 'wiki', '0001_initial', '2019-11-25 14:34:18.609279'),
       (72, 'wiki', '0002_auto_0548', '2019-11-25 14:34:18.797942'),
       (73, 'wiki', '0003_auto_0619', '2019-11-25 14:34:18.851746'),
       (74, 'base', '0004_auto_1555', '2019-11-25 15:57:10.821867'),
       (75, 'contacts', '0002_auto_1555', '2019-11-25 15:57:10.842151'),
       (76, 'group', '0002_auto_1555', '2019-11-25 15:57:10.966529'),
       (77, 'invitations', '0006_reposhareinvitation', '2019-11-25 15:57:11.090331'),
       (78, 'notifications', '0004_auto_1555', '2019-11-25 15:57:11.106563'),
       (79, 'profile', '0003_auto_1555', '2019-11-25 15:57:11.124521'),
       (80, 'revision_tag', '0002_auto_1555', '2019-11-25 15:57:11.142928'),
       (81, 'share', '0002_auto_1555', '2019-11-25 15:57:11.176538'),
       (82, 'termsandconditions', '0002_auto_1555', '2019-11-25 15:57:11.231421'),
       (83, 'wiki', '0004_auto_1555', '2019-11-25 15:57:11.266350');

CREATE TABLE IF NOT EXISTS "django_session"
(
    "session_key"  varchar(40) NOT NULL primary key,
    "session_data" text        NOT NULL,
    "expire_date"  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS "django_session_expire_date_a5c62663" ON "django_session" ("expire_date");

CREATE TABLE IF NOT EXISTS "drafts_draft"
(
    "id"                   serial primary key,
    "created_at"           timestamptz   NOT NULL,
    "updated_at"           timestamptz   NOT NULL,
    "username"             varchar(255)  NOT NULL,
    "origin_repo_id"       varchar(36)   NOT NULL,
    "origin_file_version"  varchar(100)  NOT NULL,
    "draft_file_path"      varchar(1024) NOT NULL,
    "origin_file_uuid"     char(32)      NOT NULL,
    "publish_file_version" varchar(100) DEFAULT NULL,
    "status"               varchar(20)   NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "drafts_draft_origin_file_uuid_7c003c98_uniq" ON "drafts_draft" ("origin_file_uuid");
CREATE INDEX IF NOT EXISTS "drafts_draft_created_at_e9f4523f" ON "drafts_draft" ("created_at");
CREATE INDEX IF NOT EXISTS "drafts_draft_updated_at_0a144b05" ON "drafts_draft" ("updated_at");
CREATE INDEX IF NOT EXISTS "drafts_draft_username_73e6738b" ON "drafts_draft" ("username");
CREATE INDEX IF NOT EXISTS "drafts_draft_origin_repo_id_8978ca2c" ON "drafts_draft" ("origin_repo_id");

CREATE TABLE IF NOT EXISTS "drafts_draftreviewer"
(
    "id"       serial primary key,
    "reviewer" varchar(255) NOT NULL,
    "draft_id" int          NOT NULL,
    CONSTRAINT "drafts_draftreviewer_draft_id_fk_drafts_draft_id" FOREIGN KEY ("draft_id") REFERENCES "drafts_draft" ("id")
);
CREATE INDEX IF NOT EXISTS "drafts_draftreviewer_reviewer_e4c777ac" ON "drafts_draftreviewer" ("reviewer");
CREATE INDEX IF NOT EXISTS "drafts_draftreviewer_draft_id_4ea59775_fk_drafts_draft_id" ON "drafts_draftreviewer" ("draft_id");

CREATE TABLE IF NOT EXISTS "file_participants_fileparticipant"
(
    "id"       serial primary key,
    "username" varchar(255) NOT NULL,
    "uuid_id"  char(32)     NOT NULL,
    CONSTRAINT "file_participants_fi_uuid_id_fk_tags_file" FOREIGN KEY ("uuid_id") REFERENCES "tags_fileuuidmap" ("uuid")
);
CREATE UNIQUE INDEX IF NOT EXISTS "file_participants_fileparticipant_uuid_id_username_c747dd36_uniq" ON "file_participants_fileparticipant" ("uuid_id", "username");

CREATE TABLE IF NOT EXISTS "file_tags_filetags"
(
    "id"           serial primary key,
    "file_uuid_id" char(32) NOT NULL,
    "repo_tag_id"  int      NOT NULL,
    CONSTRAINT "file_tags_filetags_file_uuid_id_fk_tags_file" FOREIGN KEY ("file_uuid_id") REFERENCES "tags_fileuuidmap" ("uuid"),
    CONSTRAINT "file_tags_filetags_repo_tag_id_fk_repo_tags_repotags_id" FOREIGN KEY ("repo_tag_id") REFERENCES "repo_tags_repotags" ("id")
);
CREATE INDEX IF NOT EXISTS "file_tags_filetags_file_uuid_id_e30f0ec8_fk_tags_file" ON "file_tags_filetags" ("file_uuid_id");
CREATE INDEX IF NOT EXISTS "file_tags_filetags_repo_tag_id_c39660cb_fk_repo_tags_repotags_id" ON "file_tags_filetags" ("repo_tag_id");

CREATE TABLE IF NOT EXISTS "institutions_institution"
(
    "id"          serial primary key,
    "name"        varchar(200) NOT NULL,
    "create_time" timestamptz  NOT NULL
);

CREATE TABLE IF NOT EXISTS "institutions_institutionadmin"
(
    "id"             serial primary key,
    "user"           varchar(255) NOT NULL,
    "institution_id" int          NOT NULL,
    CONSTRAINT "institutions_institu_institution_id_fk_instituti" FOREIGN KEY ("institution_id") REFERENCES "institutions_institution" ("id")
);
CREATE INDEX IF NOT EXISTS "institutions_institu_institution_id_1e9bb58b_fk_instituti" ON "institutions_institutionadmin" ("institution_id");
CREATE INDEX IF NOT EXISTS "institutions_institutionadmin_user_c71d766d" ON "institutions_institutionadmin" ("user");

CREATE TABLE IF NOT EXISTS "institutions_institutionquota"
(
    "id"             serial primary key,
    "quota"          bigint NOT NULL,
    "institution_id" int    NOT NULL,
    CONSTRAINT "institutions_institu_institution_id_fk_instituti" FOREIGN KEY ("institution_id") REFERENCES "institutions_institution" ("id")
);
CREATE INDEX IF NOT EXISTS "institutions_institu_institution_id_d23201d9_fk_instituti" ON "institutions_institutionquota" ("institution_id");

CREATE TABLE IF NOT EXISTS "invitations_invitation"
(
    "id"          serial primary key,
    "token"       varchar(40)  NOT NULL,
    "inviter"     varchar(255) NOT NULL,
    "accepter"    varchar(255) NOT NULL,
    "invite_time" timestamptz  NOT NULL,
    "accept_time" timestamptz DEFAULT NULL,
    "invite_type" varchar(20)  NOT NULL,
    "expire_time" timestamptz  NOT NULL
);
CREATE INDEX IF NOT EXISTS "invitations_invitation_inviter_b0a7b855" ON "invitations_invitation" ("inviter");
CREATE INDEX IF NOT EXISTS "invitations_invitation_token_25a92a38" ON "invitations_invitation" ("token");

CREATE TABLE IF NOT EXISTS "notifications_notification"
(
    "id"      serial primary key,
    "message" varchar(512) NOT NULL,
    "primary" boolean      NOT NULL
);
CREATE INDEX IF NOT EXISTS "notifications_notification_primary_4f95ec21" ON "notifications_notification" ("primary");

CREATE TABLE IF NOT EXISTS "notifications_usernotification"
(
    "id"        serial primary key,
    "to_user"   varchar(255) NOT NULL,
    "msg_type"  varchar(30)  NOT NULL,
    "detail"    text         NOT NULL,
    "timestamp" timestamptz  NOT NULL,
    "seen"      boolean      NOT NULL
);
CREATE INDEX IF NOT EXISTS "notifications_usernotification_to_user_6cadafa1" ON "notifications_usernotification" ("to_user");
CREATE INDEX IF NOT EXISTS "notifications_usernotification_msg_type_985afd02" ON "notifications_usernotification" ("msg_type");
CREATE INDEX IF NOT EXISTS "notifications_usernotification_timestamp_125067e8" ON "notifications_usernotification" ("timestamp");

CREATE TABLE IF NOT EXISTS "options_useroptions"
(
    "id"         serial primary key,
    "email"      varchar(255) NOT NULL,
    "option_key" varchar(50)  NOT NULL,
    "option_val" varchar(50)  NOT NULL
);
CREATE INDEX IF NOT EXISTS "options_useroptions_email_77d5726a" ON "options_useroptions" ("email");
CREATE INDEX IF NOT EXISTS "options_useroptions_option_key_7bf7ae4b" ON "options_useroptions" ("option_key");

CREATE TABLE IF NOT EXISTS "organizations_orgmemberquota"
(
    "id"     serial primary key,
    "org_id" int NOT NULL,
    "quota"  int NOT NULL
);
CREATE INDEX IF NOT EXISTS "organizations_orgmemberquota_org_id_93dde51d" ON "organizations_orgmemberquota" ("org_id");

CREATE TABLE IF NOT EXISTS "organizations_orgsettings"
(
    "id"     serial primary key,
    "org_id" int NOT NULL,
    "role"   varchar(100) DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_orgsettings_org_id_630f6843_uniq" ON "organizations_orgsettings" ("org_id");

CREATE TABLE IF NOT EXISTS "post_office_attachment"
(
    "id"       serial primary key,
    "file"     varchar(100) NOT NULL,
    "name"     varchar(255) NOT NULL,
    "mimetype" varchar(255) NOT NULL,
    "headers"  text DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "post_office_attachment_emails"
(
    "id"            serial primary key,
    "attachment_id" int NOT NULL,
    "email_id"      int NOT NULL,
    CONSTRAINT "post_office_attachme_attachment_id_fk_post_offi" FOREIGN KEY ("attachment_id") REFERENCES "post_office_attachment" ("id"),
    CONSTRAINT "post_office_attachme_email_id_fk_post_offi" FOREIGN KEY ("email_id") REFERENCES "post_office_email" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "post_office_attachment_e_attachment_id_email_id_8e046917_uniq" ON "post_office_attachment_emails" ("attachment_id", "email_id");
CREATE INDEX IF NOT EXISTS "post_office_attachme_email_id_96875fd9_fk_post_offi" ON "post_office_attachment_emails" ("email_id");

CREATE TABLE IF NOT EXISTS "post_office_email"
(
    "id"             serial primary key,
    "from_email"     varchar(254) NOT NULL,
    "to"             text         NOT NULL,
    "cc"             text         NOT NULL,
    "bcc"            text         NOT NULL,
    "subject"        varchar(989) NOT NULL,
    "message"        text         NOT NULL,
    "html_message"   text         NOT NULL,
    "status"         smallint    DEFAULT NULL,
    "priority"       smallint    DEFAULT NULL,
    "created"        timestamptz  NOT NULL,
    "last_updated"   timestamptz  NOT NULL,
    "scheduled_time" timestamptz DEFAULT NULL,
    "headers"        text,
    "context"        text,
    "template_id"    int         DEFAULT NULL,
    "backend_alias"  varchar(64)  NOT NULL,
    CONSTRAINT "post_office_email_template_id_fk_post_offi" FOREIGN KEY ("template_id") REFERENCES "post_office_emailtemplate" ("id")
);
CREATE INDEX IF NOT EXISTS "post_office_email_status_013a896c" ON "post_office_email" ("status");
CREATE INDEX IF NOT EXISTS "post_office_email_created_1306952f" ON "post_office_email" ("created");
CREATE INDEX IF NOT EXISTS "post_office_email_last_updated_0ffcec35" ON "post_office_email" ("last_updated");
CREATE INDEX IF NOT EXISTS "post_office_email_scheduled_time_3869ebec" ON "post_office_email" ("scheduled_time");
CREATE INDEX IF NOT EXISTS "post_office_email_template_id_417da7da_fk_post_offi" ON "post_office_email" ("template_id");

CREATE TABLE IF NOT EXISTS "post_office_emailtemplate"
(
    "id"                  serial primary key,
    "name"                varchar(255) NOT NULL,
    "description"         text         NOT NULL,
    "subject"             varchar(255) NOT NULL,
    "content"             text         NOT NULL,
    "html_content"        text         NOT NULL,
    "created"             timestamptz  NOT NULL,
    "last_updated"        timestamptz  NOT NULL,
    "default_template_id" int DEFAULT NULL,
    "language"            varchar(12)  NOT NULL,
    CONSTRAINT "post_office_emailtem_default_template_id_fk_post_offi" FOREIGN KEY ("default_template_id") REFERENCES "post_office_emailtemplate" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "post_office_emailtemplat_name_language_default_te_4023e3e4_uniq" ON "post_office_emailtemplate" ("name", "language", "default_template_id");
CREATE INDEX IF NOT EXISTS "post_office_emailtem_default_template_id_2ac2f889_fk_post_offi" ON "post_office_emailtemplate" ("default_template_id");

CREATE TABLE IF NOT EXISTS "post_office_log"
(
    "id"             serial primary key,
    "date"           timestamptz  NOT NULL,
    "status"         smallint     NOT NULL,
    "exception_type" varchar(255) NOT NULL,
    "message"        text         NOT NULL,
    "email_id"       int          NOT NULL,
    CONSTRAINT "post_office_log_email_id_fk_post_office_email_id" FOREIGN KEY ("email_id") REFERENCES "post_office_email" ("id")
);
CREATE INDEX IF NOT EXISTS "post_office_log_email_id_d42c8808_fk_post_office_email_id" ON "post_office_log" ("email_id");

CREATE TABLE IF NOT EXISTS "profile_detailedprofile"
(
    "id"         serial primary key,
    "user"       varchar(255) NOT NULL,
    "department" varchar(512) NOT NULL,
    "telephone"  varchar(100) NOT NULL
);
CREATE INDEX IF NOT EXISTS "profile_detailedprofile_user_612c11ba" ON "profile_detailedprofile" ("user");

CREATE TABLE IF NOT EXISTS "profile_profile"
(
    "id"                   serial primary key,
    "user"                 varchar(254) NOT NULL,
    "nickname"             varchar(64)  NOT NULL,
    "intro"                text         NOT NULL,
    "lang_code"            text,
    "login_id"             varchar(225) DEFAULT NULL,
    "contact_email"        varchar(225) DEFAULT NULL,
    "institution"          varchar(225) DEFAULT NULL,
    "list_in_address_book" boolean      NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "user" ON "profile_profile" ("user");
CREATE UNIQUE INDEX IF NOT EXISTS "login_id" ON "profile_profile" ("login_id");
CREATE UNIQUE INDEX IF NOT EXISTS "profile_profile_contact_email_0975e4bf_uniq" ON "profile_profile" ("contact_email");
CREATE INDEX IF NOT EXISTS "profile_profile_institution_c0286bd1" ON "profile_profile" ("institution");
CREATE INDEX IF NOT EXISTS "profile_profile_list_in_address_book_b1009a78" ON "profile_profile" ("list_in_address_book");

CREATE TABLE IF NOT EXISTS "registration_registrationprofile"
(
    "id"             serial primary key,
    "emailuser_id"   int         NOT NULL,
    "activation_key" varchar(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS "related_files_relatedfiles"
(
    "id"        serial primary key,
    "o_uuid_id" char(32) NOT NULL,
    "r_uuid_id" char(32) NOT NULL,
    CONSTRAINT "related_files_relate_r_uuid_id_fk_tags_file" FOREIGN KEY ("r_uuid_id") REFERENCES "tags_fileuuidmap" ("uuid"),
    CONSTRAINT "related_files_relate_o_uuid_id_fk_tags_file" FOREIGN KEY ("o_uuid_id") REFERENCES "tags_fileuuidmap" ("uuid")
);
CREATE INDEX IF NOT EXISTS "related_files_relate_o_uuid_id_aaa8e613_fk_tags_file" ON "related_files_relatedfiles" ("o_uuid_id");
CREATE INDEX IF NOT EXISTS "related_files_relate_r_uuid_id_031751df_fk_tags_file" ON "related_files_relatedfiles" ("r_uuid_id");

CREATE TABLE IF NOT EXISTS "repo_api_tokens"
(
    "id"           serial primary key,
    "repo_id"      varchar(36)  NOT NULL,
    "app_name"     varchar(255) NOT NULL,
    "token"        varchar(40)  NOT NULL,
    "generated_at" timestamptz  NOT NULL,
    "generated_by" varchar(255) NOT NULL,
    "last_access"  timestamptz  NOT NULL,
    "permission"   varchar(15)  NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "token" ON "repo_api_tokens" ("token");
CREATE INDEX IF NOT EXISTS "repo_api_tokens_repo_id_47a50fef" ON "repo_api_tokens" ("repo_id");
CREATE INDEX IF NOT EXISTS "repo_api_tokens_app_name_7c395c31" ON "repo_api_tokens" ("app_name");

CREATE TABLE IF NOT EXISTS "repo_share_invitation"
(
    "id"            serial primary key,
    "repo_id"       varchar(36) NOT NULL,
    "path"          text        NOT NULL,
    "permission"    varchar(50) NOT NULL,
    "invitation_id" int         NOT NULL,
    CONSTRAINT "repo_share_invitatio_invitation_id_fk_invitatio" FOREIGN KEY ("invitation_id") REFERENCES "invitations_invitation" ("id")
);
CREATE INDEX IF NOT EXISTS "repo_share_invitatio_invitation_id_b71effd2_fk_invitatio" ON "repo_share_invitation" ("invitation_id");
CREATE INDEX IF NOT EXISTS "repo_share_invitation_repo_id_7bcf84fa" ON "repo_share_invitation" ("repo_id");

CREATE TABLE IF NOT EXISTS "repo_tags_repotags"
(
    "id"      serial primary key,
    "repo_id" varchar(36)  NOT NULL,
    "name"    varchar(255) NOT NULL,
    "color"   varchar(255) NOT NULL
);
CREATE INDEX IF NOT EXISTS "repo_tags_repotags_repo_id_1163a48f" ON "repo_tags_repotags" ("repo_id");
CREATE INDEX IF NOT EXISTS "repo_tags_repotags_name_3f4c9027" ON "repo_tags_repotags" ("name");
CREATE INDEX IF NOT EXISTS "repo_tags_repotags_color_1292b6c1" ON "repo_tags_repotags" ("color");

CREATE TABLE IF NOT EXISTS "revision_tag_revisiontags"
(
    "id"          serial primary key,
    "repo_id"     varchar(36)  NOT NULL,
    "path"        text         NOT NULL,
    "revision_id" varchar(255) NOT NULL,
    "username"    varchar(255) NOT NULL,
    "tag_id"      int          NOT NULL,
    CONSTRAINT "revision_tag_revisio_tag_id_fk_revision_" FOREIGN KEY ("tag_id") REFERENCES "revision_tag_tags" ("id")
);
CREATE INDEX IF NOT EXISTS "revision_tag_revisiontags_repo_id_212c0c69" ON "revision_tag_revisiontags" ("repo_id");
CREATE INDEX IF NOT EXISTS "revision_tag_revisiontags_revision_id_fd9fe0f9" ON "revision_tag_revisiontags" ("revision_id");
CREATE INDEX IF NOT EXISTS "revision_tag_revisiontags_username_3007d29e" ON "revision_tag_revisiontags" ("username");
CREATE INDEX IF NOT EXISTS "revision_tag_revisio_tag_id_ee4e9b00_fk_revision_" ON "revision_tag_revisiontags" ("tag_id");

CREATE TABLE IF NOT EXISTS "revision_tag_tags"
(
    "id"   serial primary key,
    "name" varchar(255) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "name" ON "revision_tag_tags" ("name");

CREATE TABLE IF NOT EXISTS "role_permissions_adminrole"
(
    "id"    serial primary key,
    "email" varchar(254) NOT NULL,
    "role"  varchar(255) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "email" ON "role_permissions_adminrole" ("email");

CREATE TABLE IF NOT EXISTS "share_anonymousshare"
(
    "id"              serial primary key,
    "repo_owner"      varchar(255) NOT NULL,
    "repo_id"         varchar(36)  NOT NULL,
    "anonymous_email" varchar(255) NOT NULL,
    "token"           varchar(25)  NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "token" ON "share_anonymousshare" ("token");

CREATE TABLE IF NOT EXISTS "share_extragroupssharepermission"
(
    "id"         serial primary key,
    "repo_id"    varchar(36) NOT NULL,
    "group_id"   int         NOT NULL,
    "permission" varchar(30) NOT NULL
);
CREATE INDEX IF NOT EXISTS "share_extragroupssharepermission_repo_id_38dbaea1" ON "share_extragroupssharepermission" ("repo_id");
CREATE INDEX IF NOT EXISTS "share_extragroupssharepermission_group_id_6ca34bb2" ON "share_extragroupssharepermission" ("group_id");

CREATE TABLE IF NOT EXISTS "share_extrasharepermission"
(
    "id"         serial primary key,
    "repo_id"    varchar(36)  NOT NULL,
    "share_to"   varchar(255) NOT NULL,
    "permission" varchar(30)  NOT NULL
);
CREATE INDEX IF NOT EXISTS "share_extrasharepermission_repo_id_23cc10fc" ON "share_extrasharepermission" ("repo_id");
CREATE INDEX IF NOT EXISTS "share_extrasharepermission_share_to_823c16cb" ON "share_extrasharepermission" ("share_to");

CREATE TABLE IF NOT EXISTS "share_fileshare"
(
    "id"          serial primary key,
    "username"    varchar(255) NOT NULL,
    "repo_id"     varchar(36)  NOT NULL,
    "path"        text         NOT NULL,
    "token"       varchar(100) NOT NULL,
    "ctime"       timestamptz  NOT NULL,
    "view_cnt"    int          NOT NULL,
    "s_type"      varchar(2)   NOT NULL,
    "password"    varchar(128) DEFAULT NULL,
    "expire_date" timestamptz  DEFAULT NULL,
    "permission"  varchar(50)  NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "token" ON "share_fileshare" ("token");
CREATE INDEX IF NOT EXISTS "share_fileshare_username_5cb6de75" ON "share_fileshare" ("username");
CREATE INDEX IF NOT EXISTS "share_fileshare_repo_id_9b5ae27a" ON "share_fileshare" ("repo_id");
CREATE INDEX IF NOT EXISTS "share_fileshare_s_type_724eb6c1" ON "share_fileshare" ("s_type");
CREATE INDEX IF NOT EXISTS "share_fileshare_permission_d12c353f" ON "share_fileshare" ("permission");

CREATE TABLE IF NOT EXISTS "share_orgfileshare"
(
    "id"            serial primary key,
    "org_id"        int NOT NULL,
    "file_share_id" int NOT NULL,
    CONSTRAINT "share_orgfileshare_file_share_id_fk_share_fileshare_id" FOREIGN KEY ("file_share_id") REFERENCES "share_fileshare" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "file_share_id" ON "share_orgfileshare" ("file_share_id");
CREATE INDEX IF NOT EXISTS "share_orgfileshare_org_id_8d17998c" ON "share_orgfileshare" ("org_id");

CREATE TABLE IF NOT EXISTS "share_privatefiledirshare"
(
    "id"         serial primary key,
    "from_user"  varchar(255) NOT NULL,
    "to_user"    varchar(255) NOT NULL,
    "repo_id"    varchar(36)  NOT NULL,
    "path"       text         NOT NULL,
    "token"      varchar(10)  NOT NULL,
    "permission" varchar(5)   NOT NULL,
    "s_type"     varchar(5)   NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "token" ON "share_privatefiledirshare" ("token");
CREATE INDEX IF NOT EXISTS "share_privatefiledirshare_from_user_d568d535" ON "share_privatefiledirshare" ("from_user");
CREATE INDEX IF NOT EXISTS "share_privatefiledirshare_to_user_2a92a044" ON "share_privatefiledirshare" ("to_user");
CREATE INDEX IF NOT EXISTS "share_privatefiledirshare_repo_id_97c5cb6f" ON "share_privatefiledirshare" ("repo_id");

CREATE TABLE IF NOT EXISTS "share_uploadlinkshare"
(
    "id"          serial primary key,
    "username"    varchar(255) NOT NULL,
    "repo_id"     varchar(36)  NOT NULL,
    "path"        text         NOT NULL,
    "token"       varchar(100) NOT NULL,
    "ctime"       timestamptz  NOT NULL,
    "view_cnt"    int          NOT NULL,
    "password"    varchar(128) DEFAULT NULL,
    "expire_date" timestamptz  DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "token" ON "share_uploadlinkshare" ("token");
CREATE INDEX IF NOT EXISTS "share_uploadlinkshare_username_3203c243" ON "share_uploadlinkshare" ("username");
CREATE INDEX IF NOT EXISTS "share_uploadlinkshare_repo_id_c519f857" ON "share_uploadlinkshare" ("repo_id");

CREATE TABLE IF NOT EXISTS "social_auth_usersocialauth"
(
    "id"         serial primary key,
    "username"   varchar(255) NOT NULL,
    "provider"   varchar(32)  NOT NULL,
    "uid"        varchar(255) NOT NULL,
    "extra_data" text         NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "social_auth_usersocialauth_provider_uid_e6b5e668_uniq" ON "social_auth_usersocialauth" ("provider", "uid");
CREATE INDEX IF NOT EXISTS "social_auth_usersocialauth_username_3f06b5cf" ON "social_auth_usersocialauth" ("username");

CREATE TABLE IF NOT EXISTS "sysadmin_extra_userloginlog"
(
    "id"            serial primary key,
    "username"      varchar(255) NOT NULL,
    "login_date"    timestamptz  NOT NULL,
    "login_ip"      varchar(128) NOT NULL,
    "login_success" boolean      NOT NULL
);
CREATE INDEX IF NOT EXISTS "sysadmin_extra_userloginlog_username_5748b9e3" ON "sysadmin_extra_userloginlog" ("username");
CREATE INDEX IF NOT EXISTS "sysadmin_extra_userloginlog_login_date_c171d790" ON "sysadmin_extra_userloginlog" ("login_date");

CREATE TABLE IF NOT EXISTS "tags_filetag"
(
    "id"       serial primary key,
    "username" varchar(255) NOT NULL,
    "tag_id"   int          NOT NULL,
    "uuid_id"  char(32)     NOT NULL,
    CONSTRAINT "tags_filetag_uuid_id_fk_tags_fileuuidmap_uuid" FOREIGN KEY ("uuid_id") REFERENCES "tags_fileuuidmap" ("uuid"),
    CONSTRAINT "tags_filetag_tag_id_fk_tags_tags_id" FOREIGN KEY ("tag_id") REFERENCES "tags_tags" ("id")
);
CREATE INDEX IF NOT EXISTS "tags_filetag_tag_id_0f264fc9_fk_tags_tags_id" ON "tags_filetag" ("tag_id");
CREATE INDEX IF NOT EXISTS "tags_filetag_uuid_id_2aa2266c_fk_tags_fileuuidmap_uuid" ON "tags_filetag" ("uuid_id");

CREATE TABLE IF NOT EXISTS "tags_fileuuidmap"
(
    "uuid"                    char(32)      NOT NULL primary key,
    "repo_id"                 varchar(36)   NOT NULL,
    "repo_id_parent_path_md5" varchar(100)  NOT NULL,
    "parent_path"             text          NOT NULL,
    "filename"                varchar(1024) NOT NULL,
    "is_dir"                  boolean       NOT NULL
);
CREATE INDEX IF NOT EXISTS "tags_fileuuidmap_repo_id_ac67aa33" ON "tags_fileuuidmap" ("repo_id");
CREATE INDEX IF NOT EXISTS "tags_fileuuidmap_repo_id_parent_path_md5_c8bb0860" ON "tags_fileuuidmap" ("repo_id_parent_path_md5");

CREATE TABLE IF NOT EXISTS "tags_tags"
(
    "id"   serial primary key,
    "name" varchar(255) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "name" ON "tags_tags" ("name");

CREATE TABLE IF NOT EXISTS "termsandconditions_termsandconditions"
(
    "id"             serial primary key,
    "slug"           varchar(50)   NOT NULL,
    "name"           text          NOT NULL,
    "version_number" decimal(6, 2) NOT NULL,
    "text"           text,
    "info"           text,
    "date_active"    timestamptz DEFAULT NULL,
    "date_created"   timestamptz   NOT NULL
);
CREATE INDEX IF NOT EXISTS "termsandconditions_termsandconditions_slug_489d1e9d" ON "termsandconditions_termsandconditions" ("slug");

CREATE TABLE IF NOT EXISTS "termsandconditions_usertermsandconditions"
(
    "id"            serial primary key,
    "username"      varchar(255) NOT NULL,
    "ip_address"    char(39) DEFAULT NULL,
    "date_accepted" timestamptz  NOT NULL,
    "terms_id"      int          NOT NULL,
    CONSTRAINT "termsandconditions_u_terms_id_fk_termsandc" FOREIGN KEY ("terms_id") REFERENCES "termsandconditions_termsandconditions" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "termsandconditions_usert_username_terms_id_a7dabb70_uniq" ON "termsandconditions_usertermsandconditions" ("username", "terms_id");
CREATE INDEX IF NOT EXISTS "termsandconditions_u_terms_id_eacdbcc7_fk_termsandc" ON "termsandconditions_usertermsandconditions" ("terms_id");

CREATE TABLE IF NOT EXISTS "trusted_ip_trustedip"
(
    "id" serial primary key,
    "ip" varchar(255) NOT NULL
);
CREATE INDEX IF NOT EXISTS "trusted_ip_trustedip_ip_e898970c" ON "trusted_ip_trustedip" ("ip");

CREATE TABLE IF NOT EXISTS "two_factor_phonedevice"
(
    "id"        serial primary key,
    "user"      varchar(255) NOT NULL,
    "name"      varchar(64)  NOT NULL,
    "confirmed" boolean      NOT NULL,
    "number"    varchar(40)  NOT NULL,
    "key"       varchar(40)  NOT NULL,
    "method"    varchar(4)   NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "user" ON "two_factor_phonedevice" ("user");

CREATE TABLE IF NOT EXISTS "two_factor_staticdevice"
(
    "id"        serial primary key,
    "user"      varchar(255) NOT NULL,
    "name"      varchar(64)  NOT NULL,
    "confirmed" boolean      NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "user" ON "two_factor_staticdevice" ("user");

CREATE TABLE IF NOT EXISTS "two_factor_statictoken"
(
    "id"        serial primary key,
    "token"     varchar(16) NOT NULL,
    "device_id" int         NOT NULL,
    CONSTRAINT "two_factor_statictok_device_id_fk_two_facto" FOREIGN KEY ("device_id") REFERENCES "two_factor_staticdevice" ("id")
);
CREATE INDEX IF NOT EXISTS "two_factor_statictok_device_id_93095b45_fk_two_facto" ON "two_factor_statictoken" ("device_id");
CREATE INDEX IF NOT EXISTS "two_factor_statictoken_token_2ade1084" ON "two_factor_statictoken" ("token");

CREATE TABLE IF NOT EXISTS "two_factor_totpdevice"
(
    "id"        serial primary key,
    "user"      varchar(255) NOT NULL,
    "name"      varchar(64)  NOT NULL,
    "confirmed" boolean      NOT NULL,
    "key"       varchar(80)  NOT NULL,
    "step"      smallint     NOT NULL,
    "t0"        bigint       NOT NULL,
    "digits"    smallint     NOT NULL,
    "tolerance" smallint     NOT NULL,
    "drift"     smallint     NOT NULL,
    "last_t"    bigint       NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "user" ON "two_factor_totpdevice" ("user");

CREATE TABLE IF NOT EXISTS "wiki_wiki"
(
    "id"         serial primary key,
    "username"   varchar(255) NOT NULL,
    "name"       varchar(255) NOT NULL,
    "slug"       varchar(255) NOT NULL,
    "repo_id"    varchar(36)  NOT NULL,
    "permission" varchar(50)  NOT NULL,
    "created_at" timestamptz  NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "slug" ON "wiki_wiki" ("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "wiki_wiki_username_repo_id_4c8925af_uniq" ON "wiki_wiki" ("username", "repo_id");
CREATE INDEX IF NOT EXISTS "wiki_wiki_created_at_54930e39" ON "wiki_wiki" ("created_at");
CREATE INDEX IF NOT EXISTS "wiki_wiki_repo_id_2ee93c37" ON "wiki_wiki" ("repo_id");


CREATE TABLE "ocm_share"
(
    "id"            serial PRIMARY KEY,
    "shared_secret" varchar(36)  NOT NULL,
    "from_user"     varchar(255) NOT NULL,
    "to_user"       varchar(255) NOT NULL,
    "to_server_url" varchar(200) NOT NULL,
    "repo_id"       varchar(36)  NOT NULL,
    "repo_name"     varchar(255) NOT NULL,
    "permission"    varchar(50)  NOT NULL,
    "path"          text         NOT NULL,
    "ctime"         timestamptz  NOT NULL
);
CREATE UNIQUE INDEX "shared_secret" ON "ocm_share" ("shared_secret");
CREATE INDEX "ocm_share_from_user_7fbb7bb6" ON "ocm_share" ("from_user");
CREATE INDEX "ocm_share_to_user_4e255523" ON "ocm_share" ("to_user");
CREATE INDEX "ocm_share_to_server_url_43f0e89b" ON "ocm_share" ("to_server_url");
CREATE INDEX "ocm_share_repo_id_51937581" ON "ocm_share" ("repo_id");

CREATE TABLE IF NOT EXISTS "ocm_share_received"
(
    "id"              serial PRIMARY KEY,
    "shared_secret"   varchar(36)  NOT NULL,
    "from_user"       varchar(255) NOT NULL,
    "to_user"         varchar(255) NOT NULL,
    "from_server_url" varchar(200) NOT NULL,
    "repo_id"         varchar(36)  NOT NULL,
    "repo_name"       varchar(255) NOT NULL,
    "permission"      varchar(50)  NOT NULL,
    "path"            TEXT         NOT NULL,
    "provider_id"     varchar(40)  NOT NULL,
    "ctime"           timestamptz  NOT NULL
);
CREATE INDEX "ocm_share_received_from_user_8137d8eb" ON "ocm_share_received" ("from_user");
CREATE INDEX "ocm_share_received_to_user_0921d09a" ON "ocm_share_received" ("to_user");
CREATE INDEX "ocm_share_received_from_server_url_10527b80" ON "ocm_share_received" ("from_server_url");
CREATE INDEX "ocm_share_received_repo_id_9e77a1b9" ON "ocm_share_received" ("repo_id");
CREATE INDEX "ocm_share_received_provider_id_60c873e0" ON "ocm_share_received" ("provider_id");
CREATE UNIQUE INDEX "shared_secret" ON "ocm_share_received" ("shared_secret");

CREATE TABLE "repo_auto_delete"
(
    "id"      serial PRIMARY KEY,
    "repo_id" varchar(36) NOT NULL,
    "days"    int         NOT NULL
);
CREATE UNIQUE INDEX "repo_id" ON "repo_auto_delete" ("repo_id");

CREATE TABLE "external_department"
(
    "id"       serial PRIMARY KEY,
    "group_id" int         NOT NULL,
    "provider" varchar(32) NOT NULL,
    "outer_id" bigint      NOT NULL
);
CREATE UNIQUE INDEX "group_id" ON "external_department" ("group_id");
CREATE UNIQUE INDEX "external_department_provider_outer_id_8dns6vkw_uniq" ON "external_department" ("provider", "outer_id");

CREATE TABLE "custom_share_permission"
(
    "id"          serial PRIMARY KEY,
    "repo_id"     varchar(36)  NOT NULL,
    "name"        varchar(255) NOT NULL,
    "description" varchar(500) NOT NULL,
    "permission"  text         NOT NULL
);
CREATE INDEX "custom_share_permission_repo_id_578fe49f" ON "custom_share_permission" ("repo_id");

CREATE TABLE "ocm_via_webdav_received_shares"
(
    "id"                     serial PRIMARY KEY,
    "description"            varchar(255) DEFAULT NULL,
    "name"                   varchar(255) NOT NULL,
    "owner"                  varchar(255) NOT NULL,
    "owner_display_name"     varchar(255) DEFAULT NULL,
    "protocol_name"          varchar(255) NOT NULL,
    "shared_secret"          varchar(255) NOT NULL,
    "permissions"            varchar(255) NOT NULL,
    "provider_id"            varchar(255) NOT NULL,
    "resource_type"          varchar(255) NOT NULL,
    "share_type"             varchar(255) NOT NULL,
    "share_with"             varchar(255) NOT NULL,
    "shared_by"              varchar(255) NOT NULL,
    "shared_by_display_name" varchar(255) DEFAULT NULL,
    "ctime"                  timestamptz  NOT NULL,
    "is_dir"                 boolean      NOT NULL
);
CREATE INDEX "ocm_via_webdav_share_received_owner_261eaa70" ON "ocm_via_webdav_received_shares" ("owner");
CREATE INDEX "ocm_via_webdav_share_received_shared_secret_fbb6be5a" ON "ocm_via_webdav_received_shares" ("shared_secret");
CREATE INDEX "ocm_via_webdav_share_received_provider_id_a55680e9" ON "ocm_via_webdav_received_shares" ("provider_id");
CREATE INDEX "ocm_via_webdav_share_received_resource_type_a3c71b57" ON "ocm_via_webdav_received_shares" ("resource_type");
CREATE INDEX "ocm_via_webdav_share_received_share_type_7615aaab" ON "ocm_via_webdav_received_shares" ("share_type");
CREATE INDEX "ocm_via_webdav_share_received_share_with_5a23eb17" ON "ocm_via_webdav_received_shares" ("share_with");
CREATE INDEX "ocm_via_webdav_share_received_shared_by_1786d580" ON "ocm_via_webdav_received_shares" ("shared_by");

CREATE TABLE "onlyoffice_onlyofficedockey"
(
    "id"                    serial PRIMARY KEY,
    "doc_key"               varchar(36)  NOT NULL,
    "username"              varchar(255) NOT NULL,
    "repo_id"               varchar(36)  NOT NULL,
    "file_path"             text         NOT NULL,
    "repo_id_file_path_md5" varchar(100) NOT NULL,
    "created_time"          timestamptz  NOT NULL
);
CREATE INDEX "onlyoffice_onlyofficedockey_doc_key_edba1352" ON "onlyoffice_onlyofficedockey" ("doc_key");
CREATE INDEX "onlyoffice_onlyofficedockey_repo_id_file_path_md5_52002073" ON "onlyoffice_onlyofficedockey" ("repo_id_file_path_md5");
