ALTER TABLE `api2_tokenv2` CHANGE COLUMN `device_name` `device_name` varchar(40) CHARACTER SET 'utf8mb4' COLLATE utf8mb4_unicode_ci NOT NULL;

CREATE TABLE `custom_share_permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(500) NOT NULL,
  `permission` longtext NOT NULL,
  PRIMARY KEY (`id`),
  KEY `custom_share_permission_repo_id_578fe49f` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `ocm_via_webdav_received_shares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `description` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `owner_display_name` varchar(255) DEFAULT NULL,
  `protocol_name` varchar(255) NOT NULL,
  `shared_secret` varchar(255) NOT NULL,
  `permissions` varchar(255) NOT NULL,
  `provider_id` varchar(255) NOT NULL,
  `resource_type` varchar(255) NOT NULL,
  `share_type` varchar(255) NOT NULL,
  `share_with` varchar(255) NOT NULL,
  `shared_by` varchar(255) NOT NULL,
  `shared_by_display_name` varchar(255) DEFAULT NULL,
  `ctime` datetime(6) NOT NULL,
  `is_dir` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ocm_via_webdav_share_received_owner_261eaa70` (`owner`),
  KEY `ocm_via_webdav_share_received_shared_secret_fbb6be5a` (`shared_secret`),
  KEY `ocm_via_webdav_share_received_provider_id_a55680e9` (`provider_id`),
  KEY `ocm_via_webdav_share_received_resource_type_a3c71b57` (`resource_type`),
  KEY `ocm_via_webdav_share_received_share_type_7615aaab` (`share_type`),
  KEY `ocm_via_webdav_share_received_share_with_5a23eb17` (`share_with`),
  KEY `ocm_via_webdav_share_received_shared_by_1786d580` (`shared_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `onlyoffice_onlyofficedockey` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_key` varchar(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `file_path` longtext NOT NULL,
  `repo_id_file_path_md5` varchar(100) NOT NULL,
  `created_time` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `onlyoffice_onlyofficedockey_doc_key_edba1352` (`doc_key`),
  KEY `onlyoffice_onlyofficedockey_repo_id_file_path_md5_52002073` (`repo_id_file_path_md5`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

ALTER TABLE `onlyoffice_onlyofficedockey` DROP INDEX `onlyoffice_onlyofficedockey_repo_id_file_path_md5_52002073`;

ALTER TABLE `onlyoffice_onlyofficedockey` ADD UNIQUE (repo_id_file_path_md5);
