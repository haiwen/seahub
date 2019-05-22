# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import logging
import requests
import json

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean
from seahub.work_weixin.utils import handler_work_weixin_api_response, \
    get_work_weixin_access_token, admin_work_weixin_departments_check, \
    update_work_weixin_user_info, create_work_weixin_social_auth
from seahub.work_weixin.settings import WORK_WEIXIN_DEPARTMENTS_URL, \
    WORK_WEIXIN_DEPARTMENT_MEMBERS_URL, WORK_WEIXIN_PROVIDER
from social_django.models import UserSocialAuth
from seahub.base.accounts import User
from seahub.utils.auth import gen_user_virtual_id

logger = logging.getLogger(__name__)


# get departments: https://work.weixin.qq.com/api/doc#90000/90135/90208
# get members: https://work.weixin.qq.com/api/doc#90000/90135/90200


class AdminWorkWeixinDepartments(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request):
        if not admin_work_weixin_departments_check():
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        access_token = get_work_weixin_access_token()
        if not access_token:
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
            error_msg = '获取企业微信组织架构失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if 'department' not in api_response_dic:
            logger.error(json.dumps(api_response_dic))
            error_msg = '企业微信API错误'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        return Response(api_response_dic)


class AdminWorkWeixinDepartmentMembers(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, department_id):
        if not admin_work_weixin_departments_check():
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        access_token = get_work_weixin_access_token()
        if not access_token:
            error_msg = '获取企业微信组织架构成员失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        data = {
            'access_token': access_token,
            'department_id': department_id,
        }
        fetch_child = request.GET.get('fetch_child', 'false')
        fetch_child = to_python_boolean(fetch_child)
        if fetch_child:
            data['fetch_child'] = 1

        api_response = requests.get(WORK_WEIXIN_DEPARTMENT_MEMBERS_URL, params=data)
        api_response_dic = handler_work_weixin_api_response(api_response)
        if not api_response_dic:
            error_msg = '获取企业微信组织架构成员失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if 'userlist' not in api_response_dic:
            logger.error(json.dumps(api_response_dic))
            error_msg = '企业微信API错误'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        api_user_list = api_response_dic['userlist']
        social_auth_queryset = UserSocialAuth.objects.filter(provider=WORK_WEIXIN_PROVIDER)
        for api_user in api_user_list:
            uid = api_user.get('userid', '')
            api_user['exists'] = True if social_auth_queryset.filter(uid=uid).exists() else False

        return Response(api_response_dic)


def _handler_work_weixin_user_data(api_user, social_auth_queryset):
    user_id = api_user.get('userid', None)
    name = api_user.get('name', None)
    error_data = None
    if not user_id:
        error_data = {
            'userid': None,
            'name': None,
            'error_msg': 'userid invalid.',
        }
    elif social_auth_queryset.filter(uid=user_id).exists():
        error_data = {
            'userid': user_id,
            'name': name,
            'error_msg': '用户已存在',
        }

    return error_data


def _create_user_and_user_info_and_work_weixin_social_auth(api_user):
    email = gen_user_virtual_id()
    api_user['username'] = email
    uid = api_user.get('userid')
    try:
        User.objects.create_user(email)
        create_work_weixin_social_auth(uid, email)
        update_work_weixin_user_info(api_user)
    except Exception as e:
        logger.error(e)
        return False

    return True


class AdminWorkWeixinUsers(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        if not admin_work_weixin_departments_check():
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        api_user_list = request.data.get('user_list', None)
        if not api_user_list or not isinstance(api_user_list, list):
            error_msg = 'user_list invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        success = []
        failed = []
        social_auth_queryset = UserSocialAuth.objects.filter(provider=WORK_WEIXIN_PROVIDER)

        for api_user in api_user_list:

            error_data = _handler_work_weixin_user_data(api_user, social_auth_queryset)
            if not error_data:

                if _create_user_and_user_info_and_work_weixin_social_auth(api_user):
                    success.append({
                        'userid': api_user.get('userid'),
                        'name': api_user.get('name'),
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
