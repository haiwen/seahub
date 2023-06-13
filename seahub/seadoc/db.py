import os
import json
from datetime import datetime

from django.db import connection

db_name = 'sdoc'
if 'SDOC_SERVER_CONFIG' in os.environ:
    with open(os.environ['SDOC_SERVER_CONFIG']) as f:
        sdoc_conf = json.load(f)
        db_name = sdoc_conf.get('database', 'sdoc')


def add_seadoc_draft(username, origin_repo_id, origin_file_version, origin_file_uuid, draft_file_path, status):
    sql = """
        INSERT INTO %s.draft (created_at, updated_at, username, origin_repo_id, origin_file_version, origin_file_uuid, draft_file_path, status) 
        VALUES(%%s, %%s, %%s, %%s, %%s, %%s, %%s, %%s);
    """ % (db_name,)
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with connection.cursor() as cursor:
        cursor.execute(sql, (now, now, username, origin_repo_id, origin_file_version, origin_file_uuid, draft_file_path, status))
    return


def get_seadoc_draft_by_path(origin_repo_id, draft_file_path):
    sql = """
        SELECT id FROM %s.draft 
        WHERE origin_repo_id=%%s and draft_file_path=%%s LIMIT 1;
    """ % (db_name)
    with connection.cursor() as cursor:
        cursor.execute(sql, (origin_repo_id, draft_file_path))
        for item in cursor.fetchall():
            if item:
                return item
        return None
