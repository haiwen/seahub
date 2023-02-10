CREATE TABLE IF NOT EXISTS `org_saml_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) NOT NULL,
  `metadata_url` longtext NOT NULL,
  `single_sign_on_service` longtext NOT NULL,
  `single_logout_service` longtext NOT NULL,
  `valid_days` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `org_id` (`org_id`)
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
