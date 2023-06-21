
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `abuse_reports_abusereport` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reporter` longtext DEFAULT NULL,
  `repo_id` varchar(36) NOT NULL,
  `repo_name` varchar(255) NOT NULL,
  `file_path` longtext DEFAULT NULL,
  `abuse_type` varchar(255) NOT NULL,
  `description` longtext DEFAULT NULL,
  `handled` tinyint(1) NOT NULL,
  `time` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `abuse_reports_abusereport_abuse_type_703d5335` (`abuse_type`),
  KEY `abuse_reports_abusereport_handled_94b8304c` (`handled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `abuse_reports_abusereport` DISABLE KEYS */;
/*!40000 ALTER TABLE `abuse_reports_abusereport` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_log_adminlog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(254) NOT NULL,
  `operation` varchar(255) NOT NULL,
  `detail` longtext NOT NULL,
  `datetime` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_log_adminlog_email_7213c993` (`email`),
  KEY `admin_log_adminlog_operation_4bad7bd1` (`operation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `admin_log_adminlog` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_log_adminlog` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `api2_token` (
  `key` varchar(40) NOT NULL,
  `user` varchar(255) NOT NULL,
  `created` datetime NOT NULL,
  PRIMARY KEY (`key`),
  UNIQUE KEY `user` (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `api2_token` DISABLE KEYS */;
/*!40000 ALTER TABLE `api2_token` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `api2_tokenv2` (
  `key` varchar(40) NOT NULL,
  `user` varchar(255) NOT NULL,
  `platform` varchar(32) NOT NULL,
  `device_id` varchar(40) NOT NULL,
  `device_name` varchar(40) NOT NULL,
  `platform_version` varchar(16) NOT NULL,
  `client_version` varchar(16) NOT NULL,
  `last_accessed` datetime NOT NULL,
  `last_login_ip` char(39) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `wiped_at` datetime DEFAULT NULL,
  PRIMARY KEY (`key`),
  UNIQUE KEY `api2_tokenv2_user_platform_device_id_37005c24_uniq` (`user`,`platform`,`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

ALTER TABLE `api2_tokenv2` CHANGE COLUMN `device_name` `device_name` varchar(40) CHARACTER SET 'utf8mb4' COLLATE utf8mb4_unicode_ci NOT NULL;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `api2_tokenv2` DISABLE KEYS */;
/*!40000 ALTER TABLE `api2_tokenv2` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_group` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `auth_group` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_group_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `auth_group_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group_permissions` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `content_type_id` int(11) NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=239 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` VALUES (1,'Can add content type',1,'add_contenttype'),(2,'Can change content type',1,'change_contenttype'),(3,'Can delete content type',1,'delete_contenttype'),(4,'Can change config',2,'change_config'),(5,'Can add session',3,'add_session'),(6,'Can change session',3,'change_session'),(7,'Can delete session',3,'delete_session'),(8,'Can add client login token',4,'add_clientlogintoken'),(9,'Can change client login token',4,'change_clientlogintoken'),(10,'Can delete client login token',4,'delete_clientlogintoken'),(11,'Can add commands last check',5,'add_commandslastcheck'),(12,'Can change commands last check',5,'change_commandslastcheck'),(13,'Can delete commands last check',5,'delete_commandslastcheck'),(14,'Can add device token',6,'add_devicetoken'),(15,'Can change device token',6,'change_devicetoken'),(16,'Can delete device token',6,'delete_devicetoken'),(17,'Can add file comment',7,'add_filecomment'),(18,'Can change file comment',7,'change_filecomment'),(19,'Can delete file comment',7,'delete_filecomment'),(20,'Can add file discuss',8,'add_filediscuss'),(21,'Can change file discuss',8,'change_filediscuss'),(22,'Can delete file discuss',8,'delete_filediscuss'),(23,'Can add group enabled module',9,'add_groupenabledmodule'),(24,'Can change group enabled module',9,'change_groupenabledmodule'),(25,'Can delete group enabled module',9,'delete_groupenabledmodule'),(26,'Can add inner pub msg',10,'add_innerpubmsg'),(27,'Can change inner pub msg',10,'change_innerpubmsg'),(28,'Can delete inner pub msg',10,'delete_innerpubmsg'),(29,'Can add inner pub msg reply',11,'add_innerpubmsgreply'),(30,'Can change inner pub msg reply',11,'change_innerpubmsgreply'),(31,'Can delete inner pub msg reply',11,'delete_innerpubmsgreply'),(32,'Can add user enabled module',12,'add_userenabledmodule'),(33,'Can change user enabled module',12,'change_userenabledmodule'),(34,'Can delete user enabled module',12,'delete_userenabledmodule'),(35,'Can add user last login',13,'add_userlastlogin'),(36,'Can change user last login',13,'change_userlastlogin'),(37,'Can delete user last login',13,'delete_userlastlogin'),(38,'Can add user starred files',14,'add_userstarredfiles'),(39,'Can change user starred files',14,'change_userstarredfiles'),(40,'Can delete user starred files',14,'delete_userstarredfiles'),(41,'Can add repo secret key',15,'add_reposecretkey'),(42,'Can change repo secret key',15,'change_reposecretkey'),(43,'Can delete repo secret key',15,'delete_reposecretkey'),(44,'Can add permission',16,'add_permission'),(45,'Can change permission',16,'change_permission'),(46,'Can delete permission',16,'delete_permission'),(47,'Can add group',17,'add_group'),(48,'Can change group',17,'change_group'),(49,'Can delete group',17,'delete_group'),(50,'Can add user',18,'add_user'),(51,'Can change user',18,'change_user'),(52,'Can delete user',18,'delete_user'),(53,'Can add registration profile',19,'add_registrationprofile'),(54,'Can change registration profile',19,'change_registrationprofile'),(55,'Can delete registration profile',19,'delete_registrationprofile'),(56,'Can add captcha store',20,'add_captchastore'),(57,'Can change captcha store',20,'change_captchastore'),(58,'Can delete captcha store',20,'delete_captchastore'),(59,'Can add constance',21,'add_constance'),(60,'Can change constance',21,'change_constance'),(61,'Can delete constance',21,'delete_constance'),(62,'Can add Attachment',22,'add_attachment'),(63,'Can change Attachment',22,'change_attachment'),(64,'Can delete Attachment',22,'delete_attachment'),(65,'Can add Email',23,'add_email'),(66,'Can change Email',23,'change_email'),(67,'Can delete Email',23,'delete_email'),(68,'Can add Email Template',24,'add_emailtemplate'),(69,'Can change Email Template',24,'change_emailtemplate'),(70,'Can delete Email Template',24,'delete_emailtemplate'),(71,'Can add Log',25,'add_log'),(72,'Can change Log',25,'change_log'),(73,'Can delete Log',25,'delete_log'),(74,'Can add Terms and Conditions',26,'add_termsandconditions'),(75,'Can change Terms and Conditions',26,'change_termsandconditions'),(76,'Can delete Terms and Conditions',26,'delete_termsandconditions'),(77,'Can add User Terms and Conditions',27,'add_usertermsandconditions'),(78,'Can change User Terms and Conditions',27,'change_usertermsandconditions'),(79,'Can delete User Terms and Conditions',27,'delete_usertermsandconditions'),(80,'Can add token',28,'add_token'),(81,'Can change token',28,'change_token'),(82,'Can delete token',28,'delete_token'),(83,'Can add token v2',29,'add_tokenv2'),(84,'Can change token v2',29,'change_tokenv2'),(85,'Can delete token v2',29,'delete_tokenv2'),(86,'Can add avatar',30,'add_avatar'),(87,'Can change avatar',30,'change_avatar'),(88,'Can delete avatar',30,'delete_avatar'),(89,'Can add group avatar',31,'add_groupavatar'),(90,'Can change group avatar',31,'change_groupavatar'),(91,'Can delete group avatar',31,'delete_groupavatar'),(92,'Can add contact',32,'add_contact'),(93,'Can change contact',32,'change_contact'),(94,'Can delete contact',32,'delete_contact'),(95,'Can add draft',33,'add_draft'),(96,'Can change draft',33,'change_draft'),(97,'Can delete draft',33,'delete_draft'),(98,'Can add draft reviewer',34,'add_draftreviewer'),(99,'Can change draft reviewer',34,'change_draftreviewer'),(100,'Can delete draft reviewer',34,'delete_draftreviewer'),(101,'Can add institution',35,'add_institution'),(102,'Can change institution',35,'change_institution'),(103,'Can delete institution',35,'delete_institution'),(104,'Can add institution admin',36,'add_institutionadmin'),(105,'Can change institution admin',36,'change_institutionadmin'),(106,'Can delete institution admin',36,'delete_institutionadmin'),(107,'Can add institution quota',37,'add_institutionquota'),(108,'Can change institution quota',37,'change_institutionquota'),(109,'Can delete institution quota',37,'delete_institutionquota'),(110,'Can add invitation',38,'add_invitation'),(111,'Can change invitation',38,'change_invitation'),(112,'Can delete invitation',38,'delete_invitation'),(113,'Can add group wiki',39,'add_groupwiki'),(114,'Can change group wiki',39,'change_groupwiki'),(115,'Can delete group wiki',39,'delete_groupwiki'),(116,'Can add personal wiki',40,'add_personalwiki'),(117,'Can change personal wiki',40,'change_personalwiki'),(118,'Can delete personal wiki',40,'delete_personalwiki'),(119,'Can add wiki',41,'add_wiki'),(120,'Can change wiki',41,'change_wiki'),(121,'Can delete wiki',41,'delete_wiki'),(122,'Can add notification',42,'add_notification'),(123,'Can change notification',42,'change_notification'),(124,'Can delete notification',42,'delete_notification'),(125,'Can add user notification',43,'add_usernotification'),(126,'Can change user notification',43,'change_usernotification'),(127,'Can delete user notification',43,'delete_usernotification'),(128,'Can add user options',44,'add_useroptions'),(129,'Can change user options',44,'change_useroptions'),(130,'Can delete user options',44,'delete_useroptions'),(131,'Can add detailed profile',45,'add_detailedprofile'),(132,'Can change detailed profile',45,'change_detailedprofile'),(133,'Can delete detailed profile',45,'delete_detailedprofile'),(134,'Can add profile',46,'add_profile'),(135,'Can change profile',46,'change_profile'),(136,'Can delete profile',46,'delete_profile'),(137,'Can add anonymous share',47,'add_anonymousshare'),(138,'Can change anonymous share',47,'change_anonymousshare'),(139,'Can delete anonymous share',47,'delete_anonymousshare'),(140,'Can add extra groups share permission',48,'add_extragroupssharepermission'),(141,'Can change extra groups share permission',48,'change_extragroupssharepermission'),(142,'Can delete extra groups share permission',48,'delete_extragroupssharepermission'),(143,'Can add extra share permission',49,'add_extrasharepermission'),(144,'Can change extra share permission',49,'change_extrasharepermission'),(145,'Can delete extra share permission',49,'delete_extrasharepermission'),(146,'Can add file share',50,'add_fileshare'),(147,'Can change file share',50,'change_fileshare'),(148,'Can delete file share',50,'delete_fileshare'),(149,'Can add org file share',51,'add_orgfileshare'),(150,'Can change org file share',51,'change_orgfileshare'),(151,'Can delete org file share',51,'delete_orgfileshare'),(152,'Can add private file dir share',52,'add_privatefiledirshare'),(153,'Can change private file dir share',52,'change_privatefiledirshare'),(154,'Can delete private file dir share',52,'delete_privatefiledirshare'),(155,'Can add upload link share',53,'add_uploadlinkshare'),(156,'Can change upload link share',53,'change_uploadlinkshare'),(157,'Can delete upload link share',53,'delete_uploadlinkshare'),(158,'Can add admin log',54,'add_adminlog'),(159,'Can change admin log',54,'change_adminlog'),(160,'Can delete admin log',54,'delete_adminlog'),(161,'Can add file tag',55,'add_filetag'),(162,'Can change file tag',55,'change_filetag'),(163,'Can delete file tag',55,'delete_filetag'),(164,'Can add file uuid map',56,'add_fileuuidmap'),(165,'Can change file uuid map',56,'change_fileuuidmap'),(166,'Can delete file uuid map',56,'delete_fileuuidmap'),(167,'Can add tags',57,'add_tags'),(168,'Can change tags',57,'change_tags'),(169,'Can delete tags',57,'delete_tags'),(170,'Can add revision tags',58,'add_revisiontags'),(171,'Can change revision tags',58,'change_revisiontags'),(172,'Can delete revision tags',58,'delete_revisiontags'),(173,'Can add tags',59,'add_tags'),(174,'Can change tags',59,'change_tags'),(175,'Can delete tags',59,'delete_tags'),(176,'Can add phone device',60,'add_phonedevice'),(177,'Can change phone device',60,'change_phonedevice'),(178,'Can delete phone device',60,'delete_phonedevice'),(179,'Can add static device',61,'add_staticdevice'),(180,'Can change static device',61,'change_staticdevice'),(181,'Can delete static device',61,'delete_staticdevice'),(182,'Can add static token',62,'add_statictoken'),(183,'Can change static token',62,'change_statictoken'),(184,'Can delete static token',62,'delete_statictoken'),(185,'Can add TOTP device',63,'add_totpdevice'),(186,'Can change TOTP device',63,'change_totpdevice'),(187,'Can delete TOTP device',63,'delete_totpdevice'),(188,'Can add admin role',64,'add_adminrole'),(189,'Can change admin role',64,'change_adminrole'),(190,'Can delete admin role',64,'delete_adminrole'),(191,'Can add trusted ip',65,'add_trustedip'),(192,'Can change trusted ip',65,'change_trustedip'),(193,'Can delete trusted ip',65,'delete_trustedip'),(194,'Can add repo tags',66,'add_repotags'),(195,'Can change repo tags',66,'change_repotags'),(196,'Can delete repo tags',66,'delete_repotags'),(197,'Can add file tags',67,'add_filetags'),(198,'Can change file tags',67,'change_filetags'),(199,'Can delete file tags',67,'delete_filetags'),(200,'Can add related files',68,'add_relatedfiles'),(201,'Can change related files',68,'change_relatedfiles'),(202,'Can delete related files',68,'delete_relatedfiles'),(203,'Can add file participant',69,'add_fileparticipant'),(204,'Can change file participant',69,'change_fileparticipant'),(205,'Can delete file participant',69,'delete_fileparticipant'),(206,'Can add repo api tokens',70,'add_repoapitokens'),(207,'Can change repo api tokens',70,'change_repoapitokens'),(208,'Can delete repo api tokens',70,'delete_repoapitokens'),(209,'Can add abuse report',71,'add_abusereport'),(210,'Can change abuse report',71,'change_abusereport'),(211,'Can delete abuse report',71,'delete_abusereport'),(212,'Can add user login log',72,'add_userloginlog'),(213,'Can change user login log',72,'change_userloginlog'),(214,'Can delete user login log',72,'delete_userloginlog'),(215,'Can add org member quota',73,'add_orgmemberquota'),(216,'Can change org member quota',73,'change_orgmemberquota'),(217,'Can delete org member quota',73,'delete_orgmemberquota'),(218,'Can add org settings',74,'add_orgsettings'),(219,'Can change org settings',74,'change_orgsettings'),(220,'Can delete org settings',74,'delete_orgsettings'),(221,'Can add proxy granting ticket',75,'add_proxygrantingticket'),(222,'Can change proxy granting ticket',75,'change_proxygrantingticket'),(223,'Can delete proxy granting ticket',75,'delete_proxygrantingticket'),(224,'Can add session ticket',76,'add_sessionticket'),(225,'Can change session ticket',76,'change_sessionticket'),(226,'Can delete session ticket',76,'delete_sessionticket'),(227,'Can add user plan',77,'add_userplan'),(228,'Can change user plan',77,'change_userplan'),(229,'Can delete user plan',77,'delete_userplan'),(230,'Can add org plan',78,'add_orgplan'),(231,'Can change org plan',78,'change_orgplan'),(232,'Can delete org plan',78,'delete_orgplan'),(233,'Can add social auth user',79,'add_socialauthuser'),(234,'Can change social auth user',79,'change_socialauthuser'),(235,'Can delete social auth user',79,'delete_socialauthuser'),(236,'Can add repo share invitation',80,'add_reposhareinvitation'),(237,'Can change repo share invitation',80,'change_reposhareinvitation'),(238,'Can delete repo share invitation',80,'delete_reposhareinvitation');
/*!40000 ALTER TABLE `auth_permission` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `password` varchar(128) NOT NULL,
  `last_login` datetime DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(150) NOT NULL,
  `first_name` varchar(30) NOT NULL,
  `last_name` varchar(30) NOT NULL,
  `email` varchar(254) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `auth_user` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_user` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_user_groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_user_groups_user_id_group_id_94350c0c_uniq` (`user_id`,`group_id`),
  KEY `auth_user_groups_group_id_97559544_fk_auth_group_id` (`group_id`),
  CONSTRAINT `auth_user_groups_group_id_97559544_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  CONSTRAINT `auth_user_groups_user_id_6a12ed8b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `auth_user_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_user_groups` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_user_user_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_user_user_permissions_user_id_permission_id_14a6b632_uniq` (`user_id`,`permission_id`),
  KEY `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `auth_user_user_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_user_user_permissions` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `avatar_avatar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `emailuser` varchar(255) NOT NULL,
  `primary` tinyint(1) NOT NULL,
  `avatar` varchar(1024) NOT NULL,
  `date_uploaded` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `avatar_avatar` DISABLE KEYS */;
/*!40000 ALTER TABLE `avatar_avatar` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `avatar_groupavatar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` varchar(255) NOT NULL,
  `avatar` varchar(1024) NOT NULL,
  `date_uploaded` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `avatar_groupavatar` DISABLE KEYS */;
/*!40000 ALTER TABLE `avatar_groupavatar` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `base_clientlogintoken` (
  `token` varchar(32) NOT NULL,
  `username` varchar(255) NOT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`token`),
  KEY `base_clientlogintoken_username_4ad5d42c` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `base_clientlogintoken` DISABLE KEYS */;
/*!40000 ALTER TABLE `base_clientlogintoken` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `base_commandslastcheck` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `command_type` varchar(100) NOT NULL,
  `last_check` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `base_commandslastcheck` DISABLE KEYS */;
/*!40000 ALTER TABLE `base_commandslastcheck` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `base_devicetoken` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(80) NOT NULL,
  `user` varchar(255) NOT NULL,
  `platform` varchar(32) NOT NULL,
  `version` varchar(16) NOT NULL,
  `pversion` varchar(16) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `base_devicetoken_token_user_38535636_uniq` (`token`,`user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `base_devicetoken` DISABLE KEYS */;
/*!40000 ALTER TABLE `base_devicetoken` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `base_filecomment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `author` varchar(255) NOT NULL,
  `comment` longtext NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `uuid_id` char(32) NOT NULL,
  `detail` longtext NOT NULL,
  `resolved` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `base_filecomment_uuid_id_4f9a2ca2_fk_tags_fileuuidmap_uuid` (`uuid_id`),
  KEY `base_filecomment_author_8a4d7e91` (`author`),
  KEY `base_filecomment_resolved_e0717eca` (`resolved`),
  CONSTRAINT `base_filecomment_uuid_id_4f9a2ca2_fk_tags_fileuuidmap_uuid` FOREIGN KEY (`uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `base_filecomment` DISABLE KEYS */;
/*!40000 ALTER TABLE `base_filecomment` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `base_reposecretkey` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `secret_key` varchar(44) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `base_reposecretkey` DISABLE KEYS */;
/*!40000 ALTER TABLE `base_reposecretkey` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `base_userlastlogin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `last_login` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `base_userlastlogin_username_270de06f` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `base_userlastlogin` DISABLE KEYS */;
/*!40000 ALTER TABLE `base_userlastlogin` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `base_userstarredfiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(254) NOT NULL,
  `org_id` int(11) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `path` longtext NOT NULL,
  `is_dir` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `base_userstarredfiles_email_29e69053` (`email`),
  KEY `base_userstarredfiles_repo_id_f5ecc00a` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `base_userstarredfiles` DISABLE KEYS */;
/*!40000 ALTER TABLE `base_userstarredfiles` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `captcha_captchastore` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `challenge` varchar(32) NOT NULL,
  `response` varchar(32) NOT NULL,
  `hashkey` varchar(40) NOT NULL,
  `expiration` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hashkey` (`hashkey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `captcha_captchastore` DISABLE KEYS */;
/*!40000 ALTER TABLE `captcha_captchastore` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `constance_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `constance_key` varchar(255) NOT NULL,
  `value` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `constance_key` (`constance_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `constance_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `constance_config` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contacts_contact` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_email` varchar(255) NOT NULL,
  `contact_email` varchar(255) NOT NULL,
  `contact_name` varchar(255) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `contacts_contact_user_email_149035d4` (`user_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `contacts_contact` DISABLE KEYS */;
/*!40000 ALTER TABLE `contacts_contact` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_cas_ng_proxygrantingticket` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_key` varchar(255) DEFAULT NULL,
  `pgtiou` varchar(255) DEFAULT NULL,
  `pgt` varchar(255) DEFAULT NULL,
  `date` datetime NOT NULL,
  `user` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_cas_ng_proxygrant_session_key_user_id_4cd2ea19_uniq` (`session_key`,`user`),
  KEY `django_cas_ng_proxyg_user_id_f833edd2_fk_auth_user` (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `django_cas_ng_proxygrantingticket` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_cas_ng_proxygrantingticket` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_cas_ng_sessionticket` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_key` varchar(255) NOT NULL,
  `ticket` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `django_cas_ng_sessionticket` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_cas_ng_sessionticket` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_content_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `django_content_type` DISABLE KEYS */;
INSERT INTO `django_content_type` VALUES (71,'abuse_reports','abusereport'),(54,'admin_log','adminlog'),(28,'api2','token'),(29,'api2','tokenv2'),(17,'auth','group'),(16,'auth','permission'),(18,'auth','user'),(30,'avatar','avatar'),(31,'avatar','groupavatar'),(4,'base','clientlogintoken'),(5,'base','commandslastcheck'),(6,'base','devicetoken'),(7,'base','filecomment'),(8,'base','filediscuss'),(9,'base','groupenabledmodule'),(10,'base','innerpubmsg'),(11,'base','innerpubmsgreply'),(15,'base','reposecretkey'),(79,'base','socialauthuser'),(12,'base','userenabledmodule'),(13,'base','userlastlogin'),(14,'base','userstarredfiles'),(20,'captcha','captchastore'),(2,'constance','config'),(32,'contacts','contact'),(1,'contenttypes','contenttype'),(21,'database','constance'),(75,'django_cas_ng','proxygrantingticket'),(76,'django_cas_ng','sessionticket'),(33,'drafts','draft'),(34,'drafts','draftreviewer'),(69,'file_participants','fileparticipant'),(67,'file_tags','filetags'),(35,'institutions','institution'),(36,'institutions','institutionadmin'),(37,'institutions','institutionquota'),(38,'invitations','invitation'),(80,'invitations','reposhareinvitation'),(42,'notifications','notification'),(43,'notifications','usernotification'),(44,'options','useroptions'),(73,'organizations','orgmemberquota'),(74,'organizations','orgsettings'),(78,'plan','orgplan'),(77,'plan','userplan'),(22,'post_office','attachment'),(23,'post_office','email'),(24,'post_office','emailtemplate'),(25,'post_office','log'),(45,'profile','detailedprofile'),(46,'profile','profile'),(19,'registration','registrationprofile'),(68,'related_files','relatedfiles'),(70,'repo_api_tokens','repoapitokens'),(66,'repo_tags','repotags'),(58,'revision_tag','revisiontags'),(59,'revision_tag','tags'),(64,'role_permissions','adminrole'),(3,'sessions','session'),(47,'share','anonymousshare'),(48,'share','extragroupssharepermission'),(49,'share','extrasharepermission'),(50,'share','fileshare'),(51,'share','orgfileshare'),(52,'share','privatefiledirshare'),(53,'share','uploadlinkshare'),(72,'sysadmin_extra','userloginlog'),(55,'tags','filetag'),(56,'tags','fileuuidmap'),(57,'tags','tags'),(26,'termsandconditions','termsandconditions'),(27,'termsandconditions','usertermsandconditions'),(65,'trusted_ip','trustedip'),(60,'two_factor','phonedevice'),(61,'two_factor','staticdevice'),(62,'two_factor','statictoken'),(63,'two_factor','totpdevice'),(39,'wiki','groupwiki'),(40,'wiki','personalwiki'),(41,'wiki','wiki');
/*!40000 ALTER TABLE `django_content_type` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `django_migrations` DISABLE KEYS */;
INSERT INTO `django_migrations` VALUES (1,'abuse_reports','0001_initial','2019-11-25 14:33:59.365443'),(2,'admin_log','0001_initial','2019-11-25 14:33:59.469182'),(3,'api2','0001_initial','2019-11-25 14:33:59.693836'),(4,'contenttypes','0001_initial','2019-11-25 14:33:59.777749'),(5,'contenttypes','0002_remove_content_type_name','2019-11-25 14:33:59.858901'),(6,'auth','0001_initial','2019-11-25 14:34:00.633824'),(7,'auth','0002_alter_permission_name_max_length','2019-11-25 14:34:00.680928'),(8,'auth','0003_alter_user_email_max_length','2019-11-25 14:34:00.733661'),(9,'auth','0004_alter_user_username_opts','2019-11-25 14:34:00.752616'),(10,'auth','0005_alter_user_last_login_null','2019-11-25 14:34:00.801604'),(11,'auth','0006_require_contenttypes_0002','2019-11-25 14:34:00.810103'),(12,'auth','0007_alter_validators_add_error_messages','2019-11-25 14:34:00.825053'),(13,'auth','0008_alter_user_username_max_length','2019-11-25 14:34:00.890617'),(14,'avatar','0001_initial','2019-11-25 14:34:01.063878'),(15,'tags','0001_initial','2019-11-25 14:34:01.557738'),(16,'group','0001_initial','2019-11-25 14:34:02.025435'),(17,'base','0001_initial','2019-11-25 14:34:03.226703'),(18,'base','0002_reposecretkey','2019-11-25 14:34:03.319120'),(19,'base','0003_auto_20181016_1242','2019-11-25 14:34:03.417627'),(20,'captcha','0001_initial','2019-11-25 14:34:03.542585'),(21,'contacts','0001_initial','2019-11-25 14:34:03.652793'),(22,'database','0001_initial','2019-11-25 14:34:03.725390'),(23,'database','0002_auto_20190129_2304','2019-11-25 14:34:03.776378'),(24,'django_cas_ng','0001_initial','2019-11-25 14:34:04.033039'),(25,'django_cas_ng','0002_auto_20180410_0948','2019-11-25 14:34:04.169581'),(26,'drafts','0001_initial','2019-11-25 14:34:10.856324'),(27,'drafts','0002_draftreview_author','2019-11-25 14:34:10.929413'),(28,'drafts','0003_auto_20190301_0648','2019-11-25 14:34:11.432905'),(29,'drafts','0004_auto_20190610_0628','2019-11-25 14:34:11.577308'),(30,'file_participants','0001_initial','2019-11-25 14:34:11.763284'),(31,'repo_tags','0001_initial','2019-11-25 14:34:11.903061'),(32,'file_tags','0001_initial','2019-11-25 14:34:12.191192'),(33,'file_tags','0002_remove_filetags_parent_folder_uuid','2019-11-25 14:34:12.272233'),(34,'institutions','0001_initial','2019-11-25 14:34:12.508609'),(35,'institutions','0002_institutionquota','2019-11-25 14:34:12.666828'),(36,'institutions','0003_auto_20180426_0710','2019-11-25 14:34:12.713231'),(37,'invitations','0001_initial','2019-11-25 14:34:12.865889'),(38,'invitations','0002_invitation_invite_type','2019-11-25 14:34:12.922193'),(39,'invitations','0003_auto_20160510_1703','2019-11-25 14:34:12.982345'),(40,'invitations','0004_auto_20160629_1610','2019-11-25 14:34:13.064011'),(41,'invitations','0005_auto_20160629_1614','2019-11-25 14:34:13.096590'),(42,'notifications','0001_initial','2019-11-25 14:34:13.310594'),(43,'notifications','0002_auto_20180426_0710','2019-11-25 14:34:13.355493'),(44,'notifications','0003_auto_20181115_0825','2019-11-25 14:34:13.404819'),(45,'options','0001_initial','2019-11-25 14:34:13.560917'),(46,'options','0002_auto_20181107_0811','2019-11-25 14:34:13.621244'),(47,'organizations','0001_initial','2019-11-25 14:34:13.735566'),(48,'organizations','0002_orgsettings','2019-11-25 14:34:13.846286'),(49,'organizations','0003_auto_20190116_0323','2019-11-25 14:34:13.891216'),(50,'post_office','0001_initial','2019-11-25 14:34:14.814213'),(51,'post_office','0002_add_i18n_and_backend_alias','2019-11-25 14:34:15.077736'),(52,'post_office','0003_longer_subject','2019-11-25 14:34:15.116500'),(53,'post_office','0004_auto_20160607_0901','2019-11-25 14:34:15.488007'),(54,'post_office','0005_auto_20170515_0013','2019-11-25 14:34:15.531781'),(55,'post_office','0006_attachment_mimetype','2019-11-25 14:34:15.590856'),(56,'post_office','0007_auto_20170731_1342','2019-11-25 14:34:15.622814'),(57,'post_office','0008_attachment_headers','2019-11-25 14:34:15.675049'),(58,'profile','0001_initial','2019-11-25 14:34:15.884625'),(59,'profile','0002_auto_20190122_0225','2019-11-25 14:34:15.922660'),(60,'registration','0001_initial','2019-11-25 14:34:16.012897'),(61,'related_files','0001_initial','2019-11-25 14:34:16.156173'),(62,'repo_api_tokens','0001_initial','2019-11-25 14:34:16.290298'),(63,'revision_tag','0001_initial','2019-11-25 14:34:16.522331'),(64,'role_permissions','0001_initial','2019-11-25 14:34:16.607236'),(65,'sessions','0001_initial','2019-11-25 14:34:16.695390'),(66,'share','0001_initial','2019-11-25 14:34:17.428416'),(67,'sysadmin_extra','0001_initial','2019-11-25 14:34:17.556464'),(68,'termsandconditions','0001_initial','2019-11-25 14:34:17.895240'),(69,'trusted_ip','0001_initial','2019-11-25 14:34:17.991415'),(70,'two_factor','0001_initial','2019-11-25 14:34:18.432226'),(71,'wiki','0001_initial','2019-11-25 14:34:18.609279'),(72,'wiki','0002_auto_20180326_0548','2019-11-25 14:34:18.797942'),(73,'wiki','0003_auto_20180428_0619','2019-11-25 14:34:18.851746'),(74,'base','0004_auto_20191125_1555','2019-11-25 15:57:10.821867'),(75,'contacts','0002_auto_20191125_1555','2019-11-25 15:57:10.842151'),(76,'group','0002_auto_20191125_1555','2019-11-25 15:57:10.966529'),(77,'invitations','0006_reposhareinvitation','2019-11-25 15:57:11.090331'),(78,'notifications','0004_auto_20191125_1555','2019-11-25 15:57:11.106563'),(79,'profile','0003_auto_20191125_1555','2019-11-25 15:57:11.124521'),(80,'revision_tag','0002_auto_20191125_1555','2019-11-25 15:57:11.142928'),(81,'share','0002_auto_20191125_1555','2019-11-25 15:57:11.176538'),(82,'termsandconditions','0002_auto_20191125_1555','2019-11-25 15:57:11.231421'),(83,'wiki','0004_auto_20191125_1555','2019-11-25 15:57:11.266350');
/*!40000 ALTER TABLE `django_migrations` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `django_session` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_session` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `drafts_draft` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `username` varchar(255) NOT NULL,
  `origin_repo_id` varchar(36) NOT NULL,
  `origin_file_version` varchar(100) NOT NULL,
  `draft_file_path` varchar(1024) NOT NULL,
  `origin_file_uuid` char(32) NOT NULL,
  `publish_file_version` varchar(100) DEFAULT NULL,
  `status` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `drafts_draft_origin_file_uuid_7c003c98_uniq` (`origin_file_uuid`),
  KEY `drafts_draft_created_at_e9f4523f` (`created_at`),
  KEY `drafts_draft_updated_at_0a144b05` (`updated_at`),
  KEY `drafts_draft_username_73e6738b` (`username`),
  KEY `drafts_draft_origin_repo_id_8978ca2c` (`origin_repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `drafts_draft` DISABLE KEYS */;
/*!40000 ALTER TABLE `drafts_draft` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `drafts_draftreviewer` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reviewer` varchar(255) NOT NULL,
  `draft_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `drafts_draftreviewer_reviewer_e4c777ac` (`reviewer`),
  KEY `drafts_draftreviewer_draft_id_4ea59775_fk_drafts_draft_id` (`draft_id`),
  CONSTRAINT `drafts_draftreviewer_draft_id_4ea59775_fk_drafts_draft_id` FOREIGN KEY (`draft_id`) REFERENCES `drafts_draft` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `drafts_draftreviewer` DISABLE KEYS */;
/*!40000 ALTER TABLE `drafts_draftreviewer` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `file_participants_fileparticipant` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `uuid_id` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `file_participants_fileparticipant_uuid_id_username_c747dd36_uniq` (`uuid_id`,`username`),
  CONSTRAINT `file_participants_fi_uuid_id_861b7339_fk_tags_file` FOREIGN KEY (`uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `file_participants_fileparticipant` DISABLE KEYS */;
/*!40000 ALTER TABLE `file_participants_fileparticipant` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `file_tags_filetags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file_uuid_id` char(32) NOT NULL,
  `repo_tag_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `file_tags_filetags_file_uuid_id_e30f0ec8_fk_tags_file` (`file_uuid_id`),
  KEY `file_tags_filetags_repo_tag_id_c39660cb_fk_repo_tags_repotags_id` (`repo_tag_id`),
  CONSTRAINT `file_tags_filetags_file_uuid_id_e30f0ec8_fk_tags_file` FOREIGN KEY (`file_uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`),
  CONSTRAINT `file_tags_filetags_repo_tag_id_c39660cb_fk_repo_tags_repotags_id` FOREIGN KEY (`repo_tag_id`) REFERENCES `repo_tags_repotags` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `file_tags_filetags` DISABLE KEYS */;
/*!40000 ALTER TABLE `file_tags_filetags` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `institutions_institution` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `create_time` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `institutions_institution` DISABLE KEYS */;
/*!40000 ALTER TABLE `institutions_institution` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `institutions_institutionadmin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `institution_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `institutions_institu_institution_id_1e9bb58b_fk_instituti` (`institution_id`),
  KEY `institutions_institutionadmin_user_c71d766d` (`user`),
  CONSTRAINT `institutions_institu_institution_id_1e9bb58b_fk_instituti` FOREIGN KEY (`institution_id`) REFERENCES `institutions_institution` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `institutions_institutionadmin` DISABLE KEYS */;
/*!40000 ALTER TABLE `institutions_institutionadmin` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `institutions_institutionquota` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quota` bigint(20) NOT NULL,
  `institution_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `institutions_institu_institution_id_d23201d9_fk_instituti` (`institution_id`),
  CONSTRAINT `institutions_institu_institution_id_d23201d9_fk_instituti` FOREIGN KEY (`institution_id`) REFERENCES `institutions_institution` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `institutions_institutionquota` DISABLE KEYS */;
/*!40000 ALTER TABLE `institutions_institutionquota` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invitations_invitation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(40) NOT NULL,
  `inviter` varchar(255) NOT NULL,
  `accepter` varchar(255) NOT NULL,
  `invite_time` datetime NOT NULL,
  `accept_time` datetime DEFAULT NULL,
  `invite_type` varchar(20) NOT NULL,
  `expire_time` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invitations_invitation_inviter_b0a7b855` (`inviter`),
  KEY `invitations_invitation_token_25a92a38` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `invitations_invitation` DISABLE KEYS */;
/*!40000 ALTER TABLE `invitations_invitation` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications_notification` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message` varchar(512) NOT NULL,
  `primary` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_notification_primary_4f95ec21` (`primary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `notifications_notification` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications_notification` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications_usernotification` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `to_user` varchar(255) NOT NULL,
  `msg_type` varchar(30) NOT NULL,
  `detail` longtext NOT NULL,
  `timestamp` datetime NOT NULL,
  `seen` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_usernotification_to_user_6cadafa1` (`to_user`),
  KEY `notifications_usernotification_msg_type_985afd02` (`msg_type`),
  KEY `notifications_usernotification_timestamp_125067e8` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `notifications_usernotification` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications_usernotification` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `options_useroptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `option_key` varchar(50) NOT NULL,
  `option_val` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `options_useroptions_email_77d5726a` (`email`),
  KEY `options_useroptions_option_key_7bf7ae4b` (`option_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `options_useroptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `options_useroptions` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `organizations_orgmemberquota` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) NOT NULL,
  `quota` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `organizations_orgmemberquota_org_id_93dde51d` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `organizations_orgmemberquota` DISABLE KEYS */;
/*!40000 ALTER TABLE `organizations_orgmemberquota` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `organizations_orgsettings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) NOT NULL,
  `role` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organizations_orgsettings_org_id_630f6843_uniq` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `organizations_orgsettings` DISABLE KEYS */;
/*!40000 ALTER TABLE `organizations_orgsettings` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_office_attachment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `mimetype` varchar(255) NOT NULL,
  `headers` longtext DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `post_office_attachment` DISABLE KEYS */;
/*!40000 ALTER TABLE `post_office_attachment` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_office_attachment_emails` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `attachment_id` int(11) NOT NULL,
  `email_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `post_office_attachment_e_attachment_id_email_id_8e046917_uniq` (`attachment_id`,`email_id`),
  KEY `post_office_attachme_email_id_96875fd9_fk_post_offi` (`email_id`),
  CONSTRAINT `post_office_attachme_attachment_id_6136fd9a_fk_post_offi` FOREIGN KEY (`attachment_id`) REFERENCES `post_office_attachment` (`id`),
  CONSTRAINT `post_office_attachme_email_id_96875fd9_fk_post_offi` FOREIGN KEY (`email_id`) REFERENCES `post_office_email` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `post_office_attachment_emails` DISABLE KEYS */;
/*!40000 ALTER TABLE `post_office_attachment_emails` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_office_email` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_email` varchar(254) NOT NULL,
  `to` longtext NOT NULL,
  `cc` longtext NOT NULL,
  `bcc` longtext NOT NULL,
  `subject` varchar(989) NOT NULL,
  `message` longtext NOT NULL,
  `html_message` longtext NOT NULL,
  `status` smallint(5) unsigned DEFAULT NULL,
  `priority` smallint(5) unsigned DEFAULT NULL,
  `created` datetime NOT NULL,
  `last_updated` datetime NOT NULL,
  `scheduled_time` datetime DEFAULT NULL,
  `headers` longtext,
  `context` longtext,
  `template_id` int(11) DEFAULT NULL,
  `backend_alias` varchar(64) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `post_office_email_status_013a896c` (`status`),
  KEY `post_office_email_created_1306952f` (`created`),
  KEY `post_office_email_last_updated_0ffcec35` (`last_updated`),
  KEY `post_office_email_scheduled_time_3869ebec` (`scheduled_time`),
  KEY `post_office_email_template_id_417da7da_fk_post_offi` (`template_id`),
  CONSTRAINT `post_office_email_template_id_417da7da_fk_post_offi` FOREIGN KEY (`template_id`) REFERENCES `post_office_emailtemplate` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `post_office_email` DISABLE KEYS */;
/*!40000 ALTER TABLE `post_office_email` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_office_emailtemplate` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` longtext NOT NULL,
  `subject` varchar(255) NOT NULL,
  `content` longtext NOT NULL,
  `html_content` longtext NOT NULL,
  `created` datetime NOT NULL,
  `last_updated` datetime NOT NULL,
  `default_template_id` int(11) DEFAULT NULL,
  `language` varchar(12) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `post_office_emailtemplat_name_language_default_te_4023e3e4_uniq` (`name`,`language`,`default_template_id`),
  KEY `post_office_emailtem_default_template_id_2ac2f889_fk_post_offi` (`default_template_id`),
  CONSTRAINT `post_office_emailtem_default_template_id_2ac2f889_fk_post_offi` FOREIGN KEY (`default_template_id`) REFERENCES `post_office_emailtemplate` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `post_office_emailtemplate` DISABLE KEYS */;
/*!40000 ALTER TABLE `post_office_emailtemplate` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_office_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` datetime NOT NULL,
  `status` smallint(5) unsigned NOT NULL,
  `exception_type` varchar(255) NOT NULL,
  `message` longtext NOT NULL,
  `email_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `post_office_log_email_id_d42c8808_fk_post_office_email_id` (`email_id`),
  CONSTRAINT `post_office_log_email_id_d42c8808_fk_post_office_email_id` FOREIGN KEY (`email_id`) REFERENCES `post_office_email` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `post_office_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `post_office_log` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `profile_detailedprofile` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `department` varchar(512) NOT NULL,
  `telephone` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `profile_detailedprofile_user_612c11ba` (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `profile_detailedprofile` DISABLE KEYS */;
/*!40000 ALTER TABLE `profile_detailedprofile` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `profile_profile` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(254) NOT NULL,
  `nickname` varchar(64) NOT NULL,
  `intro` longtext NOT NULL,
  `lang_code` longtext,
  `login_id` varchar(225) DEFAULT NULL,
  `contact_email` varchar(225) DEFAULT NULL,
  `institution` varchar(225) DEFAULT NULL,
  `list_in_address_book` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user` (`user`),
  UNIQUE KEY `login_id` (`login_id`),
  UNIQUE KEY `profile_profile_contact_email_0975e4bf_uniq` (`contact_email`),
  KEY `profile_profile_institution_c0286bd1` (`institution`),
  KEY `profile_profile_list_in_address_book_b1009a78` (`list_in_address_book`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `profile_profile` DISABLE KEYS */;
/*!40000 ALTER TABLE `profile_profile` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `registration_registrationprofile` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `emailuser_id` int(11) NOT NULL,
  `activation_key` varchar(40) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `registration_registrationprofile` DISABLE KEYS */;
/*!40000 ALTER TABLE `registration_registrationprofile` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `related_files_relatedfiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `o_uuid_id` char(32) NOT NULL,
  `r_uuid_id` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `related_files_relate_o_uuid_id_aaa8e613_fk_tags_file` (`o_uuid_id`),
  KEY `related_files_relate_r_uuid_id_031751df_fk_tags_file` (`r_uuid_id`),
  CONSTRAINT `related_files_relate_r_uuid_id_031751df_fk_tags_file` FOREIGN KEY (`r_uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`),
  CONSTRAINT `related_files_relate_o_uuid_id_aaa8e613_fk_tags_file` FOREIGN KEY (`o_uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `related_files_relatedfiles` DISABLE KEYS */;
/*!40000 ALTER TABLE `related_files_relatedfiles` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `repo_api_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `app_name` varchar(255) NOT NULL,
  `token` varchar(40) NOT NULL,
  `generated_at` datetime NOT NULL,
  `generated_by` varchar(255) NOT NULL,
  `last_access` datetime NOT NULL,
  `permission` varchar(15) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `repo_api_tokens_repo_id_47a50fef` (`repo_id`),
  KEY `repo_api_tokens_app_name_7c395c31` (`app_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `repo_api_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `repo_api_tokens` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `repo_share_invitation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `path` longtext NOT NULL,
  `permission` varchar(50) NOT NULL,
  `invitation_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `repo_share_invitatio_invitation_id_b71effd2_fk_invitatio` (`invitation_id`),
  KEY `repo_share_invitation_repo_id_7bcf84fa` (`repo_id`),
  CONSTRAINT `repo_share_invitatio_invitation_id_b71effd2_fk_invitatio` FOREIGN KEY (`invitation_id`) REFERENCES `invitations_invitation` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `repo_share_invitation` DISABLE KEYS */;
/*!40000 ALTER TABLE `repo_share_invitation` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `repo_tags_repotags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `repo_tags_repotags_repo_id_1163a48f` (`repo_id`),
  KEY `repo_tags_repotags_name_3f4c9027` (`name`),
  KEY `repo_tags_repotags_color_1292b6c1` (`color`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `repo_tags_repotags` DISABLE KEYS */;
/*!40000 ALTER TABLE `repo_tags_repotags` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `revision_tag_revisiontags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `path` longtext NOT NULL,
  `revision_id` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `tag_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `revision_tag_revisiontags_repo_id_212c0c69` (`repo_id`),
  KEY `revision_tag_revisiontags_revision_id_fd9fe0f9` (`revision_id`),
  KEY `revision_tag_revisiontags_username_3007d29e` (`username`),
  KEY `revision_tag_revisio_tag_id_ee4e9b00_fk_revision_` (`tag_id`),
  CONSTRAINT `revision_tag_revisio_tag_id_ee4e9b00_fk_revision_` FOREIGN KEY (`tag_id`) REFERENCES `revision_tag_tags` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `revision_tag_revisiontags` DISABLE KEYS */;
/*!40000 ALTER TABLE `revision_tag_revisiontags` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `revision_tag_tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `revision_tag_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `revision_tag_tags` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_permissions_adminrole` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(254) NOT NULL,
  `role` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `role_permissions_adminrole` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_permissions_adminrole` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `share_anonymousshare` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_owner` varchar(255) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `anonymous_email` varchar(255) NOT NULL,
  `token` varchar(25) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `share_anonymousshare` DISABLE KEYS */;
/*!40000 ALTER TABLE `share_anonymousshare` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `share_extragroupssharepermission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `group_id` int(11) NOT NULL,
  `permission` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `share_extragroupssharepermission_repo_id_38dbaea1` (`repo_id`),
  KEY `share_extragroupssharepermission_group_id_6ca34bb2` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `share_extragroupssharepermission` DISABLE KEYS */;
/*!40000 ALTER TABLE `share_extragroupssharepermission` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `share_extrasharepermission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `share_to` varchar(255) NOT NULL,
  `permission` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `share_extrasharepermission_repo_id_23cc10fc` (`repo_id`),
  KEY `share_extrasharepermission_share_to_823c16cb` (`share_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `share_extrasharepermission` DISABLE KEYS */;
/*!40000 ALTER TABLE `share_extrasharepermission` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `share_fileshare` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `path` longtext NOT NULL,
  `token` varchar(100) NOT NULL,
  `ctime` datetime NOT NULL,
  `view_cnt` int(11) NOT NULL,
  `s_type` varchar(2) NOT NULL,
  `password` varchar(128) DEFAULT NULL,
  `expire_date` datetime DEFAULT NULL,
  `permission` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `share_fileshare_username_5cb6de75` (`username`),
  KEY `share_fileshare_repo_id_9b5ae27a` (`repo_id`),
  KEY `share_fileshare_s_type_724eb6c1` (`s_type`),
  KEY `share_fileshare_permission_d12c353f` (`permission`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `share_fileshare` DISABLE KEYS */;
/*!40000 ALTER TABLE `share_fileshare` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `share_orgfileshare` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) NOT NULL,
  `file_share_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `file_share_id` (`file_share_id`),
  KEY `share_orgfileshare_org_id_8d17998c` (`org_id`),
  CONSTRAINT `share_orgfileshare_file_share_id_7890388b_fk_share_fileshare_id` FOREIGN KEY (`file_share_id`) REFERENCES `share_fileshare` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `share_orgfileshare` DISABLE KEYS */;
/*!40000 ALTER TABLE `share_orgfileshare` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `share_privatefiledirshare` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_user` varchar(255) NOT NULL,
  `to_user` varchar(255) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `path` longtext NOT NULL,
  `token` varchar(10) NOT NULL,
  `permission` varchar(5) NOT NULL,
  `s_type` varchar(5) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `share_privatefiledirshare_from_user_d568d535` (`from_user`),
  KEY `share_privatefiledirshare_to_user_2a92a044` (`to_user`),
  KEY `share_privatefiledirshare_repo_id_97c5cb6f` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `share_privatefiledirshare` DISABLE KEYS */;
/*!40000 ALTER TABLE `share_privatefiledirshare` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `share_uploadlinkshare` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `path` longtext NOT NULL,
  `token` varchar(100) NOT NULL,
  `ctime` datetime NOT NULL,
  `view_cnt` int(11) NOT NULL,
  `password` varchar(128) DEFAULT NULL,
  `expire_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `share_uploadlinkshare_username_3203c243` (`username`),
  KEY `share_uploadlinkshare_repo_id_c519f857` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `share_uploadlinkshare` DISABLE KEYS */;
/*!40000 ALTER TABLE `share_uploadlinkshare` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `social_auth_usersocialauth` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `provider` varchar(32) NOT NULL,
  `uid` varchar(255) NOT NULL,
  `extra_data` longtext NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `social_auth_usersocialauth_provider_uid_e6b5e668_uniq` (`provider`,`uid`),
  KEY `social_auth_usersocialauth_username_3f06b5cf` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `social_auth_usersocialauth` DISABLE KEYS */;
/*!40000 ALTER TABLE `social_auth_usersocialauth` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sysadmin_extra_userloginlog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `login_date` datetime NOT NULL,
  `login_ip` varchar(128) NOT NULL,
  `login_success` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sysadmin_extra_userloginlog_username_5748b9e3` (`username`),
  KEY `sysadmin_extra_userloginlog_login_date_c171d790` (`login_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `sysadmin_extra_userloginlog` DISABLE KEYS */;
/*!40000 ALTER TABLE `sysadmin_extra_userloginlog` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tags_filetag` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `tag_id` int(11) NOT NULL,
  `uuid_id` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tags_filetag_tag_id_0f264fc9_fk_tags_tags_id` (`tag_id`),
  KEY `tags_filetag_uuid_id_2aa2266c_fk_tags_fileuuidmap_uuid` (`uuid_id`),
  CONSTRAINT `tags_filetag_uuid_id_2aa2266c_fk_tags_fileuuidmap_uuid` FOREIGN KEY (`uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`),
  CONSTRAINT `tags_filetag_tag_id_0f264fc9_fk_tags_tags_id` FOREIGN KEY (`tag_id`) REFERENCES `tags_tags` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `tags_filetag` DISABLE KEYS */;
/*!40000 ALTER TABLE `tags_filetag` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tags_fileuuidmap` (
  `uuid` char(32) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `repo_id_parent_path_md5` varchar(100) NOT NULL,
  `parent_path` longtext NOT NULL,
  `filename` varchar(1024) NOT NULL,
  `is_dir` tinyint(1) NOT NULL,
  PRIMARY KEY (`uuid`),
  KEY `tags_fileuuidmap_repo_id_ac67aa33` (`repo_id`),
  KEY `tags_fileuuidmap_repo_id_parent_path_md5_c8bb0860` (`repo_id_parent_path_md5`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `tags_fileuuidmap` DISABLE KEYS */;
/*!40000 ALTER TABLE `tags_fileuuidmap` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tags_tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `tags_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `tags_tags` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `termsandconditions_termsandconditions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) NOT NULL,
  `name` longtext NOT NULL,
  `version_number` decimal(6,2) NOT NULL,
  `text` longtext,
  `info` longtext,
  `date_active` datetime DEFAULT NULL,
  `date_created` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `termsandconditions_termsandconditions_slug_489d1e9d` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `termsandconditions_termsandconditions` DISABLE KEYS */;
/*!40000 ALTER TABLE `termsandconditions_termsandconditions` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `termsandconditions_usertermsandconditions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `ip_address` char(39) DEFAULT NULL,
  `date_accepted` datetime NOT NULL,
  `terms_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `termsandconditions_usert_username_terms_id_a7dabb70_uniq` (`username`,`terms_id`),
  KEY `termsandconditions_u_terms_id_eacdbcc7_fk_termsandc` (`terms_id`),
  CONSTRAINT `termsandconditions_u_terms_id_eacdbcc7_fk_termsandc` FOREIGN KEY (`terms_id`) REFERENCES `termsandconditions_termsandconditions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `termsandconditions_usertermsandconditions` DISABLE KEYS */;
/*!40000 ALTER TABLE `termsandconditions_usertermsandconditions` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trusted_ip_trustedip` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `trusted_ip_trustedip_ip_e898970c` (`ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `trusted_ip_trustedip` DISABLE KEYS */;
/*!40000 ALTER TABLE `trusted_ip_trustedip` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `two_factor_phonedevice` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `name` varchar(64) NOT NULL,
  `confirmed` tinyint(1) NOT NULL,
  `number` varchar(40) NOT NULL,
  `key` varchar(40) NOT NULL,
  `method` varchar(4) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user` (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `two_factor_phonedevice` DISABLE KEYS */;
/*!40000 ALTER TABLE `two_factor_phonedevice` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `two_factor_staticdevice` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `name` varchar(64) NOT NULL,
  `confirmed` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user` (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `two_factor_staticdevice` DISABLE KEYS */;
/*!40000 ALTER TABLE `two_factor_staticdevice` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `two_factor_statictoken` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(16) NOT NULL,
  `device_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `two_factor_statictok_device_id_93095b45_fk_two_facto` (`device_id`),
  KEY `two_factor_statictoken_token_2ade1084` (`token`),
  CONSTRAINT `two_factor_statictok_device_id_93095b45_fk_two_facto` FOREIGN KEY (`device_id`) REFERENCES `two_factor_staticdevice` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `two_factor_statictoken` DISABLE KEYS */;
/*!40000 ALTER TABLE `two_factor_statictoken` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `two_factor_totpdevice` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `name` varchar(64) NOT NULL,
  `confirmed` tinyint(1) NOT NULL,
  `key` varchar(80) NOT NULL,
  `step` smallint(5) unsigned NOT NULL,
  `t0` bigint(20) NOT NULL,
  `digits` smallint(5) unsigned NOT NULL,
  `tolerance` smallint(5) unsigned NOT NULL,
  `drift` smallint(6) NOT NULL,
  `last_t` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user` (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `two_factor_totpdevice` DISABLE KEYS */;
/*!40000 ALTER TABLE `two_factor_totpdevice` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wiki_wiki` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `permission` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `wiki_wiki_username_repo_id_4c8925af_uniq` (`username`,`repo_id`),
  KEY `wiki_wiki_created_at_54930e39` (`created_at`),
  KEY `wiki_wiki_repo_id_2ee93c37` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `wiki_wiki` DISABLE KEYS */;
/*!40000 ALTER TABLE `wiki_wiki` ENABLE KEYS */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

CREATE TABLE `ocm_share` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shared_secret` varchar(36) NOT NULL,
  `from_user` varchar(255) NOT NULL,
  `to_user` varchar(255) NOT NULL,
  `to_server_url` varchar(200) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `repo_name` varchar(255) NOT NULL,
  `permission` varchar(50) NOT NULL,
  `path` longtext NOT NULL,
  `ctime` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shared_secret` (`shared_secret`),
  KEY `ocm_share_from_user_7fbb7bb6` (`from_user`),
  KEY `ocm_share_to_user_4e255523` (`to_user`),
  KEY `ocm_share_to_server_url_43f0e89b` (`to_server_url`),
  KEY `ocm_share_repo_id_51937581` (`repo_id`)
) ENGINE = InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `ocm_share_received` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shared_secret` varchar(36) NOT NULL,
  `from_user` varchar(255) NOT NULL,
  `to_user` varchar(255) NOT NULL,
  `from_server_url` varchar(200) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `repo_name` varchar(255) NOT NULL,
  `permission` varchar(50) NOT NULL,
  `path` longtext NOT NULL,
  `provider_id` varchar(40) NOT NULL,
  `ctime` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shared_secret` (`shared_secret`),
  KEY `ocm_share_received_from_user_8137d8eb` (`from_user`),
  KEY `ocm_share_received_to_user_0921d09a` (`to_user`),
  KEY `ocm_share_received_from_server_url_10527b80` (`from_server_url`),
  KEY `ocm_share_received_repo_id_9e77a1b9` (`repo_id`),
  KEY `ocm_share_received_provider_id_60c873e0` (`provider_id`)
) ENGINE = InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `repo_auto_delete` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `repo_id` varchar(36) NOT NULL,
    `days` int(11) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `repo_id` (`repo_id`)
) ENGINE = InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `external_department` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `group_id` int(11) NOT NULL,
    `provider` varchar(32) NOT NULL,
    `outer_id` bigint(20) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `group_id` (`group_id`),
    UNIQUE KEY `external_department_provider_outer_id_8dns6vkw_uniq` (`provider`,`outer_id`)
) ENGINE = InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `custom_share_permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(500) NOT NULL,
  `permission` longtext NOT NULL,
  PRIMARY KEY (`id`),
  KEY `custom_share_permission_repo_id_578fe49f` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `ocm_via_webdav_received_shares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `description` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `owner_display_name` varchar(255) DEFAULT NULL,
  `protocol_name` varchar(255) NOT NULL,
  `shared_secret` varchar(255) NOT NULL,
  `permissions` varchar(255) NOT NULL,
  `provider_id` varchar(255) NOT NULL,
  `resource_type` varchar(255) NOT NULL,
  `share_type` varchar(255) NOT NULL,
  `share_with` varchar(255) NOT NULL,
  `shared_by` varchar(255) NOT NULL,
  `shared_by_display_name` varchar(255) DEFAULT NULL,
  `ctime` datetime(6) NOT NULL,
  `is_dir` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ocm_via_webdav_share_received_owner_261eaa70` (`owner`),
  KEY `ocm_via_webdav_share_received_shared_secret_fbb6be5a` (`shared_secret`),
  KEY `ocm_via_webdav_share_received_provider_id_a55680e9` (`provider_id`),
  KEY `ocm_via_webdav_share_received_resource_type_a3c71b57` (`resource_type`),
  KEY `ocm_via_webdav_share_received_share_type_7615aaab` (`share_type`),
  KEY `ocm_via_webdav_share_received_share_with_5a23eb17` (`share_with`),
  KEY `ocm_via_webdav_share_received_shared_by_1786d580` (`shared_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `onlyoffice_onlyofficedockey` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_key` varchar(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `file_path` longtext NOT NULL,
  `repo_id_file_path_md5` varchar(100) NOT NULL,
  `created_time` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `repo_id_file_path_md5` (`repo_id_file_path_md5`),
  KEY `onlyoffice_onlyofficedockey_doc_key_edba1352` (`doc_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `org_saml_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) NOT NULL,
  `metadata_url` longtext NOT NULL,
  `domain` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `org_id` (`org_id`),
  UNIQUE KEY `domain` (`domain`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `base_usermonitoredrepos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(254) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `timestamp` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `base_usermonitoredrepos_email_repo_id_b4ab00e4_uniq` (`email`,`repo_id`),
  KEY `base_usermonitoredrepos_email_55ead1b9` (`email`),
  KEY `base_usermonitoredrepos_repo_id_00e624c3` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `organizations_orgadminsettings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) NOT NULL,
  `key` varchar(255) NOT NULL,
  `value` longtext NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organizations_orgadminsettings_org_id_key_a01cc7de_uniq` (`org_id`,`key`),
  KEY `organizations_orgadminsettings_org_id_4f70d186` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `history_name` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_uuid` varchar(36) NOT NULL,
  `obj_id` varchar(40) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `history_name_doc_uuid` (`doc_uuid`),
  UNIQUE KEY `history_name_doc_uuid_obj_id` (`doc_uuid`, `obj_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `sdoc_draft` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_uuid` varchar(36) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sdoc_draft_doc_uuid` (`doc_uuid`),
  KEY `sdoc_draft_repo_id` (`repo_id`),
  KEY `sdoc_draft_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
