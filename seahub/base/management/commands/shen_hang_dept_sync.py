# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import logging

from django.core.management.base import BaseCommand
from django.db import connection

from seaserv import seafile_api, ccnet_api

from seahub.utils import get_email_by_GH
from seahub.base.accounts import User
from seahub.group.utils import is_group_member
from seahub.settings import SHEN_HANG_DB_NAME, TOP_DEPARTMENT_ID, TOP_DEPARTMENT_NAME, SEAHUB_DB_NAME, \
    ADMIN_EMAIL, DEPARTMENT_TABLE_NAME, PEOPLE_TABLE_NAME

# Get an instance of a logger
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Shen Hang DEPT Sync"

    def handle(self, *args, **options):
        try:
            self.sync_dept()
        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(e)


    def get_children_by_parent_id(self, parent_id):
        sql = 'SELECT DWH, DWMC FROM {}.{} WHERE LSDWH="{}" AND DWH!="{}"'.format(SHEN_HANG_DB_NAME, DEPARTMENT_TABLE_NAME, parent_id, parent_id)

        with connection.cursor() as cursor:
            cursor.execute(sql)
            res = cursor.fetchall()
        return res

    def get_sub_depts(self, parent_dept_id):
        current_tree_node = {}
        current_node_id_list = self.get_children_by_parent_id(parent_dept_id)
        for id, name in current_node_id_list:
            current_tree_node[name + '^' + id] = self.get_sub_depts(id)
        return current_tree_node


    def sync_dept(self):
        self.dept_tree = {}

        top_key = TOP_DEPARTMENT_NAME + '^' + TOP_DEPARTMENT_ID
        self.dept_tree[top_key] = self.get_sub_depts(TOP_DEPARTMENT_ID)
        self.current_level = 1
        self.dfs_dept_tree(self.dept_tree, parent_group_id=-1)

    def get_group_id_by_DWH(self, DWH):
        sql = 'SELECT group_id FROM {}.DWH2group_id WHERE DWH="{}"'.format(SEAHUB_DB_NAME, DWH)

        with connection.cursor() as cursor:
            cursor.execute(sql)
            res = cursor.fetchall()
        if not res:
            return None
        return res[0][0]

    def add_group_id_DWH_pair(self, group_id, DWH):
        sql = 'INSERT INTO {}.DWH2group_id (`DWH`, `group_id`) VALUES ("{}", {})'.format(SEAHUB_DB_NAME, DWH, group_id)
        with connection.cursor() as cursor:
            cursor.execute(sql)

    def list_shenhang_users_by_DWMC(self, DWMC):
        sql = 'SELECT gh FROM {}.{} WHERE yxsh="{}"'.format(SHEN_HANG_DB_NAME, PEOPLE_TABLE_NAME, DWMC)
        with connection.cursor() as cursor:
            cursor.execute(sql)
            res = cursor.fetchall()

        return [user[0] for user in res]

    def diff_user_with_seafile(self, gh, group_id):
        """
        if user in seafile but not in group, add user to that group
        """
        email = get_email_by_GH(gh)
        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            return

        if not is_group_member(group_id, email):
            ccnet_api.group_add_member(group_id, ADMIN_EMAIL, email)


    def dfs_dept_tree(self, current_node, parent_group_id):
        if self.current_level > 3:
            return
        self.current_level += 1

        for dept_name_and_DWH, v in current_node.items():

            dept_name, DWH = dept_name_and_DWH.split('^')
            group_id = self.get_group_id_by_DWH(DWH)
            logger.info('sync {}'.format(dept_name_and_DWH))
            print('sync {}'.format(dept_name_and_DWH))
            if not group_id:
                group_id = ccnet_api.create_group(group_name=dept_name, user_name=ADMIN_EMAIL, parent_group_id=parent_group_id)
                self.add_group_id_DWH_pair(group_id, DWH)

            user_gh_list = self.list_shenhang_users_by_DWMC(dept_name)
            for gh in user_gh_list:
                self.diff_user_with_seafile(gh, group_id)

            self.dfs_dept_tree(v, group_id)
        self.current_level -= 1
