ALTER TABLE `VirusFile` ADD COLUMN `has_ignored` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `VirusFile` CHANGE `has_handle` `has_deleted` TINYINT(1);
ALTER TABLE `VirusFile` ADD INDEX `has_deleted` (`has_deleted`);
ALTER TABLE `VirusFile` ADD INDEX `has_ignored` (`has_ignored`);
