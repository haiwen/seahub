CREATE TABLE IF NOT EXISTS `drafts_draft` (
  `id` int(11) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `username` varchar(255) NOT NULL,
  `origin_repo_id` varchar(36) NOT NULL,
  `origin_file_version` varchar(100) NOT NULL,
  `draft_file_path` varchar(1024) NOT NULL,
  `origin_file_uuid` char(32) NOT NULL,
  `publish_file_version` varchar(100) DEFAULT NULL,
  `status` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `drafts_draft_origin_file_uuid_id_f150319e_fk_tags_file` (`origin_file_uuid`),
  KEY `drafts_draft_created_at_e9f4523f` (`created_at`),
  KEY `drafts_draft_updated_at_0a144b05` (`updated_at`),
  KEY `drafts_draft_username_73e6738b` (`username`)
) ENGINE=InnoDB	DEFAULT CHARSET=utf8;
    
CREATE TABLE IF NOT EXISTS `drafts_draftreviewer` (
  `id` int(11) NOT NULL,
  `reviewer` varchar(255) NOT NULL,
  `draft_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `drafts_draftreviewer_reviewer_e4c777ac` (`reviewer`),
  KEY `drafts_draftreviewer_draft_id_4ea59775_fk_drafts_draft_id` (`draft_id`),
  CONSTRAINT `drafts_draftreviewer_draft_id_4ea59775_fk_drafts_draft_id` FOREIGN KEY (`draft_id`) REFERENCES `drafts_draft` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

ALTER TABLE `options_useroptions` ADD INDEX `options_useroptions_option_key_7bf7ae4b` (`option_key`);

ALTER TABLE TotalStorageStat DROP primary key;
ALTER TABLE TotalStorageStat ADD `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;
ALTER TABLE TotalStorageStat ADD `org_id` INT NOT NULL DEFAULT -1;
ALTER TABLE TotalStorageStat ADD INDEX `idx_storage_time_org` (`timestamp`, `org_id`);

ALTER TABLE FileOpsStat ADD `org_id` INT NOT NULL DEFAULT -1;
ALTER TABLE FileOpsStat ADD INDEX `idx_file_ops_time_org` (`timestamp`, `org_id`);

ALTER TABLE UserActivityStat DROP primary key;
ALTER TABLE UserActivityStat ADD `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;
ALTER TABLE UserActivityStat ADD UNIQUE (name_time_md5);
ALTER TABLE UserActivityStat ADD `org_id` INT NOT NULL DEFAULT -1;
ALTER TABLE UserActivityStat ADD INDEX `idx_activity_time_org` (`timestamp`, `org_id`);

DROP TABLE UserTrafficStat;



CREATE TABLE IF NOT EXISTS `repo_tags_repotags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `repo_tags_repotags_repo_id_1163a48f` (`repo_id`),
  KEY `repo_tags_repotags_name_3f4c9027` (`name`),
  KEY `repo_tags_repotags_color_1292b6c1` (`color`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



CREATE TABLE IF NOT EXISTS `file_tags_filetags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file_uuid_id` char(32) NOT NULL,
  `repo_tag_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `file_tags_filetags_file_uuid_id_e30f0ec8_fk_tags_file` (`file_uuid_id`),
  KEY `file_tags_filetags_repo_tag_id_c39660cb_fk_repo_tags_repotags_id` (`repo_tag_id`),
  CONSTRAINT `file_tags_filetags_file_uuid_id_e30f0ec8_fk_tags_file` FOREIGN KEY (`file_uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`),
  CONSTRAINT `file_tags_filetags_repo_tag_id_c39660cb_fk_repo_tags_repotags_id` FOREIGN KEY (`repo_tag_id`) REFERENCES `repo_tags_repotags` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



CREATE TABLE IF NOT EXISTS `related_files_relatedfiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `o_uuid_id` char(32) NOT NULL,
  `r_uuid_id` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `related_files_relate_o_uuid_id_aaa8e613_fk_tags_file` (`o_uuid_id`),
  KEY `related_files_relate_r_uuid_id_031751df_fk_tags_file` (`r_uuid_id`),
  CONSTRAINT `related_files_relate_o_uuid_id_aaa8e613_fk_tags_file` FOREIGN KEY (`o_uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`),
  CONSTRAINT `related_files_relate_r_uuid_id_031751df_fk_tags_file` FOREIGN KEY (`r_uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



CREATE TABLE IF NOT EXISTS `organizations_orgsettings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `org_id` int(11) NOT NULL,
  `role` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organizations_orgsettings_org_id_630f6843_uniq` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP INDEX `profile_profile_contact_email_0975e4bf_uniq` ON `profile_profile`;
ALTER TABLE `profile_profile` ADD CONSTRAINT `profile_profile_contact_email_0975e4bf_uniq` UNIQUE (`contact_email`);

CREATE TABLE IF NOT EXISTS `social_auth_usersocialauth` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `provider` varchar(32) NOT NULL,
  `uid` varchar(150) NOT NULL,
  `extra_data` longtext NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `social_auth_usersocialauth_provider_uid_e6b5e668_uniq` (`provider`,`uid`),
  KEY `social_auth_usersocialauth_username_3f06b5cf` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



ALTER TABLE `base_filecomment` ADD `detail` LONGTEXT DEFAULT NULL;
ALTER TABLE `base_filecomment` ADD `resolved` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `base_filecomment` ADD INDEX `resolved` (`resolved`);



CREATE TABLE IF NOT EXISTS `base_reposecretkey` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `secret_key` varchar(44) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

