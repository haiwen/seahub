CREATE TABLE IF NOT EXISTS md_server_snapshots (
    id int AUTO_INCREMENT PRIMARY KEY,
    base_id varchar(36) NOT NULL,
    snapshot_id varchar(36) NOT NULL,
    ctime bigint NOT NULL,
    version bigint NOT NULL,
    KEY index_snapshots_on_base_id (base_id),
    KEY index_snapshots_on_ctime (ctime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
