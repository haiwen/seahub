CREATE TABLE IF NOT EXISTS `repo_archive_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `status` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_repo_archive_status_repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `wiki_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wiki_id` varchar(36) NOT NULL,
  `enable_link_repos` tinyint(1) NOT NULL,
  `linked_repos` longtext,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_wiki_settings_wiki_id` (`wiki_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `wiki_file_views` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wiki_id` varchar(36) NOT NULL,
  `details` longtext NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_wiki_file_views_wiki_id` (`wiki_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `webhook_jobs` (
`id` int(11) NOT NULL AUTO_INCREMENT,
`webhook_id` int(11) NOT NULL,
`created_at` datetime,
`trigger_at` datetime DEFAULT NULL,
`status` tinyint(1) DEFAULT NULL,
`url` varchar(2000) NOT NULL,
`request_headers` text DEFAULT NULL,
`request_body` text,
`response_status` int(5) DEFAULT NULL,
`response_body` longtext DEFAULT NULL,
PRIMARY KEY (`id`),
KEY `webhook_id_key` (`webhook_id`),
KEY `status_b7n3m0x1_key` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ;


CREATE TABLE IF NOT EXISTS `webhooks` (
`id` int(11) unsigned NOT NULL AUTO_INCREMENT,
`repo_id` varchar(36) NOT NULL,
`url` varchar(2000) NOT NULL,
`settings` text DEFAULT NULL,
`creator` varchar(255) NOT NULL,
`created_at` datetime,
`is_valid` tinyint(1) DEFAULT 1,
PRIMARY KEY (`id`),
KEY `repo_id_key` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


ALTER TABLE `organizations_orgsettings` ADD COLUMN `monthly_traffic_limit` bigint(20) NOT NULL;
ALTER TABLE `share_uploadlinkshare` ADD COLUMN `description` LONGTEXT NOT NULL DEFAULT '';
ALTER TABLE `share_fileshare` ADD COLUMN `description` LONGTEXT NOT NULL DEFAULT '';
ALTER TABLE `FileTrash` ADD INDEX `idx_filetrash_repo_delete_time` (`repo_id`, `delete_time`);
ALTER TABLE `FileTrash` ADD INDEX `idx_filetrash_delete_time` (`delete_time`);
ALTER TABLE notifications_usernotification
ADD INDEX idx_usernotification_user_seen (to_user, seen);


DROP INDEX `ix_FileTrash_repo_id` ON `FileTrash`;
DROP INDEX `share_fileshare_s_type_724eb6c1` ON `share_fileshare`;
DROP INDEX `share_fileshare_permission_d12c353f` ON `share_fileshare`;
DROP INDEX `notifications_usernotification_to_user_6cadafa1` ON `notifications_usernotification`;
DROP INDEX `sdoc_revision_repo_id` ON `sdoc_revision`;
DROP INDEX `ix_wiki2_publish_repo_id` ON `wiki_wiki2_publish`;
DROP INDEX `ix_org_last_active_time_org_id` ON `org_last_active_time`;
DROP INDEX `ix_repo_extra_repo_id` ON `repo_extra_config`;
DROP INDEX `ix_stats_ai_by_team_org_id_month` ON `stats_ai_by_team`;
DROP INDEX `ix_stats_ai_by_owner_username_month` ON `stats_ai_by_owner`;
DROP INDEX `sdoc_operation_log_doc_uuid` ON `sdoc_operation_log`;
DROP INDEX `base_usermonitoredrepos_email_55ead1b9` ON `base_usermonitoredrepos`;
DROP INDEX `history_name_doc_uuid` ON `history_name`;
DROP INDEX `organizations_orgadminsettings_org_id_4f70d186` ON `organizations_orgadminsettings`;
DROP INDEX `key_repo_metadata_face_recognition_enabled` ON `repo_metadata`;
