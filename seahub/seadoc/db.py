import os
import json
from datetime import datetime

from django.db import connection

db_name = 'sdoc'
if 'SDOC_SERVER_CONFIG' in os.environ:
    with open(os.environ['SDOC_SERVER_CONFIG']) as f:
        sdoc_conf = json.load(f)
        db_name = sdoc_conf.get('database', 'sdoc')


def seadoc_mask_as_draft(file_uuid, username):
    sql = """
        INSERT INTO %s.draft (file_uuid, username, created_at) 
        VALUES(%%s, %%s, %%s);
    """ % (db_name,)
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with connection.cursor() as cursor:
        cursor.execute(sql, (file_uuid, username, now))
    return


def seadoc_unmask_as_draft(username, origin_repo_id, origin_file_version, origin_file_uuid, draft_file_path, status):
    sql = """
        INSERT INTO %s.draft (created_at, updated_at, username, origin_repo_id, origin_file_version, origin_file_uuid, draft_file_path, status) 
        VALUES(%%s, %%s, %%s, %%s, %%s, %%s, %%s, %%s);
    """ % (db_name,)
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with connection.cursor() as cursor:
        cursor.execute(sql, (now, now, username, origin_repo_id, origin_file_version, origin_file_uuid, draft_file_path, status))
    return


def list_seadoc_draft_by_uuid(file_uuid_list):
    sql = """
        SELECT id FROM %s.draft 
        WHERE file_uuid in %ss;
    """ % (db_name)
    with connection.cursor() as cursor:
        cursor.execute(sql, (file_uuid_list))
        for item in cursor.fetchall():
            if item:
                return item
        return None
