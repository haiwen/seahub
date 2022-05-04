CREATE TABLE IF NOT EXISTS `ocm_share` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shared_secret` varchar(36) NOT NULL,
  `from_user` varchar(255) NOT NULL,
  `to_user` varchar(255) NOT NULL,
  `to_server_url` varchar(200) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `repo_name` varchar(255) NOT NULL,
  `permission` varchar(50) NOT NULL,
  `path` longtext NOT NULL,
  `ctime` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shared_secret` (`shared_secret`),
  KEY `ocm_share_from_user_7fbb7bb6` (`from_user`),
  KEY `ocm_share_to_user_4e255523` (`to_user`),
  KEY `ocm_share_to_server_url_43f0e89b` (`to_server_url`),
  KEY `ocm_share_repo_id_51937581` (`repo_id`)
) ENGINE = InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `ocm_share_received` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shared_secret` varchar(36) NOT NULL,
  `from_user` varchar(255) NOT NULL,
  `to_user` varchar(255) NOT NULL,
  `from_server_url` varchar(200) NOT NULL,
  `repo_id` varchar(36) NOT NULL,
  `repo_name` varchar(255) NOT NULL,
  `permission` varchar(50) NOT NULL,
  `path` longtext NOT NULL,
  `provider_id` varchar(40) NOT NULL,
  `ctime` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shared_secret` (`shared_secret`),
  KEY `ocm_share_received_from_user_8137d8eb` (`from_user`),
  KEY `ocm_share_received_to_user_0921d09a` (`to_user`),
  KEY `ocm_share_received_from_server_url_10527b80` (`from_server_url`),
  KEY `ocm_share_received_repo_id_9e77a1b9` (`repo_id`),
  KEY `ocm_share_received_provider_id_60c873e0` (`provider_id`)
) ENGINE = InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `repo_auto_delete` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `repo_id` varchar(36) NOT NULL,
    `days` int(11) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `repo_id` (`repo_id`)
) ENGINE = InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `external_department` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `group_id` int(11) NOT NULL,
    `provider` varchar(32) NOT NULL,
    `outer_id` bigint(20) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `group_id` (`group_id`),
    UNIQUE KEY `external_department_provider_outer_id_8dns6vkw_uniq` (`provider`,`outer_id`)
) ENGINE = InnoDB DEFAULT CHARSET=utf8;
