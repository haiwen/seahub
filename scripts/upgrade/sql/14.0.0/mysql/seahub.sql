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
  `name` varchar(255) DEFAULT NULL,
  `linked_repo_id` varchar(255) DEFAULT NULL,
  `details` longtext NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_wiki_file_views_wiki_id` (`wiki_id`,`name`)
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
KEY `webhook_jobs_status_key` (`status`)
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

CREATE TABLE `chat_sessions` (
  `id` bigint(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `session_uuid` varchar(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `session_name` varchar(255) NOT NULL,
  `is_shared` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_session_uuid` (`session_uuid`),
  KEY `idx_repo_id_is_shared` (`repo_id`,`is_shared`),
  KEY `idx_chat_sessions_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `chat_messages` (
  `id` bigint(11) NOT NULL AUTO_INCREMENT,
  `session_uuid` varchar(36) NOT NULL,
  `message_id` varchar(4) DEFAULT NULL,
  `role` varchar(20) NOT NULL,
  `content` longtext DEFAULT NULL,
  `attachments` longtext DEFAULT NULL,
  `sources` longtext DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_session_uuid_message_id_role` (`session_uuid`, `message_id`, `role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `chat_message_thought_process` (
  `id` bigint(11) NOT NULL AUTO_INCREMENT,
  `session_uuid` varchar(36) DEFAULT NULL,
  `message_id` varchar(4) DEFAULT NULL,
  `thought_process` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_session_uuid_message_id` (`session_uuid`,`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


ALTER TABLE `organizations_orgsettings` ADD COLUMN `monthly_traffic_limit` bigint(20) NOT NULL;
ALTER TABLE `share_uploadlinkshare` ADD COLUMN `description` LONGTEXT;
ALTER TABLE `share_fileshare` ADD COLUMN `description` LONGTEXT;
ALTER TABLE notifications_usernotification ADD INDEX idx_usernotification_user_seen (to_user, seen);
ALTER TABLE `Activity` ADD INDEX `idx_activity_repo_timestamp` (`repo_id`, `timestamp`);
ALTER TABLE `FileHistory` ADD INDEX `ix_FileHistory_repo_id_path_md5` (`repo_id_path_md5`);
ALTER TABLE `FileAudit` ADD INDEX `idx_file_audit_orgid_eid` (`org_id`,`eid`);
ALTER TABLE `FileUpdate` ADD INDEX `idx_file_update_orgid_eid` (`org_id`,`eid`);
ALTER TABLE `FileOpsStat` ADD INDEX `idx_file_ops_org_time` (`org_id`,`timestamp`);
ALTER TABLE `PermAudit` ADD INDEX `idx_perm_audit_orgid_eid` (`org_id`,`eid`);
ALTER TABLE `PermAudit` ADD INDEX `ix_perm_audit_timestamp` (`timestamp`);
ALTER TABLE `VirusFile` ADD INDEX `ix_VirusFile_repo_id` (`repo_id`);
ALTER TABLE `FileTrash` ADD INDEX `idx_filetrash_delete_time` (`delete_time`);
ALTER TABLE `FileTrash` ADD INDEX `idx_filetrash_repo_delete_time` (`repo_id`, `delete_time`);
ALTER TABLE wiki_wiki2_publish ADD COLUMN `enable_server_render` tinyint(1) NOT NULL DEFAULT 0;

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
DROP INDEX `ix_FileTrash_repo_id` ON `FileTrash`;
DROP INDEX `ix_FileAudit_user` ON `FileAudit`;
DROP INDEX `ix_FileAudit_repo_id` ON `FileAudit`;
DROP INDEX `idx_file_ops_time_org` ON `FileOpsStat`;
