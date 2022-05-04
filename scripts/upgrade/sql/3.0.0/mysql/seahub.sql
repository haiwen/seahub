CREATE TABLE IF NOT EXISTS `api2_tokenv2` (
  `key` varchar(40) NOT NULL,
  `user` varchar(255) NOT NULL,
  `platform` varchar(32) NOT NULL,
  `device_id` varchar(40) NOT NULL,
  `device_name` varchar(40) NOT NULL,
  `platform_version` varchar(16) NOT NULL,
  `client_version` varchar(16) NOT NULL,
  `last_accessed` datetime NOT NULL,
  `last_login_ip` char(39) DEFAULT NULL,
  PRIMARY KEY (`key`),
  UNIQUE KEY `user` (`user`,`platform`,`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `sysadmin_extra_userloginlog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `login_date` datetime NOT NULL,
  `login_ip` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sysadmin_extra_userloginlog_ee0cafa2` (`username`),
  KEY `sysadmin_extra_userloginlog_c8db99ec` (`login_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8
