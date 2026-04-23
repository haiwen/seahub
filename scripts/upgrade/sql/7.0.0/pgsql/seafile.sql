ALTER TABLE RepoInfo
    ADD COLUMN status INTEGER DEFAULT 0;
CREATE TABLE IF NOT EXISTS RepoSyncError
(
    id         BIGSERIAL PRIMARY KEY,
    token      CHAR(41),
    error_time BIGINT,
    error_con  VARCHAR(1024)
);
-- existing index, reuse old name
CREATE UNIQUE INDEX IF NOT EXISTS reposyncerror_token_key ON RepoSyncError (token);
ALTER TABLE RepoSyncError
    ALTER COLUMN error_con TYPE VARCHAR(1024);

CREATE TABLE IF NOT EXISTS WebUploadTempFiles
(
    id            BIGSERIAL PRIMARY KEY,
    repo_id       CHAR(40) NOT NULL,
    file_path     TEXT     NOT NULL,
    tmp_file_path TEXT     NOT NULL
);
