ALTER TABLE `share_fileshare` MODIFY token varchar(100);
ALTER TABLE `share_fileshare` ADD COLUMN `permission` varchar(50) NOT NULL DEFAULT 'view_download';
ALTER TABLE `share_uploadlinkshare` MODIFY token varchar(100);

CREATE TABLE IF NOT EXISTS `institutions_institutionquota` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quota` bigint(20) NOT NULL,
  `institution_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `i_institution_id_2ca7c89373390e2c_fk_institutions_institution_id` (`institution_id`),
  CONSTRAINT `i_institution_id_2ca7c89373390e2c_fk_institutions_institution_id` FOREIGN KEY (`institution_id`) REFERENCES `institutions_institution` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `admin_log_adminlog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(254) NOT NULL,
  `operation` varchar(255) NOT NULL,
  `detail` longtext NOT NULL,
  `datetime` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_log_adminlog_0c83f57c` (`email`),
  KEY `admin_log_adminlog_f7235a61` (`operation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;