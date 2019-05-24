# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import logging
import json
import requests

from django.core.cache import cache
from seahub.utils import normalize_cache_key
from seahub.work_weixin.settings import WORK_WEIXIN_CORP_ID, WORK_WEIXIN_AGENT_SECRET, \
    WORK_WEIXIN_ACCESS_TOKEN_URL, ENABLE_WORK_WEIXIN_DEPARTMENTS, \
    WORK_WEIXIN_DEPARTMENTS_URL, WORK_WEIXIN_DEPARTMENT_MEMBERS_URL, \
    ENABLE_WORK_WEIXIN_OAUTH, WORK_WEIXIN_AGENT_ID, WORK_WEIXIN_AUTHORIZATION_URL, \
    WORK_WEIXIN_GET_USER_INFO_URL, WORK_WEIXIN_GET_USER_PROFILE_URL
from seahub.profile.models import Profile

logger = logging.getLogger(__name__)
WORK_WEIXIN_ACCESS_TOKEN_CACHE_KEY = 'WORK_WEIXIN_ACCESS_TOKEN'


# from social_django.models import UserSocialAuth
# get access_token: https://work.weixin.qq.com/api/doc#90000/90135/91039


def get_work_weixin_access_token():
    cache_key = normalize_cache_key(WORK_WEIXIN_ACCESS_TOKEN_CACHE_KEY)
    access_token = cache.get(cache_key, None)

    if not access_token:
        data = {
            'corpid': WORK_WEIXIN_CORP_ID,
            'corpsecret': WORK_WEIXIN_AGENT_SECRET,
        }
        api_response = requests.get(WORK_WEIXIN_ACCESS_TOKEN_URL, params=data)
        api_response_dic = handler_work_weixin_api_response(api_response)
        if not api_response_dic:
            logger.error('can not get work weixin response')
            return None
        access_token = api_response_dic.get('access_token', None)
        expires_in = api_response_dic.get('expires_in', None)
        if access_token and expires_in:
            cache.set(cache_key, access_token, expires_in)

    return access_token


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


def work_weixin_base_check():
    if not WORK_WEIXIN_CORP_ID or not WORK_WEIXIN_ACCESS_TOKEN_URL:
        logger.error('work weixin base relevant settings invalid.')
        logger.error('WORK_WEIXIN_CORP_ID: %s' % WORK_WEIXIN_CORP_ID)
        logger.error('WORK_WEIXIN_ACCESS_TOKEN_URL: %s' % WORK_WEIXIN_ACCESS_TOKEN_URL)
        return False
    return True


def work_weixin_oauth_check():
    if not work_weixin_base_check():
        return False

    if not ENABLE_WORK_WEIXIN_OAUTH:
        logger.error('work weixin oauth not enabled.')
        return False
    else:
        if not WORK_WEIXIN_AGENT_ID \
                or not WORK_WEIXIN_GET_USER_INFO_URL \
                or not WORK_WEIXIN_AUTHORIZATION_URL \
                or not WORK_WEIXIN_GET_USER_PROFILE_URL:
            logger.error('work weixin oauth relevant settings invalid.')
            logger.error('WORK_WEIXIN_AGENT_ID: %s' % WORK_WEIXIN_AGENT_ID)
            logger.error('WORK_WEIXIN_GET_USER_INFO_URL: %s' % WORK_WEIXIN_GET_USER_INFO_URL)
            logger.error('WORK_WEIXIN_AUTHORIZATION_URL: %s' % WORK_WEIXIN_AUTHORIZATION_URL)
            logger.error('WORK_WEIXIN_GET_USER_PROFILE_URL: %s' % WORK_WEIXIN_GET_USER_PROFILE_URL)
            return False

    return True


def admin_work_weixin_departments_check():
    if not work_weixin_base_check():
        return False

    if not ENABLE_WORK_WEIXIN_DEPARTMENTS:
        logger.error('admin work weixin departments not enabled.')
        return False
    else:
        if not WORK_WEIXIN_AGENT_SECRET \
                or not WORK_WEIXIN_DEPARTMENTS_URL \
                or not WORK_WEIXIN_DEPARTMENT_MEMBERS_URL:
            logger.error('admin work weixin departments relevant settings invalid.')
            logger.error('WORK_WEIXIN_AGENT_SECRET: %s' % WORK_WEIXIN_AGENT_SECRET)
            logger.error('WORK_WEIXIN_DEPARTMENTS_URL: %s' % WORK_WEIXIN_DEPARTMENTS_URL)
            logger.error('WORK_WEIXIN_DEPARTMENT_MEMBERS_URL: %s' % WORK_WEIXIN_DEPARTMENT_MEMBERS_URL)
            return False

    return True


def update_work_weixin_user_info(api_user):
    email = api_user.get('username')
    try:
        # update additional user info
        nickname = api_user.get("name", None)
        if nickname is not None:
            Profile.objects.add_or_update(email, nickname)
    except Exception as e:
        logger.error(e)
