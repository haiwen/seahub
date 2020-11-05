import hmac
import base64
import hashlib

import urllib.parse

from django.urls import reverse
from django.utils.encoding import force_bytes

from seahub.utils import get_site_scheme_and_netloc

from seahub.bisheng_office.settings import BISHENG_OFFICE_API_KEY
from seahub.bisheng_office.settings import BISHENG_OFFICE_HOST_DOMAIN


def get_hmac_hexdigest(key, msg):
    hmac_obj = hmac.new(key.encode('utf-8'), msg.encode('utf-8'))
    return hmac_obj.hexdigest()


def get_bisheng_dict(username, repo_id, file_path):
    doc_id = hashlib.md5(force_bytes(repo_id + file_path)).hexdigest()

    base_url = get_site_scheme_and_netloc()
    bisheng_url = urllib.parse.urljoin(base_url,
                                   reverse('api-v2.1-bisheng-office'))
    bisheng_url += '?doc_id=%s' % doc_id

    call_url = base64.b64encode(bisheng_url)
    sign = get_hmac_hexdigest(BISHENG_OFFICE_API_KEY, call_url)

    info = {
        'username': username,
        'repo_id': repo_id,
        'file_path': file_path,
        'doc_id': doc_id,
        'call_url': call_url,
        'sign': sign,
    }

    return info


def get_bisheng_editor_url(call_url, sign):
    return '%s/apps/editor/openEditor?callURL=%s&sign=%s' % (
        BISHENG_OFFICE_HOST_DOMAIN, call_url, sign)


def get_bisheng_preivew_url(call_url, sign):
    return '%s/apps/editor/openPreview?callURL=%s&sign=%s' % (
        BISHENG_OFFICE_HOST_DOMAIN, call_url, sign)
