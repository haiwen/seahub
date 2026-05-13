import logging
import hashlib
import time
from datetime import timedelta
from datetime import datetime

from sqlalchemy import func, select, update
from sqlalchemy.sql import text

from .models import UserTraffic, SysTraffic
from seahub_io.db import init_db_session_class
from seaserv import seafile_api
from seahub_io.utils.ccnet_db import CcnetDB
from seahub_io.utils.seahub_db import SeahubDB
from seahub_io.utils import get_quota_from_string
from seahub_io.app.config import ENABLED_ROLE_PERMISSIONS, \
    DOWNLOAD_LIMIT_WHEN_THROTTLE, UPLOAD_LIMIT_WHEN_THROTTLE
from .db import get_org_id

# This is a throwaway variable to deal with a python bug
throwaway = datetime.strptime('20110101', '%Y%m%d')

login_records = {}
traffic_info = {}

download_rate_limit_users = {}
upload_rate_limit_users = {}

download_rate_limit_orgs = {}
upload_rate_limit_orgs = {}

DEFAULT_USER = 'default'

MONTHLY_DOWNLOAD_TRAFFIC_LIMIT = 'monthly_rate_limit'
MONTHLY_DOWNLOAD_TRAFFIC_LIMIT_PER_USER = 'monthly_rate_limit_per_user'

MONTHLY_UPLOAD_TRAFFIC_LIMIT = 'monthly_upload_traffic_limit'
MONTHLY_UPLOAD_TRAFFIC_LIMIT_PER_USER = 'monthly_upload_traffic_limit_per_user'


def get_org_user_quota(local_traffic_info, date_str):
    org_user_dict = {}
    for row in local_traffic_info[date_str]:
        org_id = row[0]
        if org_id > 0 and org_id not in org_user_dict:
            with SeahubDB() as seahub_db:
                user_count = seahub_db.get_org_member_quota(org_id)
                org_user_dict[org_id] = user_count
    return org_user_dict


def update_hash_record(session, login_name, login_time, org_id):
    time_str = login_time.strftime('%Y-%m-%d 00:00:00')
    time_by_day = datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
    md5_key = hashlib.md5((login_name + time_str).encode('utf-8')).hexdigest()
    login_records[md5_key] = (login_name, time_by_day, org_id)


def save_traffic_info(session, timestamp, user_name, repo_id, oper, size):
    org_id = get_org_id(repo_id)
    time_str = timestamp.strftime('%Y-%m-%d')
    if time_str not in traffic_info:
        traffic_info[time_str] = {}
    if (org_id, user_name, oper) not in traffic_info[time_str]:
        traffic_info[time_str][(org_id, user_name, oper)] = size
    else:
        traffic_info[time_str][(org_id, user_name, oper)] += size


def get_role_traffic_limit_dict():

    if not ENABLED_ROLE_PERMISSIONS:
        return None

    role_traffic_limit_dict = {}
    for role, value in ENABLED_ROLE_PERMISSIONS.items():
        traffic_limit = {}

        limit_configs = [
            MONTHLY_DOWNLOAD_TRAFFIC_LIMIT,
            MONTHLY_DOWNLOAD_TRAFFIC_LIMIT_PER_USER,
            MONTHLY_UPLOAD_TRAFFIC_LIMIT,
            MONTHLY_UPLOAD_TRAFFIC_LIMIT_PER_USER,
        ]

        for limit_key in limit_configs:
            if limit_key in value:
                limit_value = get_quota_from_string(value[limit_key])
                traffic_limit[limit_key] = limit_value

        role_traffic_limit_dict[role] = traffic_limit

    return role_traffic_limit_dict


class TrafficInfoCounter(object):

    def __init__(self):
        self.edb_session = init_db_session_class()()
        self.download_type_list = ['web-file-download', 'link-file-download', 'sync-file-download']
        self.upload_type_list = ['web-file-upload', 'link-file-upload', 'sync-file-upload']

    def start_count(self):

        time_start = time.time()
        logging.info('Start counting traffic info..')

        dt = datetime.utcnow()
        delta = timedelta(days=1)
        yesterday = (dt - delta).date()
        yesterday_str = yesterday.strftime('%Y-%m-%d')

        today = dt.date()
        today_str = today.strftime('%Y-%m-%d')

        local_traffic_info = traffic_info.copy()
        traffic_info.clear()

        if yesterday_str in local_traffic_info:
            start_time = time.time()
            self.update_record(local_traffic_info, yesterday, yesterday_str)
            logging.info(
                'Traffic Counter: %d items has been recorded on %s, time: %s seconds.' % (
                    len(local_traffic_info[yesterday_str]),
                    yesterday_str,
                    str(time.time() - start_time),
                )
            )

        if today_str in local_traffic_info:
            start_time = time.time()
            self.update_record(local_traffic_info, today, today_str)
            logging.info(
                'Traffic Counter: %d items has been updated on %s, time: %s seconds.' % (
                    len(local_traffic_info[today_str]),
                    today_str,
                    str(time.time() - start_time),
                )
            )

        try:
            self.edb_session.commit()
        except Exception as e:
            logging.warning('Failed to update traffic info: %s.', e)
        finally:
            logging.info('Traffic counter finished, total time: %s seconds.' % str(time.time() - time_start))
            self.edb_session.close()
            del local_traffic_info

    def update_record(self, local_traffic_info, date, date_str):
        org_delta = {}

        trans_count = 0
        first_day_of_month = datetime(datetime.now().year, datetime.now().month, 1)
        org_user_quota_dict = get_org_user_quota(local_traffic_info, date_str)

        try:
            role_traffic_limit_dict = get_role_traffic_limit_dict()
        except Exception as e:
            logging.warning('Failed get download rate limit info: %s.', e)
            role_traffic_limit_dict = None

        for row in local_traffic_info[date_str]:
            trans_count += 1
            org_id = row[0]
            user = row[1]
            oper = row[2]

            size = local_traffic_info[date_str][row]
            if size == 0:
                continue

            download_traffic_threshold = None
            upload_traffic_threshold = None

            if oper in self.download_type_list:
                with CcnetDB() as ccnet_db:
                    user_role = ccnet_db.get_user_role(user)
                    role = DEFAULT_USER if user_role == '' else user_role

                if role_traffic_limit_dict and role in role_traffic_limit_dict:
                    download_traffic_threshold = role_traffic_limit_dict[role].get(
                        MONTHLY_DOWNLOAD_TRAFFIC_LIMIT
                    )

                if org_id > 0:
                    with SeahubDB() as seahub_db:
                        org_role = seahub_db.get_org_role(org_id)
                        role = DEFAULT_USER if org_role == '' else org_role

                    if role_traffic_limit_dict and role in role_traffic_limit_dict:
                        limit_per_user = role_traffic_limit_dict[role].get(
                            MONTHLY_DOWNLOAD_TRAFFIC_LIMIT_PER_USER
                        )
                    else:
                        limit_per_user = None

                    org_user_quota = org_user_quota_dict.get(org_id)
                    if org_user_quota and limit_per_user:
                        download_traffic_threshold = org_user_quota * limit_per_user
                    else:
                        download_traffic_threshold = None

                    with SeahubDB() as seahub_db:
                        monthly_traffic_limit = seahub_db.get_org_monthly_traffic_limit(org_id)
                        if monthly_traffic_limit > 0:
                            download_traffic_threshold = monthly_traffic_limit

                if (org_id, oper, download_traffic_threshold) not in org_delta:
                    org_delta[(org_id, oper, download_traffic_threshold)] = size
                else:
                    org_delta[(org_id, oper, download_traffic_threshold)] += size

            elif oper in self.upload_type_list:
                with CcnetDB() as ccnet_db:
                    user_role = ccnet_db.get_user_role(user)
                    role = DEFAULT_USER if user_role == '' else user_role

                if role_traffic_limit_dict and role in role_traffic_limit_dict:
                    upload_traffic_threshold = role_traffic_limit_dict[role].get(
                        MONTHLY_UPLOAD_TRAFFIC_LIMIT
                    )

                if org_id > 0:
                    with SeahubDB() as seahub_db:
                        org_role = seahub_db.get_org_role(org_id)
                        role = DEFAULT_USER if org_role == '' else org_role

                    if role_traffic_limit_dict and role in role_traffic_limit_dict:
                        limit_per_user = role_traffic_limit_dict[role].get(
                            MONTHLY_UPLOAD_TRAFFIC_LIMIT_PER_USER
                        )
                    else:
                        limit_per_user = None

                    org_user_quota = org_user_quota_dict.get(org_id)
                    if org_user_quota and limit_per_user:
                        upload_traffic_threshold = org_user_quota * limit_per_user
                    else:
                        upload_traffic_threshold = None

                if (org_id, oper, upload_traffic_threshold) not in org_delta:
                    org_delta[(org_id, oper, upload_traffic_threshold)] = size
                else:
                    org_delta[(org_id, oper, upload_traffic_threshold)] += size

            else:
                if (org_id, oper) not in org_delta:
                    org_delta[(org_id, oper)] = size
                else:
                    org_delta[(org_id, oper)] += size

            try:
                if (
                    download_traffic_threshold
                    and org_id < 0
                    and oper in self.download_type_list
                    and not download_rate_limit_users.get(user, False)
                ):
                    stmt = select(func.sum(UserTraffic.size).label("size")).where(
                        UserTraffic.timestamp.between(first_day_of_month, date),
                        UserTraffic.user == user,
                        UserTraffic.org_id == org_id,
                        UserTraffic.op_type.in_(self.download_type_list),
                    )
                    user_monthly_download_traffic_size = self.edb_session.scalars(stmt).first()

                    if user_monthly_download_traffic_size and user_monthly_download_traffic_size > download_traffic_threshold:
                        download_limit_format = get_quota_from_string(DOWNLOAD_LIMIT_WHEN_THROTTLE)
                        seafile_api.set_user_download_rate_limit(user, download_limit_format)
                        download_rate_limit_users[user] = True

                if (
                    upload_traffic_threshold
                    and org_id < 0
                    and oper in self.upload_type_list
                    and not upload_rate_limit_users.get(user, False)
                ):
                    stmt = select(func.sum(UserTraffic.size).label("size")).where(
                        UserTraffic.timestamp.between(first_day_of_month, date),
                        UserTraffic.user == user,
                        UserTraffic.org_id == org_id,
                        UserTraffic.op_type.in_(self.upload_type_list),
                    )
                    user_monthly_upload_traffic_size = self.edb_session.scalars(stmt).first()

                    if user_monthly_upload_traffic_size and user_monthly_upload_traffic_size > upload_traffic_threshold:
                        upload_limit_format = get_quota_from_string(UPLOAD_LIMIT_WHEN_THROTTLE)
                        seafile_api.set_user_upload_rate_limit(user, upload_limit_format)
                        upload_rate_limit_users[user] = True

                stmt = select(UserTraffic.size).where(
                    UserTraffic.timestamp == date,
                    UserTraffic.user == user,
                    UserTraffic.org_id == org_id,
                    UserTraffic.op_type == oper,
                ).limit(1)
                size_in_db = self.edb_session.scalars(stmt).first()

                if size_in_db is not None:
                    stmt = update(UserTraffic).where(
                        UserTraffic.timestamp == date,
                        UserTraffic.user == user,
                        UserTraffic.org_id == org_id,
                        UserTraffic.op_type == oper,
                    ).values(size=size + size_in_db)
                    self.edb_session.execute(stmt)
                else:
                    self.edb_session.add(UserTraffic(user, date, oper, size, org_id))

                if trans_count >= 100:
                    self.edb_session.commit()
                    trans_count = 0
            except Exception as e:
                logging.warning('Failed to update traffic info: %s.', e)
                return

        for row in org_delta:
            org_id = row[0]
            oper = row[1]
            size = org_delta[row]

            try:
                if (
                    org_id > 0
                    and oper in self.download_type_list
                    and not download_rate_limit_orgs.get(org_id)
                ):
                    stmt = select(func.sum(SysTraffic.size).label("size")).where(
                        SysTraffic.timestamp.between(first_day_of_month, date),
                        SysTraffic.org_id == org_id,
                        SysTraffic.op_type.in_(self.download_type_list),
                    )
                    org_monthly_download_traffic_size = self.edb_session.scalars(stmt).first()
                    download_traffic_threshold = row[2]

                    if (
                        org_monthly_download_traffic_size
                        and download_traffic_threshold
                        and org_monthly_download_traffic_size > download_traffic_threshold
                    ):
                        download_limit_format = get_quota_from_string(DOWNLOAD_LIMIT_WHEN_THROTTLE)
                        seafile_api.org_set_download_rate_limit(org_id, download_limit_format)
                        download_rate_limit_orgs[org_id] = True

                if (
                    org_id > 0
                    and oper in self.upload_type_list
                    and not upload_rate_limit_orgs.get(org_id)
                ):
                    stmt = select(func.sum(SysTraffic.size).label("size")).where(
                        SysTraffic.timestamp.between(first_day_of_month, date),
                        SysTraffic.org_id == org_id,
                        SysTraffic.op_type.in_(self.upload_type_list),
                    )
                    org_monthly_upload_traffic_size = self.edb_session.scalars(stmt).first()
                    upload_traffic_threshold = row[2]

                    if (
                        org_monthly_upload_traffic_size
                        and upload_traffic_threshold
                        and org_monthly_upload_traffic_size > upload_traffic_threshold
                    ):
                        upload_limit_format = get_quota_from_string(UPLOAD_LIMIT_WHEN_THROTTLE)
                        seafile_api.org_set_upload_rate_limit(org_id, upload_limit_format)
                        upload_rate_limit_orgs[org_id] = True

                stmt = select(SysTraffic.size).where(
                    SysTraffic.timestamp == date,
                    SysTraffic.org_id == org_id,
                    SysTraffic.op_type == oper,
                ).limit(1)
                size_in_db = self.edb_session.scalars(stmt).first()

                if size_in_db is not None:
                    stmt = update(SysTraffic).where(
                        SysTraffic.timestamp == date,
                        SysTraffic.org_id == org_id,
                        SysTraffic.op_type == oper,
                    ).values(size=size + size_in_db)
                    self.edb_session.execute(stmt)
                else:
                    self.edb_session.add(SysTraffic(date, oper, size, org_id))
            except Exception as e:
                logging.warning('Failed to update traffic info: %s.', e)


class UserActivityCounter(object):
    def __init__(self):
        self.edb_session = init_db_session_class()()

    def start_count(self):
        logging.info('Start counting user activity info..')
        try:
            while True:
                all_keys = list(login_records.keys())
                if len(all_keys) > 300:
                    keys = all_keys[:300]
                    self.update_login_record(keys)
                else:
                    keys = all_keys
                    self.update_login_record(keys)
                    break
            self.edb_session.commit()
            logging.info('[UserActivityCounter] update %s items.' % len(all_keys))
        except Exception as e:
            logging.warning('[UserActivityCounter] Failed to update user activity info: %s.', e)
        finally:
            self.edb_session.close()

    def update_login_record(self, keys):
        if len(keys) <= 0:
            return

        cmd = "REPLACE INTO UserActivityStat (name_time_md5, username, timestamp, org_id) values"
        cmd_extend = ''.join(
            [' (:key' + str(i) + ', :name' + str(i) + ', :time' + str(i) + ', :org' + str(i) + '),' for i in range(len(keys))]
        )[:-1]
        cmd += cmd_extend
        data = {}
        for key in keys:
            pop_data = login_records.pop(key)
            index = str(keys.index(key))
            data['key' + index] = key
            data['name' + index] = pop_data[0]
            data['time' + index] = pop_data[1]
            data['org' + index] = pop_data[2]

        self.edb_session.execute(text(cmd), data)
