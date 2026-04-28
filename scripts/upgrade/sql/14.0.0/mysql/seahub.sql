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