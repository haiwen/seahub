import logging
import requests
import json
from datetime import datetime

from django.core.management.base import BaseCommand

from seaserv import ccnet_api
from seahub.work_weixin.utils import handler_work_weixin_api_response, \
    get_work_weixin_access_token, admin_work_weixin_departments_check
from seahub.work_weixin.settings import WORK_WEIXIN_DEPARTMENTS_URL, \
    WORK_WEIXIN_PROVIDER
from seahub.auth.models import ExternalDepartment

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Fix sync the imported work-weixin departments to the database."

    def println(self, msg):
        self.stdout.write('[%s] %s\n' % (str(datetime.now()), msg))

    def log_error(self, msg):
        logger.error(msg)
        self.println(msg)

    def log_info(self, msg):
        logger.info(msg)
        self.println(msg)

    def log_debug(self, msg):
        logger.debug(msg)
        self.println(msg)

    def handle(self, *args, **options):
        self.log_debug('Start fix sync work-weixin departments...')
        self.do_action()
        self.log_debug('Finish fix sync work-weixin departments.\n')

    def get_group_by_name(self, group_name):
        checked_groups = ccnet_api.search_groups(group_name, -1, -1)

        for g in checked_groups:
            if g.group_name == group_name:
                return g

        return None

    def list_departments_from_work_weixin(self, access_token):
        # https://work.weixin.qq.com/api/doc/90000/90135/90208
        data = {
            'access_token': access_token,
        }
        api_response = requests.get(WORK_WEIXIN_DEPARTMENTS_URL, params=data)
        api_response_dic = handler_work_weixin_api_response(api_response)

        if not api_response_dic:
            self.log_error('can not get work weixin departments response')
            return None

        if 'department' not in api_response_dic:
            self.log_error(json.dumps(api_response_dic))
            self.log_error(
                'can not get department list in work weixin departments response')
            return None

        return api_response_dic['department']

    def do_action(self):
       # work weixin check
        if not admin_work_weixin_departments_check():
            self.log_error('Feature is not enabled.')
            return

        access_token = get_work_weixin_access_token()
        if not access_token:
            self.log_error('can not get work weixin access_token')
            return

        # list departments from work weixin
        api_department_list = self.list_departments_from_work_weixin(
            access_token)
        if api_department_list is None:
            self.log_error('获取企业微信组织架构失败')
            return
        api_department_list = sorted(
            api_department_list, key=lambda x: x['id'])

        self.log_debug(
            'Total %d work-weixin departments.' % len(api_department_list))

        # main
        count = 0
        exists_count = 0
        for department_obj in api_department_list:
            # check department argument
            group_name = department_obj.get('name')
            department_obj_id = department_obj.get('id')
            if department_obj_id is None or not group_name:
                continue

            # check department exist
            exist_department = ExternalDepartment.objects.get_by_provider_and_outer_id(
                WORK_WEIXIN_PROVIDER, department_obj_id)
            if exist_department:
                exists_count += 1
                continue

            # sync to db
            group = self.get_group_by_name(group_name)
            if group:
                ExternalDepartment.objects.create(
                    group_id=group.id,
                    provider=WORK_WEIXIN_PROVIDER,
                    outer_id=department_obj_id,
                )
                count += 1

        self.log_debug('%d work-weixin departments exists in db.' % exists_count)
        self.log_debug('Sync %d work-weixin departments to db.' % count)
