CREATE TABLE IF NOT EXISTS `base_reposecretkey` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `secret_key` varchar(44) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


ALTER TABLE `constance_config` MODIFY `value` longtext DEFAULT NULL;
ALTER TABLE `constance_config` CHANGE `key` `constance_key` varchar(255) NOT NULL;

DROP INDEX `drafts_draft_origin_file_uuid_7c003c98_uniq` ON `drafts_draft`;
ALTER TABLE `drafts_draft` ADD CONSTRAINT `drafts_draft_origin_file_uuid_7c003c98_uniq` UNIQUE (`origin_file_uuid`);
CREATE INDEX `drafts_draft_origin_repo_id_8978ca2c` ON `drafts_draft` (`origin_repo_id`);


CREATE TABLE IF NOT EXISTS `file_participants_fileparticipant` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `uuid_id` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `file_participants_fileparticipant_uuid_id_username_c747dd36_uniq` (`uuid_id`,`username`),
  CONSTRAINT `file_participants_fi_uuid_id_861b7339_fk_tags_file` FOREIGN KEY (`uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `repo_api_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `app_name` varchar(255) NOT NULL,
  `token` varchar(40) NOT NULL,
  `generated_at` datetime NOT NULL,
  `generated_by` varchar(255) NOT NULL,
  `last_access` datetime NOT NULL,
  `permission` varchar(15) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `repo_api_tokens_repo_id_47a50fef` (`repo_id`),
  KEY `repo_api_tokens_app_name_7c395c31` (`app_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `abuse_reports_abusereport` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reporter` longtext DEFAULT NULL,
  `repo_id` varchar(36) NOT NULL,
  `repo_name` varchar(255) NOT NULL,
  `file_path` longtext DEFAULT NULL,
  `abuse_type` varchar(255) NOT NULL,
  `description` longtext DEFAULT NULL,
  `handled` tinyint(1) NOT NULL,
  `time` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `abuse_reports_abusereport_abuse_type_703d5335` (`abuse_type`),
  KEY `abuse_reports_abusereport_handled_94b8304c` (`handled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `repo_share_invitation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `path` longtext NOT NULL,
  `permission` varchar(50) NOT NULL,
  `invitation_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `repo_share_invitatio_invitation_id_b71effd2_fk_invitatio` (`invitation_id`),
  KEY `repo_share_invitation_repo_id_7bcf84fa` (`repo_id`),
  CONSTRAINT `repo_share_invitatio_invitation_id_b71effd2_fk_invitatio` FOREIGN KEY (`invitation_id`) REFERENCES `invitations_invitation` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

ALTER TABLE `post_office_attachment` add column `headers` longtext DEFAULT NULL;

