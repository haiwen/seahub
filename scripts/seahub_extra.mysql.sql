CREATE TABLE IF NOT EXISTS `pubfile_grouppublicfile` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `path` varchar(4096) NOT NULL,
  `is_dir` tinyint(1) NOT NULL,
  `added_by` varchar(256) NOT NULL,
  `description` varchar(1024) NOT NULL,
  `download_count` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pubfile_grouppublicfile_dc00373b` (`group_id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `sysadmin_extra_userloginlog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `login_date` datetime NOT NULL,
  `login_ip` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sysadmin_extra_userloginlog_ee0cafa2` (`username`),
  KEY `sysadmin_extra_userloginlog_c8db99ec` (`login_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
