--------------------------------------------------------
--  DDL for Table API2_TOKEN
--------------------------------------------------------

  CREATE TABLE "API2_TOKEN" 
   (	"KEY" NVARCHAR2(40), 
	"USER" NVARCHAR2(255), 
	"CREATED" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table API2_TOKENV2
--------------------------------------------------------

  CREATE TABLE "API2_TOKENV2" 
   (	"KEY" NVARCHAR2(40), 
	"USER" NVARCHAR2(255), 
	"PLATFORM" NVARCHAR2(32), 
	"DEVICE_ID" NVARCHAR2(40), 
	"DEVICE_NAME" NVARCHAR2(40), 
	"PLATFORM_VERSION" NVARCHAR2(16), 
	"CLIENT_VERSION" NVARCHAR2(16), 
	"LAST_ACCESSED" TIMESTAMP (6), 
	"LAST_LOGIN_IP" VARCHAR2(39 BYTE), 
	"CREATED_AT" TIMESTAMP (6), 
	"WIPED_AT" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table AVATAR_AVATAR
--------------------------------------------------------

  CREATE TABLE "AVATAR_AVATAR" 
   (	"ID" NUMBER(11,0), 
	"EMAILUSER" NVARCHAR2(255), 
	"PRIMARY" NUMBER(1,0), 
	"AVATAR" NVARCHAR2(1024), 
	"DATE_UPLOADED" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table AVATAR_GROUPAVATAR
--------------------------------------------------------

  CREATE TABLE "AVATAR_GROUPAVATAR" 
   (	"ID" NUMBER(11,0), 
	"GROUP_ID" NVARCHAR2(255), 
	"AVATAR" NVARCHAR2(1024), 
	"DATE_UPLOADED" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table BASE_CLIENTLOGINTOKEN
--------------------------------------------------------

  CREATE TABLE "BASE_CLIENTLOGINTOKEN" 
   (	"TOKEN" NVARCHAR2(32), 
	"USERNAME" NVARCHAR2(255), 
	"TIMESTAMP" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table BASE_COMMANDSLASTCHECK
--------------------------------------------------------

  CREATE TABLE "BASE_COMMANDSLASTCHECK" 
   (	"ID" NUMBER(11,0), 
	"COMMAND_TYPE" NVARCHAR2(100), 
	"LAST_CHECK" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table BASE_DEVICETOKEN
--------------------------------------------------------

  CREATE TABLE "BASE_DEVICETOKEN" 
   (	"ID" NUMBER(11,0), 
	"TOKEN" NVARCHAR2(80), 
	"USER" NVARCHAR2(255), 
	"PLATFORM" NVARCHAR2(32), 
	"VERSION" NVARCHAR2(16), 
	"PVERSION" NVARCHAR2(16)
   ) ;
--------------------------------------------------------
--  DDL for Table BASE_FILECOMMENT
--------------------------------------------------------

  CREATE TABLE "BASE_FILECOMMENT" 
   (	"ID" NUMBER(11,0), 
	"REPO_ID" NVARCHAR2(36), 
	"PARENT_PATH" NCLOB, 
	"REPO_ID_PARENT_PATH_MD5" NVARCHAR2(100), 
	"ITEM_NAME" NCLOB, 
	"AUTHOR" NVARCHAR2(255), 
	"COMMENT" NCLOB, 
	"CREATED_AT" TIMESTAMP (6), 
	"UPDATED_AT" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table BASE_FILEDISCUSS
--------------------------------------------------------

  CREATE TABLE "BASE_FILEDISCUSS" 
   (	"ID" NUMBER(11,0), 
	"GROUP_MESSAGE_ID" NUMBER(11,0), 
	"REPO_ID" NVARCHAR2(36), 
	"PATH" NCLOB, 
	"PATH_HASH" NVARCHAR2(12)
   ) ;
--------------------------------------------------------
--  DDL for Table BASE_GROUPENABLEDMODULE
--------------------------------------------------------

  CREATE TABLE "BASE_GROUPENABLEDMODULE" 
   (	"ID" NUMBER(11,0), 
	"GROUP_ID" NVARCHAR2(10), 
	"MODULE_NAME" NVARCHAR2(20)
   ) ;
--------------------------------------------------------
--  DDL for Table BASE_INNERPUBMSG
--------------------------------------------------------

  CREATE TABLE "BASE_INNERPUBMSG" 
   (	"ID" NUMBER(11,0), 
	"FROM_EMAIL" NVARCHAR2(254), 
	"MESSAGE" NVARCHAR2(500), 
	"TIMESTAMP" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table BASE_INNERPUBMSGREPLY
--------------------------------------------------------

  CREATE TABLE "BASE_INNERPUBMSGREPLY" 
   (	"ID" NUMBER(11,0), 
	"REPLY_TO_ID" NUMBER(11,0), 
	"FROM_EMAIL" NVARCHAR2(254), 
	"MESSAGE" NVARCHAR2(150), 
	"TIMESTAMP" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table BASE_USERENABLEDMODULE
--------------------------------------------------------

  CREATE TABLE "BASE_USERENABLEDMODULE" 
   (	"ID" NUMBER(11,0), 
	"USERNAME" NVARCHAR2(255), 
	"MODULE_NAME" NVARCHAR2(20)
   ) ;
--------------------------------------------------------
--  DDL for Table BASE_USERLASTLOGIN
--------------------------------------------------------

  CREATE TABLE "BASE_USERLASTLOGIN" 
   (	"ID" NUMBER(11,0), 
	"USERNAME" NVARCHAR2(255), 
	"LAST_LOGIN" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table BASE_USERSTARREDFILES
--------------------------------------------------------

  CREATE TABLE "BASE_USERSTARREDFILES" 
   (	"ID" NUMBER(11,0), 
	"EMAIL" NVARCHAR2(254), 
	"ORG_ID" NUMBER(11,0), 
	"REPO_ID" NVARCHAR2(36), 
	"PATH" NCLOB, 
	"IS_DIR" NUMBER(1,0)
   ) ;
--------------------------------------------------------
--  DDL for Table CAPTCHA_CAPTCHASTORE
--------------------------------------------------------

  CREATE TABLE "CAPTCHA_CAPTCHASTORE" 
   (	"ID" NUMBER(11,0), 
	"CHALLENGE" NVARCHAR2(32), 
	"RESPONSE" NVARCHAR2(32), 
	"HASHKEY" NVARCHAR2(40), 
	"EXPIRATION" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table CONSTANCE_CONFIG
--------------------------------------------------------

  CREATE TABLE "CONSTANCE_CONFIG" 
   (	"ID" NUMBER(11,0), 
	"KEY" NVARCHAR2(255), 
	"VALUE" NCLOB
   ) ;
--------------------------------------------------------
--  DDL for Table CONTACTS_CONTACT
--------------------------------------------------------

  CREATE TABLE "CONTACTS_CONTACT" 
   (	"ID" NUMBER(11,0), 
	"USER_EMAIL" NVARCHAR2(255), 
	"CONTACT_EMAIL" NVARCHAR2(255), 
	"CONTACT_NAME" NVARCHAR2(255), 
	"NOTE" NVARCHAR2(255)
   ) ;
--------------------------------------------------------
--  DDL for Table DJANGO_CONTENT_TYPE
--------------------------------------------------------

  CREATE TABLE "DJANGO_CONTENT_TYPE" 
   (	"ID" NUMBER(11,0), 
	"APP_LABEL" NVARCHAR2(100), 
	"MODEL" NVARCHAR2(100)
   ) ;
--------------------------------------------------------
--  DDL for Table DJANGO_MIGRATIONS
--------------------------------------------------------

  CREATE TABLE "DJANGO_MIGRATIONS" 
   (	"ID" NUMBER(11,0), 
	"APP" NVARCHAR2(255), 
	"NAME" NVARCHAR2(255), 
	"APPLIED" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table DJANGO_SESSION
--------------------------------------------------------

  CREATE TABLE "DJANGO_SESSION" 
   (	"SESSION_KEY" NVARCHAR2(40), 
	"SESSION_DATA" NCLOB, 
	"EXPIRE_DATE" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table GROUP_GROUPMESSAGE
--------------------------------------------------------

  CREATE TABLE "GROUP_GROUPMESSAGE" 
   (	"ID" NUMBER(11,0), 
	"GROUP_ID" NUMBER(11,0), 
	"FROM_EMAIL" NVARCHAR2(255), 
	"MESSAGE" NCLOB, 
	"TIMESTAMP" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table GROUP_MESSAGEATTACHMENT
--------------------------------------------------------

  CREATE TABLE "GROUP_MESSAGEATTACHMENT" 
   (	"ID" NUMBER(11,0), 
	"GROUP_MESSAGE_ID" NUMBER(11,0), 
	"REPO_ID" NVARCHAR2(40), 
	"ATTACH_TYPE" NVARCHAR2(5), 
	"PATH" NCLOB, 
	"SRC" NVARCHAR2(20)
   ) ;
--------------------------------------------------------
--  DDL for Table GROUP_MESSAGEREPLY
--------------------------------------------------------

  CREATE TABLE "GROUP_MESSAGEREPLY" 
   (	"ID" NUMBER(11,0), 
	"REPLY_TO_ID" NUMBER(11,0), 
	"FROM_EMAIL" NVARCHAR2(255), 
	"MESSAGE" NCLOB, 
	"TIMESTAMP" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table GROUP_PUBLICGROUP
--------------------------------------------------------

  CREATE TABLE "GROUP_PUBLICGROUP" 
   (	"ID" NUMBER(11,0), 
	"GROUP_ID" NUMBER(11,0)
   ) ;
--------------------------------------------------------
--  DDL for Table INSTITUTIONS_INSTITUTION
--------------------------------------------------------

  CREATE TABLE "INSTITUTIONS_INSTITUTION" 
   (	"ID" NUMBER(11,0), 
	"NAME" NVARCHAR2(200), 
	"CREATE_TIME" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table INSTITUTIONS_INSTITUTIONADMIN
--------------------------------------------------------

  CREATE TABLE "INSTITUTIONS_INSTITUTIONADMIN" 
   (	"ID" NUMBER(11,0), 
	"USER" NVARCHAR2(254), 
	"INSTITUTION_ID" NUMBER(11,0)
   ) ;
--------------------------------------------------------
--  DDL for Table INVITATIONS_INVITATION
--------------------------------------------------------

  CREATE TABLE "INVITATIONS_INVITATION" 
   (	"ID" NUMBER(11,0), 
	"TOKEN" NVARCHAR2(40), 
	"INVITER" NVARCHAR2(255), 
	"ACCEPTER" NVARCHAR2(255), 
	"INVITE_TIME" TIMESTAMP (6), 
	"ACCEPT_TIME" TIMESTAMP (6), 
	"INVITE_TYPE" NVARCHAR2(20) DEFAULT NULL, 
	"EXPIRE_TIME" TIMESTAMP (6) DEFAULT NULL
   ) ;
--------------------------------------------------------
--  DDL for Table MESSAGE_USERMESSAGE
--------------------------------------------------------

  CREATE TABLE "MESSAGE_USERMESSAGE" 
   (	"MESSAGE_ID" NUMBER(11,0), 
	"MESSAGE" NVARCHAR2(512), 
	"FROM_EMAIL" NVARCHAR2(255), 
	"TO_EMAIL" NVARCHAR2(255), 
	"TIMESTAMP" TIMESTAMP (6), 
	"IFREAD" NUMBER(1,0), 
	"SENDER_DELETED_AT" TIMESTAMP (6), 
	"RECIPIENT_DELETED_AT" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table MESSAGE_USERMSGATTACHMENT
--------------------------------------------------------

  CREATE TABLE "MESSAGE_USERMSGATTACHMENT" 
   (	"ID" NUMBER(11,0), 
	"USER_MSG_ID" NUMBER(11,0), 
	"PRIV_FILE_DIR_SHARE_ID" NUMBER(11,0)
   ) ;
--------------------------------------------------------
--  DDL for Table MESSAGE_USERMSGLASTCHECK
--------------------------------------------------------

  CREATE TABLE "MESSAGE_USERMSGLASTCHECK" 
   (	"ID" NUMBER(11,0), 
	"CHECK_TIME" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table NOTIFICATIONS_NOTIFICATION
--------------------------------------------------------

  CREATE TABLE "NOTIFICATIONS_NOTIFICATION" 
   (	"ID" NUMBER(11,0), 
	"MESSAGE" NVARCHAR2(512), 
	"PRIMARY" NUMBER(1,0)
   ) ;
--------------------------------------------------------
--  DDL for Table NOTIFICATIONS_USERNOTIFICATION
--------------------------------------------------------

  CREATE TABLE "NOTIFICATIONS_USERNOTIFICATION" 
   (	"ID" NUMBER(11,0), 
	"TO_USER" NVARCHAR2(255), 
	"MSG_TYPE" NVARCHAR2(30), 
	"DETAIL" NCLOB, 
	"TIMESTAMP" TIMESTAMP (6), 
	"SEEN" NUMBER(1,0)
   ) ;
--------------------------------------------------------
--  DDL for Table OPTIONS_USEROPTIONS
--------------------------------------------------------

  CREATE TABLE "OPTIONS_USEROPTIONS" 
   (	"ID" NUMBER(11,0), 
	"EMAIL" NVARCHAR2(255), 
	"OPTION_KEY" NVARCHAR2(50), 
	"OPTION_VAL" NVARCHAR2(50)
   ) ;
--------------------------------------------------------
--  DDL for Table ORGANIZATIONS_ORGMEMBERQUOTA
--------------------------------------------------------

  CREATE TABLE "ORGANIZATIONS_ORGMEMBERQUOTA" 
   (	"ID" NUMBER(11,0), 
	"ORG_ID" NUMBER(11,0), 
	"QUOTA" NUMBER(11,0)
   ) ;
--------------------------------------------------------
--  DDL for Table POST_OFFICE_ATTACHMENT
--------------------------------------------------------

  CREATE TABLE "POST_OFFICE_ATTACHMENT" 
   (	"ID" NUMBER(11,0), 
	"FILE" NVARCHAR2(100), 
	"NAME" NVARCHAR2(255)
   ) ;
--------------------------------------------------------
--  DDL for Table POST_OFFICE_ATTACHMENT_EMAILS
--------------------------------------------------------

  CREATE TABLE "POST_OFFICE_ATTACHMENT_EMAILS" 
   (	"ID" NUMBER(11,0), 
	"ATTACHMENT_ID" NUMBER(11,0), 
	"EMAIL_ID" NUMBER(11,0)
   ) ;
--------------------------------------------------------
--  DDL for Table POST_OFFICE_EMAIL
--------------------------------------------------------

  CREATE TABLE "POST_OFFICE_EMAIL" 
   (	"ID" NUMBER(11,0), 
	"FROM_EMAIL" NVARCHAR2(254), 
	"TO" NCLOB, 
	"CC" NCLOB, 
	"BCC" NCLOB, 
	"SUBJECT" NVARCHAR2(255), 
	"MESSAGE" NCLOB, 
	"HTML_MESSAGE" NCLOB, 
	"STATUS" NUMBER(11,0), 
	"PRIORITY" NUMBER(11,0), 
	"CREATED" TIMESTAMP (6), 
	"LAST_UPDATED" TIMESTAMP (6), 
	"SCHEDULED_TIME" TIMESTAMP (6), 
	"HEADERS" NCLOB, 
	"CONTEXT" NCLOB, 
	"TEMPLATE_ID" NUMBER(11,0) DEFAULT NULL, 
	"BACKEND_ALIAS" NVARCHAR2(64) DEFAULT NULL
   ) ;
--------------------------------------------------------
--  DDL for Table POST_OFFICE_EMAILTEMPLATE
--------------------------------------------------------

  CREATE TABLE "POST_OFFICE_EMAILTEMPLATE" 
   (	"ID" NUMBER(11,0), 
	"NAME" NVARCHAR2(255), 
	"DESCRIPTION" NCLOB, 
	"SUBJECT" NVARCHAR2(255), 
	"CONTENT" NCLOB, 
	"HTML_CONTENT" NCLOB, 
	"CREATED" TIMESTAMP (6), 
	"LAST_UPDATED" TIMESTAMP (6), 
	"DEFAULT_TEMPLATE_ID" NUMBER(11,0), 
	"LANGUAGE" NVARCHAR2(12) DEFAULT NULL
   ) ;
--------------------------------------------------------
--  DDL for Table POST_OFFICE_LOG
--------------------------------------------------------

  CREATE TABLE "POST_OFFICE_LOG" 
   (	"ID" NUMBER(11,0), 
	"DATE" TIMESTAMP (6), 
	"STATUS" NUMBER(11,0), 
	"EXCEPTION_TYPE" NVARCHAR2(255), 
	"MESSAGE" NCLOB, 
	"EMAIL_ID" NUMBER(11,0)
   ) ;
--------------------------------------------------------
--  DDL for Table PROFILE_DETAILEDPROFILE
--------------------------------------------------------

  CREATE TABLE "PROFILE_DETAILEDPROFILE" 
   (	"ID" NUMBER(11,0), 
	"USER" NVARCHAR2(255), 
	"DEPARTMENT" NVARCHAR2(512), 
	"TELEPHONE" NVARCHAR2(100)
   ) ;
--------------------------------------------------------
--  DDL for Table PROFILE_PROFILE
--------------------------------------------------------

  CREATE TABLE "PROFILE_PROFILE" 
   (	"ID" NUMBER(11,0), 
	"USER" NVARCHAR2(254), 
	"NICKNAME" NVARCHAR2(64), 
	"INTRO" NCLOB, 
	"LANG_CODE" NCLOB, 
	"LOGIN_ID" NVARCHAR2(225), 
	"CONTACT_EMAIL" NVARCHAR2(225), 
	"INSTITUTION" NVARCHAR2(225)
   ) ;
--------------------------------------------------------
--  DDL for Table REGISTRATION_REGISTRATIONP238A
--------------------------------------------------------

  CREATE TABLE "REGISTRATION_REGISTRATIONP238A" 
   (	"ID" NUMBER(11,0), 
	"EMAILUSER_ID" NUMBER(11,0), 
	"ACTIVATION_KEY" NVARCHAR2(40)
   ) ;
--------------------------------------------------------
--  DDL for Table SHARE_ANONYMOUSSHARE
--------------------------------------------------------

  CREATE TABLE "SHARE_ANONYMOUSSHARE" 
   (	"ID" NUMBER(11,0), 
	"REPO_OWNER" NVARCHAR2(255), 
	"REPO_ID" NVARCHAR2(36), 
	"ANONYMOUS_EMAIL" NVARCHAR2(255), 
	"TOKEN" NVARCHAR2(25)
   ) ;
--------------------------------------------------------
--  DDL for Table SHARE_FILESHARE
--------------------------------------------------------

  CREATE TABLE "SHARE_FILESHARE" 
   (	"ID" NUMBER(11,0), 
	"USERNAME" NVARCHAR2(255), 
	"REPO_ID" NVARCHAR2(36), 
	"PATH" NCLOB, 
	"TOKEN" NVARCHAR2(10), 
	"CTIME" TIMESTAMP (6), 
	"VIEW_CNT" NUMBER(11,0), 
	"S_TYPE" NVARCHAR2(2), 
	"PASSWORD" NVARCHAR2(128), 
	"EXPIRE_DATE" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table SHARE_ORGFILESHARE
--------------------------------------------------------

  CREATE TABLE "SHARE_ORGFILESHARE" 
   (	"ID" NUMBER(11,0), 
	"ORG_ID" NUMBER(11,0), 
	"FILE_SHARE_ID" NUMBER(11,0)
   ) ;
--------------------------------------------------------
--  DDL for Table SHARE_PRIVATEFILEDIRSHARE
--------------------------------------------------------

  CREATE TABLE "SHARE_PRIVATEFILEDIRSHARE" 
   (	"ID" NUMBER(11,0), 
	"FROM_USER" NVARCHAR2(255), 
	"TO_USER" NVARCHAR2(255), 
	"REPO_ID" NVARCHAR2(36), 
	"PATH" NCLOB, 
	"TOKEN" NVARCHAR2(10), 
	"PERMISSION" NVARCHAR2(5), 
	"S_TYPE" NVARCHAR2(5)
   ) ;
--------------------------------------------------------
--  DDL for Table SHARE_UPLOADLINKSHARE
--------------------------------------------------------

  CREATE TABLE "SHARE_UPLOADLINKSHARE" 
   (	"ID" NUMBER(11,0), 
	"USERNAME" NVARCHAR2(255), 
	"REPO_ID" NVARCHAR2(36), 
	"PATH" NCLOB, 
	"TOKEN" NVARCHAR2(10), 
	"CTIME" TIMESTAMP (6), 
	"VIEW_CNT" NUMBER(11,0), 
	"PASSWORD" NVARCHAR2(128), 
	"EXPIRE_DATE" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table SYSADMIN_EXTRA_USERLOGINLOG
--------------------------------------------------------

  CREATE TABLE "SYSADMIN_EXTRA_USERLOGINLOG" 
   (	"ID" NUMBER(11,0), 
	"USERNAME" NVARCHAR2(255), 
	"LOGIN_DATE" TIMESTAMP (6), 
	"LOGIN_IP" NVARCHAR2(128)
   ) ;
--------------------------------------------------------
--  DDL for Table TERMSANDCONDITIONS_TERMSAN0233
--------------------------------------------------------

  CREATE TABLE "TERMSANDCONDITIONS_TERMSAN0233" 
   (	"ID" NUMBER(11,0), 
	"SLUG" NVARCHAR2(50), 
	"NAME" NCLOB, 
	"VERSION_NUMBER" NUMBER(6,2), 
	"TEXT" NCLOB, 
	"INFO" NCLOB, 
	"DATE_ACTIVE" TIMESTAMP (6), 
	"DATE_CREATED" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table TERMSANDCONDITIONS_USERTERF56C
--------------------------------------------------------

  CREATE TABLE "TERMSANDCONDITIONS_USERTERF56C" 
   (	"ID" NUMBER(11,0), 
	"USERNAME" NVARCHAR2(255), 
	"IP_ADDRESS" VARCHAR2(39 BYTE), 
	"DATE_ACCEPTED" TIMESTAMP (6), 
	"TERMS_ID" NUMBER(11,0)
   ) ;
--------------------------------------------------------
--  DDL for Table TWO_FACTOR_PHONEDEVICE
--------------------------------------------------------

  CREATE TABLE "TWO_FACTOR_PHONEDEVICE" 
   (	"ID" NUMBER(11,0), 
	"USER" NVARCHAR2(255), 
	"NAME" NVARCHAR2(64), 
	"CONFIRMED" NUMBER(1,0), 
	"NUMBER" NVARCHAR2(40), 
	"KEY" NVARCHAR2(40), 
	"METHOD" NVARCHAR2(4)
   ) ;
--------------------------------------------------------
--  DDL for Table TWO_FACTOR_STATICDEVICE
--------------------------------------------------------

  CREATE TABLE "TWO_FACTOR_STATICDEVICE" 
   (	"ID" NUMBER(11,0), 
	"USER" NVARCHAR2(255), 
	"NAME" NVARCHAR2(64), 
	"CONFIRMED" NUMBER(1,0)
   ) ;
--------------------------------------------------------
--  DDL for Table TWO_FACTOR_STATICTOKEN
--------------------------------------------------------

  CREATE TABLE "TWO_FACTOR_STATICTOKEN" 
   (	"ID" NUMBER(11,0), 
	"TOKEN" NVARCHAR2(16), 
	"DEVICE_ID" NUMBER(11,0)
   ) ;
--------------------------------------------------------
--  DDL for Table TWO_FACTOR_TOTPDEVICE
--------------------------------------------------------

  CREATE TABLE "TWO_FACTOR_TOTPDEVICE" 
   (	"ID" NUMBER(11,0), 
	"USER" NVARCHAR2(255), 
	"NAME" NVARCHAR2(64), 
	"CONFIRMED" NUMBER(1,0), 
	"KEY" NVARCHAR2(80), 
	"STEP" NUMBER(11,0), 
	"T0" NUMBER(19,0), 
	"DIGITS" NUMBER(11,0), 
	"TOLERANCE" NUMBER(11,0), 
	"DRIFT" NUMBER(11,0), 
	"LAST_T" NUMBER(19,0)
   ) ;
--------------------------------------------------------
--  DDL for Table WIKI_GROUPWIKI
--------------------------------------------------------

  CREATE TABLE "WIKI_GROUPWIKI" 
   (	"ID" NUMBER(11,0), 
	"GROUP_ID" NUMBER(11,0), 
	"REPO_ID" NVARCHAR2(36)
   ) ;
--------------------------------------------------------
--  DDL for Table WIKI_PERSONALWIKI
--------------------------------------------------------

  CREATE TABLE "WIKI_PERSONALWIKI" 
   (	"ID" NUMBER(11,0), 
	"USERNAME" NVARCHAR2(255), 
	"REPO_ID" NVARCHAR2(36)
   ) ;
--------------------------------------------------------
--  DDL for Sequence AVATAR_AVATAR_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "AVATAR_AVATAR_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence AVATAR_GROUPAVATAR_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "AVATAR_GROUPAVATAR_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence BASE_COMMANDSLASTCHECK_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "BASE_COMMANDSLASTCHECK_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence BASE_DEVICETOKEN_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "BASE_DEVICETOKEN_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence BASE_FILECOMMENT_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "BASE_FILECOMMENT_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence BASE_FILEDISCUSS_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "BASE_FILEDISCUSS_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence BASE_GROUPENABLEDMODULE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "BASE_GROUPENABLEDMODULE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence BASE_INNERPUBMSGREPLY_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "BASE_INNERPUBMSGREPLY_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence BASE_INNERPUBMSG_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "BASE_INNERPUBMSG_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence BASE_USERENABLEDMODULE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "BASE_USERENABLEDMODULE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence BASE_USERLASTLOGIN_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "BASE_USERLASTLOGIN_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence BASE_USERSTARREDFILES_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "BASE_USERSTARREDFILES_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence CAPTCHA_CAPTCHASTORE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "CAPTCHA_CAPTCHASTORE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence CONSTANCE_CONFIG_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "CONSTANCE_CONFIG_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence CONTACTS_CONTACT_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "CONTACTS_CONTACT_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence DJANGO_CONTENT_TYPE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "DJANGO_CONTENT_TYPE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 61 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence DJANGO_MIGRATIONS_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "DJANGO_MIGRATIONS_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 21 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence GROUP_GROUPMESSAGE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "GROUP_GROUPMESSAGE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence GROUP_MESSAGEATTACHMENT_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "GROUP_MESSAGEATTACHMENT_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence GROUP_MESSAGEREPLY_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "GROUP_MESSAGEREPLY_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence GROUP_PUBLICGROUP_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "GROUP_PUBLICGROUP_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence INSTITUTIONS_INSTITUTIO2836_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "INSTITUTIONS_INSTITUTIO2836_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence INSTITUTIONS_INSTITUTION_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "INSTITUTIONS_INSTITUTION_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence INVITATIONS_INVITATION_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "INVITATIONS_INVITATION_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence MESSAGE_USERMESSAGE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "MESSAGE_USERMESSAGE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence MESSAGE_USERMSGATTACHMENT_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "MESSAGE_USERMSGATTACHMENT_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence MESSAGE_USERMSGLASTCHECK_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "MESSAGE_USERMSGLASTCHECK_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence NOTIFICATIONS_NOTIFICATION_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "NOTIFICATIONS_NOTIFICATION_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence NOTIFICATIONS_USERNOTIF3BBF_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "NOTIFICATIONS_USERNOTIF3BBF_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence OPTIONS_USEROPTIONS_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "OPTIONS_USEROPTIONS_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence ORGANIZATIONS_ORGMEMBER6B70_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "ORGANIZATIONS_ORGMEMBER6B70_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence POST_OFFICE_ATTACHMENT_D670_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "POST_OFFICE_ATTACHMENT_D670_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence POST_OFFICE_ATTACHMENT_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "POST_OFFICE_ATTACHMENT_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence POST_OFFICE_EMAILTEMPLATE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "POST_OFFICE_EMAILTEMPLATE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence POST_OFFICE_EMAIL_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "POST_OFFICE_EMAIL_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence POST_OFFICE_LOG_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "POST_OFFICE_LOG_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence PROFILE_DETAILEDPROFILE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "PROFILE_DETAILEDPROFILE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence PROFILE_PROFILE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "PROFILE_PROFILE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence REGISTRATION_REGISTRATI2179_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "REGISTRATION_REGISTRATI2179_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence SHARE_ANONYMOUSSHARE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "SHARE_ANONYMOUSSHARE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence SHARE_FILESHARE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "SHARE_FILESHARE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence SHARE_ORGFILESHARE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "SHARE_ORGFILESHARE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence SHARE_PRIVATEFILEDIRSHARE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "SHARE_PRIVATEFILEDIRSHARE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence SHARE_UPLOADLINKSHARE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "SHARE_UPLOADLINKSHARE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence SYSADMIN_EXTRA_USERLOGINLOG_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "SYSADMIN_EXTRA_USERLOGINLOG_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence TERMSANDCONDITIONS_TERM6123_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "TERMSANDCONDITIONS_TERM6123_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence TERMSANDCONDITIONS_USERCF1A_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "TERMSANDCONDITIONS_USERCF1A_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence TWO_FACTOR_PHONEDEVICE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "TWO_FACTOR_PHONEDEVICE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence TWO_FACTOR_STATICDEVICE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "TWO_FACTOR_STATICDEVICE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence TWO_FACTOR_STATICTOKEN_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "TWO_FACTOR_STATICTOKEN_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence TWO_FACTOR_TOTPDEVICE_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "TWO_FACTOR_TOTPDEVICE_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence WIKI_GROUPWIKI_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "WIKI_GROUPWIKI_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
--------------------------------------------------------
--  DDL for Sequence WIKI_PERSONALWIKI_SQ
--------------------------------------------------------

   CREATE SEQUENCE  "WIKI_PERSONALWIKI_SQ"  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE ;
REM INSERTING into API2_TOKEN
SET DEFINE OFF;
REM INSERTING into API2_TOKENV2
SET DEFINE OFF;
REM INSERTING into AVATAR_AVATAR
SET DEFINE OFF;
REM INSERTING into AVATAR_GROUPAVATAR
SET DEFINE OFF;
REM INSERTING into BASE_CLIENTLOGINTOKEN
SET DEFINE OFF;
REM INSERTING into BASE_COMMANDSLASTCHECK
SET DEFINE OFF;
REM INSERTING into BASE_DEVICETOKEN
SET DEFINE OFF;
REM INSERTING into BASE_FILECOMMENT
SET DEFINE OFF;
REM INSERTING into BASE_FILEDISCUSS
SET DEFINE OFF;
REM INSERTING into BASE_GROUPENABLEDMODULE
SET DEFINE OFF;
REM INSERTING into BASE_INNERPUBMSG
SET DEFINE OFF;
REM INSERTING into BASE_INNERPUBMSGREPLY
SET DEFINE OFF;
REM INSERTING into BASE_USERENABLEDMODULE
SET DEFINE OFF;
REM INSERTING into BASE_USERLASTLOGIN
SET DEFINE OFF;
REM INSERTING into BASE_USERSTARREDFILES
SET DEFINE OFF;
REM INSERTING into CAPTCHA_CAPTCHASTORE
SET DEFINE OFF;
REM INSERTING into CONSTANCE_CONFIG
SET DEFINE OFF;
REM INSERTING into CONTACTS_CONTACT
SET DEFINE OFF;
REM INSERTING into DJANGO_CONTENT_TYPE
SET DEFINE OFF;
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (1,'contenttypes','contenttype');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (2,'sessions','session');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (3,'registration','registrationprofile');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (4,'captcha','captchastore');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (5,'database','constance');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (6,'post_office','attachment');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (7,'post_office','emailtemplate');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (8,'post_office','email');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (9,'post_office','log');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (10,'termsandconditions','termsandconditions');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (11,'termsandconditions','usertermsandconditions');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (12,'api2','token');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (13,'api2','tokenv2');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (14,'avatar','avatar');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (15,'avatar','groupavatar');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (16,'base','groupenabledmodule');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (17,'base','clientlogintoken');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (18,'base','userenabledmodule');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (19,'base','filecomment');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (20,'base','filediscuss');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (21,'base','devicetoken');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (22,'base','commandslastcheck');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (23,'base','innerpubmsg');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (24,'base','innerpubmsgreply');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (25,'base','userlastlogin');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (26,'base','userstarredfiles');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (27,'contacts','contact');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (28,'institutions','institutionadmin');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (29,'institutions','institution');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (30,'invitations','invitation');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (31,'wiki','personalwiki');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (32,'wiki','groupwiki');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (33,'group','publicgroup');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (34,'group','groupmessage');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (35,'group','messageattachment');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (36,'group','messagereply');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (37,'message','usermsgattachment');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (38,'message','usermsglastcheck');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (39,'message','usermessage');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (40,'notifications','notification');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (41,'notifications','usernotification');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (42,'options','useroptions');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (43,'profile','profile');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (44,'profile','detailedprofile');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (45,'share','privatefiledirshare');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (46,'share','uploadlinkshare');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (47,'share','fileshare');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (48,'share','anonymousshare');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (49,'share','orgfileshare');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (50,'sysadmin_extra','userloginlog');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (51,'organizations','orgmemberquota');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (52,'two_factor','phonedevice');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (53,'two_factor','statictoken');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (54,'two_factor','totpdevice');
Insert into DJANGO_CONTENT_TYPE (ID,APP_LABEL,MODEL) values (55,'two_factor','staticdevice');
REM INSERTING into DJANGO_MIGRATIONS
SET DEFINE OFF;
REM INSERTING into DJANGO_SESSION
SET DEFINE OFF;
REM INSERTING into GROUP_GROUPMESSAGE
SET DEFINE OFF;
REM INSERTING into GROUP_MESSAGEATTACHMENT
SET DEFINE OFF;
REM INSERTING into GROUP_MESSAGEREPLY
SET DEFINE OFF;
REM INSERTING into GROUP_PUBLICGROUP
SET DEFINE OFF;
REM INSERTING into INSTITUTIONS_INSTITUTION
SET DEFINE OFF;
REM INSERTING into INSTITUTIONS_INSTITUTIONADMIN
SET DEFINE OFF;
REM INSERTING into INVITATIONS_INVITATION
SET DEFINE OFF;
REM INSERTING into MESSAGE_USERMESSAGE
SET DEFINE OFF;
REM INSERTING into MESSAGE_USERMSGATTACHMENT
SET DEFINE OFF;
REM INSERTING into MESSAGE_USERMSGLASTCHECK
SET DEFINE OFF;
REM INSERTING into NOTIFICATIONS_NOTIFICATION
SET DEFINE OFF;
REM INSERTING into NOTIFICATIONS_USERNOTIFICATION
SET DEFINE OFF;
REM INSERTING into OPTIONS_USEROPTIONS
SET DEFINE OFF;
REM INSERTING into ORGANIZATIONS_ORGMEMBERQUOTA
SET DEFINE OFF;
REM INSERTING into POST_OFFICE_ATTACHMENT
SET DEFINE OFF;
REM INSERTING into POST_OFFICE_ATTACHMENT_EMAILS
SET DEFINE OFF;
REM INSERTING into POST_OFFICE_EMAIL
SET DEFINE OFF;
REM INSERTING into POST_OFFICE_EMAILTEMPLATE
SET DEFINE OFF;
REM INSERTING into POST_OFFICE_LOG
SET DEFINE OFF;
REM INSERTING into PROFILE_DETAILEDPROFILE
SET DEFINE OFF;
REM INSERTING into PROFILE_PROFILE
SET DEFINE OFF;
REM INSERTING into REGISTRATION_REGISTRATIONP238A
SET DEFINE OFF;
REM INSERTING into SHARE_ANONYMOUSSHARE
SET DEFINE OFF;
REM INSERTING into SHARE_FILESHARE
SET DEFINE OFF;
REM INSERTING into SHARE_ORGFILESHARE
SET DEFINE OFF;
REM INSERTING into SHARE_PRIVATEFILEDIRSHARE
SET DEFINE OFF;
REM INSERTING into SHARE_UPLOADLINKSHARE
SET DEFINE OFF;
REM INSERTING into SYSADMIN_EXTRA_USERLOGINLOG
SET DEFINE OFF;
REM INSERTING into TERMSANDCONDITIONS_TERMSAN0233
SET DEFINE OFF;
REM INSERTING into TERMSANDCONDITIONS_USERTERF56C
SET DEFINE OFF;
REM INSERTING into TWO_FACTOR_PHONEDEVICE
SET DEFINE OFF;
REM INSERTING into TWO_FACTOR_STATICDEVICE
SET DEFINE OFF;
REM INSERTING into TWO_FACTOR_STATICTOKEN
SET DEFINE OFF;
REM INSERTING into TWO_FACTOR_TOTPDEVICE
SET DEFINE OFF;
REM INSERTING into WIKI_GROUPWIKI
SET DEFINE OFF;
REM INSERTING into WIKI_PERSONALWIKI
SET DEFINE OFF;
--------------------------------------------------------
--  DDL for Index GROUP_PUBLICGROUP_0E939A4F
--------------------------------------------------------

  CREATE INDEX "GROUP_PUBLICGROUP_0E939A4F" ON "GROUP_PUBLICGROUP" ("GROUP_ID") 
  ;
--------------------------------------------------------
--  DDL for Index POST_OFFICE_EMAIL_E2FA5388
--------------------------------------------------------

  CREATE INDEX "POST_OFFICE_EMAIL_E2FA5388" ON "POST_OFFICE_EMAIL" ("CREATED") 
  ;
--------------------------------------------------------
--  DDL for Index SHARE_FILESHARE_14C4B06B
--------------------------------------------------------

  CREATE INDEX "SHARE_FILESHARE_14C4B06B" ON "SHARE_FILESHARE" ("USERNAME") 
  ;
--------------------------------------------------------
--  DDL for Index BASE_CLIENTLOGINTOKEN_14C4B06B
--------------------------------------------------------

  CREATE INDEX "BASE_CLIENTLOGINTOKEN_14C4B06B" ON "BASE_CLIENTLOGINTOKEN" ("USERNAME") 
  ;
--------------------------------------------------------
--  DDL for Index BASE_FILEDISCUSS_B57D9B6B
--------------------------------------------------------

  CREATE INDEX "BASE_FILEDISCUSS_B57D9B6B" ON "BASE_FILEDISCUSS" ("PATH_HASH") 
  ;
--------------------------------------------------------
--  DDL for Index BASE_FILECOMMENT_C5BF47D4
--------------------------------------------------------

  CREATE INDEX "BASE_FILECOMMENT_C5BF47D4" ON "BASE_FILECOMMENT" ("REPO_ID_PARENT_PATH_MD5") 
  ;
--------------------------------------------------------
--  DDL for Index PROFILE_DETAILEDPROFILE_EE955F
--------------------------------------------------------

  CREATE INDEX "PROFILE_DETAILEDPROFILE_EE955F" ON "PROFILE_DETAILEDPROFILE" ("USER") 
  ;
--------------------------------------------------------
--  DDL for Index SHARE_ORGFILESHARE_9CF869AA
--------------------------------------------------------

  CREATE INDEX "SHARE_ORGFILESHARE_9CF869AA" ON "SHARE_ORGFILESHARE" ("ORG_ID") 
  ;
--------------------------------------------------------
--  DDL for Index MESSAGE_USERMESSAGE_ACC047CF
--------------------------------------------------------

  CREATE INDEX "MESSAGE_USERMESSAGE_ACC047CF" ON "MESSAGE_USERMESSAGE" ("TO_EMAIL") 
  ;
--------------------------------------------------------
--  DDL for Index SHARE_FILESHARE_1ABD88B5
--------------------------------------------------------

  CREATE INDEX "SHARE_FILESHARE_1ABD88B5" ON "SHARE_FILESHARE" ("S_TYPE") 
  ;
--------------------------------------------------------
--  DDL for Index DJANGO_SESSION_DE54FA62
--------------------------------------------------------

  CREATE INDEX "DJANGO_SESSION_DE54FA62" ON "DJANGO_SESSION" ("EXPIRE_DATE") 
  ;
--------------------------------------------------------
--  DDL for Index BASE_GROUPENABLEDMODULE_0EB6FF
--------------------------------------------------------

  CREATE INDEX "BASE_GROUPENABLEDMODULE_0EB6FF" ON "BASE_GROUPENABLEDMODULE" ("GROUP_ID") 
  ;
--------------------------------------------------------
--  DDL for Index POST_OFFICE_EMAIL_74F53564
--------------------------------------------------------

  CREATE INDEX "POST_OFFICE_EMAIL_74F53564" ON "POST_OFFICE_EMAIL" ("TEMPLATE_ID") 
  ;
--------------------------------------------------------
--  DDL for Index TWO_FACTOR_STATICTOKEN_94A39D5
--------------------------------------------------------

  CREATE INDEX "TWO_FACTOR_STATICTOKEN_94A39D5" ON "TWO_FACTOR_STATICTOKEN" ("TOKEN") 
  ;
--------------------------------------------------------
--  DDL for Index MESSAGE_USERMSGATTACHMENT_7620
--------------------------------------------------------

  CREATE INDEX "MESSAGE_USERMSGATTACHMENT_7620" ON "MESSAGE_USERMSGATTACHMENT" ("USER_MSG_ID") 
  ;
--------------------------------------------------------
--  DDL for Index D85D5DBB541FAB8F1DF26BA8B130BE
--------------------------------------------------------

  CREATE UNIQUE INDEX "D85D5DBB541FAB8F1DF26BA8B130BE" ON "DJANGO_CONTENT_TYPE" ("APP_LABEL", "MODEL") 
  ;
--------------------------------------------------------
--  DDL for Index BASE_FILECOMMENT_9A8C79BF
--------------------------------------------------------

  CREATE INDEX "BASE_FILECOMMENT_9A8C79BF" ON "BASE_FILECOMMENT" ("REPO_ID") 
  ;
--------------------------------------------------------
--  DDL for Index NOTIFICATIONS_USERNOTIFICA0E9C
--------------------------------------------------------

  CREATE INDEX "NOTIFICATIONS_USERNOTIFICA0E9C" ON "NOTIFICATIONS_USERNOTIFICATION" ("TO_USER") 
  ;
--------------------------------------------------------
--  DDL for Index BASE_FILEDISCUSS_06A351D8
--------------------------------------------------------

  CREATE INDEX "BASE_FILEDISCUSS_06A351D8" ON "BASE_FILEDISCUSS" ("GROUP_MESSAGE_ID") 
  ;
--------------------------------------------------------
--  DDL for Index POST_OFFICE_ATTACHMENT_EMA4D2F
--------------------------------------------------------

  CREATE INDEX "POST_OFFICE_ATTACHMENT_EMA4D2F" ON "POST_OFFICE_ATTACHMENT_EMAILS" ("ATTACHMENT_ID") 
  ;
--------------------------------------------------------
--  DDL for Index TERMSANDCONDITIONS_USERTER2708
--------------------------------------------------------

  CREATE INDEX "TERMSANDCONDITIONS_USERTER2708" ON "TERMSANDCONDITIONS_USERTERF56C" ("TERMS_ID") 
  ;
--------------------------------------------------------
--  DDL for Index BASE_USERENABLEDMODULE_14C60A0
--------------------------------------------------------

  CREATE INDEX "BASE_USERENABLEDMODULE_14C60A0" ON "BASE_USERENABLEDMODULE" ("USERNAME") 
  ;
--------------------------------------------------------
--  DDL for Index GROUP_GROUPMESSAGE_0E939A4F
--------------------------------------------------------

  CREATE INDEX "GROUP_GROUPMESSAGE_0E939A4F" ON "GROUP_GROUPMESSAGE" ("GROUP_ID") 
  ;
--------------------------------------------------------
--  DDL for Index OPTIONS_USEROPTIONS_0C83F57C
--------------------------------------------------------

  CREATE INDEX "OPTIONS_USEROPTIONS_0C83F57C" ON "OPTIONS_USEROPTIONS" ("EMAIL") 
  ;
--------------------------------------------------------
--  DDL for Index SYSADMIN_EXTRA_USERLOGINLO3F5D
--------------------------------------------------------

  CREATE INDEX "SYSADMIN_EXTRA_USERLOGINLO3F5D" ON "SYSADMIN_EXTRA_USERLOGINLOG" ("USERNAME") 
  ;
--------------------------------------------------------
--  DDL for Index BASE_FILECOMMENT_02BD92FA
--------------------------------------------------------

  CREATE INDEX "BASE_FILECOMMENT_02BD92FA" ON "BASE_FILECOMMENT" ("AUTHOR") 
  ;
--------------------------------------------------------
--  DDL for Index GROUP_MESSAGEREPLY_6EC85D95
--------------------------------------------------------

  CREATE INDEX "GROUP_MESSAGEREPLY_6EC85D95" ON "GROUP_MESSAGEREPLY" ("REPLY_TO_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SHARE_FILESHARE_9A8C79BF
--------------------------------------------------------

  CREATE INDEX "SHARE_FILESHARE_9A8C79BF" ON "SHARE_FILESHARE" ("REPO_ID") 
  ;
--------------------------------------------------------
--  DDL for Index POST_OFFICE_EMAIL_ED24D584
--------------------------------------------------------

  CREATE INDEX "POST_OFFICE_EMAIL_ED24D584" ON "POST_OFFICE_EMAIL" ("SCHEDULED_TIME") 
  ;
--------------------------------------------------------
--  DDL for Index ORGANIZATIONS_ORGMEMBERQUO73CD
--------------------------------------------------------

  CREATE INDEX "ORGANIZATIONS_ORGMEMBERQUO73CD" ON "ORGANIZATIONS_ORGMEMBERQUOTA" ("ORG_ID") 
  ;
--------------------------------------------------------
--  DDL for Index BASE_USERLASTLOGIN_14C4B06B
--------------------------------------------------------

  CREATE INDEX "BASE_USERLASTLOGIN_14C4B06B" ON "BASE_USERLASTLOGIN" ("USERNAME") 
  ;
--------------------------------------------------------
--  DDL for Index PROFILE_PROFILE_B9973D8C
--------------------------------------------------------

  CREATE INDEX "PROFILE_PROFILE_B9973D8C" ON "PROFILE_PROFILE" ("CONTACT_EMAIL") 
  ;
--------------------------------------------------------
--  DDL for Index CONTACTS_CONTACT_40C27BDC
--------------------------------------------------------

  CREATE INDEX "CONTACTS_CONTACT_40C27BDC" ON "CONTACTS_CONTACT" ("USER_EMAIL") 
  ;
--------------------------------------------------------
--  DDL for Index POST_OFFICE_EMAIL_9ACB4454
--------------------------------------------------------

  CREATE INDEX "POST_OFFICE_EMAIL_9ACB4454" ON "POST_OFFICE_EMAIL" ("STATUS") 
  ;
--------------------------------------------------------
--  DDL for Index SHARE_UPLOADLINKSHARE_9A8C79BF
--------------------------------------------------------

  CREATE INDEX "SHARE_UPLOADLINKSHARE_9A8C79BF" ON "SHARE_UPLOADLINKSHARE" ("REPO_ID") 
  ;
--------------------------------------------------------
--  DDL for Index FF9556696FEEA12226069FE6564DB9
--------------------------------------------------------

  CREATE UNIQUE INDEX "FF9556696FEEA12226069FE6564DB9" ON "POST_OFFICE_EMAILTEMPLATE" ("LANGUAGE", "DEFAULT_TEMPLATE_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SHARE_PRIVATEFILEDIRSHARE_A423
--------------------------------------------------------

  CREATE INDEX "SHARE_PRIVATEFILEDIRSHARE_A423" ON "SHARE_PRIVATEFILEDIRSHARE" ("FROM_USER") 
  ;
--------------------------------------------------------
--  DDL for Index POST_OFFICE_EMAIL_3ACC0B7A
--------------------------------------------------------

  CREATE INDEX "POST_OFFICE_EMAIL_3ACC0B7A" ON "POST_OFFICE_EMAIL" ("LAST_UPDATED") 
  ;
--------------------------------------------------------
--  DDL for Index FA265FB080B978BD0FE0BF3E4B445B
--------------------------------------------------------

  CREATE UNIQUE INDEX "FA265FB080B978BD0FE0BF3E4B445B" ON "TERMSANDCONDITIONS_USERTERF56C" ("USERNAME", "TERMS_ID") 
  ;
--------------------------------------------------------
--  DDL for Index POST_OFFICE_EMAILTEMPLATE_0A6B
--------------------------------------------------------

  CREATE INDEX "POST_OFFICE_EMAILTEMPLATE_0A6B" ON "POST_OFFICE_EMAILTEMPLATE" ("DEFAULT_TEMPLATE_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SHARE_PRIVATEFILEDIRSHARE_ECC3
--------------------------------------------------------

  CREATE INDEX "SHARE_PRIVATEFILEDIRSHARE_ECC3" ON "SHARE_PRIVATEFILEDIRSHARE" ("REPO_ID") 
  ;
--------------------------------------------------------
--  DDL for Index TERMSANDCONDITIONS_TERMSANC405
--------------------------------------------------------

  CREATE INDEX "TERMSANDCONDITIONS_TERMSANC405" ON "TERMSANDCONDITIONS_TERMSAN0233" ("SLUG") 
  ;
--------------------------------------------------------
--  DDL for Index NOTIFICATIONS_USERNOTIFICAC70C
--------------------------------------------------------

  CREATE INDEX "NOTIFICATIONS_USERNOTIFICAC70C" ON "NOTIFICATIONS_USERNOTIFICATION" ("MSG_TYPE") 
  ;
--------------------------------------------------------
--  DDL for Index GROUP_MESSAGEATTACHMENT_061B3A
--------------------------------------------------------

  CREATE INDEX "GROUP_MESSAGEATTACHMENT_061B3A" ON "GROUP_MESSAGEATTACHMENT" ("GROUP_MESSAGE_ID") 
  ;
--------------------------------------------------------
--  DDL for Index PROFILE_PROFILE_955BFFF7
--------------------------------------------------------

  CREATE INDEX "PROFILE_PROFILE_955BFFF7" ON "PROFILE_PROFILE" ("INSTITUTION") 
  ;
--------------------------------------------------------
--  DDL for Index INVITATIONS_INVITATION_D5D9837
--------------------------------------------------------

  CREATE INDEX "INVITATIONS_INVITATION_D5D9837" ON "INVITATIONS_INVITATION" ("INVITER") 
  ;
--------------------------------------------------------
--  DDL for Index MESSAGE_USERMSGATTACHMENT_CA70
--------------------------------------------------------

  CREATE INDEX "MESSAGE_USERMSGATTACHMENT_CA70" ON "MESSAGE_USERMSGATTACHMENT" ("PRIV_FILE_DIR_SHARE_ID") 
  ;
--------------------------------------------------------
--  DDL for Index MESSAGE_USERMESSAGE_F50BD8C4
--------------------------------------------------------

  CREATE INDEX "MESSAGE_USERMESSAGE_F50BD8C4" ON "MESSAGE_USERMESSAGE" ("FROM_EMAIL") 
  ;
--------------------------------------------------------
--  DDL for Index SHARE_PRIVATEFILEDIRSHARE_1A9E
--------------------------------------------------------

  CREATE INDEX "SHARE_PRIVATEFILEDIRSHARE_1A9E" ON "SHARE_PRIVATEFILEDIRSHARE" ("TO_USER") 
  ;
--------------------------------------------------------
--  DDL for Index INSTITUTIONS_INSTITUTIONAD53E9
--------------------------------------------------------

  CREATE INDEX "INSTITUTIONS_INSTITUTIONAD53E9" ON "INSTITUTIONS_INSTITUTIONADMIN" ("INSTITUTION_ID") 
  ;
--------------------------------------------------------
--  DDL for Index BASE_USERSTARREDFILES_0C83F57C
--------------------------------------------------------

  CREATE INDEX "BASE_USERSTARREDFILES_0C83F57C" ON "BASE_USERSTARREDFILES" ("EMAIL") 
  ;
--------------------------------------------------------
--  DDL for Index TWO_FACTOR_STATICTOKEN_937438C
--------------------------------------------------------

  CREATE INDEX "TWO_FACTOR_STATICTOKEN_937438C" ON "TWO_FACTOR_STATICTOKEN" ("DEVICE_ID") 
  ;
--------------------------------------------------------
--  DDL for Index POST_OFFICE_ATTACHMENT_EMAE208
--------------------------------------------------------

  CREATE INDEX "POST_OFFICE_ATTACHMENT_EMAE208" ON "POST_OFFICE_ATTACHMENT_EMAILS" ("EMAIL_ID") 
  ;
--------------------------------------------------------
--  DDL for Index BASE_INNERPUBMSGREPLY_6EC85D95
--------------------------------------------------------

  CREATE INDEX "BASE_INNERPUBMSGREPLY_6EC85D95" ON "BASE_INNERPUBMSGREPLY" ("REPLY_TO_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IN_TOKEN_1961FBB98C05E5FD_UNIQ
--------------------------------------------------------

  CREATE INDEX "IN_TOKEN_1961FBB98C05E5FD_UNIQ" ON "INVITATIONS_INVITATION" ("TOKEN") 
  ;
--------------------------------------------------------
--  DDL for Index BASE_USERSTARREDFILES_9A8C79BF
--------------------------------------------------------

  CREATE INDEX "BASE_USERSTARREDFILES_9A8C79BF" ON "BASE_USERSTARREDFILES" ("REPO_ID") 
  ;
--------------------------------------------------------
--  DDL for Index POST_OFFICE_LOG_FDFD0EBF
--------------------------------------------------------

  CREATE INDEX "POST_OFFICE_LOG_FDFD0EBF" ON "POST_OFFICE_LOG" ("EMAIL_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SHARE_UPLOADLINKSHARE_14C4B06B
--------------------------------------------------------

  CREATE INDEX "SHARE_UPLOADLINKSHARE_14C4B06B" ON "SHARE_UPLOADLINKSHARE" ("USERNAME") 
  ;
--------------------------------------------------------
--  DDL for Index SYSADMIN_EXTRA_USERLOGINLO3B65
--------------------------------------------------------

  CREATE INDEX "SYSADMIN_EXTRA_USERLOGINLO3B65" ON "SYSADMIN_EXTRA_USERLOGINLOG" ("LOGIN_DATE") 
  ;
--------------------------------------------------------
--  DDL for Trigger AVATAR_AVATAR_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "AVATAR_AVATAR_TR" 
BEFORE INSERT ON "AVATAR_AVATAR"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "AVATAR_AVATAR_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "AVATAR_AVATAR_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger AVATAR_GROUPAVATAR_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "AVATAR_GROUPAVATAR_TR" 
BEFORE INSERT ON "AVATAR_GROUPAVATAR"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "AVATAR_GROUPAVATAR_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "AVATAR_GROUPAVATAR_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger BASE_COMMANDSLASTCHECK_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "BASE_COMMANDSLASTCHECK_TR" 
BEFORE INSERT ON "BASE_COMMANDSLASTCHECK"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "BASE_COMMANDSLASTCHECK_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "BASE_COMMANDSLASTCHECK_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger BASE_DEVICETOKEN_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "BASE_DEVICETOKEN_TR" 
BEFORE INSERT ON "BASE_DEVICETOKEN"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "BASE_DEVICETOKEN_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "BASE_DEVICETOKEN_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger BASE_FILECOMMENT_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "BASE_FILECOMMENT_TR" 
BEFORE INSERT ON "BASE_FILECOMMENT"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "BASE_FILECOMMENT_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "BASE_FILECOMMENT_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger BASE_FILEDISCUSS_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "BASE_FILEDISCUSS_TR" 
BEFORE INSERT ON "BASE_FILEDISCUSS"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "BASE_FILEDISCUSS_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "BASE_FILEDISCUSS_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger BASE_GROUPENABLEDMODULE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "BASE_GROUPENABLEDMODULE_TR" 
BEFORE INSERT ON "BASE_GROUPENABLEDMODULE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "BASE_GROUPENABLEDMODULE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "BASE_GROUPENABLEDMODULE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger BASE_INNERPUBMSGREPLY_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "BASE_INNERPUBMSGREPLY_TR" 
BEFORE INSERT ON "BASE_INNERPUBMSGREPLY"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "BASE_INNERPUBMSGREPLY_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "BASE_INNERPUBMSGREPLY_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger BASE_INNERPUBMSG_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "BASE_INNERPUBMSG_TR" 
BEFORE INSERT ON "BASE_INNERPUBMSG"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "BASE_INNERPUBMSG_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "BASE_INNERPUBMSG_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger BASE_USERENABLEDMODULE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "BASE_USERENABLEDMODULE_TR" 
BEFORE INSERT ON "BASE_USERENABLEDMODULE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "BASE_USERENABLEDMODULE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "BASE_USERENABLEDMODULE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger BASE_USERLASTLOGIN_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "BASE_USERLASTLOGIN_TR" 
BEFORE INSERT ON "BASE_USERLASTLOGIN"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "BASE_USERLASTLOGIN_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "BASE_USERLASTLOGIN_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger BASE_USERSTARREDFILES_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "BASE_USERSTARREDFILES_TR" 
BEFORE INSERT ON "BASE_USERSTARREDFILES"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "BASE_USERSTARREDFILES_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "BASE_USERSTARREDFILES_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger CAPTCHA_CAPTCHASTORE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "CAPTCHA_CAPTCHASTORE_TR" 
BEFORE INSERT ON "CAPTCHA_CAPTCHASTORE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "CAPTCHA_CAPTCHASTORE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "CAPTCHA_CAPTCHASTORE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger CONSTANCE_CONFIG_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "CONSTANCE_CONFIG_TR" 
BEFORE INSERT ON "CONSTANCE_CONFIG"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "CONSTANCE_CONFIG_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "CONSTANCE_CONFIG_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger CONTACTS_CONTACT_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "CONTACTS_CONTACT_TR" 
BEFORE INSERT ON "CONTACTS_CONTACT"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "CONTACTS_CONTACT_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "CONTACTS_CONTACT_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger DJANGO_CONTENT_TYPE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "DJANGO_CONTENT_TYPE_TR" 
BEFORE INSERT ON "DJANGO_CONTENT_TYPE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "DJANGO_CONTENT_TYPE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "DJANGO_CONTENT_TYPE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger DJANGO_MIGRATIONS_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "DJANGO_MIGRATIONS_TR" 
BEFORE INSERT ON "DJANGO_MIGRATIONS"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "DJANGO_MIGRATIONS_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "DJANGO_MIGRATIONS_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger GROUP_GROUPMESSAGE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "GROUP_GROUPMESSAGE_TR" 
BEFORE INSERT ON "GROUP_GROUPMESSAGE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "GROUP_GROUPMESSAGE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "GROUP_GROUPMESSAGE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger GROUP_MESSAGEATTACHMENT_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "GROUP_MESSAGEATTACHMENT_TR" 
BEFORE INSERT ON "GROUP_MESSAGEATTACHMENT"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "GROUP_MESSAGEATTACHMENT_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "GROUP_MESSAGEATTACHMENT_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger GROUP_MESSAGEREPLY_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "GROUP_MESSAGEREPLY_TR" 
BEFORE INSERT ON "GROUP_MESSAGEREPLY"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "GROUP_MESSAGEREPLY_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "GROUP_MESSAGEREPLY_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger GROUP_PUBLICGROUP_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "GROUP_PUBLICGROUP_TR" 
BEFORE INSERT ON "GROUP_PUBLICGROUP"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "GROUP_PUBLICGROUP_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "GROUP_PUBLICGROUP_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger INSTITUTIONS_INSTITUTIO2836_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "INSTITUTIONS_INSTITUTIO2836_TR" 
BEFORE INSERT ON "INSTITUTIONS_INSTITUTIONADMIN"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "INSTITUTIONS_INSTITUTIO2836_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "INSTITUTIONS_INSTITUTIO2836_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger INSTITUTIONS_INSTITUTION_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "INSTITUTIONS_INSTITUTION_TR" 
BEFORE INSERT ON "INSTITUTIONS_INSTITUTION"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "INSTITUTIONS_INSTITUTION_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "INSTITUTIONS_INSTITUTION_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger INVITATIONS_INVITATION_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "INVITATIONS_INVITATION_TR" 
BEFORE INSERT ON "INVITATIONS_INVITATION"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "INVITATIONS_INVITATION_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "INVITATIONS_INVITATION_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger MESSAGE_USERMESSAGE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "MESSAGE_USERMESSAGE_TR" 
BEFORE INSERT ON "MESSAGE_USERMESSAGE"
FOR EACH ROW
 WHEN (new."MESSAGE_ID" IS NULL) BEGIN
        SELECT "MESSAGE_USERMESSAGE_SQ".nextval
        INTO :new."MESSAGE_ID" FROM dual;
    END;

/
ALTER TRIGGER "MESSAGE_USERMESSAGE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger MESSAGE_USERMSGATTACHMENT_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "MESSAGE_USERMSGATTACHMENT_TR" 
BEFORE INSERT ON "MESSAGE_USERMSGATTACHMENT"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "MESSAGE_USERMSGATTACHMENT_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "MESSAGE_USERMSGATTACHMENT_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger MESSAGE_USERMSGLASTCHECK_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "MESSAGE_USERMSGLASTCHECK_TR" 
BEFORE INSERT ON "MESSAGE_USERMSGLASTCHECK"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "MESSAGE_USERMSGLASTCHECK_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "MESSAGE_USERMSGLASTCHECK_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger NOTIFICATIONS_NOTIFICATION_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "NOTIFICATIONS_NOTIFICATION_TR" 
BEFORE INSERT ON "NOTIFICATIONS_NOTIFICATION"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "NOTIFICATIONS_NOTIFICATION_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "NOTIFICATIONS_NOTIFICATION_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger NOTIFICATIONS_USERNOTIF3BBF_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "NOTIFICATIONS_USERNOTIF3BBF_TR" 
BEFORE INSERT ON "NOTIFICATIONS_USERNOTIFICATION"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "NOTIFICATIONS_USERNOTIF3BBF_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "NOTIFICATIONS_USERNOTIF3BBF_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger OPTIONS_USEROPTIONS_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "OPTIONS_USEROPTIONS_TR" 
BEFORE INSERT ON "OPTIONS_USEROPTIONS"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "OPTIONS_USEROPTIONS_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "OPTIONS_USEROPTIONS_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger ORGANIZATIONS_ORGMEMBER6B70_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "ORGANIZATIONS_ORGMEMBER6B70_TR" 
BEFORE INSERT ON "ORGANIZATIONS_ORGMEMBERQUOTA"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "ORGANIZATIONS_ORGMEMBER6B70_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "ORGANIZATIONS_ORGMEMBER6B70_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger POST_OFFICE_ATTACHMENT_D670_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "POST_OFFICE_ATTACHMENT_D670_TR" 
BEFORE INSERT ON "POST_OFFICE_ATTACHMENT_EMAILS"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "POST_OFFICE_ATTACHMENT_D670_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "POST_OFFICE_ATTACHMENT_D670_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger POST_OFFICE_ATTACHMENT_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "POST_OFFICE_ATTACHMENT_TR" 
BEFORE INSERT ON "POST_OFFICE_ATTACHMENT"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "POST_OFFICE_ATTACHMENT_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "POST_OFFICE_ATTACHMENT_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger POST_OFFICE_EMAILTEMPLATE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "POST_OFFICE_EMAILTEMPLATE_TR" 
BEFORE INSERT ON "POST_OFFICE_EMAILTEMPLATE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "POST_OFFICE_EMAILTEMPLATE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "POST_OFFICE_EMAILTEMPLATE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger POST_OFFICE_EMAIL_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "POST_OFFICE_EMAIL_TR" 
BEFORE INSERT ON "POST_OFFICE_EMAIL"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "POST_OFFICE_EMAIL_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "POST_OFFICE_EMAIL_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger POST_OFFICE_LOG_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "POST_OFFICE_LOG_TR" 
BEFORE INSERT ON "POST_OFFICE_LOG"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "POST_OFFICE_LOG_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "POST_OFFICE_LOG_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger PROFILE_DETAILEDPROFILE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "PROFILE_DETAILEDPROFILE_TR" 
BEFORE INSERT ON "PROFILE_DETAILEDPROFILE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "PROFILE_DETAILEDPROFILE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "PROFILE_DETAILEDPROFILE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger PROFILE_PROFILE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "PROFILE_PROFILE_TR" 
BEFORE INSERT ON "PROFILE_PROFILE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "PROFILE_PROFILE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "PROFILE_PROFILE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger REGISTRATION_REGISTRATI2179_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "REGISTRATION_REGISTRATI2179_TR" 
BEFORE INSERT ON "REGISTRATION_REGISTRATIONP238A"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "REGISTRATION_REGISTRATI2179_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "REGISTRATION_REGISTRATI2179_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger SHARE_ANONYMOUSSHARE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "SHARE_ANONYMOUSSHARE_TR" 
BEFORE INSERT ON "SHARE_ANONYMOUSSHARE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "SHARE_ANONYMOUSSHARE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "SHARE_ANONYMOUSSHARE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger SHARE_FILESHARE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "SHARE_FILESHARE_TR" 
BEFORE INSERT ON "SHARE_FILESHARE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "SHARE_FILESHARE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "SHARE_FILESHARE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger SHARE_ORGFILESHARE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "SHARE_ORGFILESHARE_TR" 
BEFORE INSERT ON "SHARE_ORGFILESHARE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "SHARE_ORGFILESHARE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "SHARE_ORGFILESHARE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger SHARE_PRIVATEFILEDIRSHARE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "SHARE_PRIVATEFILEDIRSHARE_TR" 
BEFORE INSERT ON "SHARE_PRIVATEFILEDIRSHARE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "SHARE_PRIVATEFILEDIRSHARE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "SHARE_PRIVATEFILEDIRSHARE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger SHARE_UPLOADLINKSHARE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "SHARE_UPLOADLINKSHARE_TR" 
BEFORE INSERT ON "SHARE_UPLOADLINKSHARE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "SHARE_UPLOADLINKSHARE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "SHARE_UPLOADLINKSHARE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger SYSADMIN_EXTRA_USERLOGINLOG_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "SYSADMIN_EXTRA_USERLOGINLOG_TR" 
BEFORE INSERT ON "SYSADMIN_EXTRA_USERLOGINLOG"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "SYSADMIN_EXTRA_USERLOGINLOG_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "SYSADMIN_EXTRA_USERLOGINLOG_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger TERMSANDCONDITIONS_TERM6123_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "TERMSANDCONDITIONS_TERM6123_TR" 
BEFORE INSERT ON "TERMSANDCONDITIONS_TERMSAN0233"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "TERMSANDCONDITIONS_TERM6123_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "TERMSANDCONDITIONS_TERM6123_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger TERMSANDCONDITIONS_USERCF1A_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "TERMSANDCONDITIONS_USERCF1A_TR" 
BEFORE INSERT ON "TERMSANDCONDITIONS_USERTERF56C"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "TERMSANDCONDITIONS_USERCF1A_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "TERMSANDCONDITIONS_USERCF1A_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger TWO_FACTOR_PHONEDEVICE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "TWO_FACTOR_PHONEDEVICE_TR" 
BEFORE INSERT ON "TWO_FACTOR_PHONEDEVICE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "TWO_FACTOR_PHONEDEVICE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "TWO_FACTOR_PHONEDEVICE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger TWO_FACTOR_STATICDEVICE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "TWO_FACTOR_STATICDEVICE_TR" 
BEFORE INSERT ON "TWO_FACTOR_STATICDEVICE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "TWO_FACTOR_STATICDEVICE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "TWO_FACTOR_STATICDEVICE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger TWO_FACTOR_STATICTOKEN_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "TWO_FACTOR_STATICTOKEN_TR" 
BEFORE INSERT ON "TWO_FACTOR_STATICTOKEN"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "TWO_FACTOR_STATICTOKEN_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "TWO_FACTOR_STATICTOKEN_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger TWO_FACTOR_TOTPDEVICE_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "TWO_FACTOR_TOTPDEVICE_TR" 
BEFORE INSERT ON "TWO_FACTOR_TOTPDEVICE"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "TWO_FACTOR_TOTPDEVICE_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "TWO_FACTOR_TOTPDEVICE_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger WIKI_GROUPWIKI_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "WIKI_GROUPWIKI_TR" 
BEFORE INSERT ON "WIKI_GROUPWIKI"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "WIKI_GROUPWIKI_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "WIKI_GROUPWIKI_TR" ENABLE;
--------------------------------------------------------
--  DDL for Trigger WIKI_PERSONALWIKI_TR
--------------------------------------------------------

  CREATE OR REPLACE TRIGGER "WIKI_PERSONALWIKI_TR" 
BEFORE INSERT ON "WIKI_PERSONALWIKI"
FOR EACH ROW
 WHEN (new."ID" IS NULL) BEGIN
        SELECT "WIKI_PERSONALWIKI_SQ".nextval
        INTO :new."ID" FROM dual;
    END;

/
ALTER TRIGGER "WIKI_PERSONALWIKI_TR" ENABLE;
--------------------------------------------------------
--  Constraints for Table INSTITUTIONS_INSTITUTION
--------------------------------------------------------

  ALTER TABLE "INSTITUTIONS_INSTITUTION" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "INSTITUTIONS_INSTITUTION" MODIFY ("CREATE_TIME" NOT NULL ENABLE);
  ALTER TABLE "INSTITUTIONS_INSTITUTION" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table POST_OFFICE_LOG
--------------------------------------------------------

  ALTER TABLE "POST_OFFICE_LOG" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "POST_OFFICE_LOG" ADD CHECK ("STATUS" >= 0) ENABLE;
  ALTER TABLE "POST_OFFICE_LOG" MODIFY ("EMAIL_ID" NOT NULL ENABLE);
  ALTER TABLE "POST_OFFICE_LOG" MODIFY ("STATUS" NOT NULL ENABLE);
  ALTER TABLE "POST_OFFICE_LOG" MODIFY ("DATE" NOT NULL ENABLE);
  ALTER TABLE "POST_OFFICE_LOG" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table TWO_FACTOR_TOTPDEVICE
--------------------------------------------------------

  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" ADD UNIQUE ("USER") ENABLE;
  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" ADD CHECK ("TOLERANCE" >= 0) ENABLE;
  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" ADD CHECK ("DIGITS" >= 0) ENABLE;
  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" ADD CHECK ("STEP" >= 0) ENABLE;
  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" ADD CHECK ("CONFIRMED" IN (0,1)) ENABLE;
  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" MODIFY ("LAST_T" NOT NULL ENABLE);
  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" MODIFY ("DRIFT" NOT NULL ENABLE);
  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" MODIFY ("TOLERANCE" NOT NULL ENABLE);
  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" MODIFY ("DIGITS" NOT NULL ENABLE);
  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" MODIFY ("T0" NOT NULL ENABLE);
  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" MODIFY ("STEP" NOT NULL ENABLE);
  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" MODIFY ("CONFIRMED" NOT NULL ENABLE);
  ALTER TABLE "TWO_FACTOR_TOTPDEVICE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table API2_TOKEN
--------------------------------------------------------

  ALTER TABLE "API2_TOKEN" ADD UNIQUE ("USER") ENABLE;
  ALTER TABLE "API2_TOKEN" ADD PRIMARY KEY ("KEY") ENABLE;
  ALTER TABLE "API2_TOKEN" MODIFY ("CREATED" NOT NULL ENABLE);
  ALTER TABLE "API2_TOKEN" MODIFY ("KEY" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table OPTIONS_USEROPTIONS
--------------------------------------------------------

  ALTER TABLE "OPTIONS_USEROPTIONS" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "OPTIONS_USEROPTIONS" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table AVATAR_AVATAR
--------------------------------------------------------

  ALTER TABLE "AVATAR_AVATAR" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "AVATAR_AVATAR" ADD CHECK ("PRIMARY" IN (0,1)) ENABLE;
  ALTER TABLE "AVATAR_AVATAR" MODIFY ("DATE_UPLOADED" NOT NULL ENABLE);
  ALTER TABLE "AVATAR_AVATAR" MODIFY ("PRIMARY" NOT NULL ENABLE);
  ALTER TABLE "AVATAR_AVATAR" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table POST_OFFICE_ATTACHMENT_EMAILS
--------------------------------------------------------

  ALTER TABLE "POST_OFFICE_ATTACHMENT_EMAILS" ADD UNIQUE ("ATTACHMENT_ID", "EMAIL_ID") ENABLE;
  ALTER TABLE "POST_OFFICE_ATTACHMENT_EMAILS" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "POST_OFFICE_ATTACHMENT_EMAILS" MODIFY ("EMAIL_ID" NOT NULL ENABLE);
  ALTER TABLE "POST_OFFICE_ATTACHMENT_EMAILS" MODIFY ("ATTACHMENT_ID" NOT NULL ENABLE);
  ALTER TABLE "POST_OFFICE_ATTACHMENT_EMAILS" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table TERMSANDCONDITIONS_USERTERF56C
--------------------------------------------------------

  ALTER TABLE "TERMSANDCONDITIONS_USERTERF56C" ADD CONSTRAINT "FA265FB080B978BD0FE0BF3E4B445B" UNIQUE ("USERNAME", "TERMS_ID") ENABLE;
  ALTER TABLE "TERMSANDCONDITIONS_USERTERF56C" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "TERMSANDCONDITIONS_USERTERF56C" MODIFY ("TERMS_ID" NOT NULL ENABLE);
  ALTER TABLE "TERMSANDCONDITIONS_USERTERF56C" MODIFY ("DATE_ACCEPTED" NOT NULL ENABLE);
  ALTER TABLE "TERMSANDCONDITIONS_USERTERF56C" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table BASE_FILECOMMENT
--------------------------------------------------------

  ALTER TABLE "BASE_FILECOMMENT" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "BASE_FILECOMMENT" MODIFY ("UPDATED_AT" NOT NULL ENABLE);
  ALTER TABLE "BASE_FILECOMMENT" MODIFY ("CREATED_AT" NOT NULL ENABLE);
  ALTER TABLE "BASE_FILECOMMENT" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table MESSAGE_USERMSGLASTCHECK
--------------------------------------------------------

  ALTER TABLE "MESSAGE_USERMSGLASTCHECK" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "MESSAGE_USERMSGLASTCHECK" MODIFY ("CHECK_TIME" NOT NULL ENABLE);
  ALTER TABLE "MESSAGE_USERMSGLASTCHECK" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table BASE_USERSTARREDFILES
--------------------------------------------------------

  ALTER TABLE "BASE_USERSTARREDFILES" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "BASE_USERSTARREDFILES" ADD CHECK ("IS_DIR" IN (0,1)) ENABLE;
  ALTER TABLE "BASE_USERSTARREDFILES" MODIFY ("IS_DIR" NOT NULL ENABLE);
  ALTER TABLE "BASE_USERSTARREDFILES" MODIFY ("ORG_ID" NOT NULL ENABLE);
  ALTER TABLE "BASE_USERSTARREDFILES" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table CAPTCHA_CAPTCHASTORE
--------------------------------------------------------

  ALTER TABLE "CAPTCHA_CAPTCHASTORE" ADD UNIQUE ("HASHKEY") ENABLE;
  ALTER TABLE "CAPTCHA_CAPTCHASTORE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "CAPTCHA_CAPTCHASTORE" MODIFY ("EXPIRATION" NOT NULL ENABLE);
  ALTER TABLE "CAPTCHA_CAPTCHASTORE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table TWO_FACTOR_STATICTOKEN
--------------------------------------------------------

  ALTER TABLE "TWO_FACTOR_STATICTOKEN" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "TWO_FACTOR_STATICTOKEN" MODIFY ("DEVICE_ID" NOT NULL ENABLE);
  ALTER TABLE "TWO_FACTOR_STATICTOKEN" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table SHARE_ORGFILESHARE
--------------------------------------------------------

  ALTER TABLE "SHARE_ORGFILESHARE" ADD UNIQUE ("FILE_SHARE_ID") ENABLE;
  ALTER TABLE "SHARE_ORGFILESHARE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "SHARE_ORGFILESHARE" MODIFY ("FILE_SHARE_ID" NOT NULL ENABLE);
  ALTER TABLE "SHARE_ORGFILESHARE" MODIFY ("ORG_ID" NOT NULL ENABLE);
  ALTER TABLE "SHARE_ORGFILESHARE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table GROUP_MESSAGEATTACHMENT
--------------------------------------------------------

  ALTER TABLE "GROUP_MESSAGEATTACHMENT" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "GROUP_MESSAGEATTACHMENT" MODIFY ("GROUP_MESSAGE_ID" NOT NULL ENABLE);
  ALTER TABLE "GROUP_MESSAGEATTACHMENT" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table SHARE_FILESHARE
--------------------------------------------------------

  ALTER TABLE "SHARE_FILESHARE" ADD UNIQUE ("TOKEN") ENABLE;
  ALTER TABLE "SHARE_FILESHARE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "SHARE_FILESHARE" MODIFY ("VIEW_CNT" NOT NULL ENABLE);
  ALTER TABLE "SHARE_FILESHARE" MODIFY ("CTIME" NOT NULL ENABLE);
  ALTER TABLE "SHARE_FILESHARE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table WIKI_GROUPWIKI
--------------------------------------------------------

  ALTER TABLE "WIKI_GROUPWIKI" ADD UNIQUE ("GROUP_ID") ENABLE;
  ALTER TABLE "WIKI_GROUPWIKI" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "WIKI_GROUPWIKI" MODIFY ("GROUP_ID" NOT NULL ENABLE);
  ALTER TABLE "WIKI_GROUPWIKI" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table POST_OFFICE_EMAIL
--------------------------------------------------------

  ALTER TABLE "POST_OFFICE_EMAIL" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "POST_OFFICE_EMAIL" ADD CHECK ("PRIORITY" >= 0) ENABLE;
  ALTER TABLE "POST_OFFICE_EMAIL" ADD CHECK ("STATUS" >= 0) ENABLE;
  ALTER TABLE "POST_OFFICE_EMAIL" MODIFY ("LAST_UPDATED" NOT NULL ENABLE);
  ALTER TABLE "POST_OFFICE_EMAIL" MODIFY ("CREATED" NOT NULL ENABLE);
  ALTER TABLE "POST_OFFICE_EMAIL" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table GROUP_MESSAGEREPLY
--------------------------------------------------------

  ALTER TABLE "GROUP_MESSAGEREPLY" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "GROUP_MESSAGEREPLY" MODIFY ("TIMESTAMP" NOT NULL ENABLE);
  ALTER TABLE "GROUP_MESSAGEREPLY" MODIFY ("REPLY_TO_ID" NOT NULL ENABLE);
  ALTER TABLE "GROUP_MESSAGEREPLY" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table CONSTANCE_CONFIG
--------------------------------------------------------

  ALTER TABLE "CONSTANCE_CONFIG" ADD UNIQUE ("KEY") ENABLE;
  ALTER TABLE "CONSTANCE_CONFIG" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "CONSTANCE_CONFIG" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table SHARE_UPLOADLINKSHARE
--------------------------------------------------------

  ALTER TABLE "SHARE_UPLOADLINKSHARE" ADD UNIQUE ("TOKEN") ENABLE;
  ALTER TABLE "SHARE_UPLOADLINKSHARE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "SHARE_UPLOADLINKSHARE" MODIFY ("VIEW_CNT" NOT NULL ENABLE);
  ALTER TABLE "SHARE_UPLOADLINKSHARE" MODIFY ("CTIME" NOT NULL ENABLE);
  ALTER TABLE "SHARE_UPLOADLINKSHARE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table PROFILE_DETAILEDPROFILE
--------------------------------------------------------

  ALTER TABLE "PROFILE_DETAILEDPROFILE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "PROFILE_DETAILEDPROFILE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table NOTIFICATIONS_NOTIFICATION
--------------------------------------------------------

  ALTER TABLE "NOTIFICATIONS_NOTIFICATION" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "NOTIFICATIONS_NOTIFICATION" ADD CHECK ("PRIMARY" IN (0,1)) ENABLE;
  ALTER TABLE "NOTIFICATIONS_NOTIFICATION" MODIFY ("PRIMARY" NOT NULL ENABLE);
  ALTER TABLE "NOTIFICATIONS_NOTIFICATION" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table DJANGO_CONTENT_TYPE
--------------------------------------------------------

  ALTER TABLE "DJANGO_CONTENT_TYPE" ADD CONSTRAINT "D85D5DBB541FAB8F1DF26BA8B130BE" UNIQUE ("APP_LABEL", "MODEL") ENABLE;
  ALTER TABLE "DJANGO_CONTENT_TYPE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "DJANGO_CONTENT_TYPE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table ORGANIZATIONS_ORGMEMBERQUOTA
--------------------------------------------------------

  ALTER TABLE "ORGANIZATIONS_ORGMEMBERQUOTA" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "ORGANIZATIONS_ORGMEMBERQUOTA" MODIFY ("QUOTA" NOT NULL ENABLE);
  ALTER TABLE "ORGANIZATIONS_ORGMEMBERQUOTA" MODIFY ("ORG_ID" NOT NULL ENABLE);
  ALTER TABLE "ORGANIZATIONS_ORGMEMBERQUOTA" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table WIKI_PERSONALWIKI
--------------------------------------------------------

  ALTER TABLE "WIKI_PERSONALWIKI" ADD UNIQUE ("USERNAME") ENABLE;
  ALTER TABLE "WIKI_PERSONALWIKI" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "WIKI_PERSONALWIKI" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table BASE_USERENABLEDMODULE
--------------------------------------------------------

  ALTER TABLE "BASE_USERENABLEDMODULE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "BASE_USERENABLEDMODULE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table BASE_INNERPUBMSG
--------------------------------------------------------

  ALTER TABLE "BASE_INNERPUBMSG" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "BASE_INNERPUBMSG" MODIFY ("TIMESTAMP" NOT NULL ENABLE);
  ALTER TABLE "BASE_INNERPUBMSG" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table INSTITUTIONS_INSTITUTIONADMIN
--------------------------------------------------------

  ALTER TABLE "INSTITUTIONS_INSTITUTIONADMIN" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "INSTITUTIONS_INSTITUTIONADMIN" MODIFY ("INSTITUTION_ID" NOT NULL ENABLE);
  ALTER TABLE "INSTITUTIONS_INSTITUTIONADMIN" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table AVATAR_GROUPAVATAR
--------------------------------------------------------

  ALTER TABLE "AVATAR_GROUPAVATAR" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "AVATAR_GROUPAVATAR" MODIFY ("DATE_UPLOADED" NOT NULL ENABLE);
  ALTER TABLE "AVATAR_GROUPAVATAR" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table REGISTRATION_REGISTRATIONP238A
--------------------------------------------------------

  ALTER TABLE "REGISTRATION_REGISTRATIONP238A" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "REGISTRATION_REGISTRATIONP238A" MODIFY ("EMAILUSER_ID" NOT NULL ENABLE);
  ALTER TABLE "REGISTRATION_REGISTRATIONP238A" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table TERMSANDCONDITIONS_TERMSAN0233
--------------------------------------------------------

  ALTER TABLE "TERMSANDCONDITIONS_TERMSAN0233" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "TERMSANDCONDITIONS_TERMSAN0233" MODIFY ("DATE_CREATED" NOT NULL ENABLE);
  ALTER TABLE "TERMSANDCONDITIONS_TERMSAN0233" MODIFY ("VERSION_NUMBER" NOT NULL ENABLE);
  ALTER TABLE "TERMSANDCONDITIONS_TERMSAN0233" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table BASE_FILEDISCUSS
--------------------------------------------------------

  ALTER TABLE "BASE_FILEDISCUSS" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "BASE_FILEDISCUSS" MODIFY ("GROUP_MESSAGE_ID" NOT NULL ENABLE);
  ALTER TABLE "BASE_FILEDISCUSS" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table GROUP_PUBLICGROUP
--------------------------------------------------------

  ALTER TABLE "GROUP_PUBLICGROUP" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "GROUP_PUBLICGROUP" MODIFY ("GROUP_ID" NOT NULL ENABLE);
  ALTER TABLE "GROUP_PUBLICGROUP" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table BASE_CLIENTLOGINTOKEN
--------------------------------------------------------

  ALTER TABLE "BASE_CLIENTLOGINTOKEN" ADD PRIMARY KEY ("TOKEN") ENABLE;
  ALTER TABLE "BASE_CLIENTLOGINTOKEN" MODIFY ("TIMESTAMP" NOT NULL ENABLE);
  ALTER TABLE "BASE_CLIENTLOGINTOKEN" MODIFY ("TOKEN" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table DJANGO_SESSION
--------------------------------------------------------

  ALTER TABLE "DJANGO_SESSION" ADD PRIMARY KEY ("SESSION_KEY") ENABLE;
  ALTER TABLE "DJANGO_SESSION" MODIFY ("EXPIRE_DATE" NOT NULL ENABLE);
  ALTER TABLE "DJANGO_SESSION" MODIFY ("SESSION_KEY" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table NOTIFICATIONS_USERNOTIFICATION
--------------------------------------------------------

  ALTER TABLE "NOTIFICATIONS_USERNOTIFICATION" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "NOTIFICATIONS_USERNOTIFICATION" ADD CHECK ("SEEN" IN (0,1)) ENABLE;
  ALTER TABLE "NOTIFICATIONS_USERNOTIFICATION" MODIFY ("SEEN" NOT NULL ENABLE);
  ALTER TABLE "NOTIFICATIONS_USERNOTIFICATION" MODIFY ("TIMESTAMP" NOT NULL ENABLE);
  ALTER TABLE "NOTIFICATIONS_USERNOTIFICATION" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table BASE_GROUPENABLEDMODULE
--------------------------------------------------------

  ALTER TABLE "BASE_GROUPENABLEDMODULE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "BASE_GROUPENABLEDMODULE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table BASE_DEVICETOKEN
--------------------------------------------------------

  ALTER TABLE "BASE_DEVICETOKEN" ADD UNIQUE ("TOKEN", "USER") ENABLE;
  ALTER TABLE "BASE_DEVICETOKEN" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "BASE_DEVICETOKEN" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table TWO_FACTOR_STATICDEVICE
--------------------------------------------------------

  ALTER TABLE "TWO_FACTOR_STATICDEVICE" ADD UNIQUE ("USER") ENABLE;
  ALTER TABLE "TWO_FACTOR_STATICDEVICE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "TWO_FACTOR_STATICDEVICE" ADD CHECK ("CONFIRMED" IN (0,1)) ENABLE;
  ALTER TABLE "TWO_FACTOR_STATICDEVICE" MODIFY ("CONFIRMED" NOT NULL ENABLE);
  ALTER TABLE "TWO_FACTOR_STATICDEVICE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table GROUP_GROUPMESSAGE
--------------------------------------------------------

  ALTER TABLE "GROUP_GROUPMESSAGE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "GROUP_GROUPMESSAGE" MODIFY ("TIMESTAMP" NOT NULL ENABLE);
  ALTER TABLE "GROUP_GROUPMESSAGE" MODIFY ("GROUP_ID" NOT NULL ENABLE);
  ALTER TABLE "GROUP_GROUPMESSAGE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table TWO_FACTOR_PHONEDEVICE
--------------------------------------------------------

  ALTER TABLE "TWO_FACTOR_PHONEDEVICE" ADD UNIQUE ("USER") ENABLE;
  ALTER TABLE "TWO_FACTOR_PHONEDEVICE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "TWO_FACTOR_PHONEDEVICE" ADD CHECK ("CONFIRMED" IN (0,1)) ENABLE;
  ALTER TABLE "TWO_FACTOR_PHONEDEVICE" MODIFY ("CONFIRMED" NOT NULL ENABLE);
  ALTER TABLE "TWO_FACTOR_PHONEDEVICE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table POST_OFFICE_ATTACHMENT
--------------------------------------------------------

  ALTER TABLE "POST_OFFICE_ATTACHMENT" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "POST_OFFICE_ATTACHMENT" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table POST_OFFICE_EMAILTEMPLATE
--------------------------------------------------------

  ALTER TABLE "POST_OFFICE_EMAILTEMPLATE" ADD CONSTRAINT "FF9556696FEEA12226069FE6564DB9" UNIQUE ("LANGUAGE", "DEFAULT_TEMPLATE_ID") ENABLE;
  ALTER TABLE "POST_OFFICE_EMAILTEMPLATE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "POST_OFFICE_EMAILTEMPLATE" MODIFY ("LAST_UPDATED" NOT NULL ENABLE);
  ALTER TABLE "POST_OFFICE_EMAILTEMPLATE" MODIFY ("CREATED" NOT NULL ENABLE);
  ALTER TABLE "POST_OFFICE_EMAILTEMPLATE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table MESSAGE_USERMESSAGE
--------------------------------------------------------

  ALTER TABLE "MESSAGE_USERMESSAGE" ADD PRIMARY KEY ("MESSAGE_ID") ENABLE;
  ALTER TABLE "MESSAGE_USERMESSAGE" ADD CHECK ("IFREAD" IN (0,1)) ENABLE;
  ALTER TABLE "MESSAGE_USERMESSAGE" MODIFY ("IFREAD" NOT NULL ENABLE);
  ALTER TABLE "MESSAGE_USERMESSAGE" MODIFY ("TIMESTAMP" NOT NULL ENABLE);
  ALTER TABLE "MESSAGE_USERMESSAGE" MODIFY ("MESSAGE_ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table BASE_COMMANDSLASTCHECK
--------------------------------------------------------

  ALTER TABLE "BASE_COMMANDSLASTCHECK" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "BASE_COMMANDSLASTCHECK" MODIFY ("LAST_CHECK" NOT NULL ENABLE);
  ALTER TABLE "BASE_COMMANDSLASTCHECK" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table CONTACTS_CONTACT
--------------------------------------------------------

  ALTER TABLE "CONTACTS_CONTACT" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "CONTACTS_CONTACT" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table DJANGO_MIGRATIONS
--------------------------------------------------------

  ALTER TABLE "DJANGO_MIGRATIONS" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "DJANGO_MIGRATIONS" MODIFY ("APPLIED" NOT NULL ENABLE);
  ALTER TABLE "DJANGO_MIGRATIONS" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table INVITATIONS_INVITATION
--------------------------------------------------------

  ALTER TABLE "INVITATIONS_INVITATION" MODIFY ("EXPIRE_TIME" NOT NULL ENABLE);
  ALTER TABLE "INVITATIONS_INVITATION" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "INVITATIONS_INVITATION" MODIFY ("INVITE_TIME" NOT NULL ENABLE);
  ALTER TABLE "INVITATIONS_INVITATION" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table BASE_USERLASTLOGIN
--------------------------------------------------------

  ALTER TABLE "BASE_USERLASTLOGIN" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "BASE_USERLASTLOGIN" MODIFY ("LAST_LOGIN" NOT NULL ENABLE);
  ALTER TABLE "BASE_USERLASTLOGIN" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table SHARE_PRIVATEFILEDIRSHARE
--------------------------------------------------------

  ALTER TABLE "SHARE_PRIVATEFILEDIRSHARE" ADD UNIQUE ("TOKEN") ENABLE;
  ALTER TABLE "SHARE_PRIVATEFILEDIRSHARE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "SHARE_PRIVATEFILEDIRSHARE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table SYSADMIN_EXTRA_USERLOGINLOG
--------------------------------------------------------

  ALTER TABLE "SYSADMIN_EXTRA_USERLOGINLOG" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "SYSADMIN_EXTRA_USERLOGINLOG" MODIFY ("LOGIN_DATE" NOT NULL ENABLE);
  ALTER TABLE "SYSADMIN_EXTRA_USERLOGINLOG" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table SHARE_ANONYMOUSSHARE
--------------------------------------------------------

  ALTER TABLE "SHARE_ANONYMOUSSHARE" ADD UNIQUE ("TOKEN") ENABLE;
  ALTER TABLE "SHARE_ANONYMOUSSHARE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "SHARE_ANONYMOUSSHARE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table MESSAGE_USERMSGATTACHMENT
--------------------------------------------------------

  ALTER TABLE "MESSAGE_USERMSGATTACHMENT" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "MESSAGE_USERMSGATTACHMENT" MODIFY ("USER_MSG_ID" NOT NULL ENABLE);
  ALTER TABLE "MESSAGE_USERMSGATTACHMENT" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table BASE_INNERPUBMSGREPLY
--------------------------------------------------------

  ALTER TABLE "BASE_INNERPUBMSGREPLY" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "BASE_INNERPUBMSGREPLY" MODIFY ("TIMESTAMP" NOT NULL ENABLE);
  ALTER TABLE "BASE_INNERPUBMSGREPLY" MODIFY ("REPLY_TO_ID" NOT NULL ENABLE);
  ALTER TABLE "BASE_INNERPUBMSGREPLY" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table PROFILE_PROFILE
--------------------------------------------------------

  ALTER TABLE "PROFILE_PROFILE" ADD UNIQUE ("LOGIN_ID") ENABLE;
  ALTER TABLE "PROFILE_PROFILE" ADD UNIQUE ("USER") ENABLE;
  ALTER TABLE "PROFILE_PROFILE" ADD PRIMARY KEY ("ID") ENABLE;
  ALTER TABLE "PROFILE_PROFILE" MODIFY ("ID" NOT NULL ENABLE);
--------------------------------------------------------
--  Constraints for Table API2_TOKENV2
--------------------------------------------------------

  ALTER TABLE "API2_TOKENV2" ADD UNIQUE ("USER", "PLATFORM", "DEVICE_ID") ENABLE;
  ALTER TABLE "API2_TOKENV2" ADD PRIMARY KEY ("KEY") ENABLE;
  ALTER TABLE "API2_TOKENV2" MODIFY ("CREATED_AT" NOT NULL ENABLE);
  ALTER TABLE "API2_TOKENV2" MODIFY ("LAST_ACCESSED" NOT NULL ENABLE);
  ALTER TABLE "API2_TOKENV2" MODIFY ("KEY" NOT NULL ENABLE);
--------------------------------------------------------
--  Ref Constraints for Table BASE_FILEDISCUSS
--------------------------------------------------------

  ALTER TABLE "BASE_FILEDISCUSS" ADD CONSTRAINT "D362E9BF714D64DD429DF16FAB60CB" FOREIGN KEY ("GROUP_MESSAGE_ID")
	  REFERENCES "GROUP_GROUPMESSAGE" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table BASE_INNERPUBMSGREPLY
--------------------------------------------------------

  ALTER TABLE "BASE_INNERPUBMSGREPLY" ADD CONSTRAINT "D6FA27AB5E9198C8D9323B6EB8493E" FOREIGN KEY ("REPLY_TO_ID")
	  REFERENCES "BASE_INNERPUBMSG" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table GROUP_MESSAGEATTACHMENT
--------------------------------------------------------

  ALTER TABLE "GROUP_MESSAGEATTACHMENT" ADD CONSTRAINT "D36A3F4E152A1CF41CD8EC91E6577B" FOREIGN KEY ("GROUP_MESSAGE_ID")
	  REFERENCES "GROUP_GROUPMESSAGE" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table GROUP_MESSAGEREPLY
--------------------------------------------------------

  ALTER TABLE "GROUP_MESSAGEREPLY" ADD CONSTRAINT "CBC9C076EAE2B5F98C3961684556C2" FOREIGN KEY ("REPLY_TO_ID")
	  REFERENCES "GROUP_GROUPMESSAGE" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table INSTITUTIONS_INSTITUTIONADMIN
--------------------------------------------------------

  ALTER TABLE "INSTITUTIONS_INSTITUTIONADMIN" ADD CONSTRAINT "D30B7110A400F3BC4A87B3F55C4224" FOREIGN KEY ("INSTITUTION_ID")
	  REFERENCES "INSTITUTIONS_INSTITUTION" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table MESSAGE_USERMSGATTACHMENT
--------------------------------------------------------

  ALTER TABLE "MESSAGE_USERMSGATTACHMENT" ADD CONSTRAINT "D264DEBB373EBBE8EA66D911FB06D5" FOREIGN KEY ("USER_MSG_ID")
	  REFERENCES "MESSAGE_USERMESSAGE" ("MESSAGE_ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
  ALTER TABLE "MESSAGE_USERMSGATTACHMENT" ADD CONSTRAINT "D7660A1DD0C70FC07F97FD114B48D4" FOREIGN KEY ("PRIV_FILE_DIR_SHARE_ID")
	  REFERENCES "SHARE_PRIVATEFILEDIRSHARE" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table POST_OFFICE_ATTACHMENT_EMAILS
--------------------------------------------------------

  ALTER TABLE "POST_OFFICE_ATTACHMENT_EMAILS" ADD CONSTRAINT "BDE40FCCED42FB8741DF331449A015" FOREIGN KEY ("EMAIL_ID")
	  REFERENCES "POST_OFFICE_EMAIL" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
  ALTER TABLE "POST_OFFICE_ATTACHMENT_EMAILS" ADD CONSTRAINT "D3937EF63F9E2AFED0117BD2B2B64B" FOREIGN KEY ("ATTACHMENT_ID")
	  REFERENCES "POST_OFFICE_ATTACHMENT" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table POST_OFFICE_EMAIL
--------------------------------------------------------

  ALTER TABLE "POST_OFFICE_EMAIL" ADD CONSTRAINT "D1ACABD4A4C9D137C464A3757D5C0D" FOREIGN KEY ("TEMPLATE_ID")
	  REFERENCES "POST_OFFICE_EMAILTEMPLATE" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table POST_OFFICE_EMAILTEMPLATE
--------------------------------------------------------

  ALTER TABLE "POST_OFFICE_EMAILTEMPLATE" ADD CONSTRAINT "A89EFC0CAC9BCF61E78054A3CF6C99" FOREIGN KEY ("DEFAULT_TEMPLATE_ID")
	  REFERENCES "POST_OFFICE_EMAILTEMPLATE" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table POST_OFFICE_LOG
--------------------------------------------------------

  ALTER TABLE "POST_OFFICE_LOG" ADD CONSTRAINT "D8ECEA069FFDCFAB2262016E237771" FOREIGN KEY ("EMAIL_ID")
	  REFERENCES "POST_OFFICE_EMAIL" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table SHARE_ORGFILESHARE
--------------------------------------------------------

  ALTER TABLE "SHARE_ORGFILESHARE" ADD CONSTRAINT "D6FEC6D55701908211F0BB25A7B212" FOREIGN KEY ("FILE_SHARE_ID")
	  REFERENCES "SHARE_FILESHARE" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table TERMSANDCONDITIONS_USERTERF56C
--------------------------------------------------------

  ALTER TABLE "TERMSANDCONDITIONS_USERTERF56C" ADD CONSTRAINT "D2272A698BFB055DBD76C7326B360B" FOREIGN KEY ("TERMS_ID")
	  REFERENCES "TERMSANDCONDITIONS_TERMSAN0233" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table TWO_FACTOR_STATICTOKEN
--------------------------------------------------------

  ALTER TABLE "TWO_FACTOR_STATICTOKEN" ADD CONSTRAINT "D972B9A8ABECC9BD2550E36848B483" FOREIGN KEY ("DEVICE_ID")
	  REFERENCES "TWO_FACTOR_STATICDEVICE" ("ID") DEFERRABLE INITIALLY DEFERRED ENABLE;
