CREATE TABLE IF NOT EXISTS `org_saml_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) NOT NULL,
  `metadata_url` longtext NOT NULL,
  `domain` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `org_id` (`org_id`),
  UNIQUE KEY `domain` (`domain`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `base_usermonitoredrepos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(254) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `timestamp` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `base_usermonitoredrepos_email_repo_id_b4ab00e4_uniq` (`email`,`repo_id`),
  KEY `base_usermonitoredrepos_email_55ead1b9` (`email`),
  KEY `base_usermonitoredrepos_repo_id_00e624c3` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `organizations_orgadminsettings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) NOT NULL,
  `key` varchar(255) NOT NULL,
  `value` longtext NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organizations_orgadminsettings_org_id_key_a01cc7de_uniq` (`org_id`,`key`),
  KEY `organizations_orgadminsettings_org_id_4f70d186` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
