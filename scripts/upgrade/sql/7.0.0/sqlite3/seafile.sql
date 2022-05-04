ALTER TABLE RepoInfo ADD COLUMN status INTEGER DEFAULT 0;
CREATE TABLE IF NOT EXISTS RepoSyncError (token CHAR(41) PRIMARY KEY, error_time BIGINT, error_con VARCHAR(1024));
ALTER TABLE RepoSyncError RENAME TO TmpRepoSyncError;
CREATE TABLE RepoSyncError (token CHAR(41) PRIMARY KEY, error_time BIGINT, error_con VARCHAR(1024));
INSERT INTO RepoSyncError SELECT * FROM TmpRepoSyncError;
DROP TABLE TmpRepoSyncError; 
CREATE TABLE IF NOT EXISTS WebUploadTempFiles (repo_id CHAR(40) NOT NULL, file_path TEXT NOT NULL, tmp_file_path TEXT NOT NULL);
