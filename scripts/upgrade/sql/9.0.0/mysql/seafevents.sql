ALTER TABLE `FileAudit` ADD INDEX `ix_FileAudit_user` (`user`);
ALTER TABLE `FileAudit` ADD INDEX `ix_FileAudit_repo_id` (`repo_id`);
