# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
"""
File related views, including view_file, view_history_file, view_trash_file,
view_snapshot_file, view_shared_file, etc.
"""

import os
import json
import time
import uuid
import stat
import urllib.request
import urllib.error
import urllib.parse
import chardet
import logging
import posixpath
import re

from django.core.cache import cache
from django.contrib.sites.shortcuts import get_current_site
from django.contrib import messages
from django.urls import reverse
from django.db.models import F
from django.http import Http404, HttpResponseRedirect, HttpResponseBadRequest
from django.shortcuts import render
from django.utils.translation import get_language, gettext as _
from django.views.decorators.csrf import ensure_csrf_cookie
from django.template.defaultfilters import filesizeformat

from seaserv import seafile_api, ccnet_api
from seaserv import get_repo, get_commits, \
    get_file_id_by_path, get_commit, get_file_size, \
    seafserv_threaded_rpc, get_org_id_by_repo_id

from seahub.share.utils import check_share_link_user_access
from seahub.tags.models import FileUUIDMap
from seahub.wopi.utils import get_wopi_dict
from seahub.onlyoffice.utils import get_onlyoffice_dict
from seahub.onlyoffice.models import RepoExtraConfig, REPO_OFFICE_CONFIG
from seahub.auth.decorators import login_required
from seahub.auth import SESSION_MOBILE_LOGIN_KEY
from seahub.base.decorators import repo_passwd_set_required
from seahub.base.accounts import ANONYMOUS_EMAIL, User
from seahub.base.templatetags.seahub_tags import file_icon_filter
from seahub.share.models import FileShare, check_share_link_common
from seahub.share.decorators import share_link_audit, share_link_login_required
from seahub.wiki.utils import get_wiki_dirent
from seahub.wiki.models import Wiki, WikiDoesNotExist, WikiPageMissing
from seahub.utils import render_error, is_org_context, \
    get_file_type_and_ext, gen_file_get_url, \
    render_permission_error, is_pro_version, is_textual_file, \
    EMPTY_SHA1, HtmlDiff, gen_inner_file_get_url, \
    get_conf_text_ext, PREVIEW_FILEEXT, \
    normalize_file_path, get_service_url, \
    normalize_cache_key, gen_file_get_url_by_sharelink, gen_file_get_url_new
from seahub.utils.ip import get_remote_ip
from seahub.utils.file_types import (IMAGE, PDF, SVG, AUDIO,
                                     MARKDOWN, TEXT, VIDEO, SEADOC, TLDRAW, EXCALIDRAW)
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils.star import is_file_starred
from seahub.utils.file_op import check_file_lock, \
        ONLINE_OFFICE_LOCK_OWNER, if_locked_by_online_office
from seahub.utils.user_permissions import get_user_role
from seahub.views import check_folder_permission, \
        get_unencry_rw_repos_by_user
from seahub.utils.repo import is_repo_owner, parse_repo_perm, is_repo_admin
from seahub.group.utils import is_group_member
from seahub.seadoc.utils import get_seadoc_file_uuid, \
        gen_seadoc_access_token, is_seadoc_revision, gen_share_seadoc_access_token
from seahub.exdraw.utils import get_exdraw_file_uuid
from seahub.seadoc.models import SeadocRevision

import seahub.settings as settings
from seahub.settings import FILE_ENCODING_LIST, FILE_PREVIEW_MAX_SIZE, \
    FILE_ENCODING_TRY_LIST, MEDIA_URL, ENABLE_WATERMARK, OFFICE_PREVIEW_MAX_SIZE, \
    SHARE_LINK_EXPIRE_DAYS_MIN, SHARE_LINK_EXPIRE_DAYS_MAX, SHARE_LINK_PASSWORD_MIN_LENGTH, \
    SHARE_LINK_FORCE_USE_PASSWORD, SHARE_LINK_PASSWORD_STRENGTH_LEVEL, \
    SHARE_LINK_EXPIRE_DAYS_DEFAULT, ENABLE_SHARE_LINK_REPORT_ABUSE, SEADOC_SERVER_URL, \
    ENABLE_MULTIPLE_OFFICE_SUITE, OFFICE_SUITE_LIST, EXCALIDRAW_SERVER_URL, ENABLE_SEADOC
from seahub.constants import PERMISSION_INVISIBLE


# wopi
try:
    from seahub.wopi.settings import ENABLE_OFFICE_WEB_APP
except ImportError:
    ENABLE_OFFICE_WEB_APP = False

try:
    from seahub.wopi.settings import ENABLE_OFFICE_WEB_APP_EDIT
except ImportError:
    ENABLE_OFFICE_WEB_APP_EDIT = False

try:
    from seahub.wopi.settings import OFFICE_WEB_APP_FILE_EXTENSION
except ImportError:
    OFFICE_WEB_APP_FILE_EXTENSION = ()

try:
    from seahub.wopi.settings import OFFICE_WEB_APP_EDIT_FILE_EXTENSION
except ImportError:
    OFFICE_WEB_APP_EDIT_FILE_EXTENSION = ()

# onlyoffice
try:
    from seahub.onlyoffice.settings import ENABLE_ONLYOFFICE
except ImportError:
    ENABLE_ONLYOFFICE = False

try:
    from seahub.onlyoffice.settings import ONLYOFFICE_FILE_EXTENSION
except ImportError:
    ONLYOFFICE_FILE_EXTENSION = ()

try:
    from seahub.onlyoffice.settings import ONLYOFFICE_EDIT_FILE_EXTENSION
except ImportError:
    ONLYOFFICE_EDIT_FILE_EXTENSION = ()

from seahub.thirdparty_editor.settings import ENABLE_THIRDPARTY_EDITOR
from seahub.thirdparty_editor.settings import THIRDPARTY_EDITOR_ACTION_URL_DICT
from seahub.thirdparty_editor.settings import THIRDPARTY_EDITOR_ACCESS_TOKEN_EXPIRATION
from seahub.settings import ROLES_DEFAULT_OFFCICE_SUITE

# Get an instance of a logger
logger = logging.getLogger(__name__)

FILE_TYPE_FOR_NEW_FILE_LINK = [
    PDF,
    VIDEO,
    MARKDOWN
]


def _check_feature(repo_id):
    office_suite = RepoExtraConfig.objects.filter(repo_id=repo_id, config_type=REPO_OFFICE_CONFIG).first()
    if office_suite:
        repo_config_details = json.loads(office_suite.config_details)
        office_config = repo_config_details.get('office_suite')
        return office_config.get('suite_id') if office_config else None
    return None


def get_office_feature_by_repo(repo):
    enable_onlyoffice, enable_office_app = False, False
    if not ENABLE_MULTIPLE_OFFICE_SUITE:
        return ENABLE_ONLYOFFICE, ENABLE_OFFICE_WEB_APP

    if not OFFICE_SUITE_LIST:
        return ENABLE_ONLYOFFICE, ENABLE_OFFICE_WEB_APP

    org_id = get_org_id_by_repo_id(repo.repo_id)
    if org_id > 0:
        repo_owner = seafile_api.get_org_repo_owner(repo.repo_id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo.repo_id)
    if '@seafile_group' in repo_owner:
        repo_feature = None
    else:
        repo_feature = _check_feature(repo.repo_id)

    if not repo_feature and '@seafile_group' not in repo_owner:
        try:
            user = User.objects.get(email=repo_owner)
        except User.DoesNotExist:
            return ENABLE_ONLYOFFICE, ENABLE_OFFICE_WEB_APP
        role = get_user_role(user)
        repo_feature = ROLES_DEFAULT_OFFCICE_SUITE.get(role)

    if not repo_feature:
        default_suite = {}
        for s in OFFICE_SUITE_LIST:
            if s.get('is_default'):
                default_suite = s
                break
        if default_suite.get('id') == 'onlyoffice':
            enable_onlyoffice = True
        if default_suite.get('id') == 'collabora':
            enable_office_app = True
    else:
        if repo_feature == 'onlyoffice':
            enable_onlyoffice = True
        if repo_feature == 'collabora':
            enable_office_app = True

    return enable_onlyoffice,  enable_office_app


def gen_path_link(path, repo_name):
    """
    Generate navigate paths and links in repo page.

    """
    if path and path[-1] != '/':
        path += '/'

    paths = []
    links = []
    if path and path != '/':
        paths = path[1:-1].split('/')
        i = 1
        for name in paths:
            link = '/' + '/'.join(paths[:i])
            i = i + 1
            links.append(link)
    if repo_name:
        paths.insert(0, repo_name)
        links.insert(0, '/')

    zipped = list(zip(paths, links))

    return zipped

def get_file_content(file_type, raw_path, file_enc):
    """Get textual file content, including txt/markdown/seaf.
    """
    return repo_file_get(raw_path, file_enc) if is_textual_file(
        file_type=file_type) else ('', '', '')

def repo_file_get(raw_path, file_enc):
    """
    Get file content and encoding.
    """
    err = ''
    file_content = ''
    encoding = None
    if file_enc != 'auto':
        encoding = file_enc

    try:
        file_response = urllib.request.urlopen(raw_path)
        content = file_response.read()
    except urllib.error.HTTPError as e:
        logger.error(e)
        err = _('HTTPError: failed to open file online')
        return err, '', None
    except urllib.error.URLError as e:
        logger.error(e)
        err = _('URLError: failed to open file online')
        return err, '', None
    else:
        if encoding:
            try:
                u_content = content.decode(encoding)
            except UnicodeDecodeError:
                err = _('The encoding you chose is not proper.')
                return err, '', encoding
        else:
            for enc in FILE_ENCODING_TRY_LIST:
                try:
                    u_content = content.decode(enc)
                    encoding = enc
                    break
                except UnicodeDecodeError:
                    if enc != FILE_ENCODING_TRY_LIST[-1]:
                        continue
                    else:
                        encoding = chardet.detect(content)['encoding']
                        if encoding:
                            try:
                                u_content = content.decode(encoding)
                            except UnicodeDecodeError:
                                err = _('Unknown file encoding')
                                return err, '', ''
                        else:
                            err = _('Unknown file encoding')
                            return err, '', ''

        file_content = u_content

    return err, file_content, encoding


def get_file_view_path_and_perm(request, repo_id, obj_id, path,
                                use_onetime=settings.FILESERVER_TOKEN_ONCE_ONLY):
    """ Get path and the permission to view file.

    Returns:
        outer fileserver file url, inner fileserver file url, permission
    """
    username = request.user.username
    filename = os.path.basename(path)

    user_perm = check_folder_permission(request, repo_id, '/')
    if user_perm is None:
        return ('', '', user_perm)
    else:
        # Get a token to visit file
        token = seafile_api.get_fileserver_access_token(repo_id,
                obj_id, 'view', username, use_onetime=use_onetime)

        if not token:
            return ('', '', None)

        outer_url = gen_file_get_url(token, filename)
        inner_url = gen_inner_file_get_url(token, filename)
        return (outer_url, inner_url, user_perm)

def handle_textual_file(request, filetype, raw_path, ret_dict):
    # encoding option a user chose
    file_enc = request.GET.get('file_enc', 'auto')
    if not file_enc in FILE_ENCODING_LIST:
        file_enc = 'auto'
    err, file_content, encoding = get_file_content(filetype,
                                                   raw_path, file_enc)
    file_encoding_list = FILE_ENCODING_LIST
    if encoding and encoding not in FILE_ENCODING_LIST:
        file_encoding_list.append(encoding)
    # populate return value dict
    ret_dict['err'] = err
    ret_dict['file_content'] = file_content
    ret_dict['encoding'] = encoding
    ret_dict['file_enc'] = file_enc
    ret_dict['file_encoding_list'] = file_encoding_list


def convert_md_link(file_content, repo_id, username):
    def repl(matchobj):
        if matchobj.group(2):   # return origin string in backquotes
            return matchobj.group(2)

        link_alias = link_name = matchobj.group(1).strip()
        if len(link_name.split('|')) > 1:
            link_alias = link_name.split('|')[0]
            link_name = link_name.split('|')[1]

        filetype, fileext = get_file_type_and_ext(link_name)
        if fileext == '':
            # convert link_name that extension is missing to a markdown page
            try:
                dirent = get_wiki_dirent(repo_id, link_name)
                path = "/" + dirent.obj_name
                href = reverse('view_lib_file', args=[repo_id, path])
                a_tag = '''<a href="%s">%s</a>'''
                return a_tag % (href, link_alias)
            except (WikiDoesNotExist, WikiPageMissing):
                a_tag = '''<p class="wiki-page-missing">%s</p>'''
                return a_tag % (link_alias)
        elif filetype == IMAGE:
            # load image to current page
            path = "/" + link_name
            filename = os.path.basename(path)
            obj_id = get_file_id_by_path(repo_id, path)
            if not obj_id:
                return '''<p class="wiki-page-missing">%s</p>''' % link_name

            token = seafile_api.get_fileserver_access_token(repo_id,
                    obj_id, 'view', username)

            if not token:
                return '''<p class="wiki-page-missing">%s</p>''' %  link_name

            return '<img class="wiki-image" src="%s" alt="%s" />' % (gen_file_get_url(token, filename), filename)
        else:

            # convert other types of filelinks to clickable links
            path = "/" + link_name
            icon = file_icon_filter(link_name)
            s = reverse('view_lib_file', args=[repo_id, path])
            a_tag = '''<img src="%simg/file/%s" alt="%s" class="vam" /> <a href="%s" target="_blank" class="vam">%s</a>'''
            return a_tag % (MEDIA_URL, icon, icon, s, link_name)

    return re.sub(r'\[\[(.+?)\]\]|(`.+?`)', repl, file_content)


def can_preview_file(file_name, file_size, repo):
    """Check whether Seafile supports view file.
    Returns (True, None) if Yes, otherwise (False, error_msg).
    """

    filetype, fileext = get_file_type_and_ext(file_name)

    ENABLE_ONLYOFFICE, ENABLE_OFFICE_WEB_APP = get_office_feature_by_repo(repo)

    # Seafile defines 10 kinds of filetype:
    # TEXT, MARKDOWN, IMAGE, VIDEO, AUDIO, PDF, SVG
    if filetype in (TEXT, MARKDOWN, IMAGE, PDF) or fileext in get_conf_text_ext():
        if file_size > FILE_PREVIEW_MAX_SIZE:
            error_msg = _('File size surpasses %s, can not be opened online.') % \
                filesizeformat(FILE_PREVIEW_MAX_SIZE)
            return False, error_msg

    elif filetype in (SEADOC) and not ENABLE_SEADOC:
        error_msg = "File preview unsupported"
        return False, error_msg

    elif fileext in OFFICE_WEB_APP_FILE_EXTENSION or \
            fileext in ONLYOFFICE_FILE_EXTENSION:

        if repo.encrypted:
            error_msg = _('The library is encrypted, can not open file online.')
            return False, error_msg

        if not ENABLE_OFFICE_WEB_APP and \
                not ENABLE_ONLYOFFICE:
            error_msg = "File preview unsupported"
            return False, error_msg

        # priority of view office file is:
        # OOS > OnlyOffice
        if ENABLE_OFFICE_WEB_APP:
            if fileext not in OFFICE_WEB_APP_FILE_EXTENSION:
                error_msg = "File preview unsupported"
                return False, error_msg

        else:
            if fileext not in ONLYOFFICE_FILE_EXTENSION:
                error_msg = "File preview unsupported"
                return False, error_msg
    else:
        # NOT depends on Seafile settings
        if filetype not in list(PREVIEW_FILEEXT.keys()):
            error_msg = "File preview unsupported"
            return False, error_msg

    return True, ''


def can_edit_file(file_name, file_size, repo):
    """Check whether Seafile supports edit file.
    Returns (True, None) if Yes, otherwise (False, error_msg).
    """
    ENABLE_ONLYOFFICE, ENABLE_OFFICE_WEB_APP = get_office_feature_by_repo(repo)
    can_preview, err_msg = can_preview_file(file_name, file_size, repo)
    if not can_preview:
        return False, err_msg

    file_type, file_ext = get_file_type_and_ext(file_name)

    if file_type in (TEXT, MARKDOWN) or file_ext in get_conf_text_ext():
        return True, ''

    if file_type in (SEADOC) and ENABLE_SEADOC:
        return True, ''

    if ENABLE_OFFICE_WEB_APP_EDIT and \
            file_ext in OFFICE_WEB_APP_EDIT_FILE_EXTENSION:
        return True, ''

    if ENABLE_ONLYOFFICE and file_ext in ONLYOFFICE_EDIT_FILE_EXTENSION:
        return True, ''

    return False, 'File edit unsupported'


@login_required
def view_lib_file_via_smart_link(request, dirent_uuid, dirent_name):

    uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(dirent_uuid)
    if not uuid_map:
        raise Http404

    repo_id = uuid_map.repo_id
    parent_path = uuid_map.parent_path
    dirent_name_from_uuid_map = uuid_map.filename
    is_dir = uuid_map.is_dir

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    dirent_path = posixpath.join(parent_path, dirent_name_from_uuid_map.strip('/'))

    readonly = request.GET.get('readonly', 'false')
    filetype = request.GET.get('filetype', 'Excalidraw')
    if readonly.lower() == 'true' and filetype == 'Excalidraw':

        template = 'shared_file_view_react.html'

        req_path = os.path.join(parent_path, uuid_map.filename)
        filename = dirent_name_from_uuid_map
        redirect_to = reverse('view_lib_file', args=[repo_id, dirent_path])
        fileext = 'exdraw'
        filetype = 'Excalidraw'
        file_id = seafile_api.get_file_id_by_path(repo_id, req_path)
        username = request.user.username
        use_onetime = False if filetype in (VIDEO, AUDIO) else True
        token = seafile_api.get_fileserver_access_token(repo_id, file_id,
                                                    'view', username,
                                                    use_onetime=use_onetime)
        if token:
            raw_path = gen_file_get_url(token, filename)

        obj_id = get_file_id_by_path(repo_id, req_path)
        file_size = seafile_api.get_file_size(repo.store_id, repo.version, file_id)
        shared_by = username
        data = {
            'repo': repo,
            'obj_id': obj_id,
            'from_shared_dir': True,
            'path': req_path,
            'file_name': filename,
            'file_size': file_size,
            'fileext': fileext,
            'raw_path': raw_path,
            'encoding': '',
            'file_encoding_list': [],
            'filetype': filetype,
            'traffic_over_limit': False,
        }
        return render(request, template, data)

    if not is_dir:
        redirect_to = reverse('view_lib_file', args=[repo_id, dirent_path])
        if request.GET.get('dl', '') == '1':
            redirect_to = redirect_to + '?dl=1'
    else:
        redirect_to = reverse('lib_view', args=[repo_id, repo.name, dirent_path.strip('/')])

    return HttpResponseRedirect(redirect_to)

def convert_repo_path_when_can_not_view_file(request, repo_id, path):

    path = normalize_file_path(path)
    username = request.user.username
    is_org = is_org_context(request)
    converted_repo_path = seafile_api.convert_repo_path(repo_id, path, username, is_org)
    if not converted_repo_path:
        return render_permission_error(request, _('Unable to view file'))

    converted_repo_path = json.loads(converted_repo_path)

    repo_id = converted_repo_path['repo_id']
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    path = converted_repo_path['path']
    path = normalize_file_path(path)
    file_id = seafile_api.get_file_id_by_path(repo_id, path)
    if not file_id:
        return render_error(request, _('File does not exist'))

    group_id = ''
    if 'group_id' in converted_repo_path:
        group_id = converted_repo_path['group_id']
        if not ccnet_api.get_group(group_id):
            return render_error(request, _('Group does not exist'))

        if not is_group_member(group_id, username):
            return render_permission_error(request, _('Unable to view file'))

    parent_dir = os.path.dirname(path)
    permission = check_folder_permission(request, repo_id, parent_dir)
    if not permission:
        return render_permission_error(request, _('Unable to view file'))

    next_url = reverse('view_lib_file', args=[repo_id, path])
    return HttpResponseRedirect(next_url)


@login_required
@repo_passwd_set_required
def view_lib_file(request, repo_id, path):

    # resource check
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    path = normalize_file_path(path)
    file_id = seafile_api.get_file_id_by_path(repo_id, path)
    if not file_id:
        return render_error(request, _('File does not exist'))

    ENABLE_ONLYOFFICE, ENABLE_OFFICE_WEB_APP = get_office_feature_by_repo(repo)

    # permission check
    username = request.user.username
    parent_dir = os.path.dirname(path)

    permission = check_folder_permission(request, repo_id, parent_dir)
    if not permission:
        return convert_repo_path_when_can_not_view_file(request, repo_id, path)

    # download file or view raw file
    filename = os.path.basename(path)
    dl = request.GET.get('dl', '0') == '1'
    raw = request.GET.get('raw', '0') == '1'
    if dl or raw:
        if parse_repo_perm(permission).can_download is False:
            raise Http404

        # redirect to sdoc export
        filetype, fileext = get_file_type_and_ext(filename)
        if filetype == SEADOC:
            file_uuid = get_seadoc_file_uuid(repo, path)
            file_url = reverse('seadoc_export', args=[file_uuid])
            return HttpResponseRedirect(file_url)

        operation = 'download' if dl else 'view'
        if dl:
            dl_or_raw_url = gen_file_get_url_new(repo_id, path)
        else:
            token = seafile_api.get_fileserver_access_token(
                repo_id, file_id, operation, username,
                use_onetime=settings.FILESERVER_TOKEN_ONCE_ONLY)

            if not token:
                return render_permission_error(request, _('Unable to view file'))

            dl_or_raw_url = gen_file_get_url(token, filename)

        # send stats message
        send_file_access_msg(request, repo, path, 'web')

        return HttpResponseRedirect(dl_or_raw_url)

    if ENABLE_THIRDPARTY_EDITOR:

        filename = os.path.basename(path)
        filetype, fileext = get_file_type_and_ext(filename)

        action_url = THIRDPARTY_EDITOR_ACTION_URL_DICT.get(fileext, '')
        if action_url:

            user_repo_path_info = {
                'request_user': request.user.username,
                'repo_id': repo_id,
                'file_path': path,
                'permission': {
                    # Only can preview file for now
                    'can_edit': False
                }
            }

            uid = uuid.uuid4()
            access_token = uid.hex
            cache.set('thirdparty_editor_access_token_' + access_token,
                      user_repo_path_info,
                      THIRDPARTY_EDITOR_ACCESS_TOKEN_EXPIRATION)

            editor_dict = {}
            editor_dict['filename'] = filename
            editor_dict['action_url'] = action_url
            editor_dict['access_token'] = access_token
            editor_dict['access_token_ttl'] = int(time.time()) + THIRDPARTY_EDITOR_ACCESS_TOKEN_EXPIRATION

            return render(request, 'view_file_thirdparty_editor.html', editor_dict)

    org_id = request.user.org.org_id if is_org_context(request) else -1
    mobile_login = request.session.get(SESSION_MOBILE_LOGIN_KEY, False)
    # basic file info
    return_dict = {
        'is_pro': is_pro_version(),
        'repo': repo,
        'file_id': file_id,
        'last_commit_id': repo.head_cmmt_id,
        'is_repo_owner': is_repo_owner(request, repo_id, username),
        'is_repo_admin': is_repo_admin(username, repo_id),
        'path': path,
        'parent_dir': parent_dir,
        'filename': filename,
        'file_perm': permission,
        'highlight_keyword': settings.HIGHLIGHT_KEYWORD,
        'enable_watermark': ENABLE_WATERMARK,
        'share_link_force_use_password': SHARE_LINK_FORCE_USE_PASSWORD,
        'share_link_password_min_length': SHARE_LINK_PASSWORD_MIN_LENGTH,
        'share_link_password_strength_level': SHARE_LINK_PASSWORD_STRENGTH_LEVEL,
        'share_link_expire_days_default': SHARE_LINK_EXPIRE_DAYS_DEFAULT,
        'share_link_expire_days_min': SHARE_LINK_EXPIRE_DAYS_MIN,
        'share_link_expire_days_max': SHARE_LINK_EXPIRE_DAYS_MAX,
        'can_download_file': parse_repo_perm(permission).can_download,
        'file_download_url': gen_file_get_url_new(repo_id, path),
        'mobile_login': mobile_login,
    }

    # check whether file is starred
    is_starred = is_file_starred(username, repo_id, path, org_id)
    return_dict['is_starred'] = is_starred

    # check file lock info
    try:
        is_locked, locked_by_me = check_file_lock(repo_id, path, username)
    except Exception as e:
        logger.error(e)
        is_locked = False
        locked_by_me = False

    locked_by_online_office = if_locked_by_online_office(repo_id, path)

    if is_pro_version() and permission == 'rw':
        can_lock_unlock_file = True
    else:
        can_lock_unlock_file = False

    return_dict['file_locked'] = is_locked
    return_dict['locked_by_me'] = locked_by_me
    return_dict['can_lock_unlock_file'] = can_lock_unlock_file

    # fetch file contributors and latest contributor
    try:
        # get real path for sub repo
        real_path = repo.origin_path + path if repo.origin_path else path
        dirent = seafile_api.get_dirent_by_path(repo.store_id, real_path)
        if dirent:
            latest_contributor, last_modified = dirent.modifier, dirent.mtime
        else:
            latest_contributor, last_modified = None, 0
    except Exception as e:
        logger.error(e)
        latest_contributor, last_modified = None, 0

    return_dict['latest_contributor'] = latest_contributor
    return_dict['last_modified'] = last_modified

    # get file type and extension
    filetype, fileext = get_file_type_and_ext(filename)
    return_dict['fileext'] = fileext
    return_dict['filetype'] = filetype

    file_uuid = get_seadoc_file_uuid(repo, path)
    return_dict['file_uuid'] = file_uuid

    # get file raw url
    raw_path = ''
    inner_path = ''
    use_onetime = False if filetype in (VIDEO, AUDIO) else True
    token = seafile_api.get_fileserver_access_token(repo_id, file_id,
                                                    'view', username,
                                                    use_onetime=use_onetime)
    if token:
        raw_path = gen_file_get_url(token, filename)
        inner_path = gen_inner_file_get_url(token, filename)

    # handle file preview/edit according to file extension
    file_size = seafile_api.get_file_size(repo.store_id, repo.version, file_id)
    # template = 'view_file_%s.html' % filetype.lower()
    template = '%s_file_view_react.html' % filetype.lower()

    if filetype in FILE_TYPE_FOR_NEW_FILE_LINK:
        raw_path = gen_file_get_url_new(repo_id, path)

    if filetype in (IMAGE, VIDEO, AUDIO, PDF, SVG, 'Unknown'):
        template = 'common_file_view_react.html'

    if filetype == SEADOC:
        return_dict['assets_url'] = '/api/v2.1/seadoc/download-image/' + file_uuid
        return_dict['seadoc_server_url'] = SEADOC_SERVER_URL
        return_dict['enable_seadoc'] = ENABLE_SEADOC

        can_edit_file = True
        if parse_repo_perm(permission).can_edit_on_web is False:
            can_edit_file = False
        elif is_locked and not locked_by_me:
            can_edit_file = False

        return_dict['can_edit_file'] = can_edit_file

        return_dict['is_freezed'] = False
        if is_pro_version():
            lock_info = seafile_api.get_lock_info(repo_id, path)
            return_dict['is_freezed'] = lock_info is not None and lock_info.expire < 0

        if is_pro_version() and can_edit_file:
            try:
                if not is_locked:
                    seafile_api.lock_file(repo_id, path, ONLINE_OFFICE_LOCK_OWNER,
                                          int(time.time()) + 40 * 60)
                elif locked_by_online_office:
                    seafile_api.refresh_file_lock(repo_id, path,
                                                  int(time.time()) + 40 * 60)
            except Exception as e:
                logger.error(e)

        seadoc_perm = 'rw' if can_edit_file else 'r'
        return_dict['seadoc_access_token'] = gen_seadoc_access_token(file_uuid, filename, username, permission=seadoc_perm)

        # revision
        revision_info = is_seadoc_revision(file_uuid)
        return_dict.update(revision_info)

        send_file_access_msg(request, repo, path, 'web')
        return render(request, template, return_dict)

    elif ENABLE_OFFICE_WEB_APP and fileext in OFFICE_WEB_APP_FILE_EXTENSION or \
            ENABLE_ONLYOFFICE and fileext in ONLYOFFICE_FILE_EXTENSION:

        if repo.encrypted:
            return_dict['err'] = _('The library is encrypted, can not open file online.')
            return render(request, template, return_dict)

        if file_size > OFFICE_PREVIEW_MAX_SIZE:
            error_msg = _('File size surpasses %s, can not be opened online.') % \
                    filesizeformat(OFFICE_PREVIEW_MAX_SIZE)
            return_dict['err'] = error_msg
            return render(request, template, return_dict)

        if ENABLE_OFFICE_WEB_APP:
            action_name = None
            # first check if can view file
            if fileext in OFFICE_WEB_APP_FILE_EXTENSION:
                action_name = 'view'

            # then check if can edit file
            if ENABLE_OFFICE_WEB_APP_EDIT and parse_repo_perm(permission).can_edit_on_web and \
                    fileext in OFFICE_WEB_APP_EDIT_FILE_EXTENSION and \
                    ((not is_locked) or (is_locked and locked_by_online_office)):
                action_name = 'edit'

            wopi_dict = get_wopi_dict(username, repo_id, path,
                                      action_name=action_name,
                                      language_code=request.LANGUAGE_CODE,
                                      can_download=parse_repo_perm(permission).can_download)

            if wopi_dict:
                send_file_access_msg(request, repo, path, 'web')
                return render(request, 'wopi_file_view_react.html', {**return_dict, **wopi_dict})
            else:
                return_dict['err'] = _('Error when prepare Office Online file preview page.')

        if ENABLE_ONLYOFFICE and fileext in ONLYOFFICE_FILE_EXTENSION:

            can_edit = False
            if parse_repo_perm(permission).can_edit_on_web and \
                    fileext in ONLYOFFICE_EDIT_FILE_EXTENSION and \
                    ((not is_locked) or (is_locked and locked_by_online_office)):
                can_edit = True

            from seahub.constants import PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT
            can_copy_content = permission not in (PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT)
            onlyoffice_dict = get_onlyoffice_dict(request, username, repo_id, path,
                                                  can_edit=can_edit,
                                                  can_download=parse_repo_perm(permission).can_download,
                                                  can_copy=can_copy_content)

            if onlyoffice_dict:
                if is_pro_version() and can_edit:
                    try:
                        if not is_locked:
                            logger.info('{} lock {} in repo {} when open it via OnlyOffice.'.format(ONLINE_OFFICE_LOCK_OWNER, path, repo_id))
                            seafile_api.lock_file(repo_id, path, ONLINE_OFFICE_LOCK_OWNER,
                                                  int(time.time()) + 40 * 60)
                        elif locked_by_online_office:
                            logger.info('{} relock {} in repo {} when open it via OnlyOffice.'.format(ONLINE_OFFICE_LOCK_OWNER, path, repo_id))
                            seafile_api.refresh_file_lock(repo_id, path,
                                                          int(time.time()) + 40 * 60)
                    except Exception as e:
                        logger.error(e)

                send_file_access_msg(request, repo, path, 'web')

                return render(request, 'onlyoffice_file_view_react.html', {**return_dict, **onlyoffice_dict})
            else:
                return_dict['err'] = _('Error when prepare OnlyOffice file preview page.')

        send_file_access_msg(request, repo, path, 'web')
        return render(request, template, return_dict)

    elif filetype == MARKDOWN:

        mode = request.GET.get('mode', '')
        if mode not in ('edit', 'viewer', 'plain'):
            mode = 'viewer'
        if mode == 'plain':
            template = 'plain_' + template

        return_dict['protocol'] = request.is_secure() and 'https' or 'http'
        return_dict['domain'] = get_current_site(request).domain
        return_dict['serviceUrl'] = get_service_url().rstrip('/')
        return_dict['language_code'] = get_language()
        return_dict['mode'] = mode
        return_dict['share_link_expire_days_Default'] = SHARE_LINK_EXPIRE_DAYS_DEFAULT
        return_dict['share_link_expire_days_min'] = SHARE_LINK_EXPIRE_DAYS_MIN
        return_dict['share_link_expire_days_max'] = SHARE_LINK_EXPIRE_DAYS_MAX
        return_dict['raw_path'] = raw_path

        can_edit_file = True
        if parse_repo_perm(permission).can_edit_on_web is False:
            can_edit_file = False
        elif is_locked and not locked_by_me:
            can_edit_file = False
        return_dict['can_edit_file'] = can_edit_file

        return render(request, template, return_dict)

    elif filetype == TLDRAW:

        mode = request.GET.get('mode', '')
        if mode not in ('edit', 'viewer', 'plain'):
            mode = 'viewer'
        if mode == 'plain':
            template = 'plain_' + template

        return_dict['protocol'] = request.is_secure() and 'https' or 'http'
        return_dict['domain'] = get_current_site(request).domain
        return_dict['serviceUrl'] = get_service_url().rstrip('/')
        return_dict['language_code'] = get_language()
        return_dict['mode'] = mode
        return_dict['share_link_expire_days_Default'] = SHARE_LINK_EXPIRE_DAYS_DEFAULT
        return_dict['share_link_expire_days_min'] = SHARE_LINK_EXPIRE_DAYS_MIN
        return_dict['share_link_expire_days_max'] = SHARE_LINK_EXPIRE_DAYS_MAX
        return_dict['raw_path'] = raw_path

        can_edit_file = True
        if parse_repo_perm(permission).can_edit_on_web is False:
            can_edit_file = False
        elif is_locked and not locked_by_me:
            can_edit_file = False
        return_dict['can_edit_file'] = can_edit_file

        return render(request, template, return_dict)

    elif filetype == EXCALIDRAW:
        file_uuid = get_exdraw_file_uuid(repo, path)
        return_dict['file_uuid'] = file_uuid
        return_dict['protocol'] = request.is_secure() and 'https' or 'http'
        return_dict['domain'] = get_current_site(request).domain
        return_dict['serviceUrl'] = get_service_url().rstrip('/')
        return_dict['language_code'] = get_language()
        return_dict['excalidraw_server_url'] = EXCALIDRAW_SERVER_URL
        return_dict['share_link_expire_days_Default'] = SHARE_LINK_EXPIRE_DAYS_DEFAULT
        return_dict['share_link_expire_days_min'] = SHARE_LINK_EXPIRE_DAYS_MIN
        return_dict['share_link_expire_days_max'] = SHARE_LINK_EXPIRE_DAYS_MAX
        return_dict['raw_path'] = raw_path

        can_edit_file = True
        if parse_repo_perm(permission).can_edit_on_web is False:
            can_edit_file = False
        elif is_locked and not locked_by_me:
            can_edit_file = False
        return_dict['can_edit_file'] = can_edit_file

        return render(request, template, return_dict)

    elif filetype in (VIDEO, AUDIO, PDF, SVG):
        return_dict['raw_path'] = raw_path
        if filetype == VIDEO:
            return_dict['enable_video_thumbnail'] = settings.ENABLE_VIDEO_THUMBNAIL
        if filetype == PDF:
            return_dict['enable_pdf_thumbnail'] = settings.ENABLE_PDF_THUMBNAIL
        if filetype not in FILE_TYPE_FOR_NEW_FILE_LINK:
            send_file_access_msg(request, repo, path, 'web')
        return render(request, template, return_dict)

    elif filetype == IMAGE:

        if file_size > FILE_PREVIEW_MAX_SIZE:
            error_msg = _('File size surpasses %s, can not be opened online.') % \
                filesizeformat(FILE_PREVIEW_MAX_SIZE)

            return_dict['err'] = error_msg
            return render(request, template, return_dict)

        img_prev = None
        img_next = None

        img_list = []
        dirs = seafile_api.list_dir_by_path(repo_id, parent_dir)
        for dirent in dirs:
            if not stat.S_ISDIR(dirent.props.mode):
                fltype, flext = get_file_type_and_ext(dirent.obj_name)
                if fltype == IMAGE:
                    img_list.append(dirent.obj_name)

        if len(img_list) > 1:
            img_list.sort(key=lambda x: x.lower())
            cur_img_index = img_list.index(filename)
            if cur_img_index != 0:
                img_prev = posixpath.join(parent_dir, img_list[cur_img_index - 1])
            if cur_img_index != len(img_list) - 1:
                img_next = posixpath.join(parent_dir, img_list[cur_img_index + 1])

        return_dict['img_prev'] = img_prev
        return_dict['img_next'] = img_next
        return_dict['raw_path'] = raw_path

        send_file_access_msg(request, repo, path, 'web')
        return render(request, template, return_dict)

    elif filetype == TEXT or fileext in get_conf_text_ext():

        # get file size
        if file_size > FILE_PREVIEW_MAX_SIZE:
            error_msg = _('File size surpasses %s, can not be opened online.') % \
                filesizeformat(FILE_PREVIEW_MAX_SIZE)

            return_dict['err'] = error_msg
            return render(request, template, return_dict)

        file_enc = request.GET.get('file_enc', 'auto')
        if file_enc not in FILE_ENCODING_LIST:
            file_enc = 'auto'

        error_msg, file_content, encoding = get_file_content(filetype, inner_path, file_enc)
        if error_msg:
            return_dict['err'] = error_msg
            return render(request, template, return_dict)

        file_encoding_list = FILE_ENCODING_LIST
        if encoding and encoding not in FILE_ENCODING_LIST:
            file_encoding_list.append(encoding)

        return_dict['file_enc'] = file_enc
        # return_dict['encoding'] = encoding
        # return_dict['file_encoding_list'] = file_encoding_list
        return_dict['file_content'] = file_content

        can_edit_file = True
        if parse_repo_perm(permission).can_edit_on_web is False:
            can_edit_file = False
        elif is_locked and not locked_by_me:
            can_edit_file = False

        return_dict['can_edit_file'] = can_edit_file

        send_file_access_msg(request, repo, path, 'web')
        return render(request, template, return_dict)

    elif getattr(settings, 'ENABLE_CAD', False) and path.endswith('.dwg'):

        from seahub.cad.utils import get_cad_dict
        cad_dict = get_cad_dict(request, username, repo_id, path)

        return_dict.update(cad_dict)

        return render(request, 'view_file_cad.html', return_dict)
    else:
        return_dict['err'] = "File preview unsupported"
        return render(request, template, return_dict)


def view_history_file_common(request, repo_id, ret_dict):

    ret_dict['err'] = ''

    # check arguments
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    path = request.GET.get('p', '/')
    path = normalize_file_path(path)

    ENABLE_ONLYOFFICE, ENABLE_OFFICE_WEB_APP = get_office_feature_by_repo(repo)

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        raise Http404

    obj_id = request.GET.get('obj_id', '')
    if not obj_id:
        raise Http404

    # construct some variables
    u_filename = os.path.basename(path)
    current_commit = get_commit(repo.id, repo.version, commit_id)
    if not current_commit:
        raise Http404

    # get file type and extension
    filetype, fileext = get_file_type_and_ext(u_filename)

    # Check whether user has permission to view file and get file raw path,
    # render error page if permission  deny.
    if filetype == VIDEO or filetype == AUDIO:
        raw_path, inner_path, user_perm = get_file_view_path_and_perm(
            request, repo_id, obj_id, path, use_onetime=False)
    else:
        raw_path, inner_path, user_perm = get_file_view_path_and_perm(
            request, repo_id, obj_id, path)

    request.user_perm = user_perm
    if user_perm:

        if ENABLE_OFFICE_WEB_APP and fileext in OFFICE_WEB_APP_FILE_EXTENSION or \
                ENABLE_ONLYOFFICE and fileext in ONLYOFFICE_FILE_EXTENSION:

            username = request.user.username

            if ENABLE_OFFICE_WEB_APP and fileext in OFFICE_WEB_APP_FILE_EXTENSION:

                # obj_id for view trash/history file
                wopi_dict = get_wopi_dict(username, repo_id, path,
                                          language_code=request.LANGUAGE_CODE,
                                          obj_id=obj_id,
                                          can_download=parse_repo_perm(user_perm).can_download)

                if wopi_dict:
                    # send file audit message
                    send_file_access_msg(request, repo, path, 'web')
                    ret_dict['wopi_dict'] = wopi_dict
                else:
                    ret_dict['err'] = _('Error when prepare Office Online file preview page.')

            if ENABLE_ONLYOFFICE and fileext in ONLYOFFICE_FILE_EXTENSION:

                from seahub.constants import PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT
                can_copy_content = user_perm not in (PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT)
                onlyoffice_dict = get_onlyoffice_dict(request, username, repo_id, path,
                                                      file_id=obj_id,
                                                      can_download=parse_repo_perm(user_perm).can_download,
                                                      can_copy=can_copy_content)

                if onlyoffice_dict:
                    # send file audit message
                    send_file_access_msg(request, repo, path, 'web')
                    ret_dict['onlyoffice_dict'] = onlyoffice_dict
                else:
                    ret_dict['err'] = _('Error when prepare OnlyOffice file preview page.')

        # Check if can preview file
        fsize = get_file_size(repo.store_id, repo.version, obj_id)
        can_preview, err_msg = can_preview_file(u_filename, fsize, repo)
        if can_preview:

            # send file audit message
            send_file_access_msg(request, repo, path, 'web')

            """Choose different approach when dealing with different type of file."""
            if is_textual_file(file_type=filetype):
                handle_textual_file(request, filetype, inner_path, ret_dict)
        else:
            ret_dict['err'] = err_msg

    # populate return value dict
    ret_dict['repo'] = repo
    ret_dict['obj_id'] = obj_id
    ret_dict['file_name'] = u_filename
    ret_dict['path'] = path
    ret_dict['current_commit'] = current_commit
    ret_dict['fileext'] = fileext
    ret_dict['raw_path'] = raw_path
    ret_dict['enable_watermark'] = ENABLE_WATERMARK
    ret_dict['can_download_file'] = parse_repo_perm(user_perm).can_download
    if 'filetype' not in ret_dict:
        ret_dict['filetype'] = filetype

@repo_passwd_set_required
def view_history_file(request, repo_id):
    ret_dict = {}
    view_history_file_common(request, repo_id, ret_dict)
    if not request.user_perm:
        return render_permission_error(request, _('Unable to view file'))

    if ret_dict['err']:
        return render(request, 'history_file_view_react.html', ret_dict)

    if 'wopi_dict' in ret_dict:
        wopi_dict = ret_dict['wopi_dict']
        return render(request, 'view_file_wopi.html', wopi_dict)

    if 'onlyoffice_dict' in ret_dict:
        onlyoffice_dict = ret_dict['onlyoffice_dict']
        return render(request, 'view_file_onlyoffice.html', onlyoffice_dict)

    # generate file path navigator
    path = ret_dict['path']
    repo = ret_dict['repo']
    ret_dict['zipped'] = gen_path_link(path, repo.name)

    #return render(request, 'view_history_file.html', ret_dict)
    return render(request, 'history_file_view_react.html', ret_dict)

@repo_passwd_set_required
def view_trash_file(request, repo_id):
    ret_dict = {}
    view_history_file_common(request, repo_id, ret_dict)
    if not request.user_perm:
        return render_permission_error(request, _('Unable to view file'))

    if ret_dict['err']:
        return render(request, 'history_file_view_react.html', ret_dict)

    if 'wopi_dict' in ret_dict:
        wopi_dict = ret_dict['wopi_dict']
        return render(request, 'view_file_wopi.html', wopi_dict)

    if 'onlyoffice_dict' in ret_dict:
        onlyoffice_dict = ret_dict['onlyoffice_dict']
        return render(request, 'view_file_onlyoffice.html', onlyoffice_dict)

    basedir = request.GET.get('base', '')
    if not basedir:
        raise Http404

    if basedir != '/':
        tmp_path = posixpath.join(basedir.rstrip('/'), ret_dict['path'].lstrip('/'))
        ret_dict['path'] = tmp_path

    #return render(request, 'view_trash_file.html', ret_dict)
    ret_dict['from_trash'] = True
    return render(request, 'history_file_view_react.html', ret_dict)

@repo_passwd_set_required
def view_snapshot_file(request, repo_id):
    ret_dict = {}
    view_history_file_common(request, repo_id, ret_dict)
    if not request.user_perm:
        return render_permission_error(request, _('Unable to view file'))

    if ret_dict['err']:
        return render(request, 'history_file_view_react.html', ret_dict)

    if 'wopi_dict' in ret_dict:
        wopi_dict = ret_dict['wopi_dict']
        return render(request, 'view_file_wopi.html', wopi_dict)

    if 'onlyoffice_dict' in ret_dict:
        onlyoffice_dict = ret_dict['onlyoffice_dict']
        return render(request, 'view_file_onlyoffice.html', onlyoffice_dict)

    # generate file path navigator
    path = ret_dict['path']
    repo = ret_dict['repo']
    ret_dict['zipped'] = gen_path_link(path, repo.name)

    #return render(request, 'view_snapshot_file.html', ret_dict)
    return render(request, 'history_file_view_react.html', ret_dict)

def _download_file_from_share_link(request, fileshare, use_tmp_token=False):
    """Download shared file.
    `path` need to be provided by frontend, if missing, use `fileshare.path`
    """
    next_page = request.headers.get('referer', settings.SITE_ROOT)

    repo = get_repo(fileshare.repo_id)
    if not repo:
        raise Http404

    # Construct real file path if download file in shared dir, otherwise, just
    # use path in DB.
    if isinstance(fileshare, FileShare) and fileshare.is_dir_share_link():
        req_path = request.GET.get('p', '')
        if not req_path:
            messages.error(request, _('Unable to download file, invalid file path'))
            return HttpResponseRedirect(next_page)
        real_path = posixpath.join(fileshare.path, req_path.lstrip('/'))
    else:
        real_path = fileshare.path

    filename = os.path.basename(real_path)
    obj_id = seafile_api.get_file_id_by_path(repo.id, real_path)
    if not obj_id:
        messages.error(request, _('Unable to download file, wrong file path'))
        return HttpResponseRedirect(next_page)

    if use_tmp_token:
        dl_token = seafile_api.get_fileserver_access_token(repo.id,
            obj_id, 'download-link', fileshare.username, use_onetime=False)
        if not dl_token:
            messages.error(request, _('Unable to download file.'))

        return HttpResponseRedirect(gen_file_get_url(dl_token, filename))

    return HttpResponseRedirect(gen_file_get_url_by_sharelink(fileshare.token))


@ensure_csrf_cookie
@share_link_audit
@share_link_login_required
def view_shared_file(request, fileshare):
    """
    View file via shared link.
    Download share file if `dl` in request param.
    View raw share file if `raw` in request param.
    """
    from seahub.utils import redirect_to_login
    token = fileshare.token
    if not check_share_link_user_access(fileshare, request.user.username):
        if not request.user.username:
            return redirect_to_login(request)
        error_msg = _('Permission denied')
        return render_error(request, error_msg)

    # check if share link is encrypted
    password_check_passed, err_msg = check_share_link_common(request, fileshare)
    direct_download = request.GET.get('dl', '') == '1'
    if not password_check_passed:
        d = {'token': token, 'view_name': 'view_shared_file',
             'err_msg': err_msg, 'direct_download': direct_download}
        return render(request, 'share_access_validation.html', d)

    # recourse check
    repo_id = fileshare.repo_id
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    path = normalize_file_path(fileshare.path)
    obj_id = seafile_api.get_file_id_by_path(repo_id, path)
    if not obj_id:
        return render_error(request, _('File does not exist'))

    ENABLE_ONLYOFFICE, ENABLE_OFFICE_WEB_APP = get_office_feature_by_repo(repo)

    # permission check
    shared_by = fileshare.username
    permission = seafile_api.check_permission_by_path(repo_id, '/', shared_by)
    if not permission or permission == PERMISSION_INVISIBLE:
        return render_error(request, _('Permission denied'))

    # Increase file shared link view_cnt, this operation should be atomic
    fileshare.view_cnt = F('view_cnt') + 1
    fileshare.save()

    if not request.user.is_authenticated:
        username = ANONYMOUS_EMAIL
    else:
        username = request.user.username

    # check file lock info
    try:
        is_locked, locked_by_me = check_file_lock(repo_id, path, username)
    except Exception as e:
        logger.error(e)
        is_locked = False

    locked_by_online_office = if_locked_by_online_office(repo_id, path)

    # get share link permission
    can_copy_content = fileshare.get_permissions()['can_copy_content']
    can_download = fileshare.get_permissions()['can_download']
    can_edit = fileshare.get_permissions()['can_edit'] and (not is_locked or locked_by_online_office)
    filename = os.path.basename(path)
    filetype, fileext = get_file_type_and_ext(filename)

    # download shared file
    if request.GET.get('dl', '') == '1':
        if can_download is False:
            raise Http404

        # send file audit message
        if filetype not in FILE_TYPE_FOR_NEW_FILE_LINK:
            send_file_access_msg(request, repo, path, 'share-link')

        return _download_file_from_share_link(request, fileshare)

    # get raw file
    access_token = seafile_api.get_fileserver_access_token(repo_id, obj_id, 'view',
                                                           '', use_onetime=False)

    if not access_token:
        return render_error(request, _('Unable to view file'))

    raw_path = gen_file_get_url(access_token, filename)

    if request.GET.get('raw', '') == '1':
        if can_download is False:
            raise Http404

        # send file audit message
        send_file_access_msg(request, repo, path, 'share-link')

        # view raw shared file, directly show/download file depends on
        # browsers
        return HttpResponseRedirect(raw_path)

    # preview file

    ret_dict = {'err': '', 'file_content': '', 'encoding': '', 'file_enc': '',
                'file_encoding_list': [], 'filetype': filetype}

    if filetype in FILE_TYPE_FOR_NEW_FILE_LINK:
        raw_path = gen_file_get_url_by_sharelink(fileshare.token)

    if filetype == SEADOC:
        file_uuid = get_seadoc_file_uuid(repo, path)
        ret_dict['file_uuid'] = file_uuid
        ret_dict['assets_url'] = '/api/v2.1/seadoc/download-image/' + file_uuid
        ret_dict['seadoc_server_url'] = SEADOC_SERVER_URL
        ret_dict['can_edit_file'] = can_edit
        seadoc_perm = 'rw' if can_edit else 'r'
        ret_dict['file_perm'] = seadoc_perm

        if not can_edit:
            ret_dict['seadoc_access_token'] = gen_seadoc_access_token(file_uuid, filename, username, permission=seadoc_perm)
        else:
            name = username
            username = str(time.time())
            ret_dict['seadoc_access_token'] = gen_share_seadoc_access_token(file_uuid, filename, username, name, permission=seadoc_perm)

        ret_dict['share_link_username'] = username

        send_file_access_msg(request, repo, path, 'web')
        request.session['seadoc_share_session'] = {
            'file_uuid': file_uuid,
            'permission': seadoc_perm,
            'seadoc_access_token': ret_dict['seadoc_access_token'],
        }

    if ENABLE_OFFICE_WEB_APP and fileext in OFFICE_WEB_APP_FILE_EXTENSION or \
            ENABLE_ONLYOFFICE and fileext in ONLYOFFICE_FILE_EXTENSION:

        def online_office_lock_or_refresh_lock(repo_id, path, username):
            try:
                if not is_locked:
                    seafile_api.lock_file(repo_id, path, ONLINE_OFFICE_LOCK_OWNER,
                                          int(time.time()) + 40 * 60)
                elif locked_by_online_office:
                    seafile_api.refresh_file_lock(repo_id, path,
                                                  int(time.time()) + 40 * 60)
            except Exception as e:
                logger.error(e)

        if ENABLE_OFFICE_WEB_APP and fileext in OFFICE_WEB_APP_FILE_EXTENSION:

            action_name = 'edit' if can_edit else 'view'
            wopi_dict = get_wopi_dict(username, repo_id, path,
                                      action_name=action_name,
                                      can_download=can_download,
                                      language_code=request.LANGUAGE_CODE)

            if wopi_dict:

                wopi_dict['share_link_token'] = token

                # send file audit message
                send_file_access_msg(request, repo, path, 'share-link')

                return render(request, 'view_file_wopi.html', wopi_dict)
            else:
                ret_dict['err'] = _('Error when prepare Office Online file preview page.')

        if ENABLE_ONLYOFFICE and fileext in ONLYOFFICE_FILE_EXTENSION:

            onlyoffice_dict = get_onlyoffice_dict(request, username, repo_id, path,
                                                  can_edit=can_edit,
                                                  can_download=can_download,
                                                  can_copy=can_copy_content)

            if onlyoffice_dict:
                if is_pro_version() and can_edit:
                    online_office_lock_or_refresh_lock(repo_id, path, username)

                onlyoffice_dict['share_link_token'] = token

                # send file audit message
                send_file_access_msg(request, repo, path, 'share-link')

                return render(request, 'view_file_onlyoffice.html', onlyoffice_dict)
            else:
                ret_dict['err'] = _('Error when prepare OnlyOffice file preview page.')

    file_size = seafile_api.get_file_size(repo.store_id, repo.version, obj_id)
    can_preview, err_msg = can_preview_file(filename, file_size, repo)
    if can_preview:

        # send file audit message
        if filetype not in FILE_TYPE_FOR_NEW_FILE_LINK:
            send_file_access_msg(request, repo, path, 'share-link')

        """Choose different approach when dealing with different type of file."""
        inner_path = gen_inner_file_get_url(access_token, filename)
        if is_textual_file(file_type=filetype):
            handle_textual_file(request, filetype, inner_path, ret_dict)
    else:
        ret_dict['err'] = err_msg

    accessible_repos = get_unencry_rw_repos_by_user(request)
    save_to_link = reverse('save_shared_link') + '?t=' + token

    permissions = fileshare.get_permissions()

    template = 'shared_file_view_react.html'

    file_share_link = request.path
    desc_for_ogp = _('Share link for %s.') % filename
    icon_path_for_ogp = file_icon_filter(filename)

    file_obj = seafile_api.get_dirent_by_path(repo_id, path)

    data = {'repo': repo,
            'obj_id': obj_id,
            'path': path,
            'file_name': filename,
            'last_modified': timestamp_to_isoformat_timestr(file_obj.mtime) if file_obj else '',
            'file_size': file_size,
            'shared_token': token,
            'access_token': access_token,
            'fileext': fileext,
            'raw_path': raw_path,
            'shared_by': shared_by,
            'err': ret_dict['err'],
            'file_content': ret_dict['file_content'],
            'encoding': ret_dict['encoding'],
            'file_encoding_list': ret_dict['file_encoding_list'],
            'filetype': ret_dict['filetype'],
            'accessible_repos': accessible_repos,
            'save_to_link': save_to_link,
            'traffic_over_limit': False,
            'permissions': permissions,
            'enable_watermark': ENABLE_WATERMARK,
            'file_share_link': file_share_link,
            'desc_for_ogp': desc_for_ogp,
            'icon_path_for_ogp': icon_path_for_ogp,
            'enable_share_link_report_abuse': ENABLE_SHARE_LINK_REPORT_ABUSE,
            'shared_file_download_url': gen_file_get_url_by_sharelink(fileshare.token)
            }
    if filetype == SEADOC:
        data['file_uuid'] = ret_dict['file_uuid']
        data['assets_url'] = ret_dict['assets_url']
        data['seadoc_server_url'] = ret_dict['seadoc_server_url']
        data['seadoc_access_token'] = ret_dict['seadoc_access_token']
        data['can_edit_file'] = ret_dict['can_edit_file']
        data['file_perm'] = ret_dict['file_perm']
        data['share_link_username'] = ret_dict['share_link_username']

    if not request.user.is_authenticated:
        from seahub.utils import get_logo_path_by_user
        data['logo_path'] = get_logo_path_by_user(shared_by)

    return render(request, template, data)


@share_link_audit
@share_link_login_required
def view_file_via_shared_dir(request, fileshare):
    from seahub.utils import redirect_to_login
    token = fileshare.token

    if not check_share_link_user_access(fileshare, request.user.username):
        if not request.user.username:
            return redirect_to_login(request)
        error_msg = _('Permission denied')
        return render_error(request, error_msg)

    # argument check
    req_path = request.GET.get('p', '')
    if not req_path:
        return HttpResponseRedirect(reverse('view_shared_dir', args=[token]))

    req_path = normalize_file_path(req_path)

    # check if share link is encrypted
    password_check_passed, err_msg = check_share_link_common(request, fileshare)
    if not password_check_passed:
        d = {'token': token,
             'view_name': 'view_file_via_shared_dir',
             'path': req_path,
             'err_msg': err_msg,
        }
        return render(request, 'share_access_validation.html', d)

    # recourse check
    repo_id = fileshare.repo_id
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    ENABLE_ONLYOFFICE, ENABLE_OFFICE_WEB_APP = get_office_feature_by_repo(repo)

    # recourse check
    # Get file path from frontend, and construct request file path
    # with fileshare.path to real path, used to fetch file content by RPC.
    real_path = posixpath.join(fileshare.path, req_path.lstrip('/'))
    obj_id = seafile_api.get_file_id_by_path(repo_id, real_path)
    if not obj_id:
        return render_error(request, _('File does not exist'))

    # permission check
    shared_by = fileshare.username
    permission = seafile_api.check_permission_by_path(repo_id, '/', shared_by)
    if not permission or permission == PERMISSION_INVISIBLE:
        return render_error(request, _('Permission denied'))

    if not request.user.is_authenticated:
        username = ANONYMOUS_EMAIL
    else:
        username = request.user.username

    # check file lock info
    try:
        is_locked, locked_by_me = check_file_lock(repo_id, real_path, username)
    except Exception as e:
        logger.error(e)
        is_locked = False
        locked_by_me = False

    locked_by_online_office = if_locked_by_online_office(repo_id, real_path)

    # get share link permission
    can_download = fileshare.get_permissions()['can_download']
    can_edit = fileshare.get_permissions()['can_edit'] and \
            (not is_locked or locked_by_online_office)

    # download shared file
    if request.GET.get('dl', '') == '1':
        if fileshare.get_permissions()['can_download'] is False:
            raise Http404

        # send file audit message
        send_file_access_msg(request, repo, real_path, 'share-link')

        return _download_file_from_share_link(request, fileshare, use_tmp_token=True)

    # get raw file
    access_token = seafile_api.get_fileserver_access_token(repo.id,
            obj_id, 'view', '', use_onetime=False)
    if not access_token:
        return render_error(request, _('Unable to view file'))

    filename = os.path.basename(req_path)
    raw_path = gen_file_get_url(access_token, filename)

    if request.GET.get('raw', '0') == '1':
        if fileshare.get_permissions()['can_download'] is False:
            raise Http404

        # send file audit message
        send_file_access_msg(request, repo, real_path, 'share-link')

        # view raw shared file, directly show/download file depends on browsers
        return HttpResponseRedirect(raw_path)

    filetype, fileext = get_file_type_and_ext(filename)
    ret_dict = {'err': '', 'file_content': '', 'encoding': '', 'file_enc': '',
                'file_encoding_list': [], 'filetype': filetype}

    if filetype == SEADOC:
        file_uuid = get_seadoc_file_uuid(repo, real_path)
        ret_dict['file_uuid'] = file_uuid
        ret_dict['assets_url'] = '/api/v2.1/seadoc/download-image/' + file_uuid
        ret_dict['seadoc_server_url'] = SEADOC_SERVER_URL
        ret_dict['can_edit_file'] = can_edit
        seadoc_perm = 'rw' if can_edit else 'r'
        ret_dict['file_perm'] = seadoc_perm
        ret_dict['seadoc_access_token'] = gen_seadoc_access_token(file_uuid, filename, username, permission=seadoc_perm)

        send_file_access_msg(request, repo, real_path, 'web')
        request.session['seadoc_share_session'] = {
            'file_uuid': file_uuid,
            'permission': seadoc_perm,
            'seadoc_access_token': ret_dict['seadoc_access_token'],
        }

    if ENABLE_OFFICE_WEB_APP and fileext in OFFICE_WEB_APP_FILE_EXTENSION or \
            ENABLE_ONLYOFFICE and fileext in ONLYOFFICE_FILE_EXTENSION:

        if not request.user.is_authenticated:
            username = ANONYMOUS_EMAIL
        else:
            username = request.user.username

        if ENABLE_OFFICE_WEB_APP and fileext in OFFICE_WEB_APP_FILE_EXTENSION:

            wopi_dict = get_wopi_dict(username, repo_id, real_path,
                                      can_download=can_download,
                                      language_code=request.LANGUAGE_CODE)

            if wopi_dict:

                # send file audit message
                send_file_access_msg(request, repo, real_path, 'share-link')

                return render(request, 'view_file_wopi.html', wopi_dict)
            else:
                ret_dict['err'] = _('Error when prepare Office Online file preview page.')

        if ENABLE_ONLYOFFICE and fileext in ONLYOFFICE_FILE_EXTENSION:

            onlyoffice_dict = get_onlyoffice_dict(request, username,
                                                  repo_id, real_path,
                                                  can_edit=can_edit,
                                                  can_download=can_download)

            if onlyoffice_dict:

                # send file audit message
                send_file_access_msg(request, repo, real_path, 'share-link')

                return render(request, 'view_file_onlyoffice.html', onlyoffice_dict)
            else:
                ret_dict['err'] = _('Error when prepare OnlyOffice file preview page.')

    img_prev = None
    img_next = None

    inner_path = gen_inner_file_get_url(access_token, filename)
    file_size = seafile_api.get_file_size(repo.store_id, repo.version, obj_id)
    can_preview, err_msg = can_preview_file(filename, file_size, repo)
    if can_preview:

        # send file audit message
        send_file_access_msg(request, repo, real_path, 'share-link')

        """Choose different approach when dealing with different type of file."""
        if is_textual_file(file_type=filetype):
            handle_textual_file(request, filetype, inner_path, ret_dict)
        elif filetype == IMAGE:
            current_commit = get_commits(repo_id, 0, 1)[0]
            real_parent_dir = os.path.dirname(real_path)
            parent_dir = os.path.dirname(req_path)
            dirs = seafile_api.list_dir_by_commit_and_path(current_commit.repo_id,
                                                           current_commit.id, real_parent_dir)
            if not dirs:
                raise Http404

            img_list = []
            for dirent in dirs:
                if not stat.S_ISDIR(dirent.props.mode):
                    fltype, flext = get_file_type_and_ext(dirent.obj_name)
                    if fltype == 'Image':
                        img_list.append(dirent.obj_name)

            if len(img_list) > 1:
                img_list.sort(key=lambda x: x.lower())
                cur_img_index = img_list.index(filename)
                if cur_img_index != 0:
                    img_prev = posixpath.join(parent_dir, img_list[cur_img_index - 1])
                if cur_img_index != len(img_list) - 1:
                    img_next = posixpath.join(parent_dir, img_list[cur_img_index + 1])
    else:
        ret_dict['err'] = err_msg

    permissions = fileshare.get_permissions()

    # generate dir navigator
    if fileshare.path == '/':
        zipped = gen_path_link(req_path, repo.name)
    else:
        zipped = gen_path_link(req_path, os.path.basename(fileshare.path[:-1]))

    template = 'shared_file_view_react.html'

    file_share_link = request.path
    desc_for_ogp = _('Share link for %s.') % filename
    icon_path_for_ogp = file_icon_filter(filename)

    file_obj = seafile_api.get_dirent_by_path(repo_id, req_path)

    data = {'repo': repo,
            'obj_id': obj_id,
            'from_shared_dir': True,
            'path': req_path,
            'file_name': filename,
            'last_modified': timestamp_to_isoformat_timestr(file_obj.mtime) if file_obj else '',
            'file_size': file_size,
            'shared_token': token,
            'access_token': access_token,
            'fileext': fileext,
            'raw_path': raw_path,
            'shared_by': shared_by,
            'token': token,
            'err': ret_dict['err'],
            'file_content': ret_dict['file_content'],
            'encoding': ret_dict['encoding'],
            'file_encoding_list': ret_dict['file_encoding_list'],
            'filetype': ret_dict['filetype'],
            'zipped': zipped,
            'img_prev': img_prev,
            'img_next': img_next,
            'traffic_over_limit': False,
            'permissions': permissions,
            'enable_watermark': ENABLE_WATERMARK,
            'file_share_link': file_share_link,
            'desc_for_ogp': desc_for_ogp,
            'icon_path_for_ogp': icon_path_for_ogp,
            'enable_share_link_report_abuse': ENABLE_SHARE_LINK_REPORT_ABUSE,
        }
    if filetype == SEADOC:
        data['file_uuid'] = ret_dict['file_uuid']
        data['assets_url'] = ret_dict['assets_url']
        data['seadoc_server_url'] = ret_dict['seadoc_server_url']
        data['seadoc_access_token'] = ret_dict['seadoc_access_token']
        data['can_edit_file'] = ret_dict['can_edit_file']
        data['file_perm'] = ret_dict['file_perm']

    if not request.user.is_authenticated:
        from seahub.utils import get_logo_path_by_user
        data['logo_path'] = get_logo_path_by_user(shared_by)

    return render(request, template, data)

@login_required
def view_raw_file(request, repo_id, file_path):
    """Returns raw content of a file.
    Used when use viewer.js to preview opendocument file.

    Arguments:
    - `request`:
    - `repo_id`:
    """
    repo = get_repo(repo_id)
    if not repo:
        raise Http404


    file_path = file_path.rstrip('/')
    if file_path[0] != '/':
        file_path = '/' + file_path

    obj_id = get_file_id_by_path(repo_id, file_path)
    if not obj_id:
        raise Http404

    raw_path, inner_path, user_perm = get_file_view_path_and_perm(
        request, repo.id, obj_id, file_path)
    if user_perm is None:
        raise Http404

    send_file_access_msg(request, repo, file_path, 'web')
    return HttpResponseRedirect(raw_path)

def send_file_access_msg(request, repo, path, access_from, custom_ip=None, custom_agent=None):
    """Send file download msg for audit.

    Arguments:
    - `request`:
    - `repo`:
    - `obj_id`:
    - `access_from`: web or api or share-link
    """
    access_from = access_from.lower()
    if access_from not in ['web', 'api', 'share-link']:
        logger.warning('Invalid access_from in file access msg: %s' % access_from)
        return

    username = request.user.username
    ip = custom_ip or get_remote_ip(request)
    user_agent = custom_agent or request.headers.get("user-agent")

    msg = {
        'msg_type': 'file-download-' + access_from,
        'user_name': username,
        'ip': ip,
        'user_agent': user_agent,
        'repo_id': repo.id,
        'file_path': path,
    }

    try:
        seafile_api.publish_event('seahub.audit', json.dumps(msg))
    except Exception as e:
        logger.error("Error when sending file-download-%s message: %s" %
                     (access_from, str(e)))

@login_required
def download_file(request, repo_id, obj_id):
    """Download file in repo/file history page.

    Arguments:
    - `request`:
    - `repo_id`:
    - `obj_id`:
    """
    username = request.user.username
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    if repo.encrypted and not seafile_api.is_password_set(repo_id, username):
        reverse_url = reverse('lib_view', args=[repo_id, repo.name, ''])
        return HttpResponseRedirect(reverse_url)

    # only check the permissions at the repo level
    # to prevent file can not be downloaded on the history page
    # if it has been renamed
    if parse_repo_perm(check_folder_permission(
            request, repo_id, '/')).can_download is True:
        # Get a token to access file
        token = seafile_api.get_fileserver_access_token(repo_id,
                obj_id, 'download', username)

        if not token:
            messages.error(request, _('Unable to download file'))
            next_page = request.headers.get('referer', settings.SITE_ROOT)
            return HttpResponseRedirect(next_page)

    else:
        messages.error(request, _('Unable to download file'))
        next_page = request.headers.get('referer', settings.SITE_ROOT)
        return HttpResponseRedirect(next_page)

    path = request.GET.get('p', '')
    send_file_access_msg(request, repo, path, 'web') # send stats message
    file_name = os.path.basename(path.rstrip('/'))
    redirect_url = gen_file_get_url(token, file_name) # generate download link

    return HttpResponseRedirect(redirect_url)

########## text diff
def get_file_content_by_commit_and_path(request, repo_id, commit_id, path, file_enc):
    try:
        obj_id = seafserv_threaded_rpc.get_file_id_by_commit_and_path( \
                                        repo_id, commit_id, path)
    except:
        return None, 'bad path'

    if not obj_id or obj_id == EMPTY_SHA1:
        return '', None
    else:
        if parse_repo_perm(check_folder_permission(
                request, repo_id, '/')).can_preview is True:
            # Get a token to visit file
            token = seafile_api.get_fileserver_access_token(repo_id,
                    obj_id, 'view', request.user.username)

            if not token:
                return None, 'FileServer access token invalid'

        else:
            return None, 'permission denied'

        filename = os.path.basename(path)
        inner_path = gen_inner_file_get_url(token, filename)

        try:
            err, file_content, encoding = repo_file_get(inner_path, file_enc)
        except Exception as e:
            return None, 'error when read file from fileserver: %s' % e
        return file_content, err

@login_required
def text_diff(request, repo_id):
    commit_id = request.GET.get('commit', '')
    path = request.GET.get('p', '')
    u_filename = os.path.basename(path)
    file_enc = request.GET.get('file_enc', 'auto')
    if not file_enc in FILE_ENCODING_LIST:
        file_enc = 'auto'

    if not (commit_id and path):
        return render_error(request, 'bad params')

    repo = get_repo(repo_id)
    if not repo:
        return render_error(request, 'bad repo')

    current_commit = seafserv_threaded_rpc.get_commit(repo.id, repo.version, commit_id)
    if not current_commit:
        return render_error(request, 'bad commit id')

    prev_commit = seafserv_threaded_rpc.get_commit(repo.id, repo.version, current_commit.parent_id)
    if not prev_commit:
        return render_error('bad commit id')

    current_content, err = get_file_content_by_commit_and_path(request, \
                                    repo_id, current_commit.id, path, file_enc)
    if err:
        return render_error(request, err)

    prev_content, err = get_file_content_by_commit_and_path(request, \
                                    repo_id, prev_commit.id, path, file_enc)
    if err:
        return render_error(request, err)

    is_new_file = False
    diff_result_table = ''
    if prev_content == '' and current_content == '':
        is_new_file = True
    else:
        diff = HtmlDiff()
        diff_result_table = diff.make_table(prev_content.splitlines(),
                                        current_content.splitlines(), True)

    zipped = gen_path_link(path, repo.name)

    referer = request.GET.get('referer', '')

    return render(request, 'text_diff.html', {
        'u_filename': u_filename,
        'repo': repo,
        'path': path,
        'zipped': zipped,
        'current_commit': current_commit,
        'prev_commit': prev_commit,
        'diff_result_table': diff_result_table,
        'is_new_file': is_new_file,
        'referer': referer,
    })


def view_media_file_via_share_link(request):
    image_path = request.GET.get('path', '')
    token = request.GET.get('token', '')

    if not image_path or not token:
        return HttpResponseBadRequest('invalid params')

    file_share = FileShare.objects.get_valid_file_link_by_token(token)

    if not file_share:
        err_msg = 'Share link does not exist'
        return render_error(request, err_msg)

    if file_share.is_expired():
        err_msg = 'Share link has expired'
        return render_error(request, err_msg)

    shared_file_name = os.path.basename(file_share.path)
    file_type, file_ext = get_file_type_and_ext(shared_file_name)

    if file_type != MARKDOWN:
        err_msg = 'Invalid file type'
        return render_error(request, err_msg)

    # recourse check
    repo_id = file_share.repo_id
    repo = get_repo(repo_id)
    if not repo:
        return render_error(request, 'Repo does not exist')

    file_id = seafile_api.get_file_id_by_path(repo_id, file_share.path)
    if not file_id:
        return render_error(request, 'File does not exist')

    # read file from cache, if hit
    err_msg, file_content = get_file_content_from_cache(file_id, repo_id, shared_file_name)

    if err_msg:
        return render_error(request, err_msg)

    # If the image does not exist in markdown
    serviceURL = get_service_url().rstrip('/')
    image_file_name = os.path.basename(image_path)

    # Translation ‘(’ ')'
    image_file_name = image_file_name.replace('(', '\(')
    image_file_name = image_file_name.replace(')', '\)')
    encoded_image_file_name = urllib.parse.quote(image_file_name)

    unsafe_pattern = '(%s)/lib/(%s)/file(.*?)%s\?raw=1' % (serviceURL, repo_id, encoded_image_file_name)
    safe_pattern = re.escape(unsafe_pattern)
    p = re.compile(safe_pattern)
    result = re.search(p, file_content)
    if not result:
        return render_error(request, 'Image does not exist')

    # get image
    obj_id = seafile_api.get_file_id_by_path(repo_id, image_path)
    if not obj_id:
        return render_error(request, 'Image does not exist')

    access_token = seafile_api.get_fileserver_access_token(repo_id,
            obj_id, 'view', '', use_onetime=False)

    dl_or_raw_url = gen_file_get_url(access_token, image_file_name)

    return HttpResponseRedirect(dl_or_raw_url)


def view_media_file_via_public_wiki(request):
    image_path = request.GET.get('path', '')
    slug = request.GET.get('slug', '')
    if not image_path or not slug:
        return HttpResponseBadRequest('invalid params')

    # check file type
    image_file_name = os.path.basename(image_path)
    file_type, file_ext = get_file_type_and_ext(image_file_name)
    if file_type != IMAGE:
        err_msg = 'Invalid file type'
        return render_error(request, err_msg)

    # get wiki object or 404
    try:
        wiki = Wiki.objects.get(slug=slug)
    except Wiki.DoesNotExist:
        err_msg = "Wiki not found."
        return render_error(request, err_msg)

    if wiki.permission != 'public':
        return render_permission_error(request, 'Permission denied')

    # recourse check
    repo_id = wiki.repo_id
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        return render_error(request, 'Repo does not exist')

    # get image
    obj_id = seafile_api.get_file_id_by_path(repo_id, image_path)
    if not obj_id:
        return render_error(request, 'Image does not exist')

    access_token = seafile_api.get_fileserver_access_token(repo_id,
            obj_id, 'view', '', use_onetime=False)

    dl_or_raw_url = gen_file_get_url(access_token, image_file_name)

    return HttpResponseRedirect(dl_or_raw_url)


def get_file_content_from_cache(file_id, repo_id, file_name):
    err_msg = ''
    file_content = ''

    cache_key = normalize_cache_key(file_id)
    # read file from cache, if hit
    file_content = cache.get(cache_key)
    if not file_content:
        # otherwise, read file from database and update cache
        access_token = seafile_api.get_fileserver_access_token(repo_id,
                file_id, 'view', '', use_onetime=False)

        if not access_token:
            err_msg = _('Unable to view file')
            return err_msg, file_content

        file_raw_path = gen_inner_file_get_url(access_token, file_name)

        err_msg, file_content, encode = repo_file_get(file_raw_path, 'auto')
        cache.set(cache_key, file_content, 24 * 60 * 60)

    return err_msg, file_content

@login_required
@repo_passwd_set_required
def view_sdoc_revision(request, repo_id, revision_id):
    username = request.user.username

    # resource check
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    revision = SeadocRevision.objects.get_by_revision_id(repo_id, revision_id)
    if not revision:
        return render_error(request, 'revision not found')

    is_published = revision.is_published
    if is_published:
        origin_file_uuid = revision.origin_doc_uuid
        origin_uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(origin_file_uuid)
        if not origin_uuid_map:
            return render_error(request, _('The original file does not exist'))

        parent_dir = origin_uuid_map.parent_path
        filename = origin_uuid_map.filename
        path = posixpath.join(parent_dir, filename)
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            return render_error(request, _('File does not exist'))

    else:
        uuid_map = FileUUIDMap.objects.filter(uuid=revision.doc_uuid).first()
        if not uuid_map:
            return render_error(request, _('File does not exist'))

        parent_dir = uuid_map.parent_path
        filename = uuid_map.filename
        path = posixpath.join(parent_dir, filename)
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            return render_error(request, _('File does not exist'))

    # permission check
    permission = check_folder_permission(request, repo_id, parent_dir)
    if not permission:
        return convert_repo_path_when_can_not_view_file(request, repo_id, path)

    mobile_login = request.session.get(SESSION_MOBILE_LOGIN_KEY, False)

    org_id = request.user.org.org_id if is_org_context(request) else -1
    # basic file info
    return_dict = {
        'is_pro': is_pro_version(),
        'repo': repo,
        'file_id': file_id,
        'last_commit_id': repo.head_cmmt_id,
        'is_repo_owner': is_repo_owner(request, repo_id, username),
        'path': path,
        'parent_dir': parent_dir,
        'filename': filename,
        'file_perm': permission,
        'highlight_keyword': settings.HIGHLIGHT_KEYWORD,
        'enable_watermark': ENABLE_WATERMARK,
        'share_link_force_use_password': SHARE_LINK_FORCE_USE_PASSWORD,
        'share_link_password_min_length': SHARE_LINK_PASSWORD_MIN_LENGTH,
        'share_link_password_strength_level': SHARE_LINK_PASSWORD_STRENGTH_LEVEL,
        'share_link_expire_days_default': SHARE_LINK_EXPIRE_DAYS_DEFAULT,
        'share_link_expire_days_min': SHARE_LINK_EXPIRE_DAYS_MIN,
        'share_link_expire_days_max': SHARE_LINK_EXPIRE_DAYS_MAX,
        'can_download_file': parse_repo_perm(permission).can_download,
        'mobile_login': mobile_login,
    }

    is_locked = False
    locked_by_me = False
    # check whether file is starred
    if not is_published:
        is_starred = is_file_starred(username, repo_id, path, org_id)
        return_dict['is_starred'] = is_starred

        # check file lock info
        try:
            is_locked, locked_by_me = check_file_lock(repo_id, path, username)
        except Exception as e:
            logger.error(e)
            is_locked = False
            locked_by_me = False

        if is_pro_version() and permission == 'rw':
            can_lock_unlock_file = True
        else:
            can_lock_unlock_file = False

        return_dict['file_locked'] = is_locked
        return_dict['locked_by_me'] = locked_by_me
        return_dict['can_lock_unlock_file'] = can_lock_unlock_file

    return_dict['can_share_file'] = False
    return_dict['filetype'] = 'SDoc'
    return_dict['is_pro'] = is_pro_version()

    file_uuid = revision.doc_uuid
    return_dict['file_uuid'] = file_uuid
    return_dict['seadoc_server_url'] = SEADOC_SERVER_URL
    return_dict['assets_url'] = '/api/v2.1/seadoc/download-image/' + (origin_file_uuid if is_published else file_uuid)

    can_edit_file = not is_published
    if parse_repo_perm(permission).can_edit_on_web is False:
        can_edit_file = False
    elif is_locked and not locked_by_me:
        can_edit_file = False

    seadoc_perm = 'rw' if can_edit_file else 'r'
    return_dict['can_edit_file'] = can_edit_file
    return_dict['seadoc_access_token'] = gen_seadoc_access_token(file_uuid, filename, username, permission=seadoc_perm)

    # revision
    revision_info = is_seadoc_revision(file_uuid, revision)
    return_dict.update(revision_info)

    send_file_access_msg(request, repo, path, 'web')

    if is_published:
        return render(request, 'sdoc_published_revision_file_view.html', return_dict)

    return render(request, 'sdoc_file_view_react.html', return_dict)
