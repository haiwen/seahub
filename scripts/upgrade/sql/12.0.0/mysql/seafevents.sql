ALTER TABLE UserActivity DROP FOREIGN KEY `UserActivity_ibfk_1`;
ALTER TABLE Activity CHANGE id id BIGINT(20) AUTO_INCREMENT;
ALTER TABLE UserActivity CHANGE id id BIGINT(20) AUTO_INCREMENT;
ALTER TABLE UserActivity CHANGE activity_id activity_id BIGINT(20);

ALTER TABLE FileHistory CHANGE id id BIGINT(20) AUTO_INCREMENT;
ALTER TABLE FileAudit CHANGE eid eid BIGINT(20) AUTO_INCREMENT;
ALTER TABLE FileUpdate CHANGE eid eid BIGINT(20) AUTO_INCREMENT;
ALTER TABLE PermAudit CHANGE eid eid BIGINT(20) AUTO_INCREMENT;
