## step 0: create avatar table in seahub db,

```
CREATE TABLE IF NOT EXISTS `avatar_uploaded` (`filename` TEXT NOT NULL, `filename_md5` CHAR(32) NOT NULL PRIMARY KEY, `data` MEDIUMTEXT NOT NULL, `size` INTEGER NOT NULL, `mtime` datetime NOT NULL);
```

## step 1: download migration script

```
cd <seafile-path>/seafile-server-latest/seahub/seahub/avatar/management/commands/

wget https://raw.githubusercontent.com/haiwen/seahub/6.2/seahub/avatar/management/commands/migrate_avatars_fs2db.py
```

## step 2: run migration

```
cd <seafile-path>/seafile-server-latest

./seahub.sh python-env seahub/manage.py migrate_avatars_fs2db
```

## step 3: change avatar storage backend

```
vi <seafile-path>/conf/seahub_settings.py

AVATAR_FILE_STORAGE = 'seahub.base.database_storage.DatabaseStorage'
```

## step 4: restart seahub cache and seafile service

for memcached: `service memcached restart`

otherwise: `rm -rf /tmp/seahub_cache/*`
