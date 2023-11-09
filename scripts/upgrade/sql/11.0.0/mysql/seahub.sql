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

CREATE TABLE IF NOT EXISTS `sdoc_notification` (
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


ALTER TABLE `share_uploadlinkshare` ADD INDEX IF NOT EXISTS `share_uploadlinkshare_expire_date` (`expire_date`);

ALTER TABLE share_fileshare MODIFY COLUMN path longtext NOT NULL COLLATE utf8mb4_bin;
