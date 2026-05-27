# coding: utf-8
import json
import hashlib

from sqlalchemy.orm import mapped_column
from sqlalchemy.sql.sqltypes import Integer, String, DateTime, Text, BigInteger
from sqlalchemy.sql.schema import Index

from seahub_io.db import Base


class Activity(Base):
    """
    """
    __tablename__ = 'Activity'

    id = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    op_type = mapped_column(String(length=128), nullable=False)
    op_user = mapped_column(String(length=255), nullable=False)
    obj_type = mapped_column(String(length=128), nullable=False)
    timestamp = mapped_column(DateTime, nullable=False, index=True)

    repo_id = mapped_column(String(length=36), nullable=False)
    commit_id = mapped_column(String(length=40))
    path = mapped_column(Text, nullable=False)
    detail = mapped_column(Text, nullable=False)

    __table_args__ = (Index('idx_activity_repo_timestamp',
                            'repo_id', 'timestamp'),)

    def __init__(self, record):
        super().__init__()
        self.op_type = record['op_type']
        self.obj_type = record['obj_type']
        self.repo_id = record['repo_id']
        self.timestamp = record['timestamp']
        self.op_user = record['op_user']
        self.path = record['path']
        self.commit_id = record.get('commit_id', None)

        detail = {}
        detail_keys = ['size', 'old_path', 'days', 'repo_name', 'obj_id', 'old_repo_name', 'path']
        for k in detail_keys:
            if k in record and record.get(k, None) is not None:
                detail[k] = record.get(k, None)

        self.detail = json.dumps(detail)

    def __str__(self):
        return 'Activity<id: %s, type: %s, repo_id: %s>' % \
            (self.id, self.op_type, self.repo_id)


class UserActivity(Base):
    """
    """
    __tablename__ = 'UserActivity'

    id = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    username = mapped_column(String(length=255), nullable=False)
    activity_id = mapped_column(BigInteger, nullable=False, index=True)
    timestamp = mapped_column(DateTime, nullable=False, index=True)

    __table_args__ = (Index('idx_username_timestamp',
                            'username', 'timestamp'),)

    def __init__(self, username, activity_id, timestamp):
        super().__init__()
        self.username = username
        self.activity_id = activity_id
        self.timestamp = timestamp

    def __str__(self):
        return 'UserActivity<username: %s, activity id: %s>' % \
                (self.username, self.activity_id)


class FileHistory(Base):
    __tablename__ = 'FileHistory'

    id = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    op_type = mapped_column(String(length=128), nullable=False)
    op_user = mapped_column(String(length=255), nullable=False)
    timestamp = mapped_column(DateTime, nullable=False, index=True)

    repo_id = mapped_column(String(length=36), nullable=False)
    commit_id = mapped_column(String(length=40))
    file_id = mapped_column(String(length=40), nullable=False)
    file_uuid = mapped_column(String(length=40), index=True)
    path = mapped_column(Text, nullable=False)
    repo_id_path_md5 = mapped_column(String(length=32), index=True)
    size = mapped_column(BigInteger, nullable=False)
    old_path = mapped_column(Text, nullable=False)

    def __init__(self, record):
        super().__init__()
        self.op_type = record['op_type']
        self.op_user = record['op_user']
        self.timestamp = record['timestamp']
        self.repo_id = record['repo_id']
        self.commit_id = record.get('commit_id', '')
        self.file_id = record.get('obj_id')
        self.file_uuid = record.get('file_uuid')
        self.path = record['path']
        self.repo_id_path_md5 = hashlib.md5((self.repo_id + self.path).encode('utf8')).hexdigest()
        self.size = record.get('size')
        self.old_path = record.get('old_path', '')


class FileAudit(Base):
    __tablename__ = 'FileAudit'

    eid = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    timestamp = mapped_column(DateTime, nullable=False, index=True)
    etype = mapped_column(String(length=128), nullable=False)
    user = mapped_column(String(length=255), nullable=False)
    ip = mapped_column(String(length=45), nullable=False)
    device = mapped_column(Text, nullable=False)
    org_id = mapped_column(Integer, nullable=False)
    repo_id = mapped_column(String(length=36), nullable=False)
    file_path = mapped_column(Text, nullable=False)
    __table_args__ = (Index('idx_file_audit_orgid_eid',
                            'org_id', 'eid'),
                      Index('idx_file_audit_user_orgid_eid',
                            'user', 'org_id', 'eid'),
                      Index('idx_file_audit_repo_org_eid',
                            'repo_id', 'org_id', 'eid'))

    def __init__(self, timestamp, etype, user, ip, device,
                 org_id, repo_id, file_path):
        super().__init__()
        self.timestamp = timestamp
        self.etype = etype
        self.user = user
        self.ip = ip
        self.device = device
        self.org_id = org_id
        self.repo_id = repo_id
        self.file_path = file_path

    def __str__(self):
        if self.org_id > 0:
            return "FileAudit<EventType = %s, User = %s, IP = %s, Device = %s, \
                    OrgID = %s, RepoID = %s, FilePath = %s>" % \
                    (self.etype, self.user, self.ip, self.device,
                     self.org_id, self.repo_id, self.file_path)
        else:
            return "FileAudit<EventType = %s, User = %s, IP = %s, Device = %s, \
                    RepoID = %s, FilePath = %s>" % \
                    (self.etype, self.user, self.ip, self.device,
                     self.repo_id, self.file_path)


class FileUpdate(Base):
    __tablename__ = 'FileUpdate'

    eid = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    timestamp = mapped_column(DateTime, nullable=False, index=True)
    user = mapped_column(String(length=255), nullable=False)
    org_id = mapped_column(Integer, nullable=False)
    repo_id = mapped_column(String(length=36), nullable=False)
    commit_id = mapped_column(String(length=40), nullable=False)
    file_oper = mapped_column(Text, nullable=False)
    __table_args__ = (Index('idx_file_update_orgid_eid',
                            'org_id', 'eid'),
                      Index('idx_file_update_user_orgid_eid',
                            'user', 'org_id', 'eid'),
                      Index('idx_file_update_repo_org_eid',
                            'repo_id', 'org_id', 'eid'))

    def __init__(self, timestamp, user, org_id, repo_id, commit_id, file_oper):
        super().__init__()
        self.timestamp = timestamp
        self.user = user
        self.org_id = org_id
        self.repo_id = repo_id
        self.commit_id = commit_id
        self.file_oper = file_oper

    def __str__(self):
        if self.org_id > 0:
            return "FileUpdate<User = %s, OrgID = %s, RepoID = %s, CommitID = %s \
                   FileOper = %s>" % (self.user, self.org_id, self.repo_id,
                                      self.commit_id, self.file_oper)
        else:
            return "FileUpdate<User = %s, RepoID = %s, CommitID = %s, \
                    FileOper = %s>" % (self.user, self.repo_id,
                                       self.commit_id, self.file_oper)


class PermAudit(Base):
    __tablename__ = 'PermAudit'

    eid = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    timestamp = mapped_column(DateTime, nullable=False)
    etype = mapped_column(String(length=128), nullable=False)
    from_user = mapped_column(String(length=255), nullable=False)
    to = mapped_column(String(length=255), nullable=False)
    org_id = mapped_column(Integer, nullable=False)
    repo_id = mapped_column(String(length=36), nullable=False)
    file_path = mapped_column(Text, nullable=False)
    permission = mapped_column(String(length=15), nullable=False)
    __table_args__ = (Index('idx_perm_audit_orgid_eid',
                            'org_id', 'eid'),
                      Index('idx_perm_audit_user_orgid_eid',
                            'from_user', 'org_id', 'eid'),
                      Index('idx_perm_audit_repo_org_eid',
                            'repo_id', 'org_id', 'eid'))

    def __init__(self, timestamp, etype, from_user, to, org_id, repo_id,
                 file_path, permission):
        super().__init__()
        self.timestamp = timestamp
        self.etype = etype
        self.from_user = from_user
        self.to = to
        self.org_id = org_id
        self.repo_id = repo_id
        self.file_path = file_path
        self.permission = permission

    def __str__(self):
        if self.org_id > 0:
            return "PermAudit<EventType = %s, FromUser = %s, To = %s, \
                   OrgID = %s, RepoID = %s, FilePath = %s, Permission = %s>" % \
                    (self.etype, self.from_user, self.to, self.org_id,
                     self.repo_id, self.file_path, self.permission)
        else:
            return "PermAudit<EventType = %s, FromUser = %s, To = %s, \
                   RepoID = %s, FilePath = %s, Permission = %s>" % \
                    (self.etype, self.from_user, self.to,
                     self.repo_id, self.file_path, self.permission)


class UserLogin(Base):
    __tablename__ = 'sysadmin_extra_userloginlog'

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    login_date = mapped_column(DateTime, nullable=False)
    username = mapped_column(String(length=255), nullable=False, index=True)
    login_ip = mapped_column(String(length=45), nullable=False)
    login_success = mapped_column(Integer, nullable=False)

    def __init__(self, login_date, username, login_ip, login_success):
        super().__init__()
        self.login_date = login_date
        self.username = username
        self.login_ip = login_ip
        self.login_success = login_success

class FileTrash(Base):
    __tablename__ = 'FileTrash'

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    user = mapped_column(String(length=255), nullable=False)
    obj_type = mapped_column(String(length=128), nullable=False)
    obj_id = mapped_column(String(length=40), nullable=False)
    obj_name = mapped_column(String(length=255), nullable=False)
    delete_time = mapped_column(DateTime, nullable=False, index=True)

    repo_id = mapped_column(String(length=36), nullable=False)
    commit_id = mapped_column(String(length=40))
    path = mapped_column(Text, nullable=False)
    size = mapped_column(BigInteger, nullable=False)
    __table_args__ = (Index('idx_filetrash_repo_delete_time',
                            'repo_id', 'delete_time'),)

    def __init__(self, record):
        super().__init__()
        self.user = record['op_user']
        self.obj_type = record['obj_type']
        self.obj_id = record.get('obj_id', "")
        self.obj_name = record['obj_name']
        self.delete_time = record['timestamp']
        self.repo_id = record['repo_id']
        self.path =record['path']
        self.commit_id = record.get('commit_id', None)
        self.size = record.get('size', 0)


    def __str__(self):
        return 'FileTrash<id: %s, type: %s, repo_id: %s>' % \
            (self.id, self.obj_type, self.repo_id)

class OrgLastActivityTime(Base):
    __tablename__ = 'org_last_active_time'

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id = mapped_column(Integer, nullable=False, index=True)
    timestamp = mapped_column(DateTime, nullable=False)

    def __init__(self, org_id, timestamp):
        self.org_id = org_id
        self.timestamp = timestamp
