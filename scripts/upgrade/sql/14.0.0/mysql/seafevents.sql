CREATE TABLE IF NOT EXISTS `repo_archive_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `status` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_repo_archive_status_repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;