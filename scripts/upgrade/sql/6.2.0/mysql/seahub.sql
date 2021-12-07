CREATE TABLE IF NOT EXISTS `revision_tag_tags` (                                                                                                                     
      `id` int(11) NOT NULL AUTO_INCREMENT,                                                                                                                
      `name` varchar(255) NOT NULL,                                                                                                                        
      PRIMARY KEY (`id`),                                                                                                                                  
      UNIQUE KEY `name` (`name`)                                                                                                                           
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8; 

CREATE TABLE IF NOT EXISTS `revision_tag_revisiontags` (                                                                                                             
      `id` int(11) NOT NULL AUTO_INCREMENT,                                                                                                                
      `repo_id` varchar(36) NOT NULL,                                                                                                                      
      `path` longtext NOT NULL,                                                                                                                            
      `revision_id` varchar(255) NOT NULL,                                                                                                                 
      `tag_id` int(11) NOT NULL,                                                                                                                           
      `username` varchar(255) NOT NULL,                                                                                                                    
      PRIMARY KEY (`id`),                                                                                                                                  
      KEY `revision_tag_rev_tag_id_37c2d76166c50597_fk_revision_tag_tags_id` (`tag_id`),                                                                   
      KEY `revision_tag_revisiontags_9a8c79bf` (`repo_id`),                                                                                                
      KEY `revision_tag_revisiontags_5de09a8d` (`revision_id`),                                                                                            
      KEY `revision_tag_revisiontags_14c4b06b` (`username`),                                                                                               
      CONSTRAINT `revision_tag_rev_tag_id_37c2d76166c50597_fk_revision_tag_tags_id` FOREIGN KEY (`tag_id`) REFERENCES `revision_tag_tags` (`id`)           
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8; 

CREATE TABLE IF NOT EXISTS `share_extrasharepermission` (                                                                                                            
      `id` int(11) NOT NULL AUTO_INCREMENT,                                                                                                                
      `repo_id` varchar(36) NOT NULL,                                                                                                                      
      `share_to` varchar(255) NOT NULL,                                                                                                                    
      `permission` varchar(30) NOT NULL,                                                                                                                   
      PRIMARY KEY (`id`),                                                                                                                                  
      KEY `share_extrasharepermission_9a8c79bf` (`repo_id`),                                                                                               
      KEY `share_extrasharepermission_e4fb1dad` (`share_to`)                                                                                               
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `share_extragroupssharepermission` (                                                                                                      
      `id` int(11) NOT NULL AUTO_INCREMENT,                                                                                                                
      `repo_id` varchar(36) NOT NULL,                                                                                                                      
      `group_id` int(11) NOT NULL,                                                                                                                     
      `permission` varchar(30) NOT NULL,                                                                                                                   
      PRIMARY KEY (`id`),                                                                                                                                  
      KEY `share_extragroupssharepermission_9a8c79bf` (`repo_id`),                                                                                         
      KEY `share_extragroupssharepermission_0e939a4f` (`group_id`)                                                                                         
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `tags_fileuuidmap` (                                                                                                                      
      `uuid` char(32) NOT NULL,                                                                                                                            
      `repo_id` varchar(36) NOT NULL,                                                                                                                      
      `repo_id_parent_path_md5` varchar(100) NOT NULL,                                                                                                     
      `parent_path` longtext NOT NULL,                                                                                                                     
      `filename` varchar(1024) NOT NULL,                                                                                                                   
      `is_dir` tinyint(1) NOT NULL,                                                                                                                        
      PRIMARY KEY (`uuid`),                                                                                                                                
      KEY `tags_fileuuidmap_9a8c79bf` (`repo_id`),                                                                                                         
      KEY `tags_fileuuidmap_c5bf47d4` (`repo_id_parent_path_md5`)                                                                                          
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `tags_tags` (                                                                                                                             
      `id` int(11) NOT NULL AUTO_INCREMENT,                                                                                                                
      `name` varchar(255) NOT NULL,                                                                                                                        
      PRIMARY KEY (`id`),                                                                                                                                  
      UNIQUE KEY `name` (`name`)                                                                                                                           
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8; 

CREATE TABLE IF NOT EXISTS `tags_filetag` (                                                                                                                          
      `id` int(11) NOT NULL AUTO_INCREMENT,                                                                                                                
      `uuid_id` char(32) NOT NULL,                                                                                                                         
      `tag_id` int(11) NOT NULL,                                                                                                                           
      `username` varchar(255) NOT NULL,                                                                                                                    
      PRIMARY KEY (`id`),                                                                                                                                  
      KEY `tags_filetag_uuid_id_5e2dc8ebbab85301_fk_tags_fileuuidmap_uuid` (`uuid_id`),                                                                    
      KEY `tags_filetag_tag_id_39c4746ee9d70b71_fk_tags_tags_id` (`tag_id`),                                                                               
      CONSTRAINT `tags_filetag_tag_id_39c4746ee9d70b71_fk_tags_tags_id` FOREIGN KEY (`tag_id`) REFERENCES `tags_tags` (`id`),                              
      CONSTRAINT `tags_filetag_uuid_id_5e2dc8ebbab85301_fk_tags_fileuuidmap_uuid` FOREIGN KEY (`uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`)           
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `role_permissions_adminrole` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(254) NOT NULL,
  `role` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

ALTER TABLE `sysadmin_extra_userloginlog` ADD COLUMN `login_success` tinyint(1) NOT NULL default 1;
ALTER TABLE `profile_profile` ADD COLUMN `list_in_address_book` tinyint(1) NOT NULL default 0;
ALTER TABLE `profile_profile` ADD INDEX `profile_profile_3d5d3631` (`list_in_address_book`);
ALTER TABLE `FileAudit` ADD INDEX `fileaudit_timestamp` (`timestamp`);
ALTER TABLE `Event` ADD INDEX `event_timestamp` (`timestamp`);
ALTER TABLE `UserTrafficStat` ADD INDEX `usertrafficstat_timestamp` (`month`);
ALTER TABLE `FileUpdate` ADD INDEX `fileupdate_timestamp` (`timestamp`);
