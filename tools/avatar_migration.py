# Copyright (c) 2012-2016 Seafile Ltd.
#!/usr/bin/env python
"""
Migrate seahub avatar files from file system to MySQL.

Usage: ./avatar_migrate.py /home/user/seahub

Note: seahub database must be MySQL.
"""
import base64
import datetime
import hashlib
import os
import sys
import MySQLdb


if len(sys.argv) != 2:
    seahub_root = input("Please enter root path of seahub: ")
else:
    seahub_root = sys.argv[1]

host = input("Please enter MySQL host:(leave blank for localhost) ")
if not host:
    host = 'localhost'
user = input("Please enter MySQL user: ")
passwd = input("Please enter password: ")
db = input("Please enter seahub database: ")
    
'''Read user's avatar path from MySQL-avatar_avatar and avatar_groupavatar'''
db = MySQLdb.connect(host=host, user=user, passwd=passwd, db=db)
cur = db.cursor()
cur.execute("(SELECT avatar FROM avatar_avatar) UNION (SELECT avatar FROM avatar_groupavatar)")
rows = cur.fetchall()

'''Fetch avatar file info from file system'''
records = []
for row in rows:
    avatar_path = row[0]
    avatar_full_path = os.path.join(seahub_root, 'media', avatar_path)
    try:
        statinfo = os.stat(avatar_full_path)
    except OSError as e:
        print(e)
        continue
    size = statinfo.st_size
    mtime = statinfo.st_mtime
    mtime_str = datetime.datetime.fromtimestamp(int(mtime)).strftime('%Y-%m-%d %H:%M:%S')
    with file(avatar_full_path) as f:
        avatar_path = avatar_path.replace('\\', '/')
        avatar_path_md5 = hashlib.md5(avatar_path.encode('utf-8')).hexdigest()
        binary = f.read()
        encoded = base64.b64encode(binary)

    records.append((avatar_path, avatar_path_md5, encoded, size, mtime_str))

'''Write avatar file to MySQL-avatar_uploaded'''
for record in records:
    sql = "INSERT INTO `avatar_uploaded`(`filename`, `filename_md5`, `data`, `size`, `mtime`) VALUES ('%s', '%s', '%s', %d, '%s')" % (record)
    cur.execute(sql)

db.commit()
db.close()
