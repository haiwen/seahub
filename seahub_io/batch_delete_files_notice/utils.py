# -*- coding: utf-8 -*-
import json
import logging

from sqlalchemy import text
from seafobj import fs_mgr

from .db import clean_deleted_files_count

logger = logging.getLogger(__name__)


def count_deleted_files(dir_obj, files_dict):

    for item in dir_obj.dirents.values():
        if item.type == 1:
            files_dict['files'].append(item)
        else:
            sub_dir = fs_mgr.load_seafdir(dir_obj.store_id, dir_obj.version, item.id)
            count_deleted_files(sub_dir, files_dict)

    return files_dict


def get_deleted_files_count(repo_id, version, deleted_files, deleted_dirs):

    files_count = len(deleted_files)
    for deleted in deleted_dirs:
        directory = fs_mgr.load_seafdir(repo_id, version, deleted.obj_id)
        files_dict = {'files': []}
        files_dict = count_deleted_files(directory, files_dict)
        files_count += len(files_dict['files'])

    return files_count


def save_deleted_files_msg(session, username, repo_id, timestamp):
    try:
        sql = """INSERT INTO notifications_usernotification (`to_user`, `msg_type`, `detail`, `timestamp`, `seen`)
                 VALUES (:to_user, :msg_type, :detail, :timestamp, :seen)"""
        detail = {"repo_id": repo_id}
        detail = json.dumps(detail)
        session.execute(text(sql), {
            'to_user': username,
            'msg_type': 'deleted_files',
            'detail': detail,
            'timestamp': timestamp,
            'seen': 0,
        })
        session.commit()
        clean_deleted_files_count(session, repo_id)
    except Exception as e:
        logger.error(e)
