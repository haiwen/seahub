CREATE TABLE IF NOT EXISTS `wiki_wiki2`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `owner` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `wiki_owner_repo_id_4c8925af_uniq`(`owner`, `repo_id`),
  KEY `wiki_wiki_created_at_54930e36`(`created_at`),
  KEY `wiki_wiki_repo_id_2ee93c31`(`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `WikiPageTrash` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `doc_uuid` text NOT NULL,
  `page_id` varchar(4) NOT NULL,
  `parent_page_id` varchar(4) default NULL,
  `subpages` longtext,
  `name` varchar(255) NOT NULL,
  `delete_time` datetime NOT NULL,
  `size` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_WikiPageTrash_repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `FileTrash` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `obj_type` varchar(10) NOT NULL,
  `obj_id` varchar(40) NOT NULL,
  `obj_name` varchar(255) NOT NULL,
  `delete_time` datetime NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `commit_id` varchar(40) DEFAULT NULL,
  `path` text NOT NULL,
  `size` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_FileTrash_repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `repo_metadata`  (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `repo_id` VARCHAR(36) NOT NULL,
  `enabled` TINYINT(1) NOT NULL,
  `face_recognition_enabled` TINYINT(1) NULL,
  `last_face_cluster_time` DATETIME NULL,
  `modified_time` DATETIME NOT NULL,
  `created_time` DATETIME NOT NULL,
  `from_commit` varchar(40) NULL,
  `to_commit` varchar(40) NULL,
  UNIQUE KEY `key_repo_metadata_repo_id`(`repo_id`),
  KEY `key_repo_metadata_enabled`(`enabled`),
  KEY `key_repo_metadata_face_recognition_enabled`(`face_recognition_enabled`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `repo_metadata_view` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `details` longtext NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_repo_meatadata_view_repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `sdoc_operation_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_uuid` varchar(36) NOT NULL,
  `op_id` bigint(20) NOT NULL,
  `op_time` bigint(20) NOT NULL,
  `operations` longtext NOT NULL,
  `author` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sdoc_operation_log_op_time` (`op_time`),
  KEY `sdoc_operation_log_doc_uuid` (`doc_uuid`),
  KEY `sdoc_idx_operation_log_doc_uuid_op_id` (`doc_uuid`,`op_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `wiki_wiki2_publish` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `publish_url` varchar(40) DEFAULT NULL,
  `username` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `visit_count` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `repo_id` (`repo_id`),
  UNIQUE KEY `publish_url` (`publish_url`),
  KEY `ix_wiki2_publish_repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE share_fileshare ADD COLUMN `user_scope` varchar(225) DEFAULT 'all_users';
ALTER TABLE share_fileshare ADD COLUMN `authed_details` LONGTEXT DEFAULT NULL;
ALTER TABLE share_fileshare ADD INDEX `idx_ctime` (`ctime`);
ALTER TABLE share_fileshare ADD INDEX `idx_view_cnt` (`view_cnt`);

ALTER TABLE profile_profile ADD COLUMN `is_manually_set_contact_email` tinyint(1) DEFAULT 0;
