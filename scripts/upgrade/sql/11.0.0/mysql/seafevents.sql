CREATE TABLE IF NOT EXISTS `deleted_files_count` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `deleted_time` datetime NOT NULL,
  `files_count` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_deleted_files_count_repo_id` (`repo_id`),
  KEY `ix_deleted_files_count_deleted_time` (`deleted_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `ContentScanRecord` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `commit_id` varchar(40) NOT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_ContentScanRecord_repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `ContentScanResult` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `path` text NOT NULL,
  `platform` varchar(32) NOT NULL,
  `detail` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_ContentScanResult_repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `Activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `op_type` varchar(128) NOT NULL,
  `op_user` varchar(255) NOT NULL,
  `obj_type` varchar(128) NOT NULL,
  `timestamp` datetime NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `commit_id` varchar(40) DEFAULT NULL,
  `path` text NOT NULL,
  `detail` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_Activity_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `UserActivity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `activity_id` int(11) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `activity_id` (`activity_id`),
  KEY `ix_UserActivity_timestamp` (`timestamp`),
  KEY `idx_username_timestamp` (`username`,`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `FileHistory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `op_type` varchar(128) NOT NULL,
  `op_user` varchar(255) NOT NULL,
  `timestamp` datetime NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `commit_id` varchar(40) DEFAULT NULL,
  `file_id` varchar(40) NOT NULL,
  `file_uuid` varchar(40) DEFAULT NULL,
  `path` text NOT NULL,
  `repo_id_path_md5` varchar(32) DEFAULT NULL,
  `size` bigint(20) NOT NULL,
  `old_path` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_FileHistory_file_uuid` (`file_uuid`),
  KEY `ix_FileHistory_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `FileAudit` (
  `eid` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` datetime NOT NULL,
  `etype` varchar(128) NOT NULL,
  `user` varchar(255) NOT NULL,
  `ip` varchar(45) NOT NULL,
  `device` text NOT NULL,
  `org_id` int(11) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `file_path` text NOT NULL,
  PRIMARY KEY (`eid`),
  KEY `ix_FileAudit_user` (`user`),
  KEY `idx_file_audit_user_orgid_eid` (`user`,`org_id`,`eid`),
  KEY `idx_file_audit_repo_org_eid` (`repo_id`,`org_id`,`eid`),
  KEY `ix_FileAudit_timestamp` (`timestamp`),
  KEY `ix_FileAudit_repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `FileUpdate` (
  `eid` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` datetime NOT NULL,
  `user` varchar(255) NOT NULL,
  `org_id` int(11) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `commit_id` varchar(40) NOT NULL,
  `file_oper` text NOT NULL,
  PRIMARY KEY (`eid`),
  KEY `idx_file_update_user_orgid_eid` (`user`,`org_id`,`eid`),
  KEY `ix_FileUpdate_timestamp` (`timestamp`),
  KEY `idx_file_update_repo_org_eid` (`repo_id`,`org_id`,`eid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `PermAudit` (
  `eid` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` datetime NOT NULL,
  `etype` varchar(128) NOT NULL,
  `from_user` varchar(255) NOT NULL,
  `to` varchar(255) NOT NULL,
  `org_id` int(11) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `file_path` text NOT NULL,
  `permission` varchar(15) NOT NULL,
  PRIMARY KEY (`eid`),
  KEY `idx_perm_audit_repo_org_eid` (`repo_id`,`org_id`,`eid`),
  KEY `idx_perm_audit_user_orgid_eid` (`from_user`,`org_id`,`eid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `TotalStorageStat` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` datetime NOT NULL,
  `total_size` bigint(20) NOT NULL,
  `org_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_storage_time_org` (`timestamp`,`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `FileOpsStat` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` datetime NOT NULL,
  `op_type` varchar(16) NOT NULL,
  `number` int(11) NOT NULL,
  `org_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_file_ops_time_org` (`timestamp`,`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `UserActivityStat` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name_time_md5` varchar(32) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  `org_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name_time_md5` (`name_time_md5`),
  KEY `idx_activity_time_org` (`timestamp`,`org_id`),
  KEY `ix_UserActivityStat_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `UserTraffic` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `org_id` int(11) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  `op_type` varchar(48) NOT NULL,
  `size` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_UserTraffic_org_id` (`org_id`),
  KEY `idx_traffic_time_user` (`timestamp`,`user`,`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `SysTraffic` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  `op_type` varchar(48) NOT NULL,
  `size` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_systraffic_time_org` (`timestamp`,`org_id`),
  KEY `ix_SysTraffic_org_id` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `SysTraffic` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  `op_type` varchar(48) NOT NULL,
  `size` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_systraffic_time_org` (`timestamp`,`org_id`),
  KEY `ix_SysTraffic_org_id` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `MonthlySysTraffic` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  `web_file_upload` bigint(20) NOT NULL,
  `web_file_download` bigint(20) NOT NULL,
  `sync_file_upload` bigint(20) NOT NULL,
  `sync_file_download` bigint(20) NOT NULL,
  `link_file_upload` bigint(20) NOT NULL,
  `link_file_download` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_monthlysystraffic_time_org` (`timestamp`,`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `VirusScanRecord` (
  `repo_id` varchar(36) NOT NULL,
  `scan_commit_id` varchar(40) NOT NULL,
  PRIMARY KEY (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `VirusFile` (
  `vid` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `commit_id` varchar(40) NOT NULL,
  `file_path` text NOT NULL,
  `has_deleted` tinyint(1) NOT NULL,
  `has_ignored` tinyint(1) NOT NULL,
  PRIMARY KEY (`vid`),
  KEY `ix_VirusFile_has_ignored` (`has_ignored`),
  KEY `ix_VirusFile_has_deleted` (`has_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `GroupIdLDAPUuidPair` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `group_uuid` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `group_id` (`group_id`),
  UNIQUE KEY `group_uuid` (`group_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
