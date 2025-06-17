import logging
import requests
import jwt
import time
from urllib.parse import urljoin

from django.utils import timezone
from django.db.models.functions import Coalesce
from django.db.models import Sum, Value

from seahub.settings import SEAFILE_AI_SECRET_KEY, SEAFILE_AI_SERVER_URL
from seahub.role_permissions.utils import get_enabled_role_permissions_by_role
from seahub.constants import DEFAULT_USER
from seahub.utils.user_permissions import get_user_role
from seahub.utils.ccnet_db import CcnetDB
from seahub.organizations.models import OrgMemberQuota
from seahub.ai.models import StatsAIByOwner, StatsAIByTeam
try:
    from seahub.settings import ORG_MEMBER_QUOTA_ENABLED
except ImportError:
    ORG_MEMBER_QUOTA_ENABLED = False

logger = logging.getLogger(__name__)


# API
def gen_headers():
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SEAFILE_AI_SECRET_KEY, algorithm='HS256')
    return {"Authorization": "Token %s" % token}


def verify_ai_config():
    if not SEAFILE_AI_SERVER_URL or not SEAFILE_AI_SECRET_KEY:
        return False
    return True


def image_caption(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/image-caption/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def generate_summary(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/generate-summary')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def generate_file_tags(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/generate-file-tags/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def ocr(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/ocr/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def translate(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/translate/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def writing_assistant(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/writing-assistant/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def extract_text(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/extract-text/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


# utils
def get_ai_credit_by_user(user, org_id):
    user_role = get_user_role(user)
    role = DEFAULT_USER if (user_role == '' or user_role == DEFAULT_USER) else user_role
    ai_credit_per_user = get_enabled_role_permissions_by_role(role)['monthly_ai_credit_per_user']
    if ai_credit_per_user < 0:
        return -1
    if org_id and org_id != -1:
        if ORG_MEMBER_QUOTA_ENABLED:
            org_members_quota = OrgMemberQuota.objects.get_quota(org_id)
            ai_credit = org_members_quota * ai_credit_per_user
        else:
            ccnet_db = CcnetDB()
            user_count = ccnet_db.get_org_user_count(org_id)
            ai_credit = user_count * ai_credit_per_user
    else:
        ai_credit = ai_credit_per_user
    return ai_credit


def get_ai_cost_by_user(user, org_id):
    month = timezone.now().replace(day=1)
    if org_id and org_id > 0:
        cost = StatsAIByTeam.objects.filter(org_id=org_id, month=month).aggregate(total_cost=Coalesce(Sum('cost'), Value(0.0)))['total_cost']
    else:
        cost = StatsAIByOwner.objects.filter(username=user.username, month=month).aggregate(total_cost=Coalesce(Sum('cost'), Value(0.0)))['total_cost']
    return cost


def is_ai_exceed_by_assistant(user, org_id):
    ai_credit = get_ai_credit_by_user(user, org_id)
    cost = get_ai_cost_by_user(user, org_id)

    if ai_credit < 0:
        return False

    return ai_credit <= round(cost, 2)
