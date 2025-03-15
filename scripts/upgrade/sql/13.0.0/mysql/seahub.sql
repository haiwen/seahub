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

ALTER TABLE `sdoc_notification` ADD INDEX `idx_user_seen` (`username`, `seen`);

ALTER TABLE organizations_orgsettings ADD COLUMN `is_active` tinyint(1) NOT NULL DEFAULT 1;
