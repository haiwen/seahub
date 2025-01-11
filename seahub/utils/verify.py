import re
import random
from django.core.cache import cache

from seahub.utils import normalize_cache_key
from seahub.profile.settings import VERIFY_CODE_CACHE_PREFIX, VERIFY_CODE_CACHE_TIMEOUT


def get_random_code(length=6, only_number=True):
    if only_number:
        alphabet = list("0123456789")
    else:
        alphabet = list("23456789abcdefghijkmnopqrstuvwxyz")
    code = ''.join([random.choice(alphabet) for _ in range(length)])
    return code


def get_sms_verify_code_cache(phone, sms_type):
    value = '%s_%s' % (phone, sms_type)
    return cache.get(normalize_cache_key(value, VERIFY_CODE_CACHE_PREFIX), None)


def set_sms_verify_code_cache(phone, sms_type, code):
    value = '%s_%s' % (phone, sms_type)
    cache.set(normalize_cache_key(value, VERIFY_CODE_CACHE_PREFIX),
              code, VERIFY_CODE_CACHE_TIMEOUT)


def verify_sms_code(phone, sms_type, code):
    code_cache = get_sms_verify_code_cache(phone, sms_type)
    if code_cache == code:
        value = '%s_%s' % (phone, sms_type)
        cache.delete(normalize_cache_key(value, VERIFY_CODE_CACHE_PREFIX))
        return True
    else:
        return False


def check_phone(phone):
    if not phone:
        return
    phone = phone.strip()
    if re.match(r'^1[3456789]\d{9}$', phone):
        return phone
