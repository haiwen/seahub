CREATE TABLE IF NOT EXISTS GroupStructure (group_id INTEGER PRIMARY KEY, path VARCHAR(1024));
alter table `Group` add column parent_group_id INTEGER default 0;  -- Replace `Group` if you configured table `Group` to another name.
