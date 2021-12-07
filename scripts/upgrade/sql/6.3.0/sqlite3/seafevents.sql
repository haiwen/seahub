CREATE INDEX IF NOT EXISTS ix_event_timestamp ON Event (timestamp);
CREATE INDEX IF NOT EXISTS ix_FileAudit_timestamp ON FileAudit (timestamp);
CREATE INDEX IF NOT EXISTS ix_FileUpdate_timestamp ON FileUpdate (timestamp);
CREATE INDEX IF NOT EXISTS ix_UserTrafficStat_month ON UserTrafficStat (month);
