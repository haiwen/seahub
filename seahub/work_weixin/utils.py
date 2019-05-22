# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import logging
import json
import requests

from django.core.cache import cache
from seahub.utils import normalize_cache_key
from .settings import WEIXIN_WORK_CORPID, WEIXIN_WORK_AGENT_SECRET, \
    WORK_WEIXIN_ACCESS_TOKEN_URL, ENABLE_WORK_WEIXIN_DEPARTMENTS, \
    WORK_WEIXIN_DEPARTMENTS_URL, WORK_WEIXIN_DEPARTMENT_MEMBERS_URL, \
    ENABLE_WORK_WEIXIN_OAUTH, WEIXIN_WORK_AGENT_ID, \
    WORK_WEIXIN_AUTHORIZATION_URL, WORK_WEIXIN_REDIRECT_URI, \
    WORK_WEIXIN_GET_USER_INFO_URL, WORK_WEIXIN_PROVIDER, WORK_WEIXIN_GET_USER_PROFILE_URL
from seahub.profile.models import Profile
from seahub.constants import DEFAULT_USER
from seahub.utils import is_pro_version
from seahub.base.accounts import User
from social_django.models import UserSocialAuth

logger = logging.getLogger(__name__)
WORK_WEIXIN_ACCESS_TOKEN_CACHE_KEY = 'WORK_WEIXIN_ACCESS_TOKEN'


# get access_token: https://work.weixin.qq.com/api/doc#90000/90135/91039


def get_work_weixin_access_token():
    cache_key = normalize_cache_key(WORK_WEIXIN_ACCESS_TOKEN_CACHE_KEY)
    access_token = cache.get(cache_key, None)

    if not access_token:
        data = {
            'corpid': WEIXIN_WORK_CORPID,
            'corpsecret': WEIXIN_WORK_AGENT_SECRET,
        }
        response = requests.get(WORK_WEIXIN_ACCESS_TOKEN_URL, params=data)
        response = handler_work_weixin_api_response(response)
        if not response:
            logger.error('can not get work weixin response')
            return None
        access_token = response.get('access_token', None)
        expires_in = response.get('expires_in', None)
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


def work_weixin_oauth_check():
    if not ENABLE_WORK_WEIXIN_OAUTH:
        logger.error('work weixin oauth not enabled.')
        return False
    else:
        if not WEIXIN_WORK_CORPID \
                or not WEIXIN_WORK_AGENT_ID \
                or not WORK_WEIXIN_ACCESS_TOKEN_URL \
                or not WORK_WEIXIN_REDIRECT_URI \
                or not WORK_WEIXIN_GET_USER_INFO_URL \
                or not WORK_WEIXIN_AUTHORIZATION_URL \
                or not WORK_WEIXIN_GET_USER_PROFILE_URL:
            logger.error('work weixin oauth relevant settings invalid.')
            logger.error('WEIXIN_WORK_CORPID: %s' % WEIXIN_WORK_CORPID)
            logger.error('WEIXIN_WORK_AGENT_ID: %s' % WEIXIN_WORK_AGENT_ID)
            logger.error('WORK_WEIXIN_ACCESS_TOKEN_URL: %s' % WORK_WEIXIN_ACCESS_TOKEN_URL)
            logger.error('WORK_WEIXIN_REDIRECT_URI: %s' % WORK_WEIXIN_REDIRECT_URI)
            logger.error('WORK_WEIXIN_GET_USER_INFO_URL: %s' % WORK_WEIXIN_GET_USER_INFO_URL)
            logger.error('WORK_WEIXIN_AUTHORIZATION_URL: %s' % WORK_WEIXIN_AUTHORIZATION_URL)
            logger.error('WORK_WEIXIN_GET_USER_PROFILE_URL: %s' % WORK_WEIXIN_GET_USER_PROFILE_URL)
            return False

    return True


def admin_work_weixin_departments_check():
    if not ENABLE_WORK_WEIXIN_DEPARTMENTS:
        logger.error('admin work weixin departments not enabled.')
        return False
    else:
        if not WEIXIN_WORK_CORPID \
                or not WEIXIN_WORK_AGENT_SECRET \
                or not WORK_WEIXIN_ACCESS_TOKEN_URL \
                or not WORK_WEIXIN_DEPARTMENTS_URL \
                or not WORK_WEIXIN_DEPARTMENT_MEMBERS_URL:
            logger.error('admin work weixin departments relevant settings invalid.')
            logger.error('WEIXIN_WORK_CORPID: %s' % WEIXIN_WORK_CORPID)
            logger.error('WEIXIN_WORK_AGENT_SECRET: %s' % WEIXIN_WORK_AGENT_SECRET)
            logger.error('WORK_WEIXIN_ACCESS_TOKEN_URL: %s' % WORK_WEIXIN_ACCESS_TOKEN_URL)
            logger.error('WORK_WEIXIN_DEPARTMENTS_URL: %s' % WORK_WEIXIN_DEPARTMENTS_URL)
            logger.error('WORK_WEIXIN_DEPARTMENT_MEMBERS_URL: %s' % WORK_WEIXIN_DEPARTMENT_MEMBERS_URL)
            return False

    return True


def update_work_weixin_user_info(api_user):
    email = api_user.get('username')
    try:
        # update additional user info
        if is_pro_version():
            User.objects.update_role(email, DEFAULT_USER)

        nickname = api_user.get("name", None)
        if nickname is not None:
            Profile.objects.add_or_update(email, nickname)
    except Exception as e:
        logger.error(e)


def create_work_weixin_social_auth(uid, username):

    work_weixin_user = UserSocialAuth.objects.create(
        username=username,
        provider=WORK_WEIXIN_PROVIDER,
        uid=uid,
        extra_data='{}'
    )

    # create or update
    return work_weixin_user
