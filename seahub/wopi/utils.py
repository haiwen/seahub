# Copyright (c) 2012-2016 Seafile Ltd.
import os
import re
import time
import urllib.request, urllib.parse, urllib.error
import urllib.parse
import requests
import hashlib
import logging
import uuid
import posixpath

try:
    import xml.etree.cElementTree as ET
except ImportError:
    import xml.etree.ElementTree as ET

from seaserv import seafile_api

from django.core.cache import cache
from django.urls import reverse

from seahub.utils import get_site_scheme_and_netloc
from .settings import OFFICE_WEB_APP_BASE_URL, WOPI_ACCESS_TOKEN_EXPIRATION, \
    OFFICE_WEB_APP_DISCOVERY_EXPIRATION, OFFICE_WEB_APP_CLIENT_PEM, \
    OFFICE_WEB_APP_CLIENT_CERT, OFFICE_WEB_APP_CLIENT_KEY, \
    OFFICE_WEB_APP_SERVER_CA, OFFICE_SERVER_TYPE

from seahub.settings import ENABLE_WATERMARK

logger = logging.getLogger(__name__)

def generate_access_token_cache_key(token):
    """ Generate cache key for WOPI access token
    """

    return 'wopi_access_token_' + str(token)

def get_file_info_by_token(token):
    """ Get file info from cache by access token

    return tuple: (request_user, repo_id, file_path, obj_id)
    """

    key = generate_access_token_cache_key(token)
    value = cache.get(key)
    if not value:
        logger.info('No wopi cache value when first get %s' % key)
        value = cache.get(key)

    return value if value else None

def generate_discovery_cache_key(name, ext):
    """ Generate cache key for office web app hosting discovery

    name: Operations that you can perform on an Office document
    ext: The file formats that are supported for the action
    """

    return 'wopi_' + name + '_' + ext

def get_wopi_dict(request_user, repo_id, file_path,
        action_name='view', can_download=True,
        language_code='en', obj_id=''):
    """ Prepare dict data for WOPI host page
    """

    if action_name not in ('view', 'edit'):
        return None

    file_name = os.path.basename(file_path)
    file_ext = os.path.splitext(file_name)[1][1:].lower()

    if OFFICE_SERVER_TYPE.lower() == 'collaboraoffice':
        if file_ext == 'doc':
            file_ext = 'docx'

        if file_ext == 'ppt':
            file_ext = 'pptx'

        if file_ext == 'xls':
            file_ext = 'xlsx'

    wopi_key = generate_discovery_cache_key(action_name, file_ext)
    action_url = cache.get(wopi_key)

    if not action_url:
        # can not get action_url from cache

        try:
            if OFFICE_WEB_APP_CLIENT_CERT and OFFICE_WEB_APP_CLIENT_KEY:
                xml = requests.get(OFFICE_WEB_APP_BASE_URL,
                    cert=(OFFICE_WEB_APP_CLIENT_CERT, OFFICE_WEB_APP_CLIENT_KEY),
                    verify=OFFICE_WEB_APP_SERVER_CA)
            elif OFFICE_WEB_APP_CLIENT_PEM:
                xml = requests.get(OFFICE_WEB_APP_BASE_URL,
                    cert=OFFICE_WEB_APP_CLIENT_PEM,
                    verify=OFFICE_WEB_APP_SERVER_CA)
            else:
                xml = requests.get(OFFICE_WEB_APP_BASE_URL, verify=OFFICE_WEB_APP_SERVER_CA)
        except Exception as e:
            logger.error(e)
            return None

        try:
            root = ET.fromstring(xml.content)
        except Exception as e:
            logger.error(e)
            return None

        for action in root.iter('action'):
            attr = action.attrib
            ext = attr.get('ext')
            name = attr.get('name')
            urlsrc = attr.get('urlsrc')

            if ext and name and urlsrc:

                tmp_action_url = re.sub(r'<.*>', '', urlsrc)
                tmp_wopi_key = generate_discovery_cache_key(name, ext)
                cache.set(tmp_wopi_key, tmp_action_url,
                        OFFICE_WEB_APP_DISCOVERY_EXPIRATION)

                if wopi_key == tmp_wopi_key:
                    action_url = tmp_action_url
            else:
                continue

    if not action_url:
        # can not get action_url from hosting discovery page
        return None

    # generate full action url
    repo = seafile_api.get_repo(repo_id)
    if repo.is_virtual:
        origin_repo_id = repo.origin_repo_id
        origin_file_path = posixpath.join(repo.origin_path, file_path.strip('/'))
        repo_path_info = '_'.join([origin_repo_id, origin_file_path])
    else:
        repo_path_info = '_'.join([repo_id, file_path])

    fake_file_id = hashlib.sha1(repo_path_info.encode('utf8')).hexdigest()
    base_url = get_site_scheme_and_netloc()
    check_file_info_endpoint = reverse('WOPIFilesView', args=[fake_file_id])
    WOPISrc = urllib.parse.urljoin(base_url, check_file_info_endpoint)

    query_dict = {'WOPISrc': WOPISrc}
    if action_url[-1] in ('?', '&'):
        full_action_url = action_url + urllib.parse.urlencode(query_dict)
    elif '?' in action_url:
        full_action_url = action_url + '&' + urllib.parse.urlencode(query_dict)
    else:
        full_action_url = action_url + '?' + urllib.parse.urlencode(query_dict)

    # key, collected from seahub/settings.py
    # value, collected from https://wopi.readthedocs.io/en/latest/faq/languages.html#languages
    lang_dict = {
        "ar": "ar-SA",
        "ca": "ca-ES",
        "cs": "cs-CZ",
        "de": "de-DE",
        "el": "el-GR",
        "en": "en-US",
        "es": "es-ES",
        "es-ar": "es-ES",
        "es-mx": "es-ES",
        "fi": "fi-FI",
        "fr": "fr-FR",
        "he": "he-IL",
        "hu": "hu-HU",
        "is": "is-IS",
        "it": "it-IT",
        "ja": "ja-JP",
        "ko": "ko-KR",
        "lv": "lv-LV",
        "nl": "nl-NL",
        "pl": "pl-PL",
        "pt-br": "pt-BR",
        "ru": "ru-Ru",
        "sl": "sl-SI",
        "sv": "sv-SE",
        "th": "th-TH",
        "tr": "tr-TR",
        "uk": "uk-UA",
        "vi": "vi-VN",
        "zh-cn": "zh-CN",
        "zh-tw": "zh-TW",
    }
    WOPI_UI_LLCC = lang_dict[language_code]

    full_action_url += '&ui=%s&rs=%s' % (WOPI_UI_LLCC, WOPI_UI_LLCC)

    # generate access token
    user_repo_path_info = {
        'request_user': request_user,
        'repo_id': repo_id,
        'file_path': file_path,
        'obj_id': obj_id,
        'can_edit': action_name == 'edit',
        'can_download': can_download,
    }

    # collobora office only allowed alphanumeric and _
    uid = uuid.uuid4()
    access_token = uid.hex
    key = generate_access_token_cache_key(access_token)
    cache.set(key, user_repo_path_info, WOPI_ACCESS_TOKEN_EXPIRATION)

    # access_token_ttl property tells office web app
    # when access token expires
    utc_timestamp = time.time()
    access_token_ttl = int((utc_timestamp + WOPI_ACCESS_TOKEN_EXPIRATION) * 1000)

    wopi_dict = {}
    wopi_dict['repo_id'] = repo_id
    wopi_dict['path'] = file_path
    wopi_dict['can_edit'] = action_name == 'edit'
    wopi_dict['action_url'] = full_action_url
    wopi_dict['access_token'] = access_token
    wopi_dict['access_token_ttl'] = access_token_ttl
    wopi_dict['doc_title'] = file_name
    wopi_dict['enable_watermark'] = ENABLE_WATERMARK and action_name == 'view'

    return wopi_dict
