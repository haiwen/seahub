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
from seahub.utils import is_org_context
from seahub.group.utils import validate_group_name, check_top_group_name_conflict

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


class AdminWorkWeixinDepartmentImport(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def post(self, request, department_id):
        """import department from work weixin
        """
        # argument check
        parent_group = request.data.get('parent_group', -1)
        try:
            parent_group = int(parent_group)
        except ValueError:
            error_msg = 'parent_group invalid.'
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

        department_success = list()
        department_failed = list()
        user_success = list()
        user_failed = list()

        # list departments from work weixin
        data = {
            'access_token': access_token,
            'id': department_id,
        }

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

        # import departments
        department_list = api_response_dic[WORK_WEIXIN_DEPARTMENT_FIELD]
        group_owner = DEPARTMENT_OWNER
        tmp_group_id_dic = dict()

        for index, department_obj in enumerate(department_list):
            if index != 0:
                parent_group = tmp_group_id_dic.get(department_obj.get('parentid'), None)

            new_group_name = department_obj.get('name', '')
            tmp_department_id = department_obj.get('id', None)
            if parent_group is None or \
                    tmp_department_id is None or\
                    not new_group_name or \
                    not validate_group_name(new_group_name):
                logger.warning('department parameters check failed')
                department_failed.append({
                    'department_id': tmp_department_id,
                    'department_name': new_group_name,
                })
                continue

            if parent_group == -1 and check_top_group_name_conflict(request, new_group_name):
                error_msg = '部门已存在'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # create department
            try:
                if is_org_context(request):
                    # request called by org admin
                    org_id = request.user.org.org_id
                    group_id = ccnet_api.create_org_group(
                        org_id, new_group_name, group_owner, parent_group_id=parent_group)
                else:
                    group_id = ccnet_api.create_group(
                        new_group_name, group_owner, parent_group_id=parent_group)

                seafile_api.set_group_quota(group_id, -2)
                tmp_group_id_dic[tmp_department_id] = group_id
                department_success.append({
                    'department_id': tmp_department_id,
                    'department_name': new_group_name,
                    'group_id': group_id,
                })
            except Exception as e:
                logger.error(e)
                department_failed.append({
                    'department_id': tmp_department_id,
                    'department_name': new_group_name,
                })

        # list department members from work weixin
        data = {
            'access_token': access_token,
            'department_id': department_id,
            'fetch_child': 1,
        }

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

        group_owner = DEPARTMENT_OWNER
        for api_user in api_user_list:
            uid = WORK_WEIXIN_UID_PREFIX + api_user.get('userid', '')
            api_user['contact_email'] = api_user['email']
            # #  determine the user exists
            if social_auth_queryset.filter(uid=uid).exists():
                email = social_auth_queryset.get(uid=uid).username
            else:
                # import user
                email = gen_user_virtual_id()
                _import_user_from_work_weixin(email, api_user)

            # bind user to department
            api_user_department_list = api_user.get('department')
            for tmp_department_id in api_user_department_list:
                group_id = tmp_group_id_dic.get(tmp_department_id, None)
                if group_id is not None:
                    try:
                        ccnet_api.group_add_member(group_id, group_owner, email)
                        user_success.append({
                            'email': email,
                            'nickname': api_user.get('name'),
                        })
                    except Exception as e:
                        logger.error(e)
                        user_failed.append({
                            'email': email,
                            'nickname': api_user.get('name'),
                        })

        return Response({
            'department_success': department_success,
            'department_failed': department_failed,
            'user_success': user_success,
            'user_failed': user_failed,
        })
