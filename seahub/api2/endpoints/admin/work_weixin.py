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
from seahub.api2.permissions import IsProVersion

from seahub.work_weixin.utils import handler_work_weixin_api_response, \
    get_work_weixin_access_token, admin_work_weixin_departments_check, \
    update_work_weixin_user_info
from seahub.work_weixin.settings import WORK_WEIXIN_DEPARTMENTS_URL, \
    WORK_WEIXIN_DEPARTMENT_MEMBERS_URL, WORK_WEIXIN_PROVIDER, WORK_WEIXIN_UID_PREFIX
from seahub.base.accounts import User
from seahub.auth.models import SocialAuthUser
from seahub.group.utils import validate_group_name
from seahub.auth.models import ExternalDepartment

logger = logging.getLogger(__name__)
WORK_WEIXIN_DEPARTMENT_FIELD = 'department'
WORK_WEIXIN_DEPARTMENT_MEMBERS_FIELD = 'userlist'
DEPARTMENT_OWNER = 'system admin'


# # uid = corpid + '_' + userid
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

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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
            api_user['contact_email'] = api_user.get('email', '')
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


def _import_user_from_work_weixin(api_user):
    uid = WORK_WEIXIN_UID_PREFIX + api_user.get('userid')
    try:
        contact_email = api_user.get('contact_email') if api_user.get('contact_email') else None
        user = User.objects.create_oauth_user(contact_email)
        api_user['username'] = user.username
        SocialAuthUser.objects.add(user.username, WORK_WEIXIN_PROVIDER, uid)
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

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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
                if _import_user_from_work_weixin(api_user):
                    success.append({
                        'userid': api_user.get('userid'),
                        'name': api_user.get('name'),
                        'email': api_user.get('username'),
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


class AdminWorkWeixinDepartmentsImport(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def _list_departments_from_work_weixin(self, access_token, department_id):
        # https://work.weixin.qq.com/api/doc/90000/90135/90208
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

    def _api_department_success_msg(self, department_obj_id, department_obj_name, group_id):
        return {
            'type': 'department',
            'department_id': department_obj_id,
            'department_name': department_obj_name,
            'group_id': group_id,
        }

    def _api_department_failed_msg(self, department_obj_id, department_obj_name, msg):
        return {
            'type': 'department',
            'department_id': department_obj_id,
            'department_name': department_obj_name,
            'msg': msg,
        }

    def _api_user_success_msg(self, email, api_user_name, department_obj_id, group_id):
        return {
            'type': 'user',
            'email': email,
            'api_user_name': api_user_name,
            'department_id': department_obj_id,
            'group_id': group_id,
        }

    def _api_user_failed_msg(self, email, api_user_name, department_obj_id, msg):
        return {
            'type': 'user',
            'email': email,
            'api_user_name': api_user_name,
            'department_id': department_obj_id,
            'msg': msg,
        }

    def post(self, request):
        """import department from work weixin

        permission: IsProVersion
        """

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        department_id = request.data.get('work_weixin_department_id')
        try:
            department_id = int(department_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'work_weixin_department_ids invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # is pro version and work weixin check
        if not IsProVersion or not admin_work_weixin_departments_check():
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        access_token = get_work_weixin_access_token()
        if not access_token:
            logger.error('can not get work weixin access_token')
            error_msg = '获取企业微信组织架构失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # list departments from work weixin
        api_department_list = self._list_departments_from_work_weixin(access_token, department_id)
        if api_department_list is None:
            error_msg = '获取企业微信组织架构失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        api_department_list = sorted(api_department_list, key=lambda x: x['id'])

        # list department members from work weixin
        api_user_list = self._list_department_members_from_work_weixin(access_token, department_id)
        if api_user_list is None:
            error_msg = '获取企业微信组织架构成员失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # main
        success = list()
        failed = list()
        department_map_to_group_dict = dict()

        for index, department_obj in enumerate(api_department_list):
            # check department argument
            new_group_name = department_obj.get('name')
            department_obj_id = department_obj.get('id')
            parent_department_id = department_obj.get('parentid', 0)
            if department_obj_id is None or not new_group_name or not validate_group_name(new_group_name):
                failed_msg = self._api_department_failed_msg(
                    department_obj_id, new_group_name, '部门参数错误')
                failed.append(failed_msg)
                continue

            # check parent group
            if index == 0:
                parent_group_id = -1
            else:
                parent_group_id = department_map_to_group_dict.get(parent_department_id)

            if parent_group_id is None:
                failed_msg = self._api_department_failed_msg(
                    department_obj_id, new_group_name, '父级部门不存在')
                failed.append(failed_msg)
                continue

            # check department exist
            exist_department = ExternalDepartment.objects.get_by_provider_and_outer_id(
                WORK_WEIXIN_PROVIDER, department_obj_id)
            if exist_department:
                department_map_to_group_dict[department_obj_id] = exist_department.group_id
                failed_msg = self._api_department_failed_msg(
                    department_obj_id, new_group_name, '部门已存在')
                failed.append(failed_msg)
                continue

            # import department
            try:
                group_id = ccnet_api.create_group(
                    new_group_name, DEPARTMENT_OWNER, parent_group_id=parent_group_id)

                seafile_api.set_group_quota(group_id, -2)

                ExternalDepartment.objects.create(
                    group_id=group_id,
                    provider=WORK_WEIXIN_PROVIDER,
                    outer_id=department_obj_id,
                )

                department_map_to_group_dict[department_obj_id] = group_id
                success_msg = self._api_department_success_msg(
                    department_obj_id, new_group_name, group_id)
                success.append(success_msg)
            except Exception as e:
                logger.error(e)
                failed_msg = self._api_department_failed_msg(
                    department_obj_id, new_group_name, '部门导入失败')
                failed.append(failed_msg)

        # todo filter ccnet User database
        social_auth_queryset = SocialAuthUser.objects.filter(
            provider=WORK_WEIXIN_PROVIDER, uid__contains=WORK_WEIXIN_UID_PREFIX)

        # import api_user
        for api_user in api_user_list:
            uid = WORK_WEIXIN_UID_PREFIX + api_user.get('userid', '')
            api_user['contact_email'] = api_user.get('email', '')
            api_user_name = api_user.get('name')

            #  determine the user exists
            if social_auth_queryset.filter(uid=uid).exists():
                email = social_auth_queryset.get(uid=uid).username  # this email means username
            else:
                # create user
                create_user_success = _import_user_from_work_weixin(api_user)
                if not create_user_success:
                    failed_msg = self._api_user_failed_msg(
                        '', api_user_name, department_id, '导入用户失败')
                    failed.append(failed_msg)
                    continue
                # api_user's username is from `User.objects.create_oauth_user` in `_import_user_from_work_weixin`
                email = api_user.get('username')

            # bind user to department
            api_user_department_list = api_user.get('department')
            for department_obj_id in api_user_department_list:
                group_id = department_map_to_group_dict.get(department_obj_id)
                if group_id is None:
                    # the api_user also exist in the brother department which not import
                    continue

                if ccnet_api.is_group_user(group_id, email):
                    failed_msg = self._api_user_failed_msg(
                        email, api_user_name, department_obj_id, '部门成员已存在')
                    failed.append(failed_msg)
                    continue

                try:
                    ccnet_api.group_add_member(group_id, DEPARTMENT_OWNER, email)
                    success_msg = self._api_user_success_msg(
                        email, api_user_name, department_obj_id, group_id)
                    success.append(success_msg)
                except Exception as e:
                    logger.error(e)
                    failed_msg = self._api_user_failed_msg(
                        email, api_user_name, department_id, '导入部门成员失败')
                    failed.append(failed_msg)

        return Response({
            'success': success,
            'failed': failed,
        })
