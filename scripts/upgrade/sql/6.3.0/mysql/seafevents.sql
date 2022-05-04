ALTER TABLE Event ADD INDEX `ix_event_timestamp` (`timestamp`);
ALTER TABLE FileAudit ADD INDEX `ix_FileAudit_timestamp` (`timestamp`);
ALTER TABLE FileUpdate ADD INDEX `ix_FileUpdate_timestamp` (`timestamp`);
ALTER TABLE UserTrafficStat ADD INDEX `ix_UserTrafficStat_month` (`month`);
