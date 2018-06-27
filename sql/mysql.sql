
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
) ENGINE=InnoDB AUTO_INCREMENT=209 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` VALUES (1,'Can add content type',1,'add_contenttype'),(2,'Can change content type',1,'change_contenttype'),(3,'Can delete content type',1,'delete_contenttype'),(4,'Can change config',2,'change_config'),(5,'Can add session',3,'add_session'),(6,'Can change session',3,'change_session'),(7,'Can delete session',3,'delete_session'),(8,'Can add user enabled module',7,'add_userenabledmodule'),(9,'Can change user enabled module',7,'change_userenabledmodule'),(10,'Can delete user enabled module',7,'delete_userenabledmodule'),(11,'Can add user starred files',9,'add_userstarredfiles'),(12,'Can change user starred files',9,'change_userstarredfiles'),(13,'Can delete user starred files',9,'delete_userstarredfiles'),(14,'Can add file discuss',10,'add_filediscuss'),(15,'Can change file discuss',10,'change_filediscuss'),(16,'Can delete file discuss',10,'delete_filediscuss'),(17,'Can add user last login',13,'add_userlastlogin'),(18,'Can change user last login',13,'change_userlastlogin'),(19,'Can delete user last login',13,'delete_userlastlogin'),(20,'Can add inner pub msg',11,'add_innerpubmsg'),(21,'Can change inner pub msg',11,'change_innerpubmsg'),(22,'Can delete inner pub msg',11,'delete_innerpubmsg'),(23,'Can add group enabled module',4,'add_groupenabledmodule'),(24,'Can change group enabled module',4,'change_groupenabledmodule'),(25,'Can delete group enabled module',4,'delete_groupenabledmodule'),(26,'Can add commands last check',6,'add_commandslastcheck'),(27,'Can change commands last check',6,'change_commandslastcheck'),(28,'Can delete commands last check',6,'delete_commandslastcheck'),(29,'Can add file comment',8,'add_filecomment'),(30,'Can change file comment',8,'change_filecomment'),(31,'Can delete file comment',8,'delete_filecomment'),(32,'Can add inner pub msg reply',12,'add_innerpubmsgreply'),(33,'Can change inner pub msg reply',12,'change_innerpubmsgreply'),(34,'Can delete inner pub msg reply',12,'delete_innerpubmsgreply'),(35,'Can add client login token',5,'add_clientlogintoken'),(36,'Can change client login token',5,'change_clientlogintoken'),(37,'Can delete client login token',5,'delete_clientlogintoken'),(38,'Can add device token',14,'add_devicetoken'),(39,'Can change device token',14,'change_devicetoken'),(40,'Can delete device token',14,'delete_devicetoken'),(41,'Can add group',15,'add_group'),(42,'Can change group',15,'change_group'),(43,'Can delete group',15,'delete_group'),(44,'Can add permission',17,'add_permission'),(45,'Can change permission',17,'change_permission'),(46,'Can delete permission',17,'delete_permission'),(47,'Can add user',16,'add_user'),(48,'Can change user',16,'change_user'),(49,'Can delete user',16,'delete_user'),(50,'Can add registration profile',18,'add_registrationprofile'),(51,'Can change registration profile',18,'change_registrationprofile'),(52,'Can delete registration profile',18,'delete_registrationprofile'),(53,'Can add captcha store',19,'add_captchastore'),(54,'Can change captcha store',19,'change_captchastore'),(55,'Can delete captcha store',19,'delete_captchastore'),(56,'Can add constance',20,'add_constance'),(57,'Can change constance',20,'change_constance'),(58,'Can delete constance',20,'delete_constance'),(59,'Can add Email',23,'add_email'),(60,'Can change Email',23,'change_email'),(61,'Can delete Email',23,'delete_email'),(62,'Can add Attachment',24,'add_attachment'),(63,'Can change Attachment',24,'change_attachment'),(64,'Can delete Attachment',24,'delete_attachment'),(65,'Can add Email Template',22,'add_emailtemplate'),(66,'Can change Email Template',22,'change_emailtemplate'),(67,'Can delete Email Template',22,'delete_emailtemplate'),(68,'Can add Log',21,'add_log'),(69,'Can change Log',21,'change_log'),(70,'Can delete Log',21,'delete_log'),(71,'Can add Terms and Conditions',25,'add_termsandconditions'),(72,'Can change Terms and Conditions',25,'change_termsandconditions'),(73,'Can delete Terms and Conditions',25,'delete_termsandconditions'),(74,'Can add User Terms and Conditions',26,'add_usertermsandconditions'),(75,'Can change User Terms and Conditions',26,'change_usertermsandconditions'),(76,'Can delete User Terms and Conditions',26,'delete_usertermsandconditions'),(77,'Can add token v2',28,'add_tokenv2'),(78,'Can change token v2',28,'change_tokenv2'),(79,'Can delete token v2',28,'delete_tokenv2'),(80,'Can add token',27,'add_token'),(81,'Can change token',27,'change_token'),(82,'Can delete token',27,'delete_token'),(83,'Can add avatar',29,'add_avatar'),(84,'Can change avatar',29,'change_avatar'),(85,'Can delete avatar',29,'delete_avatar'),(86,'Can add group avatar',30,'add_groupavatar'),(87,'Can change group avatar',30,'change_groupavatar'),(88,'Can delete group avatar',30,'delete_groupavatar'),(89,'Can add contact',31,'add_contact'),(90,'Can change contact',31,'change_contact'),(91,'Can delete contact',31,'delete_contact'),(92,'Can add institution',33,'add_institution'),(93,'Can change institution',33,'change_institution'),(94,'Can delete institution',33,'delete_institution'),(95,'Can add institution admin',32,'add_institutionadmin'),(96,'Can change institution admin',32,'change_institutionadmin'),(97,'Can delete institution admin',32,'delete_institutionadmin'),(98,'Can add institution quota',34,'add_institutionquota'),(99,'Can change institution quota',34,'change_institutionquota'),(100,'Can delete institution quota',34,'delete_institutionquota'),(101,'Can add invitation',35,'add_invitation'),(102,'Can change invitation',35,'change_invitation'),(103,'Can delete invitation',35,'delete_invitation'),(104,'Can add personal wiki',36,'add_personalwiki'),(105,'Can change personal wiki',36,'change_personalwiki'),(106,'Can delete personal wiki',36,'delete_personalwiki'),(107,'Can add wiki',37,'add_wiki'),(108,'Can change wiki',37,'change_wiki'),(109,'Can delete wiki',37,'delete_wiki'),(110,'Can add group wiki',38,'add_groupwiki'),(111,'Can change group wiki',38,'change_groupwiki'),(112,'Can delete group wiki',38,'delete_groupwiki'),(113,'Can add message attachment',42,'add_messageattachment'),(114,'Can change message attachment',42,'change_messageattachment'),(115,'Can delete message attachment',42,'delete_messageattachment'),(116,'Can add message reply',41,'add_messagereply'),(117,'Can change message reply',41,'change_messagereply'),(118,'Can delete message reply',41,'delete_messagereply'),(119,'Can add public group',39,'add_publicgroup'),(120,'Can change public group',39,'change_publicgroup'),(121,'Can delete public group',39,'delete_publicgroup'),(122,'Can add group message',40,'add_groupmessage'),(123,'Can change group message',40,'change_groupmessage'),(124,'Can delete group message',40,'delete_groupmessage'),(125,'Can add notification',43,'add_notification'),(126,'Can change notification',43,'change_notification'),(127,'Can delete notification',43,'delete_notification'),(128,'Can add user notification',44,'add_usernotification'),(129,'Can change user notification',44,'change_usernotification'),(130,'Can delete user notification',44,'delete_usernotification'),(131,'Can add user options',45,'add_useroptions'),(132,'Can change user options',45,'change_useroptions'),(133,'Can delete user options',45,'delete_useroptions'),(134,'Can add detailed profile',46,'add_detailedprofile'),(135,'Can change detailed profile',46,'change_detailedprofile'),(136,'Can delete detailed profile',46,'delete_detailedprofile'),(137,'Can add profile',47,'add_profile'),(138,'Can change profile',47,'change_profile'),(139,'Can delete profile',47,'delete_profile'),(140,'Can add private file dir share',48,'add_privatefiledirshare'),(141,'Can change private file dir share',48,'change_privatefiledirshare'),(142,'Can delete private file dir share',48,'delete_privatefiledirshare'),(143,'Can add file share',49,'add_fileshare'),(144,'Can change file share',49,'change_fileshare'),(145,'Can delete file share',49,'delete_fileshare'),(146,'Can add extra share permission',52,'add_extrasharepermission'),(147,'Can change extra share permission',52,'change_extrasharepermission'),(148,'Can delete extra share permission',52,'delete_extrasharepermission'),(149,'Can add extra groups share permission',53,'add_extragroupssharepermission'),(150,'Can change extra groups share permission',53,'change_extragroupssharepermission'),(151,'Can delete extra groups share permission',53,'delete_extragroupssharepermission'),(152,'Can add anonymous share',54,'add_anonymousshare'),(153,'Can change anonymous share',54,'change_anonymousshare'),(154,'Can delete anonymous share',54,'delete_anonymousshare'),(155,'Can add org file share',50,'add_orgfileshare'),(156,'Can change org file share',50,'change_orgfileshare'),(157,'Can delete org file share',50,'delete_orgfileshare'),(158,'Can add upload link share',51,'add_uploadlinkshare'),(159,'Can change upload link share',51,'change_uploadlinkshare'),(160,'Can delete upload link share',51,'delete_uploadlinkshare'),(161,'Can add admin log',55,'add_adminlog'),(162,'Can change admin log',55,'change_adminlog'),(163,'Can delete admin log',55,'delete_adminlog'),(164,'Can add file tag',57,'add_filetag'),(165,'Can change file tag',57,'change_filetag'),(166,'Can delete file tag',57,'delete_filetag'),(167,'Can add tags',58,'add_tags'),(168,'Can change tags',58,'change_tags'),(169,'Can delete tags',58,'delete_tags'),(170,'Can add file uuid map',56,'add_fileuuidmap'),(171,'Can change file uuid map',56,'change_fileuuidmap'),(172,'Can delete file uuid map',56,'delete_fileuuidmap'),(173,'Can add tags',60,'add_tags'),(174,'Can change tags',60,'change_tags'),(175,'Can delete tags',60,'delete_tags'),(176,'Can add revision tags',59,'add_revisiontags'),(177,'Can change revision tags',59,'change_revisiontags'),(178,'Can delete revision tags',59,'delete_revisiontags'),(179,'Can add TOTP device',63,'add_totpdevice'),(180,'Can change TOTP device',63,'change_totpdevice'),(181,'Can delete TOTP device',63,'delete_totpdevice'),(182,'Can add static token',62,'add_statictoken'),(183,'Can change static token',62,'change_statictoken'),(184,'Can delete static token',62,'delete_statictoken'),(185,'Can add phone device',61,'add_phonedevice'),(186,'Can change phone device',61,'change_phonedevice'),(187,'Can delete phone device',61,'delete_phonedevice'),(188,'Can add static device',64,'add_staticdevice'),(189,'Can change static device',64,'change_staticdevice'),(190,'Can delete static device',64,'delete_staticdevice'),(191,'Can add admin role',65,'add_adminrole'),(192,'Can change admin role',65,'change_adminrole'),(193,'Can delete admin role',65,'delete_adminrole'),(194,'Can add trusted ip',66,'add_trustedip'),(195,'Can change trusted ip',66,'change_trustedip'),(196,'Can delete trusted ip',66,'delete_trustedip'),(197,'Can add user login log',67,'add_userloginlog'),(198,'Can change user login log',67,'change_userloginlog'),(199,'Can delete user login log',67,'delete_userloginlog'),(200,'Can add org member quota',68,'add_orgmemberquota'),(201,'Can change org member quota',68,'change_orgmemberquota'),(202,'Can delete org member quota',68,'delete_orgmemberquota'),(203,'Can add session ticket',70,'add_sessionticket'),(204,'Can change session ticket',70,'change_sessionticket'),(205,'Can delete session ticket',70,'delete_sessionticket'),(206,'Can add proxy granting ticket',69,'add_proxygrantingticket'),(207,'Can change proxy granting ticket',69,'change_proxygrantingticket'),(208,'Can delete proxy granting ticket',69,'delete_proxygrantingticket');
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
  PRIMARY KEY (`id`),
  KEY `base_filecomment_uuid_id_4f9a2ca2_fk_tags_fileuuidmap_uuid` (`uuid_id`),
  KEY `base_filecomment_author_8a4d7e91` (`author`),
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
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `django_content_type` DISABLE KEYS */;
INSERT INTO `django_content_type` VALUES (55,'admin_log','adminlog'),(27,'api2','token'),(28,'api2','tokenv2'),(15,'auth','group'),(17,'auth','permission'),(16,'auth','user'),(29,'avatar','avatar'),(30,'avatar','groupavatar'),(5,'base','clientlogintoken'),(6,'base','commandslastcheck'),(14,'base','devicetoken'),(8,'base','filecomment'),(10,'base','filediscuss'),(4,'base','groupenabledmodule'),(11,'base','innerpubmsg'),(12,'base','innerpubmsgreply'),(7,'base','userenabledmodule'),(13,'base','userlastlogin'),(9,'base','userstarredfiles'),(19,'captcha','captchastore'),(2,'constance','config'),(31,'contacts','contact'),(1,'contenttypes','contenttype'),(20,'database','constance'),(69,'django_cas_ng','proxygrantingticket'),(70,'django_cas_ng','sessionticket'),(40,'group','groupmessage'),(42,'group','messageattachment'),(41,'group','messagereply'),(39,'group','publicgroup'),(33,'institutions','institution'),(32,'institutions','institutionadmin'),(34,'institutions','institutionquota'),(35,'invitations','invitation'),(43,'notifications','notification'),(44,'notifications','usernotification'),(45,'options','useroptions'),(68,'organizations','orgmemberquota'),(24,'post_office','attachment'),(23,'post_office','email'),(22,'post_office','emailtemplate'),(21,'post_office','log'),(46,'profile','detailedprofile'),(47,'profile','profile'),(18,'registration','registrationprofile'),(59,'revision_tag','revisiontags'),(60,'revision_tag','tags'),(65,'role_permissions','adminrole'),(3,'sessions','session'),(54,'share','anonymousshare'),(53,'share','extragroupssharepermission'),(52,'share','extrasharepermission'),(49,'share','fileshare'),(50,'share','orgfileshare'),(48,'share','privatefiledirshare'),(51,'share','uploadlinkshare'),(67,'sysadmin_extra','userloginlog'),(57,'tags','filetag'),(56,'tags','fileuuidmap'),(58,'tags','tags'),(25,'termsandconditions','termsandconditions'),(26,'termsandconditions','usertermsandconditions'),(66,'trusted_ip','trustedip'),(61,'two_factor','phonedevice'),(64,'two_factor','staticdevice'),(62,'two_factor','statictoken'),(63,'two_factor','totpdevice'),(38,'wiki','groupwiki'),(36,'wiki','personalwiki'),(37,'wiki','wiki');
/*!40000 ALTER TABLE `django_content_type` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `django_migrations` DISABLE KEYS */;
INSERT INTO `django_migrations` VALUES (1,'admin_log','0001_initial','2018-06-27 02:50:49.548921'),(2,'api2','0001_initial','2018-06-27 02:50:49.930960'),(3,'contenttypes','0001_initial','2018-06-27 02:50:49.979518'),(4,'contenttypes','0002_remove_content_type_name','2018-06-27 02:50:50.067604'),(5,'auth','0001_initial','2018-06-27 02:50:50.970680'),(6,'auth','0002_alter_permission_name_max_length','2018-06-27 02:50:51.002810'),(7,'auth','0003_alter_user_email_max_length','2018-06-27 02:50:51.048514'),(8,'auth','0004_alter_user_username_opts','2018-06-27 02:50:51.064347'),(9,'auth','0005_alter_user_last_login_null','2018-06-27 02:50:51.097687'),(10,'auth','0006_require_contenttypes_0002','2018-06-27 02:50:51.100780'),(11,'auth','0007_alter_validators_add_error_messages','2018-06-27 02:50:51.123902'),(12,'auth','0008_alter_user_username_max_length','2018-06-27 02:50:51.162747'),(13,'avatar','0001_initial','2018-06-27 02:50:51.356427'),(14,'tags','0001_initial','2018-06-27 02:50:51.531345'),(15,'group','0001_initial','2018-06-27 02:50:52.010902'),(16,'base','0001_initial','2018-06-27 02:50:52.804154'),(17,'captcha','0001_initial','2018-06-27 02:50:52.842917'),(18,'contacts','0001_initial','2018-06-27 02:50:53.033049'),(19,'database','0001_initial','2018-06-27 02:50:53.065329'),(20,'django_cas_ng','0001_initial','2018-06-27 02:50:53.192349'),(21,'django_cas_ng','0002_auto_20180410_0948','2018-06-27 02:50:53.582217'),(22,'institutions','0001_initial','2018-06-27 02:50:53.811817'),(23,'institutions','0002_institutionquota','2018-06-27 02:50:53.862047'),(24,'institutions','0003_auto_20180426_0710','2018-06-27 02:50:53.960556'),(25,'invitations','0001_initial','2018-06-27 02:50:54.007953'),(26,'invitations','0002_invitation_invite_type','2018-06-27 02:50:54.048775'),(27,'invitations','0003_auto_20160510_1703','2018-06-27 02:50:54.252238'),(28,'invitations','0004_auto_20160629_1610','2018-06-27 02:50:54.471329'),(29,'invitations','0005_auto_20160629_1614','2018-06-27 02:50:54.493259'),(30,'notifications','0001_initial','2018-06-27 02:50:54.584081'),(31,'notifications','0002_auto_20180426_0710','2018-06-27 02:50:54.610380'),(32,'options','0001_initial','2018-06-27 02:50:54.653635'),(33,'organizations','0001_initial','2018-06-27 02:50:54.711299'),(34,'post_office','0001_initial','2018-06-27 02:50:55.643107'),(35,'post_office','0002_add_i18n_and_backend_alias','2018-06-27 02:50:56.150930'),(36,'post_office','0003_longer_subject','2018-06-27 02:50:56.364985'),(37,'post_office','0004_auto_20160607_0901','2018-06-27 02:50:57.322806'),(38,'post_office','0005_auto_20170515_0013','2018-06-27 02:50:57.365993'),(39,'post_office','0006_attachment_mimetype','2018-06-27 02:50:57.422628'),(40,'profile','0001_initial','2018-06-27 02:50:57.558227'),(41,'registration','0001_initial','2018-06-27 02:50:57.592740'),(42,'revision_tag','0001_initial','2018-06-27 02:50:57.758820'),(43,'role_permissions','0001_initial','2018-06-27 02:50:57.787048'),(44,'sessions','0001_initial','2018-06-27 02:50:57.841607'),(45,'share','0001_initial','2018-06-27 02:50:58.624777'),(46,'sysadmin_extra','0001_initial','2018-06-27 02:50:58.697467'),(47,'termsandconditions','0001_initial','2018-06-27 02:50:59.022414'),(48,'trusted_ip','0001_initial','2018-06-27 02:50:59.072886'),(49,'two_factor','0001_initial','2018-06-27 02:50:59.564555'),(50,'wiki','0001_initial','2018-06-27 02:50:59.644137'),(51,'wiki','0002_auto_20180326_0548','2018-06-27 02:50:59.738217'),(52,'wiki','0003_auto_20180428_0619','2018-06-27 02:50:59.776448');
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
  KEY `options_useroptions_email_77d5726a` (`email`)
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
  KEY `profile_profile_contact_email_0975e4bf` (`contact_email`),
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

