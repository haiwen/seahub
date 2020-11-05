# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8

import logging
import json
import requests

from django.core.cache import cache
from django.core.files.base import ContentFile

from seahub.avatar.models import Avatar
from seahub.utils import normalize_cache_key
from seahub.work_weixin.settings import WORK_WEIXIN_CORP_ID, WORK_WEIXIN_AGENT_SECRET, \
    WORK_WEIXIN_ACCESS_TOKEN_URL, ENABLE_WORK_WEIXIN, \
    WORK_WEIXIN_DEPARTMENTS_URL, WORK_WEIXIN_DEPARTMENT_MEMBERS_URL, \
    WORK_WEIXIN_AGENT_ID, WORK_WEIXIN_AUTHORIZATION_URL, \
    WORK_WEIXIN_GET_USER_INFO_URL, WORK_WEIXIN_GET_USER_PROFILE_URL, \
    WORK_WEIXIN_NOTIFICATIONS_URL
from seahub.profile.models import Profile

logger = logging.getLogger(__name__)
WORK_WEIXIN_ACCESS_TOKEN_CACHE_KEY = 'WORK_WEIXIN_ACCESS_TOKEN'


# get access_token: https://work.weixin.qq.com/api/doc#90000/90135/91039


def get_work_weixin_access_token():
    """ get global work weixin access_token
    """
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
    """ handler work_weixin response and errcode
    """
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
    """ work weixin base check
    """
    if not ENABLE_WORK_WEIXIN:
        return False

    if not WORK_WEIXIN_CORP_ID or not WORK_WEIXIN_AGENT_SECRET or not WORK_WEIXIN_ACCESS_TOKEN_URL:
        logger.error('work weixin base relevant settings invalid.')
        logger.error('please check WORK_WEIXIN_CORP_ID, WORK_WEIXIN_AGENT_SECRET')
        logger.error('WORK_WEIXIN_ACCESS_TOKEN_URL: %s' % WORK_WEIXIN_ACCESS_TOKEN_URL)
        return False

    return True


def work_weixin_oauth_check():
    """ use for work weixin login and profile bind
    """
    if not work_weixin_base_check():
        return False

    if not WORK_WEIXIN_AGENT_ID \
            or not WORK_WEIXIN_GET_USER_INFO_URL \
            or not WORK_WEIXIN_AUTHORIZATION_URL \
            or not WORK_WEIXIN_GET_USER_PROFILE_URL:
        logger.error('work weixin oauth relevant settings invalid.')
        logger.error('please check WORK_WEIXIN_AGENT_ID')
        logger.error('WORK_WEIXIN_GET_USER_INFO_URL: %s' % WORK_WEIXIN_GET_USER_INFO_URL)
        logger.error('WORK_WEIXIN_AUTHORIZATION_URL: %s' % WORK_WEIXIN_AUTHORIZATION_URL)
        logger.error('WORK_WEIXIN_GET_USER_PROFILE_URL: %s' % WORK_WEIXIN_GET_USER_PROFILE_URL)
        return False

    return True


def admin_work_weixin_departments_check():
    """ use for admin work weixin departments
    """
    if not work_weixin_base_check():
        return False

    if not WORK_WEIXIN_DEPARTMENTS_URL \
            or not WORK_WEIXIN_DEPARTMENT_MEMBERS_URL:
        logger.error('admin work weixin departments relevant settings invalid.')
        logger.error('WORK_WEIXIN_DEPARTMENTS_URL: %s' % WORK_WEIXIN_DEPARTMENTS_URL)
        logger.error('WORK_WEIXIN_DEPARTMENT_MEMBERS_URL: %s' % WORK_WEIXIN_DEPARTMENT_MEMBERS_URL)
        return False

    return True


def work_weixin_notifications_check():
    """ use for send work weixin notifications
    """
    if not work_weixin_base_check():
        return False

    if not WORK_WEIXIN_AGENT_ID \
            or not WORK_WEIXIN_NOTIFICATIONS_URL:
        logger.error('work weixin notifications relevant settings invalid.')
        logger.error('please check WORK_WEIXIN_AGENT_ID')
        logger.error('WORK_WEIXIN_NOTIFICATIONS_URL: %s' % WORK_WEIXIN_NOTIFICATIONS_URL)
        return False

    return True


def update_work_weixin_user_info(api_user):
    """ update user profile from work weixin

    use for work weixin departments, login, profile bind
    """
    # update additional user info
    username = api_user.get('username')
    nickname = api_user.get('name')
    contact_email = api_user.get('contact_email')
    headimgurl = api_user.get('avatar')

    # make sure the contact_email is unique
    if contact_email and Profile.objects.get_profile_by_contact_email(contact_email):
        logger.warning('contact email %s already exists' % contact_email)
        contact_email = ''

    profile_kwargs = {}
    if nickname:
        profile_kwargs['nickname'] = nickname
    if contact_email:
        profile_kwargs['contact_email'] = contact_email

    if profile_kwargs:
        try:
            Profile.objects.add_or_update(username, **profile_kwargs)
        except Exception as e:
            logger.error(e)

    # avatar

    try:
        image_name = 'work_weixin_avatar'
        image_file = requests.get(headimgurl).content
        avatar = Avatar.objects.filter(emailuser=username, primary=True).first()
        avatar = avatar or Avatar(emailuser=username, primary=True)
        avatar_file = ContentFile(image_file)
        avatar_file.name = image_name
        avatar.avatar = avatar_file
        avatar.save()
    except Exception as e:
        logger.error(e)
