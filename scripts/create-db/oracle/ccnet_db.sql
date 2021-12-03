-- User db tables
CREATE TABLE EmailUser (
  id int PRIMARY KEY,
  email varchar2(255),
  passwd varchar2(256),
  is_staff int,
  is_active int,
  ctime number,
  UNIQUE (email)
);
CREATE SEQUENCE EmailUsersIdSeq MINVALUE 1 START WITH 1 INCREMENT BY 1;
CREATE TABLE LDAPUsers (
  id int PRIMARY KEY,
  email varchar2(255),
  password varchar2(256),
  is_staff int,
  is_active int,
  extra_attrs varchar2(1024),
  UNIQUE (email)
);
CREATE SEQUENCE LDAPUsersIdSeq MINVALUE 1 START WITH 1 INCREMENT BY 1;
CREATE TABLE UserRole (
  email varchar2(255),
  role varchar2(255),
  UNIQUE (email, role)
);

-- Group db tables
CREATE TABLE "Group" (
  group_id int PRIMARY KEY,
  group_name varchar2(255),
  creator_name varchar2(255),
  timestamp number,
  type varchar2(32)
);
CREATE SEQUENCE GroupIdSeq MINVALUE 1 START WITH 1 INCREMENT BY 1;
CREATE TABLE GroupUser (
  group_id int,
  user_name varchar2(255),
  is_staff int,
  UNIQUE (group_id, user_name)
);
CREATE INDEX GroupUserNameIndex ON GroupUser (user_name);
CREATE TABLE GroupDNPair (
  group_id int,
  dn varchar2(255)
);

-- Org db tables
CREATE TABLE Organization (
  org_id int PRIMARY KEY,
  org_name varchar2(255),
  url_prefix varchar2(255),
  creator varchar2(255),
  ctime number,
  UNIQUE (url_prefix)
);
CREATE SEQUENCE OrgIdSeq MINVALUE 1 START WITH 1 INCREMENT BY 1;
CREATE TABLE OrgUser (
  org_id int,
  email varchar2(255),
  is_staff int,
  UNIQUE (org_id, email)
);
CREATE INDEX OrgUserEmailIndex ON OrgUser (email);
CREATE TABLE OrgGroup (
  org_id int,
  group_id int,
  UNIQUE (org_id, group_id)
);
CREATE INDEX OrgGroupIdIndex ON OrgGroup (group_id);
