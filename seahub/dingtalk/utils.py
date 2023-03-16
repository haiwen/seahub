import urllib
import logging
import requests

from django.core.cache import cache
from seahub.utils import normalize_cache_key

# for 10.0 or later
from seahub.dingtalk.settings import DINGTALK_APP_KEY, DINGTALK_APP_SECRET, \
        DINGTALK_GET_ORGAPP_TOKEN_URL, \
        DINGTALK_TOPAPI_GET_USERID_BY_UNIONID_URL, \
        DINGTALK_TOPAPI_GET_DETAILED_USER_INFO_URL

# for 9.0 or before
from seahub.dingtalk.settings import DINGTALK_DEPARTMENT_APP_KEY, \
        DINGTALK_DEPARTMENT_APP_SECRET, \
        DINGTALK_DEPARTMENT_GET_ACCESS_TOKEN_URL, \
        DINGTALK_GET_USERID_BY_UNIONID, DINGTALK_GET_DETAILED_USER_INFO_URL

logger = logging.getLogger(__name__)


# for 10.0 or later
def dingtalk_get_orgapp_token():
    """
    https://open.dingtalk.com/document/orgapp/obtain-orgapp-token
    """

    cache_key = normalize_cache_key('DINGTALK_ORGAPP_TOKEN')
    access_token = cache.get(cache_key, None)
    if access_token:
        return access_token

    data = {
        'appkey': DINGTALK_APP_KEY,
        'appsecret': DINGTALK_APP_SECRET,
    }
    resp_json = requests.get(DINGTALK_GET_ORGAPP_TOKEN_URL,
                             params=data).json()

    access_token = resp_json.get('access_token', '')
    if not access_token:
        logger.warning('failed to get dingtalk access_token')
        logger.warning(DINGTALK_GET_ORGAPP_TOKEN_URL)
        logger.warning(data)
        logger.warning(resp_json)
        return ''

    expires_in = resp_json.get('expires_in', 7200)
    cache.set(cache_key, access_token, expires_in)

    return access_token


def dingtalk_get_userid_by_unionid_new(union_id):
    """
    https://open.dingtalk.com/document/orgapp/query-a-user-by-the-union-id
    """

    cache_key = normalize_cache_key('DINGTALK_UNION_ID_%s_TO_USER_ID' % union_id)
    user_id = cache.get(cache_key, None)
    if user_id:
        return user_id

    access_token = dingtalk_get_orgapp_token()

    parameters = {'access_token': access_token}
    data = {'unionid': union_id}

    url = DINGTALK_TOPAPI_GET_USERID_BY_UNIONID_URL + '?' + urllib.parse.urlencode(parameters)
    resp_json = requests.post(url, data=data).json()

    result = resp_json.get('result', {})
    user_id = result.get('userid')

    if not user_id:
        logger.warning('failed to get userid by unionid: %s' % union_id)
        logger.warning(DINGTALK_TOPAPI_GET_USERID_BY_UNIONID_URL)
        logger.warning(data)
        logger.warning(resp_json)
        return ''

    cache.set(cache_key, user_id)

    return user_id


def dingtalk_get_detailed_user_info_new(user_id):
    """
    https://open.dingtalk.com/document/orgapp/query-user-details
    """
    access_token = dingtalk_get_orgapp_token()

    parameters = {
        'access_token': access_token,
    }
    data = {'userid': user_id}

    url = DINGTALK_TOPAPI_GET_DETAILED_USER_INFO_URL + '?' + urllib.parse.urlencode(parameters)
    return requests.post(url, data=data).json()


# for 9.0 or before
def dingtalk_get_access_token():

    cache_key = normalize_cache_key('DINGTALK_ACCESS_TOKEN')
    access_token = cache.get(cache_key, None)
    if access_token:
        return access_token

    data = {
        'appkey': DINGTALK_DEPARTMENT_APP_KEY,
        'appsecret': DINGTALK_DEPARTMENT_APP_SECRET,
    }
    resp_json = requests.get(DINGTALK_DEPARTMENT_GET_ACCESS_TOKEN_URL,
                             params=data).json()

    access_token = resp_json.get('access_token', '')
    if not access_token:
        logger.error('failed to get dingtalk access_token')
        logger.error(DINGTALK_DEPARTMENT_GET_ACCESS_TOKEN_URL)
        logger.error(data)
        logger.error(resp_json)
        return ''

    expires_in = resp_json.get('expires_in', 7200)
    cache.set(cache_key, access_token, expires_in)

    return access_token


def dingtalk_get_userid_by_unionid(union_id):

    cache_key = normalize_cache_key('DINGTALK_UNION_ID_%s' % union_id)
    user_id = cache.get(cache_key, None)
    if user_id:
        return user_id

    access_token = dingtalk_get_access_token()
    data = {
        'access_token': access_token,
        'unionid': union_id,
    }
    resp_json = requests.get(DINGTALK_GET_USERID_BY_UNIONID, params=data).json()
    user_id = resp_json.get('userid', '')
    if not user_id:
        logger.error('failed to get userid by unionid: %s' % union_id)
        logger.error(DINGTALK_GET_USERID_BY_UNIONID)
        logger.error(data)
        logger.error(resp_json)
        return ''

    cache.set(cache_key, user_id)
    return user_id


def dingtalk_get_detailed_user_info(union_id):

    access_token = dingtalk_get_access_token()
    data = {
        'access_token': access_token,
        'userid': dingtalk_get_userid_by_unionid(union_id),
    }
    return requests.get(DINGTALK_GET_DETAILED_USER_INFO_URL, params=data).json()
