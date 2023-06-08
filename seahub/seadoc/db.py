import os
import json

from django.db import connection

db_name = 'sdoc'
if 'SDOC_SERVER_CONFIG' in os.environ:
    with open(os.environ['SDOC_SERVER_CONFIG']) as f:
        sdoc_conf = json.load(f)
        db_name = sdoc_conf.get('database', 'sdoc')


def list_seadoc_history_name(doc_uuid, obj_id_list):
    name_dict = {}
    sql = """
        SELECT obj_id, name FROM %s.history_name 
        WHERE doc_uuid=%%s and obj_id in %%s;
    """ % (db_name)
    with connection.cursor() as cursor:
        cursor.execute(sql, (doc_uuid, obj_id_list))
        for obj_id, name in cursor.fetchall():
            name_dict[obj_id] = name
    return name_dict


def update_seadoc_history_name(doc_uuid, obj_id, name):
    sql = """
        INSERT INTO %s.history_name (doc_uuid, obj_id, name) 
        VALUES(%%s, %%s, %%s) 
        ON DUPLICATE KEY UPDATE name=%%s;
    """ % (db_name,)
    with connection.cursor() as cursor:
        cursor.execute(sql, (doc_uuid, obj_id, name, name))
    return
