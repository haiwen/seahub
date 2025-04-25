import logging
import requests
from django.core.cache import cache

from seahub.utils import normalize_cache_key
from seahub.utils import is_pro_version, is_org_context
from .settings import ENABLE_STRIPE_SUBSCRIPTION, STRIPE_SUBSCRIPTION_SERVER_AUTH_KEY, \
    STRIPE_SUBSCRIPTION_SERVER_URL, STRIPE_SUBSCRIPTION_ORG_PREFIX

logger = logging.getLogger(__name__)

SUBSCRIPTION_TOKEN_CACHE_KEY = 'SUBSCRIPTION_TOKEN'


def subscription_check():

    if not is_pro_version() or not ENABLE_STRIPE_SUBSCRIPTION:
        return False

    if not STRIPE_SUBSCRIPTION_SERVER_AUTH_KEY \
            or not STRIPE_SUBSCRIPTION_SERVER_URL:
        logger.error('subscription relevant settings invalid.')
        logger.error(
            'please check SUBSCRIPTION_SERVER_AUTH_KEY')
        logger.error('STRIPE_SUBSCRIPTION_SERVER_URL: %s' % STRIPE_SUBSCRIPTION_SERVER_URL)
        return False

    return True


def get_subscription_jwt_token():
    cache_key = normalize_cache_key(SUBSCRIPTION_TOKEN_CACHE_KEY)
    jwt_token = cache.get(cache_key, None)

    if not jwt_token:
        data = {
            'auth_key': STRIPE_SUBSCRIPTION_SERVER_AUTH_KEY,
        }
        url = STRIPE_SUBSCRIPTION_SERVER_URL.rstrip('/') + '/api/jwt-auth/'
        response = requests.post(url, json=data)
        if response.status_code >= 400:
            raise ConnectionError(response.status_code, response.text)

        response_dic = response.json()
        jwt_token = response_dic.get('token')
        cache.set(cache_key, jwt_token, 3000)

    return jwt_token


def clear_subscription_jwt_token():
    cache_key = normalize_cache_key(SUBSCRIPTION_TOKEN_CACHE_KEY)
    cache.set(cache_key, None)


def get_subscription_api_headers():
    jwt_token = get_subscription_jwt_token()
    headers = {
        'Authorization': 'JWT ' + jwt_token,
        'Content-Type': 'application/json',
    }

    return headers


def handler_subscription_api_response(response):
    if response.status_code == 403:
        clear_subscription_jwt_token()
        response.status_code = 500

    return response


def subscription_permission_check(request):
    if is_org_context(request):
        is_org_staff = request.user.org.is_staff
        if not is_org_staff:
            return False

    return True


def get_customer_id(request):
    if is_org_context(request):
        org_id = request.user.org.org_id
        customer_id = STRIPE_SUBSCRIPTION_ORG_PREFIX + str(org_id)
    else:
        customer_id = request.user.username

    return customer_id
