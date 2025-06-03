CREATE TABLE IF NOT EXISTS `repo_extra_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `config_type` varchar(50) NOT NULL,
  `config_details` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_repo_extra_repo_id` (`repo_id`),
  UNIQUE KEY `ix_repo_extra_repo_idconfig_type` (`repo_id`, `config_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `RepoTransfer` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `org_id` int(11) NOT NULL,
  `from_user` varchar(255) NOT NULL,
  `to` varchar(255) NOT NULL,
  `timestamp` datetime NOT NULL,
  `operator` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_file_transfer_org_id` (`org_id`),
  KEY `idx_file_transfer_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `group_invite_link` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(40) NOT NULL,
  `group_id` int(11) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `group_invite_link_group_id` (`group_id`),
  KEY `group_invite_link_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `org_last_active_time` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) NOT NULL,
  `timestamp` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `org_id` (`org_id`),
  KEY `ix_org_last_active_time_org_id` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `group_member_audit` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) NOT NULL,
  `operator` varchar(255) NOT NULL,
  `user` varchar(255) NOT NULL,
  `group_id` int(11) NOT NULL,
  `operation` varchar(128) NOT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_group_member_audit_org_id` (`org_id`),
  KEY `idx_group_member_audit_timestamp` (`timestamp`),
  KEY `idx_group_member_audit_operator` (`operator`),
  KEY `idx_group_member_audit_user` (`user`),
  KEY `idx_group_member_audit_group_id` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `notifications_sysusernotification` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message` longtext NOT NULL,
  `to_user` varchar(255) NOT NULL,
  `seen` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_sysusernotification_to_user_e0c9101e` (`to_user`),
  KEY `notifications_sysusernotification_seen_9d851bf7` (`seen`),
  KEY `notifications_sysusernotification_created_at_56ffd2a0` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `stats_ai_by_team` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `org_id` bigint(20) NOT NULL,
  `month` date NOT NULL,
  `model` varchar(100) NOT NULL,
  `input_tokens` int(11) DEFAULT NULL,
  `output_tokens` int(11) DEFAULT NULL,
  `cost` double NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stats_ai_by_team_org_id_month_model` (`org_id`,`month`,`model`),
  KEY `ix_stats_ai_by_team_org_id_month` (`org_id`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `stats_ai_by_owner` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `month` date NOT NULL,
  `model` varchar(100) NOT NULL,
  `input_tokens` int(11) DEFAULT NULL,
  `output_tokens` int(11) DEFAULT NULL,
  `cost` double NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stats_ai_by_owner_username_month_model` (`username`,`month`,`model`),
  KEY `ix_stats_ai_by_owner_username_month` (`username`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `sdoc_notification` ADD INDEX `idx_user_seen` (`username`, `seen`);

ALTER TABLE organizations_orgsettings ADD COLUMN `is_active` tinyint(1) NOT NULL DEFAULT 1;

ALTER TABLE repo_metadata ADD COLUMN tags_enabled tinyint(1) NULL;
ALTER TABLE repo_metadata ADD COLUMN tags_lang varchar(36) NULL;
ALTER TABLE repo_metadata ADD COLUMN details_settings longtext NULL;
ALTER TABLE repo_metadata ADD COLUMN ocr_enabled tinyint(1) NULL;
ALTER TABLE repo_metadata ADD COLUMN global_hidden_columns longtext DEFAULT NULL;
ALTER TABLE `repo_metadata` ADD KEY `key_last_face_cluster_time_face_recognition_enabled`(`face_recognition_enabled`, `last_face_cluster_time`);

ALTER TABLE share_fileshare ADD COLUMN `description` LONGTEXT DEFAULT NULL;
