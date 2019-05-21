# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import logging
import json
import requests

from django.core.cache import cache
from seahub.utils import normalize_cache_key
from .settings import WEIXIN_WORK_CORPID, WEIXIN_WORK_AGENT_SECRET, WORK_WEIXIN_ACCESS_TOKEN_URL

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
