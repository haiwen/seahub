CREATE TABLE IF NOT EXISTS `history_name` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_uuid` varchar(36) NOT NULL,
  `obj_id` varchar(40) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `history_name_doc_uuid` (`doc_uuid`),
  UNIQUE KEY `history_name_doc_uuid_obj_id` (`doc_uuid`, `obj_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sdoc_draft` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_uuid` varchar(36) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sdoc_draft_doc_uuid` (`doc_uuid`),
  KEY `sdoc_draft_repo_id` (`repo_id`),
  KEY `sdoc_draft_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sdoc_revision` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `revision_id` int(11) NOT NULL,
  `doc_uuid` varchar(36) NOT NULL,
  `origin_doc_uuid` varchar(36) NOT NULL,
  `origin_doc_path` longtext NOT NULL,
  `origin_file_version` varchar(100) NOT NULL,
  `publish_file_version` varchar(100) DEFAULT NULL,
  `username` varchar(255) NOT NULL,
  `publisher` varchar(255) DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sdoc_revision_doc_uuid` (`doc_uuid`),
  UNIQUE KEY `sdoc_revision_repo_id_revision_id` (`repo_id`, `revision_id`),
  KEY `sdoc_revision_repo_id` (`repo_id`),
  KEY `sdoc_revision_origin_doc_uuid` (`origin_doc_uuid`),
  KEY `sdoc_revision_username` (`username`),
  KEY `sdoc_revision_is_published` (`is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sdoc_comment_reply` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `author` varchar(255) NOT NULL,
  `reply` longtext NOT NULL,
  `type` varchar(36) NOT NULL,
  `comment_id` int(11) NOT NULL,
  `doc_uuid` varchar(36) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `sdoc_comment_reply_comment_id` (`comment_id`),
  KEY `sdoc_comment_reply_doc_uuid` (`doc_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `deleted_files_count` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `deleted_time` datetime NOT NULL,
  `files_count` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_deleted_files_count_repo_id` (`repo_id`),
  KEY `ix_deleted_files_count_deleted_time` (`deleted_time`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `sdoc_notification` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_uuid` varchar(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `msg_type` varchar(36) NOT NULL,
  `created_at` datetime NOT NULL,
  `detail` longtext NOT NULL,
  `seen` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `sdoc_notification_doc_uuid_username` (`doc_uuid`, `username`),
  KEY `sdoc_notification_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `base_clientssotoken` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(100) NOT NULL,
  `username` varchar(255) DEFAULT NULL,
  `status` varchar(10) NOT NULL,
  `api_key` varchar(40) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `accessed_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `base_clientssotoken_username_651ec6b5` (`username`),
  KEY `base_clientssotoken_created_at_d185d3e0` (`created_at`),
  KEY `base_clientssotoken_updated_at_591fc2cd` (`updated_at`),
  KEY `base_clientssotoken_accessed_at_cdc66bf3` (`accessed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `share_uploadlinkshare` ADD INDEX IF NOT EXISTS `share_uploadlinkshare_expire_date` (`expire_date`);

ALTER TABLE share_fileshare MODIFY COLUMN path longtext NOT NULL COLLATE utf8mb4_bin;

ALTER TABLE options_useroptions MODIFY option_val VARCHAR(512) NOT NULL;

ALTER TABLE `org_saml_config` CHANGE domain domain varchar(255) DEFAULT NULL;
ALTER TABLE `org_saml_config` ADD COLUMN IF NOT EXISTS `dns_txt` varchar(64) NULL;
ALTER TABLE `org_saml_config` ADD COLUMN IF NOT EXISTS `domain_verified` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `org_saml_config` ADD INDEX IF NOT EXISTS `org_saml_config_domain_verified_398065b9` (`domain_verified`);
UPDATE `org_saml_config` SET domain_verified=1 WHERE domain_verified=0;

ALTER TABLE `social_auth_usersocialauth` CHANGE extra_data extra_data longtext DEFAULT NULL;
