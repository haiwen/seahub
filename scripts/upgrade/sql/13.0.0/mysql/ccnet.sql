ALTER TABLE EmailUser ADD COLUMN `is_department_owner` BOOL NOT NULL DEFAULT 0;
CREATE INDEX EmailUser_is_active on EmailUser(is_active);
CREATE INDEX EmailUser_is_department_owenr on EmailUser(is_department_owner);
UPDATE `EmailUser` SET is_department_owner=1 WHERE email LIKE "%@seafile_group";
