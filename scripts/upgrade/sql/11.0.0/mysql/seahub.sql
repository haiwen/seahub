CREATE TABLE `history_name` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_uuid` varchar(36) NOT NULL,
  `obj_id` varchar(40) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `history_name_doc_uuid` (`doc_uuid`),
  UNIQUE KEY `history_name_doc_uuid_obj_id` (`doc_uuid`, `obj_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `sdoc_draft` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_uuid` varchar(36) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sdoc_draft_doc_uuid` (`doc_uuid`),
  KEY `sdoc_draft_repo_id` (`repo_id`),
  KEY `sdoc_draft_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
