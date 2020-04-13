import logging
import requests

from django.core.cache import cache
from seahub.utils import normalize_cache_key

from seahub.dingtalk.settings import DINGTALK_DEPARTMENT_APP_KEY, \
        DINGTALK_DEPARTMENT_APP_SECRET, \
        DINGTALK_DEPARTMENT_GET_ACCESS_TOKEN_URL, \
        DINGTALK_GET_USERID_BY_UNIONID

logger = logging.getLogger(__name__)

def dingtalk_get_access_token():

    cache_key = normalize_cache_key('DINGTALK_ACCESS_TOKEN')
    access_token = cache.get(cache_key, None)

    if not access_token:

        data = {
            'appkey': DINGTALK_DEPARTMENT_APP_KEY,
            'appsecret': DINGTALK_DEPARTMENT_APP_SECRET,
        }
        resp_json = requests.get(DINGTALK_DEPARTMENT_GET_ACCESS_TOKEN_URL,
                params=data).json()

        access_token = resp_json.get('access_token', '')
        if not access_token:
            logger.error('failed to get dingtalk access_token')
            logger.error(data)
            logger.error(DINGTALK_DEPARTMENT_GET_ACCESS_TOKEN_URL)
            logger.error(resp_json)
            return ''

        expires_in = resp_json.get('expires_in', 7200)
        cache.set(cache_key, access_token, expires_in)

    return access_token

def dingtalk_get_userid_by_unionid(union_id):

    access_token = dingtalk_get_access_token()
    data = {
        'access_token': access_token,
        'unionid': union_id,
    }
    resp_json = requests.get(DINGTALK_GET_USERID_BY_UNIONID, params=data).json()
    return resp_json.get('userid', '')
