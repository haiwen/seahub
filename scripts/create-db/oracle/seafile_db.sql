CREATE TABLE Branch (
  name varchar2(10),
  repo_id char(36),
  commit_id char(40),
  PRIMARY KEY (repo_id,name)
);
CREATE TABLE FileLockTimestamp (
  repo_id char(36),
  update_time number,
  PRIMARY KEY (repo_id)
);
CREATE TABLE FileLocks (
  repo_id char(36),
  path varchar2(1024 char),
  user_name varchar2(255),
  lock_time number,
  expire number
);
CREATE INDEX FileLocksIndex ON FileLocks (repo_id);
CREATE TABLE FolderGroupPerm (
  repo_id char(36),
  path varchar2(1024 char),
  permission varchar2(15),
  group_id int
);
CREATE INDEX FolderGroupPermIndex ON FolderGroupPerm (repo_id);
CREATE TABLE FolderPermTimestamp (
  repo_id char(36),
  timestamp number,
  PRIMARY KEY (repo_id)
);
CREATE TABLE FolderUserPerm (
  repo_id char(36),
  path varchar2(1024 char),
  permission varchar2(15),
  "user" varchar2(255)
);
CREATE INDEX FolderUserPermIndex ON FolderUserPerm (repo_id);
CREATE TABLE GCID (
  repo_id char(36),
  gc_id char(36),
  PRIMARY KEY (repo_id)
);
CREATE TABLE GarbageRepos (
  repo_id char(36),
  PRIMARY KEY (repo_id)
);
CREATE TABLE InnerPubRepo (
  repo_id char(36),
  permission varchar2(15),
  PRIMARY KEY (repo_id)
);
CREATE TABLE LastGCID (
  repo_id char(36),
  client_id varchar2(128),
  gc_id char(36),
  PRIMARY KEY (repo_id,client_id)
);
CREATE TABLE OrgGroupRepo (
  org_id int,
  repo_id char(36),
  group_id int,
  owner varchar2(255),
  permission varchar2(15),
  PRIMARY KEY (org_id,group_id,repo_id)
);
CREATE INDEX OrgGroupRepoIdIndex ON OrgGroupRepo (repo_id);
CREATE INDEX OrgGroupRepoOwnerIndex ON OrgGroupRepo (owner);
CREATE TABLE OrgInnerPubRepo (
  org_id int,
  repo_id char(36),
  permission varchar2(15),
  PRIMARY KEY (org_id,repo_id)
);
CREATE TABLE OrgQuota (
  org_id int,
  quota number,
  PRIMARY KEY (org_id)
);
CREATE TABLE OrgRepo (
  org_id int,
  repo_id char(36),
  "user" varchar2(255),
  PRIMARY KEY (org_id,repo_id),
  UNIQUE (repo_id)
);
CREATE INDEX OrgRepoOrgIdIndex ON OrgRepo (org_id, "user");
CREATE TABLE OrgSharedRepo (
  id int,
  org_id int,
  repo_id char(36),
  from_email varchar2(255),
  to_email varchar2(255),
  permission varchar2(15),
  PRIMARY KEY (id)
);
CREATE SEQUENCE OrgSharedRepoSeq MINVALUE 1 START WITH 1 INCREMENT BY 1;
CREATE INDEX OrgSharedRepoIdIndex ON OrgSharedRepo (org_id, repo_id);
CREATE INDEX OrgSharedRepoFromEmailIndex ON OrgSharedRepo (from_email);
CREATE INDEX OrgSharedRepoToEmailIndex ON OrgSharedRepo (to_email);
CREATE TABLE OrgUserQuota (
  org_id int,
  "user" varchar2(255),
  quota number,
  PRIMARY KEY (org_id,"user")
);
CREATE TABLE Repo (
  repo_id char(36),
  PRIMARY KEY (repo_id)
);
CREATE TABLE RepoFileCount (
  repo_id char(36),
  file_count number,
  PRIMARY KEY (repo_id)
);
CREATE TABLE RepoGroup (
  repo_id char(36),
  group_id int,
  user_name varchar2(255),
  permission varchar2(15),
  PRIMARY KEY (group_id,repo_id)
);
CREATE INDEX RepoGroupIdIndex ON RepoGroup (repo_id);
CREATE INDEX RepoGroupUsernameIndex ON RepoGroup (user_name);
CREATE TABLE RepoHead (
  repo_id char(36),
  branch_name varchar2(10),
  PRIMARY KEY (repo_id)
);
CREATE TABLE RepoHistoryLimit (
  repo_id char(36),
  days int,
  PRIMARY KEY (repo_id)
);
CREATE TABLE RepoOwner (
  repo_id char(36),
  owner_id varchar2(255),
  PRIMARY KEY (repo_id)
);
CREATE INDEX RepoOwnerNameIndex ON RepoOwner (owner_id);
CREATE TABLE RepoSize (
  repo_id char(36),
  "size" number,
  head_id char(40),
  PRIMARY KEY (repo_id)
);
CREATE TABLE RepoSyncError (
  token char(40),
  error_time number,
  error_con varchar2(50),
  PRIMARY KEY (token)
);
CREATE TABLE RepoTokenPeerInfo (
  token char(40),
  peer_id char(40),
  peer_ip varchar2(40),
  peer_name varchar2(255),
  sync_time number,
  client_ver varchar2(20),
  PRIMARY KEY (token)
);
CREATE TABLE RepoTrash (
  repo_id char(36),
  repo_name varchar2(255),
  head_id char(40),
  owner_id varchar2(255),
  "size" number,
  org_id int,
  del_time number,
  PRIMARY KEY (repo_id)
);
CREATE INDEX RepoTrashOwnerIndex ON RepoTrash (owner_id);
CREATE INDEX RepoTrashOrgIdIndex ON RepoTrash (org_id);
CREATE TABLE RepoUserToken (
  repo_id char(36),
  email varchar2(255),
  token char(40),
  PRIMARY KEY (repo_id,token)
);
CREATE INDEX RepoUserTokenEmailIndex ON RepoUserToken (email);
CREATE TABLE RepoValidSince (
  repo_id char(36),
  timestamp number,
  PRIMARY KEY (repo_id)
);
CREATE TABLE SharedRepo (
  id int,
  repo_id char(36),
  from_email varchar2(255),
  to_email varchar2(255),
  permission varchar2(15)
);
CREATE SEQUENCE SharedRepoSeq MINVALUE 1 START WITH 1 INCREMENT BY 1;
CREATE INDEX SharedRepoIdIndex ON SharedRepo (repo_id);
CREATE INDEX SharedRepoFromEmailIndex ON SharedRepo (from_email);
CREATE INDEX SharedRepoToEmailIndex ON SharedRepo (to_email);
CREATE TABLE SystemInfo (
  info_key varchar2(256) PRIMARY KEY,
  info_value varchar2(1024)
);
CREATE TABLE UserQuota (
  "user" varchar2(255),
  quota number,
  PRIMARY KEY ("user")
);
CREATE TABLE UserShareQuota (
  "user" varchar2(255),
  quota number,
  PRIMARY KEY ("user")
);
CREATE TABLE RoleQuota (
  role varchar2(255),
  quota number,
  PRIMARY KEY (role)
);
CREATE TABLE VirtualRepo (
  repo_id char(36),
  origin_repo char(36),
  path varchar2(1024 char),
  base_commit char(40),
  PRIMARY KEY (repo_id)
);
CREATE INDEX VirtualRepoOriginIndex ON VirtualRepo (origin_repo);
CREATE TABLE WebUploadTempFiles (
  repo_id char(36),
  file_path varchar2(1024 char),
  tmp_file_path varchar2(1024 char)
);
