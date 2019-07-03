# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8

import logging
import requests
import json

from seaserv import seafile_api, ccnet_api
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.work_weixin.utils import handler_work_weixin_api_response, \
    get_work_weixin_access_token, admin_work_weixin_departments_check, \
    update_work_weixin_user_info
from seahub.work_weixin.settings import WORK_WEIXIN_DEPARTMENTS_URL, \
    WORK_WEIXIN_DEPARTMENT_MEMBERS_URL, WORK_WEIXIN_PROVIDER, WORK_WEIXIN_UID_PREFIX
from seahub.base.accounts import User
from seahub.utils.auth import gen_user_virtual_id
from seahub.auth.models import SocialAuthUser
from seahub.group.utils import validate_group_name, admin_check_group_name_conflict

logger = logging.getLogger(__name__)
WORK_WEIXIN_DEPARTMENT_FIELD = 'department'
WORK_WEIXIN_DEPARTMENT_MEMBERS_FIELD = 'userlist'
DEPARTMENT_OWNER = 'system admin'


# # uid = corpid + '_' + userid
# from social_django.models import UserSocialAuth
# get departments: https://work.weixin.qq.com/api/doc#90000/90135/90208
# get members: https://work.weixin.qq.com/api/doc#90000/90135/90200


class AdminWorkWeixinDepartments(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request):
        if not admin_work_weixin_departments_check():
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        access_token = get_work_weixin_access_token()
        if not access_token:
            logger.error('can not get work weixin access_token')
            error_msg = '获取企业微信组织架构失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        data = {
            'access_token': access_token,
        }
        department_id = request.GET.get('department_id', None)
        if department_id:
            data['id'] = department_id

        api_response = requests.get(WORK_WEIXIN_DEPARTMENTS_URL, params=data)
        api_response_dic = handler_work_weixin_api_response(api_response)
        if not api_response_dic:
            logger.error('can not get work weixin departments response')
            error_msg = '获取企业微信组织架构失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if WORK_WEIXIN_DEPARTMENT_FIELD not in api_response_dic:
            logger.error(json.dumps(api_response_dic))
            logger.error('can not get department list in work weixin departments response')
            error_msg = '获取企业微信组织架构失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        return Response(api_response_dic)


class AdminWorkWeixinDepartmentMembers(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, department_id):
        if not admin_work_weixin_departments_check():
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        access_token = get_work_weixin_access_token()
        if not access_token:
            logger.error('can not get work weixin access_token')
            error_msg = '获取企业微信组织架构成员失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        data = {
            'access_token': access_token,
            'department_id': department_id,
        }
        fetch_child = request.GET.get('fetch_child', None)
        if fetch_child:
            if fetch_child not in ('true', 'false'):
                error_msg = 'fetch_child invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            data['fetch_child'] = 1 if fetch_child == 'true' else 0

        api_response = requests.get(WORK_WEIXIN_DEPARTMENT_MEMBERS_URL, params=data)
        api_response_dic = handler_work_weixin_api_response(api_response)
        if not api_response_dic:
            logger.error('can not get work weixin department members response')
            error_msg = '获取企业微信组织架构成员失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if WORK_WEIXIN_DEPARTMENT_MEMBERS_FIELD not in api_response_dic:
            logger.error(json.dumps(api_response_dic))
            logger.error('can not get userlist in work weixin department members response')
            error_msg = '获取企业微信组织架构成员失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        api_user_list = api_response_dic[WORK_WEIXIN_DEPARTMENT_MEMBERS_FIELD]
        # todo filter ccnet User database
        social_auth_queryset = SocialAuthUser.objects.filter(
            provider=WORK_WEIXIN_PROVIDER, uid__contains=WORK_WEIXIN_UID_PREFIX)
        for api_user in api_user_list:
            uid = WORK_WEIXIN_UID_PREFIX + api_user.get('userid', '')
            api_user['contact_email'] = api_user['email']
            # #  determine the user exists
            if social_auth_queryset.filter(uid=uid).exists():
                api_user['email'] = social_auth_queryset.get(uid=uid).username
            else:
                api_user['email'] = ''

        return Response(api_response_dic)


def _handler_work_weixin_user_data(api_user, social_auth_queryset):
    user_id = api_user.get('userid', '')
    uid = WORK_WEIXIN_UID_PREFIX + user_id
    name = api_user.get('name', None)
    error_data = None
    if not uid:
        error_data = {
            'userid': None,
            'name': None,
            'error_msg': 'userid invalid.',
        }
    elif social_auth_queryset.filter(uid=uid).exists():
        error_data = {
            'userid': user_id,
            'name': name,
            'error_msg': '用户已存在',
        }

    return error_data


def _import_user_from_work_weixin(email, api_user):
    api_user['username'] = email
    uid = WORK_WEIXIN_UID_PREFIX + api_user.get('userid')
    try:
        User.objects.create_user(email)
        SocialAuthUser.objects.add(email, WORK_WEIXIN_PROVIDER, uid)
        update_work_weixin_user_info(api_user)
    except Exception as e:
        logger.error(e)
        return False

    return True


class AdminWorkWeixinUsersBatch(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        if not admin_work_weixin_departments_check():
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        api_user_list = request.data.get(WORK_WEIXIN_DEPARTMENT_MEMBERS_FIELD, None)
        if not api_user_list or not isinstance(api_user_list, list):
            error_msg = 'userlist invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        success = []
        failed = []
        social_auth_queryset = SocialAuthUser.objects.filter(
            provider=WORK_WEIXIN_PROVIDER, uid__contains=WORK_WEIXIN_UID_PREFIX)

        for api_user in api_user_list:

            error_data = _handler_work_weixin_user_data(api_user, social_auth_queryset)
            if not error_data:
                email = gen_user_virtual_id()
                if _import_user_from_work_weixin(email, api_user):
                    success.append({
                        'userid': api_user.get('userid'),
                        'name': api_user.get('name'),
                        'email': email,
                    })
                else:
                    failed.append({
                        'userid': api_user.get('userid'),
                        'name': api_user.get('name'),
                        'error_msg': '导入失败'
                    })
            else:
                failed.append(error_data)

        return Response({'success': success, 'failed': failed})


class AdminWorkWeixinDepartmentsBatchImport(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def _list_departments_from_work_weixin(self, access_token, department_id):
        data = {
            'access_token': access_token,
            'id': department_id,
        }
        api_response = requests.get(WORK_WEIXIN_DEPARTMENTS_URL, params=data)
        api_response_dic = handler_work_weixin_api_response(api_response)

        if not api_response_dic:
            logger.error('can not get work weixin departments response')
            return None

        if WORK_WEIXIN_DEPARTMENT_FIELD not in api_response_dic:
            logger.error(json.dumps(api_response_dic))
            logger.error('can not get department list in work weixin departments response')
            return None

        return api_response_dic[WORK_WEIXIN_DEPARTMENT_FIELD]

    def _list_department_members_from_work_weixin(self, access_token, department_id):
        data = {
            'access_token': access_token,
            'department_id': department_id,
            'fetch_child': 1,
        }
        api_response = requests.get(WORK_WEIXIN_DEPARTMENT_MEMBERS_URL, params=data)
        api_response_dic = handler_work_weixin_api_response(api_response)

        if not api_response_dic:
            logger.error('can not get work weixin department members response')
            return None

        if WORK_WEIXIN_DEPARTMENT_MEMBERS_FIELD not in api_response_dic:
            logger.error(json.dumps(api_response_dic))
            logger.error('can not get userlist in work weixin department members response')
            return None

        return api_response_dic[WORK_WEIXIN_DEPARTMENT_MEMBERS_FIELD]

    def post(self, request):
        """import department from work weixin
        """
        # argument check
        parent_group = request.data.get('parent_group', -1)
        try:
            parent_group = int(parent_group)
        except ValueError:
            error_msg = 'parent_group invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        department_ids = request.data.get('department_ids')
        if not isinstance(department_ids, list):
            error_msg = 'departments invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        for department_id in department_ids:
            if not isinstance(department_id, int):
                error_msg = 'department_id %s invalid.' % department_id
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        if parent_group != -1 and not ccnet_api.get_group(parent_group):
            error_msg = 'Parent Group not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # work weixin check
        if not admin_work_weixin_departments_check():
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        access_token = get_work_weixin_access_token()
        if not access_token:
            logger.error('can not get work weixin access_token')
            error_msg = '获取企业微信组织架构失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # main
        msg = list()
        failed = list()

        api_department_count = 0
        department_create_success_count = 0
        department_exist_count = 0
        department_create_failed_count = 0

        api_user_count = 0
        user_bind_department_success_count = 0
        user_bind_department_exist_count = 0
        user_bind_department_failed_count = 0

        group_owner = DEPARTMENT_OWNER
        # todo filter ccnet User database
        social_auth_queryset = SocialAuthUser.objects.filter(
            provider=WORK_WEIXIN_PROVIDER, uid__contains=WORK_WEIXIN_UID_PREFIX)

        # import departments
        for department_id in department_ids:
            department_map_to_group_dict = dict()

            # list departments from work weixin
            api_department_list = self._list_departments_from_work_weixin(access_token, department_id)
            if not api_department_list:
                logger.error('can not get work weixin department %s response' % department_id)
                failed.append('获取微信部门 %s 数据失败' % department_id)
                continue
            api_department_count += len(api_department_list)

            for index, department_obj in enumerate(api_department_list):
                # check department argument
                new_group_name = department_obj.get('name')
                department_obj_id = department_obj.get('id')
                if department_obj_id is None or not new_group_name or not validate_group_name(new_group_name):
                    department_create_failed_count += 1
                    logger.error('work weixin department argument check failed %s' % new_group_name)
                    continue

                # check parent_group
                if index != 0:
                    parent_group = department_map_to_group_dict.get(department_obj.get('parentid'))
                if parent_group is None:
                    department_create_failed_count += 1
                    logger.error('work weixin department parent group check failed %s' % new_group_name)
                    continue

                # check department exist by group name
                exist, exist_group = admin_check_group_name_conflict(new_group_name)
                if exist:
                    department_map_to_group_dict[department_obj_id] = exist_group.id
                    department_exist_count += 1
                    continue

                # create department
                try:
                    group_id = ccnet_api.create_group(
                        new_group_name, group_owner, parent_group_id=parent_group)

                    seafile_api.set_group_quota(group_id, -2)
                    department_map_to_group_dict[department_obj_id] = group_id
                    department_create_success_count += 1
                except Exception as e:
                    logger.error(e)
                    department_create_failed_count += 1

            # list department members from work weixin
            api_user_list = self._list_department_members_from_work_weixin(access_token, department_id)
            if not api_user_list:
                logger.error('can not get work weixin department %s members response' % department_id)
                failed.append('获取微信部门 %s 成员数据失败' % department_id)
                continue
            api_user_count += len(api_user_list)

            for api_user in api_user_list:
                uid = WORK_WEIXIN_UID_PREFIX + api_user.get('userid', '')
                api_user['contact_email'] = api_user['email']
                # #  determine the user exists
                if social_auth_queryset.filter(uid=uid).exists():
                    email = social_auth_queryset.get(uid=uid).username
                else:
                    # create user
                    email = gen_user_virtual_id()
                    create_user_success = _import_user_from_work_weixin(email, api_user)
                    if not create_user_success:
                        user_bind_department_failed_count += 1
                        failed.append('创建用户 %s 失败' % api_user.get('name'))
                        continue

                # bind user to department
                api_user_department_list = api_user.get('department')
                for department_obj_id in api_user_department_list:
                    group_id = department_map_to_group_dict.get(department_obj_id)
                    if group_id is not None:
                        if ccnet_api.is_group_user(group_id, email):
                            user_bind_department_exist_count += 1
                            continue

                        try:
                            ccnet_api.group_add_member(group_id, group_owner, email)
                            user_bind_department_success_count += 1
                        except Exception as e:
                            logger.error(e)
                            user_bind_department_failed_count += 1

        msg.append('企业微信部门共 %s 个，其中成功导入 %s 个，已存在 %s 个，导入失败 %s 个。' % (
                api_department_count,
                department_create_success_count,
                department_exist_count,
                department_create_failed_count,
        ))
        msg.append('企业微信部门成员共 %s 个，其中成功导入 %s 个，已存在 %s 个，导入失败 %s 个。' % (
            api_user_count,
            user_bind_department_success_count,
            user_bind_department_exist_count,
            user_bind_department_failed_count,
        ))
        return Response({
            'msg': msg,
            'failed': failed,
        })
