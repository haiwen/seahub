CREATE TABLE IF NOT EXISTS `user_quota_usage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `org_id` int(11) NOT NULL,
  `quota` bigint(20) DEFAULT NULL,
  `usage` bigint(20) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_quota_usage_username` (`username`),
  KEY `idx_user_quota_usage_timestamp` (`timestamp`),
  KEY `idx_user_quota_usage_org_id` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `org_quota_usage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) NOT NULL,
  `quota` bigint(20) DEFAULT NULL,
  `usage` bigint(20) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_org_quota_usage_org_id` (`org_id`),
  KEY `idx_org_quota_usage_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
