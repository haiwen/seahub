CREATE TABLE IF NOT EXISTS `repo_archive_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `repo_id` varchar(36) NOT NULL,
  `status` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_repo_archive_status_repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP INDEX IF EXISTS `ix_FileAudit_user` ON `FileAudit`;
DROP INDEX IF EXISTS `ix_FileAudit_repo_id` ON `FileAudit`;

ALTER TABLE `Activity` ADD INDEX `idx_activity_repo_timestamp` (`repo_id`, `timestamp`);

ALTER TABLE `FileHistory` ADD INDEX `ix_FileHistory_repo_id_path_md5` (`repo_id_path_md5`);
ALTER TABLE `FileAudit` ADD INDEX `idx_file_audit_orgid_eid` (`org_id`,`eid`);
ALTER TABLE `FileUpdate` ADD INDEX `idx_file_update_orgid_eid` (`org_id`,`eid`);

DROP INDEX IF EXISTS `idx_file_ops_time_org` ON `FileOpsStat`;
ALTER TABLE `FileOpsStat` ADD INDEX `idx_file_ops_org_time` (`org_id`,`timestamp`);

ALTER TABLE `PermAudit` ADD INDEX `idx_perm_audit_orgid_eid` (`org_id`,`eid`);
ALTER TABLE `PermAudit` ADD INDEX `ix_perm_audit_timestamp` (`timestamp`);

ALTER TABLE `VirusFile` ADD INDEX `ix_VirusFile_repo_id` (`repo_id`);
