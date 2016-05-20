import os
import re
import time
import urllib
import urllib2
import urlparse
import hashlib
import logging
import uuid
from dateutil.relativedelta import relativedelta

try:
    import xml.etree.cElementTree as ET
except ImportError:
    import xml.etree.ElementTree as ET

from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.utils import timezone

from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.views import check_file_lock
from seahub.utils import get_site_scheme_and_netloc, \
    get_file_type_and_ext, is_pro_version

from seahub import settings

WOPI_ACCESS_TOKEN_EXPIRATION = getattr(settings, 'WOPI_ACCESS_TOKEN_EXPIRATION', 30 * 60)

# settings for OWA
ENABLE_OFFICE_WEB_APP = getattr(settings, 'ENABLE_OFFICE_WEB_APP', False)
if ENABLE_OFFICE_WEB_APP:
    OFFICE_WEB_APP_BASE_URL = getattr(settings, 'OFFICE_WEB_APP_BASE_URL', '')
    OFFICE_WEB_APP_DISCOVERY_EXPIRATION = getattr(settings, 'OFFICE_WEB_APP_DISCOVERY_EXPIRATION', 24 * 60 * 60)
    OFFICE_WEB_APP_FILE_EXTENSION = getattr(settings, 'OFFICE_WEB_APP_FILE_EXTENSION', ())
    ENABLE_OFFICE_WEB_APP_EDIT = getattr(settings, 'ENABLE_OFFICE_WEB_APP_EDIT', False)
    OFFICE_WEB_APP_EDIT_FILE_EXTENSION = getattr(settings, 'OFFICE_WEB_APP_EDIT_FILE_EXTENSION', ())
else:
    OFFICE_WEB_APP_BASE_URL = ''
    OFFICE_WEB_APP_DISCOVERY_EXPIRATION = 0
    OFFICE_WEB_APP_FILE_EXTENSION = ()
    ENABLE_OFFICE_WEB_APP_EDIT = False
    OFFICE_WEB_APP_EDIT_FILE_EXTENSION = ()

# settings for LibreOFFICE
ENABLE_LibreOFFICE = getattr(settings, 'ENABLE_LibreOFFICE', False)
if ENABLE_LibreOFFICE:
    LibreOFFICE_BASE_URL = getattr(settings, 'LibreOFFICE_BASE_URL', '')
    LibreOFFICE_DISCOVERY_EXPIRATION = getattr(settings, 'LibreOFFICE_DISCOVERY_EXPIRATION', 24 * 60 * 60)
    LibreOFFICE_EDIT_FILE_EXTENSION = getattr(settings, 'LibreOFFICE_EDIT_FILE_EXTENSION', ())
else:
    LibreOFFICE_BASE_URL = ''
    LibreOFFICE_DISCOVERY_EXPIRATION = 0
    LibreOFFICE_EDIT_FILE_EXTENSION = ()

logger = logging.getLogger(__name__)

def check_can_view_file_by_OWA(username, repo_id, path):
    try:
        repo = seafile_api.get_repo(repo_id)
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        permission = seafile_api.check_permission_by_path(repo_id, path, username)
    except SearpcError as e:
        logger.error(e)
        return False

    filename = os.path.basename(path)
    filetype, fileext = get_file_type_and_ext(filename)

    if (not is_pro_version()) or (not repo) or repo.encrypted or (not file_id) or \
        (not permission) or (not ENABLE_OFFICE_WEB_APP) or \
        (fileext not in OFFICE_WEB_APP_FILE_EXTENSION):
        return False

    return True

def check_can_edit_file_by_OWA(username, repo_id, path):
    try:
        repo = seafile_api.get_repo(repo_id)
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        permission = seafile_api.check_permission_by_path(repo_id, path, username)
    except SearpcError as e:
        logger.error(e)
        return False

    filename = os.path.basename(path)
    filetype, fileext = get_file_type_and_ext(filename)

    if (not is_pro_version()) or (not repo) or repo.encrypted or (not file_id) or \
        (permission != 'rw') or (not ENABLE_OFFICE_WEB_APP_EDIT) or \
        (fileext not in OFFICE_WEB_APP_EDIT_FILE_EXTENSION):
        return False

    is_locked, locked_by_me = check_file_lock(repo_id, path, username)
    if is_locked and not locked_by_me:
        return False

    return True

def check_can_edit_file_by_LibreOFFICE(username, repo_id, path):
    try:
        repo = seafile_api.get_repo(repo_id)
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        permission = seafile_api.check_permission_by_path(repo_id, path, username)
    except SearpcError as e:
        logger.error(e)
        return False

    filename = os.path.basename(path)
    filetype, fileext = get_file_type_and_ext(filename)

    if (not repo) or repo.encrypted or (not file_id) or \
        (permission != 'rw') or (not ENABLE_LibreOFFICE) or \
        (fileext not in LibreOFFICE_EDIT_FILE_EXTENSION):
        return False

    is_locked, locked_by_me = check_file_lock(repo_id, path, username)
    if is_locked and not locked_by_me:
        return False

    return True

def generate_access_token_cache_key(token):
    """ Generate cache key for WOPI access token
    """

    return 'wopi_access_token_' + str(token)

def get_file_info_by_token(token):
    """ Get file info from cache by access token

    return tuple: (request_user, repo_id, file_path)
    """

    key = generate_access_token_cache_key(token)
    return cache.get(key) if cache.get(key) else (None, None, None)

def generate_discovery_cache_key(name, ext):
    """ Generate cache key for office web app hosting discovery

    name: Operations that you can perform on an Office document
    ext: The file formats that are supported for the action
    """

    return 'wopi_' + name + '_' + ext

def get_wopi_dict(request_user, repo_id, file_path, action_name='view'):
    """ Prepare dict data for WOPI host page
    """

    if action_name not in ('view', 'edit'):
        return None

    file_name = os.path.basename(file_path)
    file_ext = os.path.splitext(file_name)[1][1:].lower()

    wopi_key = generate_discovery_cache_key(action_name, file_ext)
    action_url = cache.get(wopi_key)

    if not action_url:
        # can not get action_url from cache
        if ENABLE_OFFICE_WEB_APP:
            base_url = OFFICE_WEB_APP_BASE_URL
            discovery_expiration = OFFICE_WEB_APP_DISCOVERY_EXPIRATION
        elif ENABLE_LibreOFFICE:
            base_url = LibreOFFICE_BASE_URL
            discovery_expiration = LibreOFFICE_DISCOVERY_EXPIRATION
        else:
            base_url = ''
            discovery_expiration = 0

        try:
            xml = urllib2.urlopen(base_url)
        except urllib2.URLError as e:
            logger.error(e)
            return None

        try:
            tree = ET.parse(xml)
            root = tree.getroot()
        except Exception as e:
            logger.error(e)
            return None

        for action in root.getiterator('action'):
            attr = action.attrib
            ext = attr.get('ext')
            name = attr.get('name')
            urlsrc = attr.get('urlsrc')

            if ext and name and urlsrc:
                tmp_action_url = re.sub(r'<.*>', '', urlsrc)
                tmp_wopi_key = generate_discovery_cache_key(name, ext)
                cache.set(tmp_wopi_key, tmp_action_url, discovery_expiration)

                if wopi_key == tmp_wopi_key:
                    action_url = tmp_action_url
            else:
                continue

    if not action_url:
        # can not get action_url from hosting discovery page
        return None

    # generate full action url
    full_file_info = '_'.join([request_user, repo_id, file_path])
    fake_file_id = hashlib.sha1(full_file_info.encode('utf8')).hexdigest()

    base_url = get_site_scheme_and_netloc()
    check_file_info_endpoint = reverse('api-v2.1-wopi-files', args=[fake_file_id])
    WOPISrc = urlparse.urljoin(base_url, check_file_info_endpoint)

    query_dict = {'WOPISrc': WOPISrc}
    if action_url[-1] in ('?', '&'):
        full_action_url = action_url + urllib.urlencode(query_dict)
    elif '?' in action_url:
        full_action_url = action_url + '&' + urllib.urlencode(query_dict)
    else:
        full_action_url = action_url + '?' + urllib.urlencode(query_dict)

    # generate access token
    file_info = (request_user, repo_id, file_path)
    access_token = uuid.uuid4()
    key = generate_access_token_cache_key(access_token)
    cache.set(key, file_info, WOPI_ACCESS_TOKEN_EXPIRATION)

    # access_token_ttl property tells office web app
    # when access token expires
    expire_sec = WOPI_ACCESS_TOKEN_EXPIRATION
    expiration= timezone.now() + relativedelta(seconds=expire_sec)
    milliseconds_ttl = time.mktime(expiration.timetuple()) * 1000
    access_token_ttl = int(milliseconds_ttl)

    wopi_dict = {}
    wopi_dict['action_url'] = full_action_url
    wopi_dict['access_token'] = access_token
    wopi_dict['access_token_ttl'] = access_token_ttl

    return wopi_dict
