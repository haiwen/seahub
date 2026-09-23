import os
import json
import time
import hmac
import logging
import hashlib
import requests

from django.core.cache import cache

from seahub.weboffice.settings import WPS_WEBOFFICE_SERVER_URL, \
        WPS_WEBOFFICE_ACCESS_KEY, WPS_WEBOFFICE_SECRET_KEY, \
        WPS_WEBOFFICE_EDIT_LINK, WPS_WEBOFFICE_PREVIEW_LINK

logger = logging.getLogger(__name__)


def _wps4_sig(method, url, date, body):

    if body is None:
        bodySha = ""
    else:
        bodySha = hashlib.sha256(body.encode('utf-8')).hexdigest()

    content = "WPS-4" + method + url + "application/json" + date + bodySha
    signature = hmac.new(WPS_WEBOFFICE_SECRET_KEY.encode('utf-8'),
                         content.encode('utf-8'),
                         hashlib.sha256).hexdigest()

    return "WPS-4 %s:%s" % (WPS_WEBOFFICE_ACCESS_KEY, signature)


def send_request(method, host, uri, body=None, cookie=None, headers=None):

    requests.packages.urllib3.disable_warnings()

    if body is not None:
        body = json.dumps(body)

    # date = "Wed, 02 Jun 2021 12:15:40 GMT"
    date = time.strftime("%a, %d %b %Y %H:%M:%S GMT", time.gmtime())

    header = {"Content-type": "application/json"}
    header['Wps-Docs-Date'] = date
    header['Wps-Docs-Authorization'] = _wps4_sig(method, uri, date, body)
    if headers is not None:
        for key, value in headers.items():
            header[key] = value

    url = f"{host}{uri}"
    resp = requests.request(method, url, data=body,
                            headers=header, cookies=cookie,
                            verify=False)

    return resp


def wps_weboffice_get_editor_url(request, repo_id, file_path,
                                 can_edit=True, can_download=True,
                                 obj_id=''):

    file_ext = os.path.splitext(file_path)[1][1:].lower()
    file_type = ''
    if file_ext in ('doc', 'dot', 'wps', 'wpt', 'docx', 'dotx', 'docm', 'dotm', 'rtf'):
        file_type = 'w'
    elif file_ext in ('ppt', 'pptx', 'pptm', 'ppsx', 'ppsm', 'pps', 'potx', 'potm', 'dpt', 'dps'):
        file_type = 'p'
    elif file_ext in ('xls', 'xlt', 'et', 'xlsx', 'xltx', 'csv', 'xlsm', 'xltm'):
        file_type = 's'

    info = '{}_{}'.format(repo_id, file_path).encode('utf-8')
    if obj_id:
        info = '{}_{}_{}'.format(repo_id, file_path, obj_id).encode('utf-8')

    wps_file_id = hashlib.md5(info).hexdigest()
    doc_info = {
        'can_edit': can_edit,
        'can_download': can_download,
        'username': request.user.username,
        'repo_id': repo_id,
        'file_path': file_path,
        'obj_id': obj_id
    }
    cache.set(wps_file_id, doc_info, None)

    if can_edit:
        basic_link = WPS_WEBOFFICE_EDIT_LINK.replace('{file_id}', wps_file_id)
    else:
        basic_link = WPS_WEBOFFICE_PREVIEW_LINK.replace('{file_id}', wps_file_id)

    uri = f'{basic_link}?type={file_type}'

    resp = send_request('GET', WPS_WEBOFFICE_SERVER_URL, uri)

    try:
        json_resp = resp.json()
        return json_resp['data']['link']
    except KeyError as e:
        logger.error(e)
        logger.error(uri)
        logger.error(resp.status_code)
        logger.error(resp.text)
        return ''
