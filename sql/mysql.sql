
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
) ENGINE=InnoDB AUTO_INCREMENT=236 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` VALUES (1,'Can add content type',1,'add_contenttype'),(2,'Can change content type',1,'change_contenttype'),(3,'Can delete content type',1,'delete_contenttype'),(4,'Can change config',2,'change_config'),(5,'Can add session',3,'add_session'),(6,'Can change session',3,'change_session'),(7,'Can delete session',3,'delete_session'),(8,'Can add user enabled module',8,'add_userenabledmodule'),(9,'Can change user enabled module',8,'change_userenabledmodule'),(10,'Can delete user enabled module',8,'delete_userenabledmodule'),(11,'Can add user starred files',10,'add_userstarredfiles'),(12,'Can change user starred files',10,'change_userstarredfiles'),(13,'Can delete user starred files',10,'delete_userstarredfiles'),(14,'Can add file discuss',11,'add_filediscuss'),(15,'Can change file discuss',11,'change_filediscuss'),(16,'Can delete file discuss',11,'delete_filediscuss'),(17,'Can add repo secret key',6,'add_reposecretkey'),(18,'Can change repo secret key',6,'change_reposecretkey'),(19,'Can delete repo secret key',6,'delete_reposecretkey'),(20,'Can add user last login',14,'add_userlastlogin'),(21,'Can change user last login',14,'change_userlastlogin'),(22,'Can delete user last login',14,'delete_userlastlogin'),(23,'Can add inner pub msg',12,'add_innerpubmsg'),(24,'Can change inner pub msg',12,'change_innerpubmsg'),(25,'Can delete inner pub msg',12,'delete_innerpubmsg'),(26,'Can add group enabled module',4,'add_groupenabledmodule'),(27,'Can change group enabled module',4,'change_groupenabledmodule'),(28,'Can delete group enabled module',4,'delete_groupenabledmodule'),(29,'Can add commands last check',7,'add_commandslastcheck'),(30,'Can change commands last check',7,'change_commandslastcheck'),(31,'Can delete commands last check',7,'delete_commandslastcheck'),(32,'Can add file comment',9,'add_filecomment'),(33,'Can change file comment',9,'change_filecomment'),(34,'Can delete file comment',9,'delete_filecomment'),(35,'Can add inner pub msg reply',13,'add_innerpubmsgreply'),(36,'Can change inner pub msg reply',13,'change_innerpubmsgreply'),(37,'Can delete inner pub msg reply',13,'delete_innerpubmsgreply'),(38,'Can add client login token',5,'add_clientlogintoken'),(39,'Can change client login token',5,'change_clientlogintoken'),(40,'Can delete client login token',5,'delete_clientlogintoken'),(41,'Can add device token',15,'add_devicetoken'),(42,'Can change device token',15,'change_devicetoken'),(43,'Can delete device token',15,'delete_devicetoken'),(44,'Can add group',16,'add_group'),(45,'Can change group',16,'change_group'),(46,'Can delete group',16,'delete_group'),(47,'Can add permission',18,'add_permission'),(48,'Can change permission',18,'change_permission'),(49,'Can delete permission',18,'delete_permission'),(50,'Can add user',17,'add_user'),(51,'Can change user',17,'change_user'),(52,'Can delete user',17,'delete_user'),(53,'Can add registration profile',19,'add_registrationprofile'),(54,'Can change registration profile',19,'change_registrationprofile'),(55,'Can delete registration profile',19,'delete_registrationprofile'),(56,'Can add captcha store',20,'add_captchastore'),(57,'Can change captcha store',20,'change_captchastore'),(58,'Can delete captcha store',20,'delete_captchastore'),(59,'Can add constance',21,'add_constance'),(60,'Can change constance',21,'change_constance'),(61,'Can delete constance',21,'delete_constance'),(62,'Can add Email',24,'add_email'),(63,'Can change Email',24,'change_email'),(64,'Can delete Email',24,'delete_email'),(65,'Can add Attachment',25,'add_attachment'),(66,'Can change Attachment',25,'change_attachment'),(67,'Can delete Attachment',25,'delete_attachment'),(68,'Can add Email Template',23,'add_emailtemplate'),(69,'Can change Email Template',23,'change_emailtemplate'),(70,'Can delete Email Template',23,'delete_emailtemplate'),(71,'Can add Log',22,'add_log'),(72,'Can change Log',22,'change_log'),(73,'Can delete Log',22,'delete_log'),(74,'Can add Terms and Conditions',26,'add_termsandconditions'),(75,'Can change Terms and Conditions',26,'change_termsandconditions'),(76,'Can delete Terms and Conditions',26,'delete_termsandconditions'),(77,'Can add User Terms and Conditions',27,'add_usertermsandconditions'),(78,'Can change User Terms and Conditions',27,'change_usertermsandconditions'),(79,'Can delete User Terms and Conditions',27,'delete_usertermsandconditions'),(80,'Can add token v2',29,'add_tokenv2'),(81,'Can change token v2',29,'change_tokenv2'),(82,'Can delete token v2',29,'delete_tokenv2'),(83,'Can add token',28,'add_token'),(84,'Can change token',28,'change_token'),(85,'Can delete token',28,'delete_token'),(86,'Can add avatar',30,'add_avatar'),(87,'Can change avatar',30,'change_avatar'),(88,'Can delete avatar',30,'delete_avatar'),(89,'Can add group avatar',31,'add_groupavatar'),(90,'Can change group avatar',31,'change_groupavatar'),(91,'Can delete group avatar',31,'delete_groupavatar'),(92,'Can add contact',32,'add_contact'),(93,'Can change contact',32,'change_contact'),(94,'Can delete contact',32,'delete_contact'),(95,'Can add draft',35,'add_draft'),(96,'Can change draft',35,'change_draft'),(97,'Can delete draft',35,'delete_draft'),(98,'Can add draft review',33,'add_draftreview'),(99,'Can change draft review',33,'change_draftreview'),(100,'Can delete draft review',33,'delete_draftreview'),(101,'Can add review comment',36,'add_reviewcomment'),(102,'Can change review comment',36,'change_reviewcomment'),(103,'Can delete review comment',36,'delete_reviewcomment'),(104,'Can add review reviewer',34,'add_reviewreviewer'),(105,'Can change review reviewer',34,'change_reviewreviewer'),(106,'Can delete review reviewer',34,'delete_reviewreviewer'),(107,'Can add institution',38,'add_institution'),(108,'Can change institution',38,'change_institution'),(109,'Can delete institution',38,'delete_institution'),(110,'Can add institution admin',37,'add_institutionadmin'),(111,'Can change institution admin',37,'change_institutionadmin'),(112,'Can delete institution admin',37,'delete_institutionadmin'),(113,'Can add institution quota',39,'add_institutionquota'),(114,'Can change institution quota',39,'change_institutionquota'),(115,'Can delete institution quota',39,'delete_institutionquota'),(116,'Can add invitation',40,'add_invitation'),(117,'Can change invitation',40,'change_invitation'),(118,'Can delete invitation',40,'delete_invitation'),(119,'Can add personal wiki',41,'add_personalwiki'),(120,'Can change personal wiki',41,'change_personalwiki'),(121,'Can delete personal wiki',41,'delete_personalwiki'),(122,'Can add wiki',42,'add_wiki'),(123,'Can change wiki',42,'change_wiki'),(124,'Can delete wiki',42,'delete_wiki'),(125,'Can add group wiki',43,'add_groupwiki'),(126,'Can change group wiki',43,'change_groupwiki'),(127,'Can delete group wiki',43,'delete_groupwiki'),(128,'Can add message attachment',47,'add_messageattachment'),(129,'Can change message attachment',47,'change_messageattachment'),(130,'Can delete message attachment',47,'delete_messageattachment'),(131,'Can add message reply',46,'add_messagereply'),(132,'Can change message reply',46,'change_messagereply'),(133,'Can delete message reply',46,'delete_messagereply'),(134,'Can add public group',44,'add_publicgroup'),(135,'Can change public group',44,'change_publicgroup'),(136,'Can delete public group',44,'delete_publicgroup'),(137,'Can add group message',45,'add_groupmessage'),(138,'Can change group message',45,'change_groupmessage'),(139,'Can delete group message',45,'delete_groupmessage'),(140,'Can add notification',48,'add_notification'),(141,'Can change notification',48,'change_notification'),(142,'Can delete notification',48,'delete_notification'),(143,'Can add user notification',49,'add_usernotification'),(144,'Can change user notification',49,'change_usernotification'),(145,'Can delete user notification',49,'delete_usernotification'),(146,'Can add user options',50,'add_useroptions'),(147,'Can change user options',50,'change_useroptions'),(148,'Can delete user options',50,'delete_useroptions'),(149,'Can add detailed profile',51,'add_detailedprofile'),(150,'Can change detailed profile',51,'change_detailedprofile'),(151,'Can delete detailed profile',51,'delete_detailedprofile'),(152,'Can add profile',52,'add_profile'),(153,'Can change profile',52,'change_profile'),(154,'Can delete profile',52,'delete_profile'),(155,'Can add private file dir share',53,'add_privatefiledirshare'),(156,'Can change private file dir share',53,'change_privatefiledirshare'),(157,'Can delete private file dir share',53,'delete_privatefiledirshare'),(158,'Can add extra share permission',57,'add_extrasharepermission'),(159,'Can change extra share permission',57,'change_extrasharepermission'),(160,'Can delete extra share permission',57,'delete_extrasharepermission'),(161,'Can add file share',54,'add_fileshare'),(162,'Can change file share',54,'change_fileshare'),(163,'Can delete file share',54,'delete_fileshare'),(164,'Can add extra groups share permission',58,'add_extragroupssharepermission'),(165,'Can change extra groups share permission',58,'change_extragroupssharepermission'),(166,'Can delete extra groups share permission',58,'delete_extragroupssharepermission'),(167,'Can add anonymous share',59,'add_anonymousshare'),(168,'Can change anonymous share',59,'change_anonymousshare'),(169,'Can delete anonymous share',59,'delete_anonymousshare'),(170,'Can add org file share',55,'add_orgfileshare'),(171,'Can change org file share',55,'change_orgfileshare'),(172,'Can delete org file share',55,'delete_orgfileshare'),(173,'Can add upload link share',56,'add_uploadlinkshare'),(174,'Can change upload link share',56,'change_uploadlinkshare'),(175,'Can delete upload link share',56,'delete_uploadlinkshare'),(176,'Can add admin log',60,'add_adminlog'),(177,'Can change admin log',60,'change_adminlog'),(178,'Can delete admin log',60,'delete_adminlog'),(179,'Can add file tag',62,'add_filetag'),(180,'Can change file tag',62,'change_filetag'),(181,'Can delete file tag',62,'delete_filetag'),(182,'Can add tags',63,'add_tags'),(183,'Can change tags',63,'change_tags'),(184,'Can delete tags',63,'delete_tags'),(185,'Can add file uuid map',61,'add_fileuuidmap'),(186,'Can change file uuid map',61,'change_fileuuidmap'),(187,'Can delete file uuid map',61,'delete_fileuuidmap'),(188,'Can add tags',65,'add_tags'),(189,'Can change tags',65,'change_tags'),(190,'Can delete tags',65,'delete_tags'),(191,'Can add revision tags',64,'add_revisiontags'),(192,'Can change revision tags',64,'change_revisiontags'),(193,'Can delete revision tags',64,'delete_revisiontags'),(194,'Can add static token',67,'add_statictoken'),(195,'Can change static token',67,'change_statictoken'),(196,'Can delete static token',67,'delete_statictoken'),(197,'Can add TOTP device',68,'add_totpdevice'),(198,'Can change TOTP device',68,'change_totpdevice'),(199,'Can delete TOTP device',68,'delete_totpdevice'),(200,'Can add phone device',66,'add_phonedevice'),(201,'Can change phone device',66,'change_phonedevice'),(202,'Can delete phone device',66,'delete_phonedevice'),(203,'Can add static device',69,'add_staticdevice'),(204,'Can change static device',69,'change_staticdevice'),(205,'Can delete static device',69,'delete_staticdevice'),(206,'Can add admin role',70,'add_adminrole'),(207,'Can change admin role',70,'change_adminrole'),(208,'Can delete admin role',70,'delete_adminrole'),(209,'Can add trusted ip',71,'add_trustedip'),(210,'Can change trusted ip',71,'change_trustedip'),(211,'Can delete trusted ip',71,'delete_trustedip'),(212,'Can add repo tags',72,'add_repotags'),(213,'Can change repo tags',72,'change_repotags'),(214,'Can delete repo tags',72,'delete_repotags'),(215,'Can add file tags',73,'add_filetags'),(216,'Can change file tags',73,'change_filetags'),(217,'Can delete file tags',73,'delete_filetags'),(218,'Can add related files',74,'add_relatedfiles'),(219,'Can change related files',74,'change_relatedfiles'),(220,'Can delete related files',74,'delete_relatedfiles'),(221,'Can add user login log',75,'add_userloginlog'),(222,'Can change user login log',75,'change_userloginlog'),(223,'Can delete user login log',75,'delete_userloginlog'),(224,'Can add org member quota',77,'add_orgmemberquota'),(225,'Can change org member quota',77,'change_orgmemberquota'),(226,'Can delete org member quota',77,'delete_orgmemberquota'),(227,'Can add org settings',76,'add_orgsettings'),(228,'Can change org settings',76,'change_orgsettings'),(229,'Can delete org settings',76,'delete_orgsettings'),(230,'Can add session ticket',79,'add_sessionticket'),(231,'Can change session ticket',79,'change_sessionticket'),(232,'Can delete session ticket',79,'delete_sessionticket'),(233,'Can add proxy granting ticket',78,'add_proxygrantingticket'),(234,'Can change proxy granting ticket',78,'change_proxygrantingticket'),(235,'Can delete proxy granting ticket',78,'delete_proxygrantingticket');
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
CREATE TABLE `base_filediscuss` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `path` longtext NOT NULL,
  `path_hash` varchar(12) NOT NULL,
  `group_message_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `base_filediscuss_group_message_id_2f7d7046_fk_group_gro` (`group_message_id`),
  KEY `base_filediscuss_path_hash_fd9f7348` (`path_hash`),
  CONSTRAINT `base_filediscuss_group_message_id_2f7d7046_fk_group_gro` FOREIGN KEY (`group_message_id`) REFERENCES `group_groupmessage` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `base_filediscuss` DISABLE KEYS */;
/*!40000 ALTER TABLE `base_filediscuss` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `base_groupenabledmodule` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` varchar(10) NOT NULL,
  `module_name` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `base_groupenabledmodule_group_id_8c06b5bc` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `base_groupenabledmodule` DISABLE KEYS */;
/*!40000 ALTER TABLE `base_groupenabledmodule` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `base_innerpubmsg` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_email` varchar(254) NOT NULL,
  `message` varchar(500) NOT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `base_innerpubmsg` DISABLE KEYS */;
/*!40000 ALTER TABLE `base_innerpubmsg` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `base_innerpubmsgreply` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_email` varchar(254) NOT NULL,
  `message` varchar(150) NOT NULL,
  `timestamp` datetime NOT NULL,
  `reply_to_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `base_innerpubmsgrepl_reply_to_id_62ce6fe5_fk_base_inne` (`reply_to_id`),
  CONSTRAINT `base_innerpubmsgrepl_reply_to_id_62ce6fe5_fk_base_inne` FOREIGN KEY (`reply_to_id`) REFERENCES `base_innerpubmsg` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `base_innerpubmsgreply` DISABLE KEYS */;
/*!40000 ALTER TABLE `base_innerpubmsgreply` ENABLE KEYS */;
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
CREATE TABLE `base_userenabledmodule` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `module_name` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `base_userenabledmodule_username_4f1c3c88` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `base_userenabledmodule` DISABLE KEYS */;
/*!40000 ALTER TABLE `base_userenabledmodule` ENABLE KEYS */;
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
  `key` varchar(255) NOT NULL,
  `value` longtext NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
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
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `django_content_type` DISABLE KEYS */;
INSERT INTO `django_content_type` VALUES (60,'admin_log','adminlog'),(28,'api2','token'),(29,'api2','tokenv2'),(16,'auth','group'),(18,'auth','permission'),(17,'auth','user'),(30,'avatar','avatar'),(31,'avatar','groupavatar'),(5,'base','clientlogintoken'),(7,'base','commandslastcheck'),(15,'base','devicetoken'),(9,'base','filecomment'),(11,'base','filediscuss'),(4,'base','groupenabledmodule'),(12,'base','innerpubmsg'),(13,'base','innerpubmsgreply'),(6,'base','reposecretkey'),(8,'base','userenabledmodule'),(14,'base','userlastlogin'),(10,'base','userstarredfiles'),(20,'captcha','captchastore'),(2,'constance','config'),(32,'contacts','contact'),(1,'contenttypes','contenttype'),(21,'database','constance'),(78,'django_cas_ng','proxygrantingticket'),(79,'django_cas_ng','sessionticket'),(35,'drafts','draft'),(33,'drafts','draftreview'),(36,'drafts','reviewcomment'),(34,'drafts','reviewreviewer'),(73,'file_tags','filetags'),(45,'group','groupmessage'),(47,'group','messageattachment'),(46,'group','messagereply'),(44,'group','publicgroup'),(38,'institutions','institution'),(37,'institutions','institutionadmin'),(39,'institutions','institutionquota'),(40,'invitations','invitation'),(48,'notifications','notification'),(49,'notifications','usernotification'),(50,'options','useroptions'),(77,'organizations','orgmemberquota'),(76,'organizations','orgsettings'),(25,'post_office','attachment'),(24,'post_office','email'),(23,'post_office','emailtemplate'),(22,'post_office','log'),(51,'profile','detailedprofile'),(52,'profile','profile'),(19,'registration','registrationprofile'),(74,'related_files','relatedfiles'),(72,'repo_tags','repotags'),(64,'revision_tag','revisiontags'),(65,'revision_tag','tags'),(70,'role_permissions','adminrole'),(3,'sessions','session'),(59,'share','anonymousshare'),(58,'share','extragroupssharepermission'),(57,'share','extrasharepermission'),(54,'share','fileshare'),(55,'share','orgfileshare'),(53,'share','privatefiledirshare'),(56,'share','uploadlinkshare'),(75,'sysadmin_extra','userloginlog'),(62,'tags','filetag'),(61,'tags','fileuuidmap'),(63,'tags','tags'),(26,'termsandconditions','termsandconditions'),(27,'termsandconditions','usertermsandconditions'),(71,'trusted_ip','trustedip'),(66,'two_factor','phonedevice'),(69,'two_factor','staticdevice'),(67,'two_factor','statictoken'),(68,'two_factor','totpdevice'),(43,'wiki','groupwiki'),(41,'wiki','personalwiki'),(42,'wiki','wiki');
/*!40000 ALTER TABLE `django_content_type` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `django_migrations` DISABLE KEYS */;
INSERT INTO `django_migrations` VALUES (1,'admin_log','0001_initial','2019-01-22 02:36:08'),(2,'api2','0001_initial','2019-01-22 02:36:08'),(3,'contenttypes','0001_initial','2019-01-22 02:36:08'),(4,'contenttypes','0002_remove_content_type_name','2019-01-22 02:36:08'),(5,'auth','0001_initial','2019-01-22 02:36:09'),(6,'auth','0002_alter_permission_name_max_length','2019-01-22 02:36:09'),(7,'auth','0003_alter_user_email_max_length','2019-01-22 02:36:09'),(8,'auth','0004_alter_user_username_opts','2019-01-22 02:36:09'),(9,'auth','0005_alter_user_last_login_null','2019-01-22 02:36:09'),(10,'auth','0006_require_contenttypes_0002','2019-01-22 02:36:09'),(11,'auth','0007_alter_validators_add_error_messages','2019-01-22 02:36:09'),(12,'auth','0008_alter_user_username_max_length','2019-01-22 02:36:09'),(13,'avatar','0001_initial','2019-01-22 02:36:09'),(14,'tags','0001_initial','2019-01-22 02:36:09'),(15,'group','0001_initial','2019-01-22 02:36:09'),(16,'base','0001_initial','2019-01-22 02:36:10'),(17,'base','0002_reposecretkey','2019-01-22 02:36:10'),(18,'base','0003_auto_20181016_1242','2019-01-22 02:36:10'),(19,'captcha','0001_initial','2019-01-22 02:36:10'),(20,'contacts','0001_initial','2019-01-22 02:36:10'),(21,'database','0001_initial','2019-01-22 02:36:10'),(22,'django_cas_ng','0001_initial','2019-01-22 02:36:10'),(23,'django_cas_ng','0002_auto_20180410_0948','2019-01-22 02:36:11'),(24,'drafts','0001_initial','2019-01-22 02:36:11'),(25,'drafts','0002_draftreview_author','2019-01-22 02:36:11'),(26,'repo_tags','0001_initial','2019-01-22 02:36:11'),(27,'file_tags','0001_initial','2019-01-22 02:36:11'),(28,'institutions','0001_initial','2019-01-22 02:36:11'),(29,'institutions','0002_institutionquota','2019-01-22 02:36:12'),(30,'institutions','0003_auto_20180426_0710','2019-01-22 02:36:12'),(31,'invitations','0001_initial','2019-01-22 02:36:12'),(32,'invitations','0002_invitation_invite_type','2019-01-22 02:36:12'),(33,'invitations','0003_auto_20160510_1703','2019-01-22 02:36:12'),(34,'invitations','0004_auto_20160629_1610','2019-01-22 02:36:12'),(35,'invitations','0005_auto_20160629_1614','2019-01-22 02:36:12'),(36,'notifications','0001_initial','2019-01-22 02:36:12'),(37,'notifications','0002_auto_20180426_0710','2019-01-22 02:36:12'),(38,'options','0001_initial','2019-01-22 02:36:12'),(39,'options','0002_auto_20181107_0811','2019-01-22 02:36:12'),(40,'organizations','0001_initial','2019-01-22 02:36:12'),(41,'organizations','0002_orgsettings','2019-01-22 02:36:12'),(42,'organizations','0003_auto_20190116_0323','2019-01-22 02:36:12'),(43,'post_office','0001_initial','2019-01-22 02:36:13'),(44,'post_office','0002_add_i18n_and_backend_alias','2019-01-22 02:36:14'),(45,'post_office','0003_longer_subject','2019-01-22 02:36:14'),(46,'post_office','0004_auto_20160607_0901','2019-01-22 02:36:14'),(47,'post_office','0005_auto_20170515_0013','2019-01-22 02:36:15'),(48,'post_office','0006_attachment_mimetype','2019-01-22 02:36:15'),(49,'profile','0001_initial','2019-01-22 02:36:15'),(50,'profile','0002_auto_20190122_0225','2019-01-22 02:36:15'),(51,'registration','0001_initial','2019-01-22 02:36:15'),(52,'related_files','0001_initial','2019-01-22 02:36:15'),(53,'revision_tag','0001_initial','2019-01-22 02:36:15'),(54,'role_permissions','0001_initial','2019-01-22 02:36:15'),(55,'sessions','0001_initial','2019-01-22 02:36:15'),(56,'share','0001_initial','2019-01-22 02:36:16'),(57,'sysadmin_extra','0001_initial','2019-01-22 02:36:16'),(58,'termsandconditions','0001_initial','2019-01-22 02:36:16'),(59,'trusted_ip','0001_initial','2019-01-22 02:36:16'),(60,'two_factor','0001_initial','2019-01-22 02:36:17'),(61,'wiki','0001_initial','2019-01-22 02:36:17'),(62,'wiki','0002_auto_20180326_0548','2019-01-22 02:36:17'),(63,'wiki','0003_auto_20180428_0619','2019-01-22 02:36:17');
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
  `origin_file_uuid_id` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `drafts_draft_origin_file_uuid_id_f150319e_fk_tags_file` (`origin_file_uuid_id`),
  KEY `drafts_draft_created_at_e9f4523f` (`created_at`),
  KEY `drafts_draft_updated_at_0a144b05` (`updated_at`),
  KEY `drafts_draft_username_73e6738b` (`username`),
  CONSTRAINT `drafts_draft_origin_file_uuid_id_f150319e_fk_tags_file` FOREIGN KEY (`origin_file_uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `drafts_draft` DISABLE KEYS */;
/*!40000 ALTER TABLE `drafts_draft` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `drafts_draftreview` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `creator` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL,
  `origin_repo_id` varchar(36) NOT NULL,
  `draft_file_path` varchar(1024) NOT NULL,
  `origin_file_version` varchar(100) NOT NULL,
  `publish_file_version` varchar(100) DEFAULT NULL,
  `draft_id_id` int(11) DEFAULT NULL,
  `origin_file_uuid_id` char(32) NOT NULL,
  `author` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `draft_id_id` (`draft_id_id`),
  KEY `drafts_draftreview_origin_file_uuid_id_113d5031_fk_tags_file` (`origin_file_uuid_id`),
  KEY `drafts_draftreview_created_at_1e4356bb` (`created_at`),
  KEY `drafts_draftreview_updated_at_ad2a1471` (`updated_at`),
  KEY `drafts_draftreview_creator_ecbc7e5e` (`creator`),
  KEY `drafts_draftreview_author_2ed48342` (`author`),
  CONSTRAINT `drafts_draftreview_draft_id_id_9e6babe7_fk_drafts_draft_id` FOREIGN KEY (`draft_id_id`) REFERENCES `drafts_draft` (`id`),
  CONSTRAINT `drafts_draftreview_origin_file_uuid_id_113d5031_fk_tags_file` FOREIGN KEY (`origin_file_uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `drafts_draftreview` DISABLE KEYS */;
/*!40000 ALTER TABLE `drafts_draftreview` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `drafts_reviewcomment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `author` varchar(255) NOT NULL,
  `resolved` tinyint(1) NOT NULL,
  `comment` longtext NOT NULL,
  `detail` longtext NOT NULL,
  `review_id_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `drafts_reviewcomment_review_id_id_1645670c_fk_drafts_dr` (`review_id_id`),
  KEY `drafts_reviewcomment_created_at_370dbc87` (`created_at`),
  KEY `drafts_reviewcomment_updated_at_46073bd4` (`updated_at`),
  KEY `drafts_reviewcomment_author_5498ceea` (`author`),
  KEY `drafts_reviewcomment_resolved_94bcb8e6` (`resolved`),
  CONSTRAINT `drafts_reviewcomment_review_id_id_1645670c_fk_drafts_dr` FOREIGN KEY (`review_id_id`) REFERENCES `drafts_draftreview` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `drafts_reviewcomment` DISABLE KEYS */;
/*!40000 ALTER TABLE `drafts_reviewcomment` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `drafts_reviewreviewer` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reviewer` varchar(255) NOT NULL,
  `review_id_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `drafts_reviewreviewe_review_id_id_fc6bd0fd_fk_drafts_dr` (`review_id_id`),
  KEY `drafts_reviewreviewer_reviewer_65880f6e` (`reviewer`),
  CONSTRAINT `drafts_reviewreviewe_review_id_id_fc6bd0fd_fk_drafts_dr` FOREIGN KEY (`review_id_id`) REFERENCES `drafts_draftreview` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `drafts_reviewreviewer` DISABLE KEYS */;
/*!40000 ALTER TABLE `drafts_reviewreviewer` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `file_tags_filetags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file_uuid_id` char(32) NOT NULL,
  `parent_folder_uuid_id` char(32) NOT NULL,
  `repo_tag_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `file_tags_filetags_file_uuid_id_e30f0ec8_fk_tags_file` (`file_uuid_id`),
  KEY `file_tags_filetags_parent_folder_uuid_i_df56f09b_fk_tags_file` (`parent_folder_uuid_id`),
  KEY `file_tags_filetags_repo_tag_id_c39660cb_fk_repo_tags_repotags_id` (`repo_tag_id`),
  CONSTRAINT `file_tags_filetags_repo_tag_id_c39660cb_fk_repo_tags_repotags_id` FOREIGN KEY (`repo_tag_id`) REFERENCES `repo_tags_repotags` (`id`),
  CONSTRAINT `file_tags_filetags_file_uuid_id_e30f0ec8_fk_tags_file` FOREIGN KEY (`file_uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`),
  CONSTRAINT `file_tags_filetags_parent_folder_uuid_i_df56f09b_fk_tags_file` FOREIGN KEY (`parent_folder_uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `file_tags_filetags` DISABLE KEYS */;
/*!40000 ALTER TABLE `file_tags_filetags` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `group_groupmessage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `from_email` varchar(255) NOT NULL,
  `message` longtext NOT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `group_groupmessage_group_id_acc24329` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `group_groupmessage` DISABLE KEYS */;
/*!40000 ALTER TABLE `group_groupmessage` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `group_messageattachment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(40) NOT NULL,
  `attach_type` varchar(5) NOT NULL,
  `path` longtext NOT NULL,
  `src` varchar(20) NOT NULL,
  `group_message_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `group_messageattachm_group_message_id_6edb6096_fk_group_gro` (`group_message_id`),
  CONSTRAINT `group_messageattachm_group_message_id_6edb6096_fk_group_gro` FOREIGN KEY (`group_message_id`) REFERENCES `group_groupmessage` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `group_messageattachment` DISABLE KEYS */;
/*!40000 ALTER TABLE `group_messageattachment` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `group_messagereply` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_email` varchar(255) NOT NULL,
  `message` longtext NOT NULL,
  `timestamp` datetime NOT NULL,
  `reply_to_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `group_messagereply_reply_to_id_6562f0ac_fk_group_groupmessage_id` (`reply_to_id`),
  CONSTRAINT `group_messagereply_reply_to_id_6562f0ac_fk_group_groupmessage_id` FOREIGN KEY (`reply_to_id`) REFERENCES `group_groupmessage` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `group_messagereply` DISABLE KEYS */;
/*!40000 ALTER TABLE `group_messagereply` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `group_publicgroup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `group_publicgroup_group_id_c91e54ce` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `group_publicgroup` DISABLE KEYS */;
/*!40000 ALTER TABLE `group_publicgroup` ENABLE KEYS */;
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
  KEY `notifications_usernotification_msg_type_985afd02` (`msg_type`)
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
CREATE TABLE `wiki_groupwiki` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `group_id` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `wiki_groupwiki` DISABLE KEYS */;
/*!40000 ALTER TABLE `wiki_groupwiki` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wiki_personalwiki` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `wiki_personalwiki` DISABLE KEYS */;
/*!40000 ALTER TABLE `wiki_personalwiki` ENABLE KEYS */;
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

