# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import logging
import requests
import json
from django.core.cache import cache

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean
from seahub.settings import SOCIAL_AUTH_WEIXIN_WORK_KEY, SOCIAL_AUTH_WEIXIN_WORK_SECRET
from seahub.utils import normalize_cache_key

logger = logging.getLogger(__name__)

# get access_token: https://work.weixin.qq.com/api/doc#90000/90135/91039
# get departments: https://work.weixin.qq.com/api/doc#90000/90135/90208
# get members: https://work.weixin.qq.com/api/doc#90000/90135/90200

WORK_WEIXIN_ACCESS_TOKEN_URL = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken'
WORK_WEIXIN_DEPARTMENTS_URL = 'https://qyapi.weixin.qq.com/cgi-bin/department/list'
WORK_WEIXIN_DEPARTMENT_MEMBERS_SIMPLE_LIST_URL = 'https://qyapi.weixin.qq.com/cgi-bin/user/simplelist'
WORK_WEIXIN_DEPARTMENT_MEMBERS_LIST_URL = 'https://qyapi.weixin.qq.com/cgi-bin/user/list'
WORK_WEIXIN_ACCESS_TOKEN_CACHE_KEY = 'WORK_WEIXIN_ACCESS_TOKEN'


def handler_work_weixin_api_response(response):
    try:
        response = response.json()
    except ValueError:
        logger.error(response)
        return None

    errcode = response.get('errcode', None)
    if errcode != 0:
        logger.error(json.dumps(response))
        return None
    return response


def get_work_weixin_access_token():

    cache_key = normalize_cache_key(WORK_WEIXIN_ACCESS_TOKEN_CACHE_KEY)
    access_token = cache.get(cache_key, None)

    if not access_token:
        data = {
            'corpid': SOCIAL_AUTH_WEIXIN_WORK_KEY,
            'corpsecret': SOCIAL_AUTH_WEIXIN_WORK_SECRET,
        }
        response = requests.get(WORK_WEIXIN_ACCESS_TOKEN_URL, params=data)
        response = handler_work_weixin_api_response(response)
        if not response:
            return None
        access_token = response.get('access_token', None)
        expires_in = response.get('expires_in', None)
        if access_token and expires_in:
            cache.set(cache_key, access_token, expires_in)

    return access_token


class AdminWorkWeixinDepartments(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser,)

    def get(self, request):
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
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser,)

    def get(self, request, department_id):
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

        response = requests.get(WORK_WEIXIN_DEPARTMENT_MEMBERS_LIST_URL, params=data)
        response = handler_work_weixin_api_response(response)
        if not response:
            error_msg = '获取企业微信组织架构成员失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if 'userlist' not in response:
            logger.error(json.dumps(response))
            error_msg = '企业微信API错误'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        return Response(response)
