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

CREATE TABLE `ai_review_task` (
  `id` char(36) NOT NULL,
  `chat_session_id` varchar(36) NOT NULL,
  `assistant_message_id` bigint(20) DEFAULT NULL,
  `repo_id` varchar(36) NOT NULL,
  `path` longtext NOT NULL,
  `file_uuid` varchar(36) NOT NULL,
  `requester` varchar(255) NOT NULL,
  `prompt` longtext NOT NULL,
  `route` varchar(32) NOT NULL,
  `org_id` bigint(20) DEFAULT NULL,
  `message_id` varchar(4) DEFAULT NULL,
  `generation_status` varchar(32) NOT NULL,
  `generation_revision` int(11) NOT NULL,
  `generation_attempt_id` char(36) DEFAULT NULL,
  `generation_deadline_at` datetime(6) DEFAULT NULL,
  `error_code` varchar(64) DEFAULT NULL,
  `total_chunks` int(11) NOT NULL,
  `completed_chunks` int(11) NOT NULL,
  `total_review_blocks` int(11) NOT NULL,
  `completed_review_blocks` int(11) NOT NULL,
  `generation_truncated` tinyint(1) NOT NULL,
  `generation_stop_reason` varchar(64) DEFAULT NULL,
  `generation_finished_at` datetime(6) DEFAULT NULL,
  `base_sdoc_version` bigint(20) DEFAULT NULL,
  `current_changeset_revision_id` char(36) DEFAULT NULL,
  `current_card_revision_id` char(36) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_review_task_assistant_message_id` (`assistant_message_id`),
  KEY `ai_review_task_chat_session_id` (`chat_session_id`),
  KEY `ai_review_task_repo_id` (`repo_id`),
  KEY `ai_review_task_file_uuid` (`file_uuid`),
  KEY `ai_review_task_generation_status` (`generation_status`),
  KEY `ai_review_task_generation_attempt_id` (`generation_attempt_id`),
  KEY `ai_review_task_current_changeset_revision_id` (`current_changeset_revision_id`),
  KEY `ai_review_task_current_card_revision_id` (`current_card_revision_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `ai_review_changeset_revision` (
  `id` char(36) NOT NULL,
  `review_task_id` char(36) NOT NULL,
  `changeset_revision` int(11) NOT NULL,
  `snapshot_id` varchar(36) NOT NULL,
  `file_uuid` varchar(36) NOT NULL,
  `document_incarnation` varchar(36) NOT NULL,
  `exact_sdoc_version` bigint(20) NOT NULL,
  `projection_version` varchar(64) NOT NULL,
  `scope_summary` longtext NOT NULL,
  `revision_brief` json NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_review_changeset_revision_task_rev` (`review_task_id`,`changeset_revision`),
  KEY `ai_review_changeset_revision_file_uuid` (`file_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `ai_review_generation_chunk` (
  `id` char(36) NOT NULL,
  `review_task_id` char(36) NOT NULL,
  `generation_attempt_id` char(36) NOT NULL,
  `chunk_index` int(11) NOT NULL,
  `block_count` int(11) NOT NULL,
  `created_item_count` int(11) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_review_generation_chunk_attempt_index` (`review_task_id`,`generation_attempt_id`,`chunk_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `ai_review_change_item` (
  `id` char(36) NOT NULL,
  `item_id` char(36) NOT NULL,
  `changeset_revision_id` char(36) NOT NULL,
  `logical_item_id` char(36) DEFAULT NULL,
  `kind` varchar(64) NOT NULL,
  `target` json NOT NULL,
  `precondition` json NOT NULL,
  `preview` json NOT NULL,
  `after_text` longtext NOT NULL,
  `after_type` varchar(64) DEFAULT NULL,
  `rationale` longtext NOT NULL,
  `sort_order` int(11) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_review_change_item_rev_item` (`changeset_revision_id`,`item_id`),
  KEY `ai_review_change_item_item_id` (`item_id`),
  KEY `ai_review_change_item_logical_item_id` (`logical_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `ai_review_card_revision` (`id` char(36) NOT NULL, `review_task_id` char(36) NOT NULL, `changeset_revision_id` char(36) NOT NULL, `card_revision` int(11) NOT NULL, `supersedes_decision_id` char(36) DEFAULT NULL, `created_at` datetime(6) NOT NULL, PRIMARY KEY (`id`), UNIQUE KEY `ai_review_card_revision_task_rev` (`review_task_id`,`card_revision`), KEY `ai_review_card_revision_changeset_revision_id` (`changeset_revision_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `ai_review_card_revision_item` (`id` char(36) NOT NULL, `card_revision_item_id` char(36) NOT NULL, `card_revision_id` char(36) NOT NULL, `change_item_id` char(36) NOT NULL, `reviewable` tinyint(1) NOT NULL, `conflicted` tinyint(1) NOT NULL, `selectable` tinyint(1) NOT NULL, `conflict_summary` longtext DEFAULT NULL, `created_at` datetime(6) NOT NULL, PRIMARY KEY (`id`), UNIQUE KEY `ai_review_card_rev_item_membership` (`card_revision_id`,`change_item_id`), KEY `ai_review_card_rev_item_card_item_id` (`card_revision_item_id`), KEY `ai_review_card_rev_item_change_item_id` (`change_item_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `ai_review_decision` (`id` char(36) NOT NULL, `review_decision_id` char(36) NOT NULL, `card_revision_id` char(36) NOT NULL, `decision_kind` varchar(16) NOT NULL, `selection_digest` varchar(64) NOT NULL, `operator` varchar(255) NOT NULL, `created_at` datetime(6) NOT NULL, PRIMARY KEY (`id`), UNIQUE KEY `ai_review_decision_review_decision_id` (`review_decision_id`), KEY `ai_review_decision_card_revision_id` (`card_revision_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `ai_review_decision_selection` (`id` char(36) NOT NULL, `decision_id` char(36) NOT NULL, `card_revision_item_id` char(36) NOT NULL, PRIMARY KEY (`id`), UNIQUE KEY `ai_review_decision_selection_decision_item` (`decision_id`,`card_revision_item_id`), KEY `ai_review_decision_selection_card_revision_item_id` (`card_revision_item_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `ai_review_apply_attempt` (`id` char(36) NOT NULL, `apply_attempt_id` char(36) NOT NULL, `review_decision_id` char(36) NOT NULL, `status` varchar(32) NOT NULL, `persistence_status` varchar(32) NOT NULL, `verification_status` varchar(32) NOT NULL, `approved_by` varchar(255) NOT NULL, `selection_digest` varchar(64) NOT NULL, `apply_payload_digest` varchar(64) NOT NULL, `card_revision_number` int(11) NOT NULL, `changeset_revision_number` int(11) NOT NULL, `snapshot_id` varchar(36) NOT NULL, `document_incarnation` varchar(36) NOT NULL, `applied_sdoc_version` bigint(20) DEFAULT NULL, `operation_log_correlation_id` varchar(36) DEFAULT NULL, `result_query_deadline_at` datetime(6) DEFAULT NULL, `error_code` varchar(64) DEFAULT NULL, `created_at` datetime(6) NOT NULL, `updated_at` datetime(6) NOT NULL, PRIMARY KEY (`id`), UNIQUE KEY `ai_review_apply_attempt_apply_attempt_id` (`apply_attempt_id`), UNIQUE KEY `ai_review_apply_attempt_review_decision_id` (`review_decision_id`), KEY `ai_review_apply_attempt_status` (`status`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


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

ALTER TABLE social_auth_usersocialauth
MODIFY COLUMN provider varchar(32)
  CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
MODIFY COLUMN uid varchar(255)
  CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;

ALTER TABLE `repo_metadata`
  ADD COLUMN `ai_processing_status` VARCHAR(32) NOT NULL DEFAULT '';
