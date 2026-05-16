import json
import uuid
import logging
import datetime
from datetime import timedelta
import hashlib

from sqlalchemy import desc, select, update, delete
from sqlalchemy.sql import exists

from .models import FileAudit, FileUpdate, PermAudit, \
        Activity, UserActivity, FileHistory, FileTrash


logger = logging.getLogger('seahub_io')

USER_ACTIVITIES_GENERATE_LIMIT = 50

ACTIVITY_MAX_AGGREGATE_ITEMS = 200




BATCH_AGGREGATE_TIME_THRESHOLD = 5
BATCH_AGGREGATE_OP_TYPES = ('create', 'delete')


def _find_recent_batch_activity(session, repo_id, op_user, obj_type, op_type):
    """Find aggregatable Activity records within 5 minutes"""
    time_limit = datetime.datetime.utcnow() - timedelta(minutes=BATCH_AGGREGATE_TIME_THRESHOLD)
    
    batch_op_type = f'batch_{op_type}'
    
    stmt = (
        select(Activity)
        .where(
            Activity.repo_id == repo_id,
            Activity.op_user == op_user,
            Activity.obj_type == obj_type,
            Activity.op_type.in_([op_type, batch_op_type]),
            Activity.timestamp > time_limit
        )
        .order_by(desc(Activity.timestamp))
        .limit(1)
    )
    
    return session.scalars(stmt).first()

def _extract_detail_item(detail_dict):
    """Extract array item from single Activity and detail dict"""

    item = {}
    for key in ['obj_id', 'size', 'old_path', 'repo_name', 'obj_id', 'old_repo_name', 'path']:
        if key in detail_dict and detail_dict[key] is not None:
            item[key] = detail_dict[key]
    return item
    
def _update_batch_activity(session, activity, new_record):
    """Append new operation to existing aggregated record"""
    # 1. Determine op_type (convert to batch type if not already)
    base_op_type = new_record['op_type']
    new_op_type = f'batch_{base_op_type}' if not activity.op_type.startswith('batch_') else activity.op_type
    
    # 2. Parse existing detail field
    try:
        current_detail = json.loads(activity.detail)
    except json.JSONDecodeError as e:
        raise Exception(f'Invalid JSON in Activity.detail: {e}')

    # 3. Convert to array format (if not already)
    detail_array = [_extract_detail_item(current_detail)] if isinstance(current_detail, dict) else current_detail
    if len(detail_array) >= ACTIVITY_MAX_AGGREGATE_ITEMS:
        raise Exception(f"Too many items aggregated in Activity.detail")
    new_detail_item = _extract_detail_item(new_record)
    detail_array.append(new_detail_item)
    
    # 5. Update database record
    stmt = (
        update(Activity)
        .where(Activity.id == activity.id)
        .values(
            op_type=new_op_type,
            timestamp=new_record['timestamp'],
            detail=json.dumps(detail_array)
        )
    )
    session.execute(stmt)
    
    # 6. Synchronously update UserActivity timestamp
    user_activity_stmt = (
        update(UserActivity)
        .where(UserActivity.activity_id == activity.id)
        .values(timestamp=new_record['timestamp'])
    )
    session.execute(user_activity_stmt)
    
    session.commit()


def save_user_activity(session, record):
    """Save or aggregate user activity record"""
    op_type = record.get('op_type', '')
    
    if op_type in BATCH_AGGREGATE_OP_TYPES:
        try:
            recent_activity = _find_recent_batch_activity(
                session,
                record['repo_id'],
                record['op_user'],
                record['obj_type'],
                op_type
            )
            
            if recent_activity:
                _update_batch_activity(session, recent_activity, record)
                return
        except Exception as e:
            logger.warning('Failed to aggregate activity, creating new record: %s', e)
    
    activity = Activity(record)
    session.add(activity)
    session.commit()
    for username in record['related_users'][:USER_ACTIVITIES_GENERATE_LIMIT]:
        user_activity = UserActivity(username, activity.id, record['timestamp'])
        session.add(user_activity)
    session.commit()

def save_repo_trash(session, record):
    repo_trash = FileTrash(record)
    session.add(repo_trash)
    session.commit()

def restore_repo_trash(session, record):
    stmt = delete(FileTrash).where(FileTrash.repo_id == record['repo_id'], FileTrash.obj_name == record['obj_name'],
                                    FileTrash.path == record['path'])
    session.execute(stmt)
    session.commit()

def update_user_activity_timestamp(session, activity_id, record):
    activity_stmt = update(Activity).where(Activity.id == activity_id).\
        values(timestamp=record["timestamp"])
    session.execute(activity_stmt)
    user_activity_stmt = update(UserActivity).where(UserActivity.activity_id == activity_id).\
        values(timestamp=record["timestamp"])
    session.execute(user_activity_stmt)
    session.commit()

def update_file_history_record(session, history_id, record):
    stmt = update(FileHistory).where(FileHistory.id == history_id).\
        values(timestamp=record["timestamp"], file_id=record["obj_id"],
               commit_id=record["commit_id"], size=record["size"])
    session.execute(stmt)
    session.commit()

def query_prev_record(session, record):
    if record['op_type'] == 'create':
        return None

    if record['op_type'] in ['rename', 'move']:
        repo_id_path_md5 = hashlib.md5((record['repo_id'] + record['old_path']).encode('utf8')).hexdigest()
    else:
        repo_id_path_md5 = hashlib.md5((record['repo_id'] + record['path']).encode('utf8')).hexdigest()

    stmt = select(FileHistory).where(FileHistory.repo_id_path_md5 == repo_id_path_md5).\
        order_by(desc(FileHistory.timestamp)).limit(1)
    prev_item = session.scalars(stmt).first()

    # The restore operation may not be the last record to be restored, so you need to switch to the last record
    if record['op_type'] == 'recover':
        stmt = select(FileHistory).where(FileHistory.file_uuid == prev_item.file_uuid).\
            order_by(desc(FileHistory.timestamp)).limit(1)
        prev_item = session.scalars(stmt).first()

    return prev_item

def save_filehistory(session, fh_threshold, record):
    # use same file_uuid if prev item already exists, otherwise new one
    prev_item = query_prev_record(session, record)
    if prev_item:
        # If a file was edited many times in a few minutes, just update timestamp.
        dt = datetime.datetime.utcnow()
        delta = timedelta(minutes=fh_threshold)
        if record['op_type'] == 'edit' and prev_item.op_type == 'edit' \
                                       and prev_item.op_user == record['op_user'] \
                                       and prev_item.timestamp > dt - delta:
            update_file_history_record(session, prev_item.id, record)
            return

        if record['path'] != prev_item.path and record['op_type'] == 'recover':
            pass
        else:
            record['file_uuid'] = prev_item.file_uuid

    if 'file_uuid' not in record:
        file_uuid = uuid.uuid4().__str__()
        # avoid hash conflict
        while session.scalar(select(exists().where(FileHistory.file_uuid == file_uuid))):
            file_uuid = uuid.uuid4().__str__()
        record['file_uuid'] = file_uuid

    filehistory = FileHistory(record)
    session.add(filehistory)
    session.commit()


def save_file_update_event(session, timestamp, user, org_id, repo_id,
                           commit_id, file_oper):
    if timestamp is None:
        timestamp = datetime.datetime.utcnow()

    event = FileUpdate(timestamp, user, org_id, repo_id, commit_id, file_oper)
    session.add(event)
    session.commit()

def save_file_audit_event(session, timestamp, etype, user, ip, device,
                           org_id, repo_id, file_path):
    if timestamp is None:
        timestamp = datetime.datetime.utcnow()

    file_audit = FileAudit(timestamp, etype, user, ip, device, org_id,
                           repo_id, file_path)

    session.add(file_audit)
    session.commit()

def save_perm_audit_event(session, timestamp, etype, from_user, to,
                          org_id, repo_id, file_path, perm):
    if timestamp is None:
        timestamp = datetime.datetime.utcnow()

    perm_audit = PermAudit(timestamp, etype, from_user, to, org_id,
                           repo_id, file_path, perm)

    session.add(perm_audit)
    session.commit()
