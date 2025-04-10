# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
from functools import partial
import os
import re
import urllib.request
import urllib.parse
import urllib.error
import uuid
import logging
import hashlib
import tempfile
import configparser
import mimetypes
import contextlib
import json
from datetime import datetime
from urllib.parse import urlparse, urljoin

from constance import config
import seaserv
from seaserv import seafile_api, ccnet_api

from django.urls import reverse
from django.core.mail import EmailMessage
from django.shortcuts import render
from django.template import loader
from django.utils.translation import gettext as _
from django.http import HttpResponseRedirect, HttpResponse
from urllib.parse import quote
from django.utils.html import escape
from django.utils.timezone import make_naive, is_aware
from django.utils.crypto import get_random_string

from seahub.auth import REDIRECT_FIELD_NAME
from seahub.api2.models import Token, TokenV2
import seahub.settings
from seahub.settings import MEDIA_URL, LOGO_PATH, \
        MEDIA_ROOT, CUSTOM_LOGO_PATH
from seahub.constants import PERMISSION_READ_WRITE
from seahub.utils.db_api import SeafileDB

try:
    from seahub.settings import EVENTS_CONFIG_FILE
except ImportError:
    EVENTS_CONFIG_FILE = None
try:
    from seahub.settings import EMAIL_HOST
    IS_EMAIL_CONFIGURED = True
except ImportError:
    IS_EMAIL_CONFIGURED = False
try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False
try:
    from seahub.settings import ENABLE_INNER_FILESERVER
except ImportError:
    ENABLE_INNER_FILESERVER = True

logger = logging.getLogger(__name__)

# init Seafevents API
if EVENTS_CONFIG_FILE:
    try:
        from seafevents import seafevents_api
    except ImportError:
        logging.exception('Failed to import seafevents package.')
        seafevents_api = None
else:
    class RPCProxy(object):
        def __getattr__(self, name):
            return partial(self.method_missing, name)

        def method_missing(self, name, *args, **kwargs):
            return None
    seafevents_api = RPCProxy()

def is_pro_version():
    return getattr(seahub.settings, 'IS_PRO_VERSION', False) is True
    
def is_cluster_mode():
    cfg = configparser.ConfigParser()
    if 'SEAFILE_CENTRAL_CONF_DIR' in os.environ:
        confdir = os.environ['SEAFILE_CENTRAL_CONF_DIR']
    else:
        confdir = os.environ['SEAFILE_CONF_DIR']
    conf = os.path.join(confdir, 'seafile.conf')
    cfg.read(conf)
    if cfg.has_option('cluster', 'enabled'):
        enabled = cfg.getboolean('cluster', 'enabled')
    else:
        enabled = False

    if enabled:
        logging.debug('cluster mode is enabled')
    else:
        logging.debug('cluster mode is disabled')

    return enabled

CLUSTER_MODE = is_cluster_mode()

def is_db_sqlite3():
    is_db_sqlite3 = False
    try:
        if 'sqlite3' in seahub.settings.DATABASES['default']['ENGINE']:
            is_db_sqlite3 = True
    except:
        pass
    return is_db_sqlite3

IS_DB_SQLITE3 = is_db_sqlite3()

from seahub.utils.file_types import *
from seahub.utils.htmldiff import HtmlDiff # used in views/files.py

EMPTY_SHA1 = '0000000000000000000000000000000000000000'
MAX_INT = 2147483647

PREVIEW_FILEEXT = {
    IMAGE: ('gif', 'jpeg', 'jpg', 'png', 'heic', 'ico', 'bmp', 'tif', 'tiff', 'psd', 'webp', 'jfif'),
    DOCUMENT: ('doc', 'docx', 'docxf', 'oform', 'ppt', 'pptx', 'odt', 'fodt', 'odp', 'fodp', 'odg'),
    SPREADSHEET: ('xls', 'xlsx', 'ods', 'fods'),
    SVG: ('svg',),
    PDF: ('pdf', 'ai'),
    MARKDOWN: ('markdown', 'md'),
    VIDEO: ('mp4', 'ogv', 'webm', 'mov'),
    AUDIO: ('mp3', 'oga', 'ogg', 'wav', 'flac', 'opus'),
    #'3D': ('stl', 'obj'),
    SEADOC: ('sdoc',),
    TLDRAW: ('draw',),
    EXCALIDRAW: ('exdraw',),
}

def get_non_sdoc_file_exts():
    exts = []
    for filetype in PREVIEW_FILEEXT.keys():
        if filetype in [IMAGE, SEADOC]:
            continue
        exts.extend(list(PREVIEW_FILEEXT.get(filetype, [])))
    return exts

def gen_fileext_type_map():
    """
    Generate previewed file extension and file type relation map.

    """
    d = {}
    for filetype in list(PREVIEW_FILEEXT.keys()):
        for fileext in PREVIEW_FILEEXT.get(filetype):
            d[fileext] = filetype

    return d
FILEEXT_TYPE_MAP = gen_fileext_type_map()

def render_permission_error(request, msg=None, extra_ctx=None):
    """
    Return permisson error page.

    """
    ctx = {}
    ctx['unable_view_file'] = msg == _('Unable to view file')
    ctx['error_msg'] = msg or _('permission error')

    if extra_ctx:
        for k in extra_ctx:
            ctx[k] = extra_ctx[k]

    return render(request, 'error.html', ctx)

def render_error(request, msg=None, extra_ctx=None):
    """
    Return normal error page.

    """
    ctx = {}
    ctx['unable_view_file'] = msg == _('Unable to view file')
    ctx['error_msg'] = msg or _('Internal Server Error')

    if extra_ctx:
        for k in extra_ctx:
            ctx[k] = extra_ctx[k]

    return render(request, 'error.html', ctx)

def list_to_string(l):
    """
    Return string of a list.

    """
    return ','.join(l)

def get_fileserver_root():
    """ Construct seafile fileserver address and port.

    Returns:
    	Constructed fileserver root.
    """
    return seahub.settings.FILE_SERVER_ROOT

def get_inner_fileserver_root():
    """Construct inner seafile fileserver address and port.

    Inner fileserver root allows Seahub access fileserver through local
    address, thus avoiding the overhead of DNS queries, as well as other
    related issues, for example, the server can not ping itself, etc.

    Returns:
    	http://127.0.0.1:<port>
    """

    return seahub.settings.INNER_FILE_SERVER_ROOT

def gen_token(max_length=5):
    """
    Generate a random token.

    """

    return uuid.uuid4().hex[:max_length]

def normalize_cache_key(value, prefix=None, token=None, max_length=200):
    """Returns a cache key consisten of ``value`` and ``prefix`` and ``token``. Cache key
    must not include control characters or whitespace.
    """
    key = value if prefix is None else prefix + value
    key = key if token is None else key + '_' + token
    return quote(key)[:max_length]

def get_repo_last_modify(repo):
    """ Get last modification time for a repo.

    If head commit id of a repo is provided, we use that commit as last commit,
    otherwise falls back to getting last commit of a repo which is time
    consuming.
    """
    if repo.head_cmmt_id is not None:
        last_cmmt = seaserv.get_commit(repo.id, repo.version, repo.head_cmmt_id)
    else:
        logger = logging.getLogger(__name__)
        logger.info('[repo %s] head_cmmt_id is missing.' % repo.id)
        last_cmmt = seafile_api.get_commit_list(repo.id, 0, 1)[0]
    return last_cmmt.ctime if last_cmmt else 0

def calculate_repos_last_modify(repo_list):
    """ Get last modification time for repos.
    """
    for repo in repo_list:
        repo.latest_modify = get_repo_last_modify(repo)

def normalize_dir_path(path):
    """Add '/' at the end of directory path if necessary.

    And make sure path starts with '/'
    """

    path = path.strip('/')
    if path == '':
        return '/'
    else:
        return '/' + path + '/'

def normalize_file_path(path):
    """Remove '/' at the end of file path if necessary.

    And make sure path starts with '/'
    """

    path = path.strip('/')
    if path == '':
        return ''
    else:
        return '/' + path

# modified from django1.5:/core/validators, and remove the support for single
# quote in email address
email_re = re.compile(
    r"(^[-!#$%&*+/=?^_`{}|~0-9A-Z]+(\.[-!#$%&*+/=?^_`{}|~0-9A-Z]+)*"  # dot-atom
    # quoted-string, see also http://tools.ietf.org/html/rfc2822#section-3.2.5
    r'|^"([\001-\010\013\014\016-\037!#-\[\]-\177]|\\[\001-\011\013\014\016-\177])*"'
    r')@((?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)$)'  # domain
    r'|\[(25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3}\]$', re.IGNORECASE)  # literal form, ipv4 address (SMTP 4.1.3)

def is_valid_email(email):
    """A heavy email format validation.
    """
    return True if email_re.match(email) is not None else False

def is_valid_username(username):
    """Check whether username is valid, currently only email can be a username.
    """
    return is_valid_email(username)

def is_valid_username2(username):
    """ New username check function, old version is used by many others, stay put
    """
    return (not username.startswith(' ')) and (not username.endswith(' '))

def is_valid_dirent_name(name):
    """Check whether repo/dir/file name is valid.
    """
    for character in name:
        # Emojis fall within the range \U0001F300 to \U0001FAD6
        if 0x1F300 <= ord(character) <= 0x1FAD6:
            return False
    if name == '..':
        return False
    if '/' in name:
        return False
    # `repo_id` parameter is not used in seafile api
    return seafile_api.is_valid_filename('fake_repo_id', name)

def is_ldap_user(user):
    """Check whether user is a LDAP user.
    """
    return user.source == 'LDAP' or user.source == 'LDAPImport'

def get_no_duplicate_obj_name(obj_name, exist_obj_names):

    def no_duplicate(obj_name):
        for exist_obj_name in exist_obj_names:
            if exist_obj_name == obj_name:
                return False
        return True

    def make_new_name(obj_name, i):
        base, ext = os.path.splitext(obj_name)
        if ext:
            new_base = "%s (%d)" % (base, i)
            return new_base + ext
        else:
            return "%s (%d)" % (obj_name, i)

    if no_duplicate(obj_name):
        return obj_name
    else:
        i = 1
        while True:
            new_name = make_new_name(obj_name, i)
            if no_duplicate(new_name):
                return new_name
            else:
                i += 1

def check_filename_with_rename(repo_id, parent_dir, obj_name):
    exist_obj_names = list_obj_names_in_dir(repo_id, parent_dir)
    return get_no_duplicate_obj_name(obj_name, exist_obj_names)

def list_obj_names_in_dir(repo_id, parent_dir):
    cmmts = seafile_api.get_commit_list(repo_id, 0, 1)
    latest_commit = cmmts[0] if cmmts else None
    if not latest_commit:
        return ''
    # TODO: what if parrent_dir does not exist?
    dirents = seafile_api.list_dir_by_commit_and_path(repo_id,
            latest_commit.id, parent_dir)

    exist_obj_names = [dirent.obj_name for dirent in dirents]
    return exist_obj_names

def check_filename_or_rename(repo_id, parent_dir, obj_name):
    exist_obj_names = list_obj_names_in_dir(repo_id, parent_dir)

    if obj_name not in exist_obj_names:
        return obj_name
    return get_no_duplicate_obj_name(obj_name, exist_obj_names)

def get_user_repos(username, org_id=None):
    """
    Get all repos that user can access, including owns, shared, public, and
    repo in groups.
    If ``org_id`` is not None, get org repos that user can access.
    """
    if org_id is None:
        owned_repos = seafile_api.get_owned_repo_list(username)
        shared_repos = seafile_api.get_share_in_repo_list(username, -1, -1)
        groups_repos = seafile_api.get_group_repos_by_user(username)
        if CLOUD_MODE:
            public_repos = []
        else:
            public_repos = seafile_api.get_inner_pub_repo_list()

        for r in shared_repos + public_repos:
            # collumn names in shared_repo struct are not same as owned or group
            # repos.
            r.id = r.repo_id
            r.name = r.repo_name
            r.last_modify = r.last_modified
    else:
        owned_repos = seafile_api.get_org_owned_repo_list(org_id,
                username)
        shared_repos = seafile_api.get_org_share_in_repo_list(org_id,
                username, -1, -1)
        groups_repos = seafile_api.get_org_group_repos_by_user(username,
                org_id)
        public_repos = seaserv.seafserv_threaded_rpc.list_org_inner_pub_repos(org_id)

        for r in shared_repos + groups_repos + public_repos:
            # collumn names in shared_repo struct are not same as owned
            # repos.
            r.id = r.repo_id
            r.name = r.repo_name
            r.last_modify = r.last_modified

    return (owned_repos, shared_repos, groups_repos, public_repos)

def get_conf_text_ext():
    """
    Get the conf of text ext in constance settings, and remove space.
    """
    if hasattr(config, 'TEXT_PREVIEW_EXT'):
        text_ext = getattr(config, 'TEXT_PREVIEW_EXT').split(',')
        return [x.strip() for x in text_ext]
    return []

def get_file_type_and_ext(filename):
    """
    Return file type and extension if the file can be previewed online,
    otherwise, return unknown type.
    """
    fileExt = os.path.splitext(filename)[1][1:].lower()
    if fileExt in get_conf_text_ext():
        return (TEXT, fileExt)

    filetype = FILEEXT_TYPE_MAP.get(fileExt)
    if filetype:
        return (filetype, fileExt)
    else:
        return ('Unknown', fileExt)

def get_file_revision_id_size(repo_id, commit_id, path):
    """Given a commit and a file path in that commit, return the seafile id
    and size of the file blob

    """
    repo = seafile_api.get_repo(repo_id)
    dirname  = os.path.dirname(path)
    filename = os.path.basename(path)
    seafdir = seafile_api.list_dir_by_commit_and_path(repo_id, commit_id, dirname)
    for dirent in seafdir:
        if dirent.obj_name == filename:
            file_size = seafile_api.get_file_size(repo.store_id, repo.version,
                                                  dirent.obj_id)
            return dirent.obj_id, file_size

    return None, None

def new_merge_with_no_conflict(commit):
    """Check whether a commit is a new merge, and no conflict.

    Arguments:
    - `commit`:
    """
    if commit.second_parent_id is not None and commit.new_merge is True and \
            commit.conflict is False:
        return True
    else:
        return False

def get_commit_before_new_merge(commit):
    """Traverse parents of ``commit``, and get a commit which is not a new merge.

    Pre-condition: ``commit`` must be a new merge and not conflict.

    Arguments:
    - `commit`:
    """
    assert new_merge_with_no_conflict(commit) is True

    while(new_merge_with_no_conflict(commit)):
        p1 = seaserv.get_commit(commit.repo_id, commit.version, commit.parent_id)
        p2 = seaserv.get_commit(commit.repo_id, commit.version, commit.second_parent_id)
        commit = p1 if p1.ctime > p2.ctime else p2

    assert new_merge_with_no_conflict(commit) is False

    return commit

def gen_inner_file_get_url(token, filename):
    """Generate inner fileserver file url.

    If ``ENABLE_INNER_FILESERVER`` set to False(defaults to True), will
    returns outer fileserver file url.

    Arguments:
    - `token`:
    - `filename`:

    Returns:
    	e.g., http://127.0.0.1:<port>/files/<token>/<filename>
    """
    if ENABLE_INNER_FILESERVER:
        return '%s/files/%s/%s' % (get_inner_fileserver_root(), token,
                                   quote(filename))
    else:
        return gen_file_get_url(token, filename)

def gen_inner_file_upload_url(op, token):
    """Generate inner fileserver upload url.

    If ``ENABLE_INNER_FILESERVER`` set to False(defaults to True), will
    returns outer fileserver file url.

    Arguments:
    - `op`:
    - `token`:

    Returns:
        e.g., http://127.0.0.1:<port>/<op>/<token>
        http://127.0.0.1:8082/update-api/80c69afa-9438-4ee6-a297-a24fadb10750
    """
    if ENABLE_INNER_FILESERVER:
        return '%s/%s/%s' % (get_inner_fileserver_root(), op, token)
    else:
        return gen_file_upload_url(token, op)

def get_max_upload_file_size():
    """Get max upload file size from config file, defaults to no limit.

    Returns ``None`` if this value is not set.
    """
    return seaserv.MAX_UPLOAD_FILE_SIZE

def gen_block_get_url(token, blkid):
    """
    Generate fileserver block url.
    Format: http://<domain:port>/blks/<token>/<blkid>
    """
    if blkid:
        return '%s/blks/%s/%s' % (get_fileserver_root(), token, blkid)
    else:
        return '%s/blks/%s/' % (get_fileserver_root(), token)

def gen_file_get_url(token, filename):
    """
    Generate fileserver file url.
    Format: http://<domain:port>/files/<token>/<filename>
    """
    return '%s/files/%s/%s' % (get_fileserver_root(), token, quote(filename))


def gen_file_get_url_by_sharelink(token):
    """
    Generate fileserver file url by sharelink.
    Format: http://<domain:port>/f/<token>/
    """
    return '%s/f/%s/' % (get_fileserver_root(), token)

def gen_file_get_url_new(repo_id, filepath, op='download'):
    """
    Generate fileserver file url.
    Format: http://<domain:port>/repos/<repo_id>files/<filepath>/?op=download
    """

    return '%s/repos/%s/files/%s/?op=%s' % (
        get_fileserver_root(),
        repo_id,
        quote(filepath.strip('/')),
        op
    )

def gen_file_upload_url(token, op, replace=False):
    url = '%s/%s/%s' % (get_fileserver_root(), op, token)
    if replace is True:
        url += '?replace=1'
    return url

def gen_dir_zip_download_url(token):
    """
    Generate fileserver file url.
    Format: http://<domain:port>/files/<token>/<filename>
    """
    return '%s/zip/%s' % (get_fileserver_root(), token)

def string2list(string):
    """
    Split string contacted with different separators to a list, and remove
    duplicated strings.
    """
    tmp_str = string.replace(';', ',').replace('\n', ',').replace('\r', ',')
    # Remove empty and duplicate strings
    s = set()
    for e in tmp_str.split(','):
        e = e.strip(' ')
        if not e:
            continue
        s.add(e)
    return [ x for x in s ]

def is_org_context(request):
    """An organization context is a virtual private Seafile instance on cloud
    service.

    Arguments:
    - `request`:
    """
    return request.cloud_mode and request.user.org is not None

# events related
if EVENTS_CONFIG_FILE:
    parsed_events_conf = configparser.ConfigParser()
    parsed_events_conf.read(EVENTS_CONFIG_FILE)

    try:
        EVENTS_ENABLED = True
        SeafEventsSession = seafevents_api.init_db_session_class(parsed_events_conf)
    except ImportError:
        logging.exception('Failed to import seafevents package.')
        seafevents = None
        EVENTS_ENABLED = False

    @contextlib.contextmanager
    def _get_seafevents_session():
        try:
            session = SeafEventsSession()
            yield session
        finally:
           session.close()


    def _get_activities(username, start, count, op_user=None):
        ev_session = SeafEventsSession()

        events = []
        try:
            if op_user:
                events = seafevents_api.get_user_activities_by_op_user(ev_session,
                    username, op_user, start, count)
            else:
                events = seafevents_api.get_user_activities(ev_session,
                    username, start, count)
        finally:
            ev_session.close()

        return events


    def get_user_activities(username, start, count, op_user=None):
        """Return user events list and a new start.
        For example:
        ``get_user_activities('foo@example.com', 0, 10)`` returns the first 10
        ``get_user_activities('foo@example.com', 4, 10)`` returns the 6th through
                 15th events.
        """
        return _get_activities(username, start, count, op_user)

    def get_user_activity_stats_by_day(start, end, offset):
        """
        """
        with _get_seafevents_session() as session:
            res = seafevents_api.get_user_activity_stats_by_day(session, start, end, offset)
        return res

    def get_org_user_activity_stats_by_day(org_id, start, end):
        """
        """
        with _get_seafevents_session() as session:
            res = seafevents_api.get_org_user_activity_stats_by_day(session, org_id, start, end)
        return res

    def get_file_history(repo_id, path, start, count, history_limit=-1):
        """Return file histories
        """
        with _get_seafevents_session() as session:
            res = seafevents_api.get_file_history(session, repo_id, path, start, count, history_limit)
        return res

    def get_file_history_by_day(repo_id, path, start, count, to_tz, history_limit):
        """Return file histories
        """
        with _get_seafevents_session() as session:
            res = seafevents_api.get_file_history_by_day(session, repo_id, path, start, count, to_tz, history_limit)
        return res

    def get_file_daily_history_detail(repo_id, path, start_time, end_time, to_tz):
        """Return file histories detail
        """
        with _get_seafevents_session() as session:
            res = seafevents_api.get_file_daily_history_detail(session, repo_id, path, start_time, end_time, to_tz)
        return res

    def get_log_events_by_time(log_type, tstart, tend):
        """Return log events list by start/end timestamp. (If no logs, return 'None')
        """
        with _get_seafevents_session() as session:
            events = seafevents_api.get_event_log_by_time(session, log_type, tstart, tend)

        return events if events else None

    def generate_file_audit_event_type(e):

        event_type_dict = {
            'file-download-web': ('web', ''),
            'file-download-share-link': ('share-link', ''),
            'file-download-api': ('API', e.device),
            'repo-download-sync': ('download-sync', e.device),
            'repo-upload-sync': ('upload-sync', e.device),
            'seadrive-download-file': ('seadrive-download', e.device),
        }

        if e.etype not in event_type_dict:
            event_type_dict[e.etype] = (e.etype, e.device if e.device else '')

        return event_type_dict[e.etype]

    def get_file_audit_events_by_path(email, org_id, repo_id, file_path, start, limit):
        """Return file audit events list by file path. (If no file audit, return 'None')

        For example:
        ``get_file_audit_events_by_path(email, org_id, repo_id, file_path, 0, 10)`` returns the first 10
        events.
        ``get_file_audit_events_by_path(email, org_id, repo_id, file_path, 5, 10)`` returns the 6th through
        15th events.
        """
        with _get_seafevents_session() as session:
            events = seafevents_api.get_file_audit_events_by_path(session,
                email, org_id, repo_id, file_path, start, limit)

        return events if events else []

    def get_file_audit_events(email, org_id, repo_id, start, limit):
        """Return file audit events list. (If no file audit, return 'None')

        For example:
        ``get_file_audit_events(email, org_id, repo_id, 0, 10)`` returns the first 10
        events.
        ``get_file_audit_events(email, org_id, repo_id, 5, 10)`` returns the 6th through
        15th events.
        """
        with _get_seafevents_session() as session:
            events = seafevents_api.get_file_audit_events(session, email, org_id, repo_id, start, limit)

        return events if events else None
    
    def get_log_events_by_users_and_repos(type, emails, repo_ids, start, limit):
        with _get_seafevents_session() as session:
            events = seafevents_api.get_event_log_by_users_and_repos(session, type, emails, repo_ids, start, limit)

        return events if events else None

    def get_file_ops_stats_by_day(start, end, offset):
        """ return file audit record of sepcifiy time group by day.
        """
        with _get_seafevents_session() as session:
            res = seafevents_api.get_file_ops_stats_by_day(session, start, end, offset)
        return res

    def get_org_file_ops_stats_by_day(org_id, start, end, offset):
        """ return file audit record of sepcifiy time group by day.
        """
        with _get_seafevents_session() as session:
            res = seafevents_api.get_org_file_ops_stats_by_day(session, org_id, start, end, offset)
        return res

    def get_total_storage_stats_by_day(start, end, offset):
        """
        """
        with _get_seafevents_session() as session:
            res = seafevents_api.get_total_storage_stats_by_day(session, start, end, offset)
        return res

    def get_org_total_storage_stats_by_day(org_id, start, end, offset):
        """
        """
        with _get_seafevents_session() as session:
            res = seafevents_api.get_org_storage_stats_by_day(session, org_id, start, end, offset)
        return res

    def get_system_traffic_by_day(start, end, offset, op_type='all'):
        with _get_seafevents_session() as session:
            res = seafevents_api.get_system_traffic_by_day(session, start, end, offset, op_type)
        return res

    def get_org_traffic_by_day(org_id, start, end, offset, op_type='all'):
        with _get_seafevents_session() as session:
            res = seafevents_api.get_org_traffic_by_day(session, org_id, start, end, offset, op_type)
        return res

    def get_file_update_events(email, org_id, repo_id, start, limit):
        """Return file update events list. (If no file update, return 'None')

        For example:
        ``get_file_update_events(email, org_id, repo_id, 0, 10)`` returns the first 10
        events.
        ``get_file_update_events(email, org_id, repo_id, 5, 10)`` returns the 6th through
        15th events.
        """
        with _get_seafevents_session() as session:
            events = seafevents_api.get_file_update_events(session, email, org_id, repo_id, start, limit)
        return events if events else None

    def get_perm_audit_events(email, org_id, repo_id, start, limit):
        """Return repo perm events list. (If no repo perm, return 'None')

        For example:
        ``get_repo_perm_events(email, org_id, repo_id, 0, 10)`` returns the first 10
        events.
        ``get_repo_perm_events(email, org_id, repo_id, 5, 10)`` returns the 6th through
        15th events.
        """
        with _get_seafevents_session() as session:
            events = seafevents_api.get_perm_audit_events(session, email, org_id, repo_id, start, limit)

        return events if events else None

    def get_virus_files(repo_id=None, has_handled=None, start=-1, limit=-1):
        with _get_seafevents_session() as session:
            r = seafevents_api.get_virus_files(session, repo_id, has_handled, start, limit)
        return r if r else []

    def delete_virus_file(vid):
        with _get_seafevents_session() as session:
            return True if seafevents_api.delete_virus_file(session, vid) == 0 else False

    def operate_virus_file(vid, ignore):
        with _get_seafevents_session() as session:
            return True if seafevents_api.operate_virus_file(session, vid, ignore) == 0 else False

    def get_virus_file_by_vid(vid):
        with _get_seafevents_session() as session:
            return seafevents_api.get_virus_file_by_vid(session, vid)

    def get_file_scan_record(start=-1, limit=-1):
        with _get_seafevents_session() as session:
            records = seafevents_api.get_content_scan_results(session, start, limit)
        return records if records else []

    def get_user_activities_by_timestamp(username, start, end):
        with _get_seafevents_session() as session:
            events = seafevents_api.get_user_activities_by_timestamp(session, username, start, end)
        return events if events else []

    def get_all_users_traffic_by_month(month, start=-1, limit=-1, order_by='user', org_id=-1):
        with _get_seafevents_session() as session:
            res = seafevents_api.get_all_users_traffic_by_month(session, month, start, limit, order_by, org_id)
        return res

    def get_all_orgs_traffic_by_month(month, start=-1, limit=-1, order_by='user'):
        with _get_seafevents_session() as session:
            res = seafevents_api.get_all_orgs_traffic_by_month(session, month, start, limit, order_by)
        return res

    def get_user_traffic_by_month(username, month):
        with _get_seafevents_session() as session:
            res = seafevents_api.get_user_traffic_by_month(session, username, month)
        return res

    def get_org_traffic_by_month(org_id, month):
        with _get_seafevents_session() as session:
            res = seafevents_api.get_org_traffic_by_month(session, org_id, month)
        return res

    def get_file_history_suffix():
        return seafevents_api.get_file_history_suffix(parsed_events_conf)

    def get_trash_records(repo_id, show_time, start, limit):
        with _get_seafevents_session() as session:
            res, total_count = seafevents_api.get_delete_records(session, repo_id, show_time, start, limit)
        return res, total_count

else:
    parsed_events_conf = None
    EVENTS_ENABLED = False
    def get_file_history_suffix():
        pass
    def get_all_users_traffic_by_month():
        pass
    def get_all_orgs_traffic_by_month():
        pass
    def get_user_traffic_by_month():
        pass
    def get_org_traffic_by_month():
        pass
    def get_user_activity_stats_by_day():
        pass
    def get_org_user_activity_stats_by_day():
        pass
    def get_log_events_by_time():
        pass
    def get_user_activities():
        pass
    def get_file_history():
        pass
    def get_file_history_by_day():
        pass
    def get_file_daily_history_detail():
        pass
    def generate_file_audit_event_type():
        pass
    def get_file_audit_events_by_path():
        pass
    def get_file_audit_events():
        pass
    def get_log_events_by_users_and_repos():
        pass
    def get_file_ops_stats_by_day():
        pass
    def get_org_file_ops_stats_by_day():
        pass
    def get_total_storage_stats_by_day():
        pass
    def get_org_total_storage_stats_by_day():
        pass
    def get_system_traffic_by_day():
        pass
    def get_org_system_traffic_by_day():
        pass
    def get_org_traffic_by_day():
        pass
    def get_file_update_events():
        pass
    def get_perm_audit_events():
        pass
    def get_virus_files():
        pass
    def delete_virus_file():
        pass
    def operate_virus_file():
        pass
    def get_virus_file_by_vid(vid):
        pass
    def get_file_scan_record():
        pass
    def get_user_activities_by_timestamp():
        pass
    def get_trash_records():
        pass


def calc_file_path_hash(path, bits=12):
    if isinstance(path, str):
        path = path.encode('UTF-8')

    path_hash = hashlib.md5(urllib.parse.quote(path)).hexdigest()[:bits]
    return path_hash

def get_service_url():
    """Get service url from seaserv.
    """
    return seahub.settings.SERVICE_URL

def get_webdav_url():
    """Get webdav url.
    """

    if 'SEAFILE_CENTRAL_CONF_DIR' in os.environ:
        conf_dir = os.environ['SEAFILE_CENTRAL_CONF_DIR']
    else:
        conf_dir = os.environ['SEAFILE_CONF_DIR']

    conf_file = os.path.join(conf_dir, 'seafdav.conf')
    if not os.path.exists(conf_file):
        return ""

    config = configparser.ConfigParser()
    config.read(conf_file)
    if not config.has_option("WEBDAV", "share_name"):
        return ""

    share_name = config.get("WEBDAV", "share_name")
    share_name = share_name.strip('/')

    service_url = get_service_url()
    service_url = service_url.rstrip('/')

    return "{}/{}/".format(service_url, share_name)


def get_server_id():
    """Get server id from seaserv.
    """
    return getattr(seaserv, 'SERVER_ID', '-')

def get_site_scheme_and_netloc():
    """Return a string contains site scheme and network location part from
    service url.

    For example:
    >>> get_site_scheme_and_netloc("https://example.com:8000/seafile/")
    https://example.com:8000

    """
    parse_result = urlparse(get_service_url())
    return "%s://%s" % (parse_result.scheme, parse_result.netloc)

def get_site_name():
    """Return site name from settings.
    """
    return config.SITE_NAME

def send_html_email(subject, con_template, con_context, from_email, to_email,
                    reply_to=None):
    """Send HTML email
    """

    # get logo path
    logo_path = LOGO_PATH
    custom_logo_file = os.path.join(MEDIA_ROOT, CUSTOM_LOGO_PATH)
    if os.path.exists(custom_logo_file):
        logo_path = CUSTOM_LOGO_PATH

    base_context = {
        'url_base': get_site_scheme_and_netloc(),
        'site_name': get_site_name(),
        'media_url': MEDIA_URL,
        'logo_path': logo_path,
    }
    t = loader.get_template(con_template)
    con_context.update(base_context)

    headers = {}
    if IS_EMAIL_CONFIGURED:
        if reply_to is not None:
            headers['Reply-to'] = reply_to

    msg = EmailMessage(subject, t.render(con_context), from_email,
                       to_email, headers=headers)
    msg.content_subtype = "html"
    msg.send()

def gen_dir_share_link(token):
    """Generate directory share link.
    """
    return gen_shared_link(token, 'd')

def gen_file_share_link(token):
    """Generate file share link.
    """
    return gen_shared_link(token, 'f')

def gen_shared_link(token, s_type):
    service_url = get_service_url()
    assert service_url is not None

    service_url = service_url.rstrip('/')
    if s_type == 'f':
        return '%s/f/%s/' % (service_url, token)
    else:
        return '%s/d/%s/' % (service_url, token)

def gen_shared_upload_link(token):
    service_url = get_service_url()
    assert service_url is not None

    service_url = service_url.rstrip('/')
    return '%s/u/d/%s/' % (service_url, token)


def show_delete_days(request):
    if request.method == 'GET':
        days_str = request.GET.get('days', '')
    elif request.method == 'POST':
        days_str = request.POST.get('days', '')
    else:
        days_str = ''

    try:
        days = int(days_str)
    except ValueError:
        days = 7

    return days

def is_textual_file(file_type):
    """
    Check whether a file type is a textual file.
    """
    if file_type == TEXT or file_type == MARKDOWN or file_type == SEADOC:
        return True
    else:
        return False

def redirect_to_login(request):
    from django.conf import settings
    login_url = settings.LOGIN_URL
    path = quote(request.get_full_path())
    tup = login_url, REDIRECT_FIELD_NAME, path
    return HttpResponseRedirect('%s?%s=%s' % tup)

def mkstemp():
    '''Returns (fd, filepath), the same as tempfile.mkstemp, except the
    filepath is encoded in UTF-8

    '''
    fd, path = tempfile.mkstemp()

    return fd, path

# File or directory operations
FILE_OP = ('Added or modified', 'Added', 'Modified', 'Renamed', 'Moved',
           'Added directory', 'Renamed directory', 'Moved directory')

OPS = '|'.join(FILE_OP)
CMMT_DESC_PATT = re.compile(r'(%s) "(.*)"\s?(and \d+ more (?:files|directories))?' % OPS)

API_OPS = '|'.join((OPS, 'Deleted', 'Removed'))
API_CMMT_DESC_PATT = r'(%s) "(.*)"\s?(and \d+ more (?:files|directories))?' % API_OPS


def convert_cmmt_desc_link(commit):
    """Wrap file/folder with ``<a></a>`` in commit description.
    """
    repo_id = commit.repo_id
    cmmt_id = commit.id
    conv_link_url = reverse('convert_cmmt_desc_link')

    def link_repl(matchobj):
        op = matchobj.group(1)
        file_or_dir = matchobj.group(2)
        remaining = matchobj.group(3)

        tmp_str = '%s "<a href="%s?repo_id=%s&cmmt_id=%s&nm=%s" class="normal">%s</a>"'
        if remaining:
            return (tmp_str + ' %s') % (op, conv_link_url, repo_id, cmmt_id, quote(file_or_dir),
                                        escape(file_or_dir), remaining)
        else:
            return tmp_str % (op, conv_link_url, repo_id, cmmt_id, quote(file_or_dir), escape(file_or_dir))

    return re.sub(CMMT_DESC_PATT, link_repl, commit.desc)

def api_tsstr_sec(value):
    """Turn a timestamp to string"""
    try:
        return datetime.fromtimestamp(value).strftime("%Y-%m-%d %H:%M:%S")
    except:
        return datetime.fromtimestamp(value/1000000).strftime("%Y-%m-%d %H:%M:%S")

MORE_PATT = r'and \d+ more (?:files|directories)'
def more_files_in_commit(commit):
    """Check whether added/deleted/modified more files in commit description.
    """
    return True if re.search(MORE_PATT, commit.desc) else False

# file audit related
FILE_AUDIT_ENABLED = False
if EVENTS_CONFIG_FILE:
    def check_file_audit_enabled():
        enabled = False
        if hasattr(seafevents_api, 'is_audit_enabled'):
            enabled = seafevents_api.is_audit_enabled(parsed_events_conf)

            if enabled:
                logging.debug('file audit: enabled')
            else:
                logging.debug('file audit: not enabled')
        return enabled

    FILE_AUDIT_ENABLED = check_file_audit_enabled()

OFFICE_PREVIEW_MAX_SIZE = 2 * 1024 * 1024
OFFICE_PREVIEW_MAX_PAGES = 50

# search realted
HAS_FILE_SEARCH = False
HAS_FILE_SEASEARCH = False
if EVENTS_CONFIG_FILE:
    def check_search_enabled():
        enabled = False
        if hasattr(seafevents_api, 'is_search_enabled'):
            enabled = seafevents_api.is_search_enabled(parsed_events_conf)

            if enabled:
                logging.debug('search: enabled')
            else:
                logging.debug('search: not enabled')
        return enabled

    def check_seasearch_enabled():
        enabled = False
        if hasattr(seafevents_api, 'is_seasearch_enabled'):
            enabled = seafevents_api.is_seasearch_enabled(parsed_events_conf)
        return enabled

    HAS_FILE_SEARCH = check_search_enabled()
    HAS_FILE_SEASEARCH = check_seasearch_enabled()
    if HAS_FILE_SEARCH and HAS_FILE_SEASEARCH:
        raise Exception('ES and seasearch cannot be configured simultaneously.')

# repo auto delete related
ENABLE_REPO_AUTO_DEL = False
if EVENTS_CONFIG_FILE:
    def check_repo_auto_del_enabled():
        enabled = False
        if hasattr(seafevents_api, 'is_repo_auto_del_enabled'):
            enabled = seafevents_api.is_repo_auto_del_enabled(parsed_events_conf)
            if enabled:
                logging.debug('search: enabled')
            else:
                logging.debug('search: not enabled')
        return enabled

    ENABLE_REPO_AUTO_DEL = check_repo_auto_del_enabled()

def get_password_strength_level(password):

    num = 0
    for letter in password:
        # get ascii dec
        # bitwise OR
        num |= get_char_mode(ord(letter))

    return calculate_bitwise(num)

def get_char_mode(n):
    """Return different num according to the type of given letter:
       '1': num,
       '2': upper_letter,
       '4': lower_letter,
       '8': other symbols
    """
    if (n >= 48 and n <= 57): #nums
        return 1;
    if (n >= 65 and n <= 90): #uppers
        return 2;
    if (n >= 97 and n <= 122): #lowers
        return 4;
    else:
        return 8;

def calculate_bitwise(num):
    """Return different level according to the given num:
    """
    level = 0
    for i in range(4):
        # bitwise AND
        if (num&1):
            level += 1
        # Right logical shift
        num = num >> 1
    return level

def do_md5(s):
    if isinstance(s, str):
        s = s.encode('UTF-8')
    return hashlib.md5(s).hexdigest()

def do_urlopen(url, data=None, headers=None):
    headers = headers or {}
    req = urllib.request.Request(url, data=data, headers=headers)
    ret = urllib.request.urlopen(req)
    return ret

def clear_token(username):
    '''
    clear web api and repo sync token
    when delete/inactive an user
    '''
    Token.objects.filter(user = username).delete()
    TokenV2.objects.filter(user = username).delete()
    seafile_api.delete_repo_tokens_by_email(username)


def inactive_user(username):
    # del tokens and personal repo api tokens (not department)
    from seahub.repo_api_tokens.models import RepoAPITokens
    try:
        clear_token(username)
    except Exception as e:
        logger.error("Failed to delete tokens for user %s: %s." % (username, e))
    try:
        from seahub.settings import MULTI_TENANCY
    except ImportError:
        MULTI_TENANCY = False
    try:
        org_id = -1
        if MULTI_TENANCY:
            orgs = ccnet_api.get_orgs_by_user(username)
            if orgs:
                org = orgs[0]
                org_id = org.org_id
        if org_id > 0:
            owned_repos = seafile_api.get_org_owned_repo_list(
                org_id, username, ret_corrupted=True)
        else:
            owned_repos = seafile_api.get_owned_repo_list(
                username, ret_corrupted=True)
        owned_repo_ids = [item.repo_id for item in owned_repos]
        RepoAPITokens.objects.filter(
            repo_id__in=owned_repo_ids).delete()
    except Exception as e:
        logger.error("Failed to delete repo api tokens for user %s: %s." % (username, e))


def send_perm_audit_msg(etype, from_user, to, repo_id, path, perm):
    """Send repo permission audit msg.

    Arguments:
    - `etype`: add/modify/delete-repo-perm
    - `from_user`: email
    - `to`: email or group_id or all(public)
    - `repo_id`: origin repo id
    - `path`: dir path
    - `perm`: r or rw
    """

    msg = {
        'msg_type': 'perm-change',
        'etype': etype,
        'from_user': from_user,
        'to': to,
        'repo_id': repo_id,
        'file_path': path,
        'perm': perm,
    }

    try:
        seafile_api.publish_event('seahub.audit', json.dumps(msg))
    except Exception as e:
        logger.error("Error when sending perm-audit-%s message: %s" %
                     (etype, str(e)))


def send_user_login_msg(username, timestamp, org_id):
    msg = {
        'msg_type': 'user-login',
        'user_name': username,
        'timestamp': timestamp,
        'org_id': org_id,
    }
    seafile_api.publish_event('seahub.stats', json.dumps(msg))


def get_origin_repo_info(repo_id):
    repo = seafile_api.get_repo(repo_id)
    if repo.origin_repo_id is not None:
        origin_repo_id = repo.origin_repo_id
        origin_path = repo.origin_path
        return (origin_repo_id, origin_path)

    return (None, None)

def within_time_range(d1, d2, maxdiff_seconds):
    '''Return true if two datetime.datetime object differs less than the given seconds'''
    if is_aware(d1):
        d1 = make_naive(d1)

    if is_aware(d2):
        d2 = make_naive(d2)

    delta = d2 - d1 if d2 > d1 else d1 - d2
    # delta.total_seconds() is only available in python 2.7+
    diff = (delta.microseconds + (delta.seconds + delta.days*24*3600) * 1e6) / 1e6
    return diff < maxdiff_seconds

def get_system_admins():
    db_users = seaserv.get_emailusers('DB', -1, -1)
    ldpa_imported_users = seaserv.get_emailusers('LDAPImport', -1, -1)

    admins = []
    for user in db_users + ldpa_imported_users:
        if user.is_staff:
            admins.append(user)

    return admins

def is_windows_operating_system(request):
    if 'user-agent' not in request.headers:
        return False

    if 'windows' in request.headers['user-agent'].lower():
        return True
    else:
        return False

def get_folder_permission_recursively(username, repo_id, path):
    """ Get folder permission recursively

    Ger permission from the innermost layer of subdirectories to root
    directory.
    """
    if not path or not isinstance(path, str):
        raise Exception('path invalid.')

    if not seafile_api.get_dir_id_by_path(repo_id, path):
       # get current folder's parent directory
        path = os.path.dirname(path.rstrip('/'))
        return get_folder_permission_recursively(
                username, repo_id, path)
    else:
        return seafile_api.check_permission_by_path(
                repo_id, path, username)

def is_valid_org_id(org_id):
    if org_id and org_id > 0:
        return True
    else:
        return False


def hash_password(password, algorithm='sha1', salt=get_random_string(4)):

    digest = hashlib.pbkdf2_hmac(algorithm,
                                 password.encode(),
                                 salt.encode(),
                                 10000)
    hex_hash = digest.hex()

    # sha1$QRle$5511a4e2efb7d12e1f64647f64c0c6e105d150ff
    return "{}${}${}".format(algorithm, salt, hex_hash)


def check_hashed_password(password, hashed_password):

    algorithm, salt, hex_hash = hashed_password.split('$')

    return hashed_password == hash_password(password, algorithm, salt)


ASCII_RE = re.compile(r'[^\x00-\x7f]')


def is_valid_password(password):

    return False if ASCII_RE.search(password) else True


def get_logo_path_by_user(username):

    logo_path = LOGO_PATH

    # custom logo
    custom_logo_file = os.path.join(MEDIA_ROOT, CUSTOM_LOGO_PATH)
    if os.path.exists(custom_logo_file):
        logo_path = CUSTOM_LOGO_PATH

    # org custom logo
    orgs = ccnet_api.get_orgs_by_user(username)
    if orgs:

        from seahub.organizations.settings import ORG_ENABLE_ADMIN_CUSTOM_LOGO
        if ORG_ENABLE_ADMIN_CUSTOM_LOGO:

            org = orgs[0]
            from seahub.organizations.models import OrgAdminSettings
            org_logo_url = OrgAdminSettings.objects.get_org_logo_url(org.org_id)

            if org_logo_url:
                logo_path = org_logo_url

                from seahub.avatar.settings import AVATAR_FILE_STORAGE
                if AVATAR_FILE_STORAGE == 'seahub.base.database_storage.DatabaseStorage':
                    logo_path = "/image-view/" + logo_path

    return logo_path


def transfer_repo(repo_id, new_owner, is_share, org_id=None):
    group_id = None
    if "seafile_group" in new_owner:
        group_id = int(new_owner.split('@')[0])
    if type(is_share) is not bool:
        if is_share == 'false':
            is_share = False
        else:
            is_share = True
    repo_owner = seafile_api.get_org_repo_owner(repo_id) if org_id else seafile_api.get_repo_owner(repo_id)
    current_group_id = None
    if "seafile_group" in repo_owner:
        current_group_id = int(repo_owner.split('@')[0])
    # transfer repo
    # retain share
    if is_share:
        seafile_db_api = SeafileDB()
        # transfer to group
        if group_id:
            if org_id and org_id != ccnet_api.get_org_id_by_group(group_id):
                error_msg = 'Permission denied.'
                raise error_msg
            seafile_db_api.set_repo_group_owner(repo_id, group_id, current_group_id, org_id)
        # transfer to user
        else:
            seafile_db_api.set_repo_owner(repo_id, new_owner, org_id)

        # Update shares and delete the old owner's token
        seafile_db_api.update_repo_user_shares(repo_id, new_owner, org_id)
        seafile_db_api.update_repo_group_shares(repo_id, new_owner, org_id)
        seafile_db_api.delete_repo_user_token(repo_id, repo_owner)
    else:
        if org_id:
            if group_id:
                # org transfer check,only transfer current org repo
                if org_id != ccnet_api.get_org_id_by_group(group_id):
                    error_msg = 'Permission denied.'
                    raise error_msg
                seafile_api.org_transfer_repo_to_group(repo_id, org_id, group_id, PERMISSION_READ_WRITE)
            else:
                seafile_api.set_org_repo_owner(org_id, repo_id, new_owner)
        else:
            if group_id:
                seafile_api.transfer_repo_to_group(repo_id, group_id, PERMISSION_READ_WRITE)
            else:
                seafile_api.set_repo_owner(repo_id, new_owner)
