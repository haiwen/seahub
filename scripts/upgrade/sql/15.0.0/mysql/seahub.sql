ALTER TABLE `chat_messages` ADD COLUMN `artifacts` LONGTEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS `ai_chat_artifacts` (
  `id` bigint(11) NOT NULL AUTO_INCREMENT,
  `action_id` varchar(64) NOT NULL,
  `session_uuid` varchar(36) NOT NULL,
  `message_id` varchar(4) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `artifact_type` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL,
  `artifact` longtext DEFAULT NULL,
  `error_code` varchar(64) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_ai_chat_artifacts_action_id` (`action_id`),
  KEY `idx_ai_chat_artifacts_session_message` (`session_uuid`, `message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
