# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import logging
import requests
import json
import uuid

from django.db import transaction
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean
from seahub.work_weixin.utils import handler_work_weixin_api_response, get_work_weixin_access_token
from seahub.work_weixin.settings import ENABLE_WORK_WEIXIN_DEPARTMENTS, WORK_WEIXIN_DEPARTMENTS_URL, \
    WORK_WEIXIN_DEPARTMENT_MEMBERS_URL, WORK_WEIXIN_PROVIDER, WORK_WEIXIN_EMAIL_DOMAIN
from social_django.models import UserSocialAuth
from seahub.profile.models import Profile
from seahub.base.accounts import User
from seahub.constants import DEFAULT_USER
from seahub.utils import is_valid_username, is_pro_version, is_valid_email

logger = logging.getLogger(__name__)


# get departments: https://work.weixin.qq.com/api/doc#90000/90135/90208
# get members: https://work.weixin.qq.com/api/doc#90000/90135/90200


class AdminWorkWeixinDepartments(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request):
        if not ENABLE_WORK_WEIXIN_DEPARTMENTS:
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

        response = requests.get(WORK_WEIXIN_DEPARTMENTS_URL, params=data)
        response = handler_work_weixin_api_response(response)
        if not response:
            error_msg = '获取企业微信组织架构失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if 'department' not in response:
            logger.error(json.dumps(response))
            error_msg = '企业微信API错误'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        return Response(response)


class AdminWorkWeixinDepartmentMembers(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, department_id):
        if not ENABLE_WORK_WEIXIN_DEPARTMENTS:
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

        response = requests.get(WORK_WEIXIN_DEPARTMENT_MEMBERS_URL, params=data)
        response = handler_work_weixin_api_response(response)
        if not response:
            error_msg = '获取企业微信组织架构成员失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if 'userlist' not in response:
            logger.error(json.dumps(response))
            error_msg = '企业微信API错误'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        user_list = response['userlist']
        work_weixin_user_queryset = UserSocialAuth.objects.filter(provider=WORK_WEIXIN_PROVIDER)
        for work_weixin_user in user_list:
            uid = work_weixin_user.get('userid', '')
            work_weixin_user['exists'] = True if work_weixin_user_queryset.filter(uid=uid).exists() else False

        return Response(response)


def handler_work_weixin_user_data(work_weixin_user, user_social_auth_queryset):
    user_id = work_weixin_user.get('userid', None)
    name = work_weixin_user.get('name', None)
    if not user_id:
        return {
            'userid': None,
            'name': None,
            'error_msg': 'userid invalid.',
        }

    if user_social_auth_queryset.filter(uid=user_id).exists():
        return {
            'userid': user_id,
            'name': name,
            'error_msg': '用户已存在',
        }

    return None


def update_work_weixin_user_info(work_weixin_user, user):
    email = user.username

    # update additional user info
    if is_pro_version():
        User.objects.update_role(email, DEFAULT_USER)

    nickname = work_weixin_user.get("name", None)
    if nickname is not None:
        Profile.objects.add_or_update(email, nickname)


def create_work_weixin_user(work_weixin_user):
    email = str(uuid.uuid4()) + WORK_WEIXIN_EMAIL_DOMAIN
    if not is_valid_username(email):
        logger.error('uuid email invalid', email)
        return False

    uid = work_weixin_user.get('userid')
    try:
        with transaction.atomic():
            user_obj = User.objects.create_user(email)
            UserSocialAuth.objects.create(username=email, provider=WORK_WEIXIN_PROVIDER, uid=uid, extra_data='{}')
            update_work_weixin_user_info(work_weixin_user, user_obj)
    except Exception as e:
        logger.error(e)
        return False

    return True


class AdminWorkWeixinUsers(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        if not ENABLE_WORK_WEIXIN_DEPARTMENTS:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        work_weixin_user_list = request.data.get('user_list', None)
        if not work_weixin_user_list or not isinstance(work_weixin_user_list, list):
            error_msg = 'user_list invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        success = []
        failed = []
        work_weixin_user_queryset = UserSocialAuth.objects.filter(provider=WORK_WEIXIN_PROVIDER)

        for work_weixin_user in work_weixin_user_list:

            error_data = handler_work_weixin_user_data(work_weixin_user, work_weixin_user_queryset)
            if not error_data:

                if create_work_weixin_user(work_weixin_user):
                    success.append({
                        'userid': work_weixin_user.get('userid'),
                        'name': work_weixin_user.get('name'),
                    })
                else:
                    failed.append({
                        'userid': work_weixin_user.get('userid'),
                        'name': work_weixin_user.get('name'),
                        'error_msg': '导入失败'
                    })
            else:
                failed.append(error_data)

        return Response({'success': success, 'failed': failed})
