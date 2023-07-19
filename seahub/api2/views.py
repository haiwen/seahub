# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import logging
import os
import stat
from importlib import import_module
import json
import datetime
import posixpath
import re
from dateutil.relativedelta import relativedelta
from urllib.parse import quote

from rest_framework import parsers
from rest_framework import status
from rest_framework import renderers
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.reverse import reverse
from rest_framework.response import Response

from django.conf import settings as dj_settings
from django.contrib.auth.hashers import check_password
from django.contrib.sites.shortcuts import get_current_site
from django.db import IntegrityError
from django.db.models import F
from django.http import HttpResponse
from django.template.defaultfilters import filesizeformat
from django.utils import timezone
from django.utils.translation import gettext as _

from .throttling import ScopedRateThrottle, AnonRateThrottle, UserRateThrottle
from .authentication import TokenAuthentication
from .serializers import AuthTokenSerializer
from .utils import get_diff_details, to_python_boolean, \
    api_error, get_file_size, prepare_starred_files, is_web_request, \
    get_groups, api_group_check, get_timestamp, json_response
from seahub.wopi.utils import get_wopi_dict
from seahub.api2.base import APIView
from seahub.api2.models import TokenV2, DESKTOP_PLATFORMS
from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner
from seahub.avatar.templatetags.avatar_tags import api_avatar_url, avatar
from seahub.avatar.templatetags.group_avatar_tags import api_grp_avatar_url, \
        grp_avatar
from seahub.base.accounts import User
from seahub.base.models import UserStarredFiles, DeviceToken, RepoSecretKey, FileComment
from seahub.share.models import ExtraSharePermission, ExtraGroupsSharePermission
from seahub.share.utils import is_repo_admin, check_group_share_in_permission, normalize_custom_permission_name
from seahub.base.templatetags.seahub_tags import email2nickname, \
    translate_seahub_time, translate_commit_desc_escape, \
    email2contact_email
from seahub.constants import PERMISSION_READ_WRITE, PERMISSION_PREVIEW_EDIT, \
        PERMISSION_INVISIBLE
from seahub.group.views import remove_group_common, \
    rename_group_with_new_name, is_group_staff
from seahub.group.utils import BadGroupNameError, ConflictGroupNameError, \
    validate_group_name, is_group_member, group_id_to_name, is_group_admin
from seahub.thumbnail.utils import generate_thumbnail
from seahub.notifications.models import UserNotification
from seahub.options.models import UserOptions
from seahub.profile.models import Profile, DetailedProfile
from seahub.drafts.models import Draft
from seahub.drafts.utils import get_file_draft, \
    is_draft_file, has_draft_file
from seahub.signals import (repo_created, repo_deleted, repo_transfer)
from seahub.share.models import FileShare, OrgFileShare, UploadLinkShare
from seahub.utils import gen_file_get_url, gen_token, gen_file_upload_url, \
    check_filename_with_rename, is_valid_username, EVENTS_ENABLED, \
    EMPTY_SHA1, is_pro_version, \
    gen_block_get_url, get_file_type_and_ext, HAS_FILE_SEARCH, \
    gen_file_share_link, gen_dir_share_link, is_org_context, gen_shared_link, \
    calculate_repos_last_modify, send_perm_audit_msg, \
    gen_shared_upload_link, convert_cmmt_desc_link, is_valid_dirent_name, \
    normalize_file_path, get_no_duplicate_obj_name, normalize_dir_path

from seahub.tags.models import FileUUIDMap
from seahub.seadoc.models import SeadocHistoryName, SeadocDraft
from seahub.utils.file_types import IMAGE, SEADOC
from seahub.utils.file_revisions import get_file_revisions_after_renamed
from seahub.utils.devices import do_unlink_device
from seahub.utils.repo import get_repo_owner, get_library_storages, \
        get_locked_files_by_dir, get_related_users_by_repo, \
        is_valid_repo_id_format, can_set_folder_perm_by_user, \
        add_encrypted_repo_secret_key_to_database, get_available_repo_perms, \
        parse_repo_perm
from seahub.utils.star import star_file, unstar_file, get_dir_starred_files
from seahub.utils.file_tags import get_files_tags_in_dir
from seahub.utils.file_types import DOCUMENT, MARKDOWN
from seahub.utils.file_size import get_file_size_unit
from seahub.utils.file_op import check_file_lock
from seahub.utils.timeutils import utc_to_local, \
        datetime_to_isoformat_timestr, datetime_to_timestamp, \
        timestamp_to_isoformat_timestr
from seahub.views import is_registered_user, check_folder_permission, \
    create_default_library, list_inner_pub_repos
from seahub.views.file import get_file_view_path_and_perm, send_file_access_msg, can_edit_file
if HAS_FILE_SEARCH:
    from seahub.search.utils import search_files, get_search_repos_map, SEARCH_FILEEXT
from seahub.utils import HAS_OFFICE_CONVERTER
if HAS_OFFICE_CONVERTER:
    from seahub.utils import query_office_convert_status, prepare_converted_html
import seahub.settings as settings
from seahub.settings import THUMBNAIL_EXTENSION, THUMBNAIL_ROOT, \
    FILE_LOCK_EXPIRATION_DAYS, ENABLE_STORAGE_CLASSES, \
    STORAGE_CLASS_MAPPING_POLICY, \
    ENABLE_RESET_ENCRYPTED_REPO_PASSWORD, SHARE_LINK_EXPIRE_DAYS_MAX, \
        SHARE_LINK_EXPIRE_DAYS_MIN, SHARE_LINK_EXPIRE_DAYS_DEFAULT


try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False
try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False
try:
    from seahub.settings import ORG_MEMBER_QUOTA_DEFAULT
except ImportError:
    ORG_MEMBER_QUOTA_DEFAULT = None

try:
    from seahub.settings import ENABLE_OFFICE_WEB_APP
except ImportError:
    ENABLE_OFFICE_WEB_APP = False

try:
    from seahub.settings import OFFICE_WEB_APP_FILE_EXTENSION
except ImportError:
    OFFICE_WEB_APP_FILE_EXTENSION = ()

from pysearpc import SearpcError, SearpcObjEncoder
import seaserv
from seaserv import seafserv_threaded_rpc, \
    is_personal_repo, get_repo, check_permission, get_commits,\
    check_quota, list_share_repos, get_group_repos_by_owner, get_group_repoids, \
    remove_share, get_group, get_file_id_by_path, edit_repo, \
    ccnet_threaded_rpc, get_personal_groups, seafile_api, \
    create_org, ccnet_api

from constance import config

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'

# Define custom HTTP status code. 4xx starts from 440, 5xx starts from 520.
HTTP_440_REPO_PASSWD_REQUIRED = 440
HTTP_441_REPO_PASSWD_MAGIC_REQUIRED = 441
HTTP_443_ABOVE_QUOTA = 443
HTTP_520_OPERATION_FAILED = 520

########## Test
class Ping(APIView):
    """
    Returns a simple `pong` message when client calls `api2/ping/`.
    For example:
        curl http://127.0.0.1:8000/api2/ping/
    """
    throttle_classes = (ScopedRateThrottle, )
    throttle_scope = 'ping'

    def get(self, request, format=None):
        return Response('pong')

    def head(self, request, format=None):
        return Response(headers={'foo': 'bar',})

class AuthPing(APIView):
    """
    Returns a simple `pong` message when client provided an auth token.
    For example:
        curl -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b" http://127.0.0.1:8000/api2/auth/ping/
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        return Response('pong')

########## Token
class ObtainAuthToken(APIView):
    """
    Returns auth token if username and password are valid.
    For example:
        curl -d "username=foo@example.com&password=123456" http://127.0.0.1:8000/api2/auth-token/
    """
    throttle_classes = (AnonRateThrottle, )
    permission_classes = ()
    parser_classes = (parsers.FormParser, parsers.MultiPartParser, parsers.JSONParser,)
    renderer_classes = (renderers.JSONRenderer,)

    def post(self, request):
        headers = {}
        context = { 'request': request }
        serializer = AuthTokenSerializer(data=request.data, context=context)
        if serializer.is_valid():
            key = serializer.validated_data

            trust_dev = False
            try:
                trust_dev_header = int(request.headers.get('x-seafile-2fa-trust-device', ''))
                trust_dev = True if trust_dev_header == 1 else False
            except ValueError:
                trust_dev = False

            skip_2fa_header = request.headers.get('x-seafile-s2fa', None)
            if skip_2fa_header is None:
                if trust_dev:
                    # 2fa login with trust device,
                    # create new session, and return session id.
                    pass
                else:
                    # No 2fa login or 2fa login without trust device,
                    # return token only.
                    return Response({'token': key})
            else:
                # 2fa login without OTP token,
                # get or create session, and return session id
                pass

            SessionStore = import_module(dj_settings.SESSION_ENGINE).SessionStore
            s = SessionStore(skip_2fa_header)
            if not s.exists(skip_2fa_header) or s.is_empty():
                from seahub.two_factor.views.login import remember_device
                s = remember_device(request.data['username'])

            headers = {
                'X-SEAFILE-S2FA': s.session_key
            }
            return Response({'token': key}, headers=headers)

        if serializer.two_factor_auth_failed:
            # Add a special response header so the client knows to ask the user
            # for the 2fa token.
            headers = {
                'X-Seafile-OTP': 'required',
            }

        return Response(serializer.errors,
                        status=status.HTTP_400_BAD_REQUEST,
                        headers=headers)

########## Accounts
class Accounts(APIView):
    """List all accounts.
    Administrator permission is required.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        # list accounts
        start = int(request.GET.get('start', '0'))
        limit = int(request.GET.get('limit', '100'))
        # reading scope user list
        scope = request.GET.get('scope', None)

        accounts_ldapimport = []
        accounts_ldap = []
        accounts_db = []
        if scope:
            scope = scope.upper()
            if scope == 'LDAP':
                accounts_ldap = ccnet_api.get_emailusers('LDAP', start, limit)
            elif scope == 'LDAPIMPORT':
                accounts_ldapimport = ccnet_api.get_emailusers('LDAPImport', start, limit)
            elif scope == 'DB':
                accounts_db = ccnet_api.get_emailusers('DB', start, limit)
            else:
                return api_error(status.HTTP_400_BAD_REQUEST, "%s is not a valid scope value" % scope)
        else:
            # old way - search first in LDAP if available then DB if no one found
            accounts_ldap = seaserv.get_emailusers('LDAP', start, limit)
            if len(accounts_ldap) == 0:
                accounts_db = seaserv.get_emailusers('DB', start, limit)

        accounts_json = []
        for account in accounts_ldap:
            accounts_json.append({'email': account.email, 'source' : 'LDAP'})

        for account in accounts_ldapimport:
            accounts_json.append({'email': account.email, 'source' : 'LDAPImport'})

        for account in accounts_db:
            accounts_json.append({'email': account.email, 'source' : 'DB'})

        return Response(accounts_json)


class AccountInfo(APIView):
    """ Show account info.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def _get_account_info(self, request):
        info = {}
        email = request.user.username
        p = Profile.objects.get_profile_by_user(email)
        d_p = DetailedProfile.objects.get_detailed_profile_by_user(email)

        if is_org_context(request):
            org_id = request.user.org.org_id
            quota_total = seafile_api.get_org_user_quota(org_id, email)
            quota_usage = seafile_api.get_org_user_quota_usage(org_id, email)
            is_org_staff = request.user.org.is_staff
            info['is_org_staff'] = is_org_staff
        else:
            quota_total = seafile_api.get_user_quota(email)
            quota_usage = seafile_api.get_user_self_usage(email)

        if quota_total > 0:
            info['space_usage'] = str(float(quota_usage) / quota_total * 100) + '%'
        else:                       # no space quota set in config
            info['space_usage'] = '0%'

        url, _, _ = api_avatar_url(email, int(72))

        info['avatar_url'] = url
        info['email'] = email
        info['name'] = email2nickname(email)
        info['total'] = quota_total
        info['usage'] = quota_usage
        info['login_id'] = p.login_id if p and p.login_id else ""
        info['department'] = d_p.department if d_p else ""
        info['contact_email'] = p.contact_email if p else ""
        info['institution'] = p.institution if p and p.institution else ""
        info['is_staff'] = request.user.is_staff

        if getattr(settings, 'MULTI_INSTITUTION', False):
            from seahub.institutions.models import InstitutionAdmin
            try:
                InstitutionAdmin.objects.get(user=email)
                info['is_inst_admin'] = True
            except InstitutionAdmin.DoesNotExist:
                info['is_inst_admin'] = False

        file_updates_email_interval = UserOptions.objects.get_file_updates_email_interval(email)
        info['file_updates_email_interval'] = 0 if file_updates_email_interval is None else file_updates_email_interval
        collaborate_email_interval = UserOptions.objects.get_collaborate_email_interval(email)
        info['collaborate_email_interval'] = 0 if collaborate_email_interval is None else collaborate_email_interval
        return info

    def get(self, request, format=None):
        return Response(self._get_account_info(request))

    def put(self, request, format=None):
        """Update account info.
        """
        username = request.user.username

        name = request.data.get("name", None)
        if name is not None:
            if len(name) > 64:
                return api_error(status.HTTP_400_BAD_REQUEST,
                        _('Name is too long (maximum is 64 characters)'))

            if "/" in name:
                return api_error(status.HTTP_400_BAD_REQUEST,
                        _("Name should not include '/'."))

        file_updates_email_interval = request.data.get("file_updates_email_interval", None)
        if file_updates_email_interval is not None:
            try:
                file_updates_email_interval = int(file_updates_email_interval)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'file_updates_email_interval invalid')
        collaborate_email_interval = request.data.get("collaborate_email_interval", None)
        if collaborate_email_interval is not None:
            try:
                collaborate_email_interval = int(collaborate_email_interval)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'collaborate_email_interval invalid')

        # update user info

        if name is not None:
            profile = Profile.objects.get_profile_by_user(username)
            if profile is None:
                profile = Profile(user=username)
            profile.nickname = name
            profile.save()

        if file_updates_email_interval is not None:
            if file_updates_email_interval <= 0:
                UserOptions.objects.unset_file_updates_email_interval(username)
            else:
                UserOptions.objects.set_file_updates_email_interval(
                    username, file_updates_email_interval)

        if collaborate_email_interval is not None:
            UserOptions.objects.set_collaborate_email_interval(
                username, collaborate_email_interval)

        return Response(self._get_account_info(request))


class RegDevice(APIView):
    """Reg device for iOS push notification.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def post(self, request, format=None):
        version = request.POST.get('version')
        platform = request.POST.get('platform')
        pversion = request.POST.get('pversion')
        devicetoken = request.POST.get('deviceToken')
        if not devicetoken or not version or not platform or not pversion:
            return api_error(status.HTTP_400_BAD_REQUEST, "Missing argument")

        token, modified = DeviceToken.objects.get_or_create(
            token=devicetoken, user=request.user.username)
        if token.version != version:
            token.version = version
            modified = True
        if token.pversion != pversion:
            token.pversion = pversion
            modified = True
        if token.platform != platform:
            token.platform = platform
            modified = True

        if modified:
            token.save()
        return Response("success")


class Search(APIView):
    """ Search all the repos
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):

        if not HAS_FILE_SEARCH:
            error_msg = 'Search not supported.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # argument check
        keyword = request.GET.get('q', None)
        if not keyword:
            error_msg = 'q invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        search_filename_only = request.GET.get('search_filename_only', 'false')
        try:
            search_filename_only = to_python_boolean(str(search_filename_only))
        except ValueError:
            search_filename_only = False

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '10'))
            if per_page > 100:
                per_page = 100
        except ValueError:
            current_page = 1
            per_page = 10

        start = (current_page - 1) * per_page
        size = per_page
        if start < 0 or size < 0:
            error_msg = 'page or per_page invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        search_repo = request.GET.get('search_repo', 'all') # val: scope or 'repo_id'
        search_repo = search_repo.lower()
        if not is_valid_repo_id_format(search_repo) and \
                search_repo not in ('all', 'mine', 'shared', 'group', 'public'):
            error_msg = 'search_repo invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        search_path = request.GET.get('search_path', None)
        if search_path:
            search_path = normalize_dir_path(search_path)
            if not is_valid_repo_id_format(search_repo):
                error_msg = 'search_repo invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            dir_id = seafile_api.get_dir_id_by_path(search_repo, search_path)
            if not dir_id:
                error_msg = 'Folder %s not found.' % search_path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        obj_type = request.GET.get('obj_type', None)
        if obj_type:
            obj_type = obj_type.lower()

        if obj_type and obj_type not in ('dir', 'file'):
            error_msg = 'obj_type invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        search_ftypes = request.GET.get('search_ftypes', 'all') # val: 'all' or 'custom'
        search_ftypes = search_ftypes.lower()
        if search_ftypes not in ('all', 'custom'):
            error_msg = 'search_ftypes invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        with_permission = request.GET.get('with_permission', 'false')
        with_permission = with_permission.lower()
        if with_permission not in ('true', 'false'):
            error_msg = 'with_permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        time_from = request.GET.get('time_from', None)
        time_to = request.GET.get('time_to', None)
        if time_from is not None:
            try:
                time_from = int(time_from)
            except:
                error_msg = 'time_from invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if time_to is not None:
            try:
                time_to = int(time_to)
            except:
                error_msg = 'time_to invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        size_from = request.GET.get('size_from', None)
        size_to = request.GET.get('size_to', None)
        if size_from is not None:
            try:
                size_from = int(size_from)
            except:
                error_msg = 'size_from invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if size_to is not None:
            try:
                size_to = int(size_to)
            except:
                error_msg = 'size_to invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        time_range = (time_from, time_to)
        size_range = (size_from, size_to)

        suffixes = None
        custom_ftypes =  request.GET.getlist('ftype') # types like 'Image', 'Video'... same in utils/file_types.py
        input_fileexts = request.GET.get('input_fexts', '') # file extension input by the user
        if search_ftypes == 'custom':
            suffixes = []
            if len(custom_ftypes) > 0:
                for ftp in custom_ftypes:
                    if ftp in SEARCH_FILEEXT:
                        for ext in SEARCH_FILEEXT[ftp]:
                            suffixes.append(ext)

            if input_fileexts:
                input_fexts = input_fileexts.split(',')
                for i_ext in input_fexts:
                    i_ext = i_ext.strip()
                    if i_ext:
                        suffixes.append(i_ext)

        username = request.user.username
        org_id = request.user.org.org_id if is_org_context(request) else None
        repo_id_map = {}
        # check recourse and permissin when search in a single repo
        if is_valid_repo_id_format(search_repo):
            repo_id = search_repo
            repo = seafile_api.get_repo(repo_id)
            # recourse check
            if not repo:
                error_msg = 'Library %s not found.' % repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # permission check
            if not check_folder_permission(request, repo_id, '/'):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
            map_id = repo.origin_repo_id if repo.origin_repo_id else repo_id
            repo_id_map[map_id] = repo
            repo_type_map = {}
        else:
            shared_from = request.GET.get('shared_from', None)
            not_shared_from = request.GET.get('not_shared_from', None)
            repo_id_map, repo_type_map = get_search_repos_map(search_repo,
                    username, org_id, shared_from, not_shared_from)

        obj_desc = {
            'obj_type': obj_type,
            'suffixes': suffixes,
            'time_range': time_range,
            'size_range': size_range
        }
        # search file
        try:
            results, total = search_files(repo_id_map, search_path, keyword, obj_desc, start, size, org_id,
                                          search_filename_only)
        except Exception as e:
            logger.error(e)
            results, total = [], 0
            return Response({"total": total, "results": results, "has_more": False})

        for e in results:
            e.pop('repo', None)
            e.pop('exists', None)
            e.pop('last_modified_by', None)
            e.pop('name_highlight', None)
            e.pop('score', None)

            repo_id = e['repo_id']

            if with_permission.lower() == 'true':
                permission = check_folder_permission(request, repo_id, '/')
                if not permission:
                    continue
                e['permission'] = permission

            # get repo type
            if repo_id in repo_type_map:
                e['repo_type'] = repo_type_map[repo_id]
            else:
                e['repo_type'] = ''

            e['thumbnail_url'] = ''
            filetype, fileext = get_file_type_and_ext(e.get('name', ''))

            if filetype == IMAGE:
                thumbnail_url = reverse('api2-thumbnail',
                                        args=[e.get('repo_id', '')],
                                        request=request)
                params = '?p={}&size={}'.format(quote(e.get('fullpath', '').encode('utf-8')), 72)
                e['thumbnail_url'] = thumbnail_url + params

        has_more = True if total > current_page * per_page else False
        return Response({"total":total, "results":results, "has_more":has_more})

########## Repo related
def repo_download_info(request, repo_id, gen_sync_token=True):
    repo = get_repo(repo_id)
    if not repo:
        return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

    # generate download url for client
    email = request.user.username
    if gen_sync_token:
        token = seafile_api.generate_repo_token(repo_id, email)
    else:
        token = ''
    repo_name = repo.name
    repo_desc = repo.desc
    repo_size = repo.size
    repo_size_formatted = filesizeformat(repo.size)
    enc = 1 if repo.encrypted else ''
    magic = repo.magic if repo.encrypted else ''
    random_key = repo.random_key if repo.random_key else ''
    enc_version = repo.enc_version
    repo_version = repo.version

    calculate_repos_last_modify([repo])

    info_json = {
        'relay_id': '44e8f253849ad910dc142247227c8ece8ec0f971',
        'relay_addr': '127.0.0.1',
        'relay_port': '80',
        'email': email,
        'token': token,
        'repo_id': repo_id,
        'repo_name': repo_name,
        'repo_desc': repo_desc,
        'repo_size': repo_size,
        'repo_size_formatted': repo_size_formatted,
        'mtime': repo.latest_modify,
        'mtime_relative': translate_seahub_time(repo.latest_modify),
        'encrypted': enc,
        'enc_version': enc_version,
        'salt': repo.salt if enc_version >= 3 else '',
        'magic': magic,
        'random_key': random_key,
        'repo_version': repo_version,
        'head_commit_id': repo.head_cmmt_id,
        'permission': seafile_api.check_permission_by_path(repo_id, '/', email)
        }

    if is_pro_version() and ENABLE_STORAGE_CLASSES:
        info_json['storage_name'] = repo.storage_name

    return Response(info_json)

class Repos(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        # parse request params
        filter_by = {
            'mine': False,
            'shared': False,
            'group': False,
            'org': False,
        }

        q = request.GET.get('nameContains', '')
        rtype = request.GET.get('type', "")
        if not rtype:
            # set all to True, no filter applied
            filter_by = filter_by.fromkeys(iter(filter_by.keys()), True)

        for f in rtype.split(','):
            f = f.strip()
            filter_by[f] = True

        email = request.user.username
        owner_name = email2nickname(email)
        owner_contact_email = email2contact_email(email)

        # Use dict to reduce memcache fetch cost in large for-loop.
        contact_email_dict = {}
        nickname_dict = {}

        repos_json = []
        if filter_by['mine']:
            if is_org_context(request):
                org_id = request.user.org.org_id
                owned_repos = seafile_api.get_org_owned_repo_list(org_id,
                        email, ret_corrupted=True)
            else:
                owned_repos = seafile_api.get_owned_repo_list(email,
                        ret_corrupted=True)

            # Reduce memcache fetch ops.
            modifiers_set = {x.last_modifier for x in owned_repos}
            for e in modifiers_set:
                if e not in contact_email_dict:
                    contact_email_dict[e] = email2contact_email(e)
                if e not in nickname_dict:
                    nickname_dict[e] = email2nickname(e)

            owned_repos.sort(key=lambda x: x.last_modify, reverse=True)
            for r in owned_repos:
                # do not return virtual repos
                if r.is_virtual:
                    continue

                if q and q.lower() not in r.name.lower():
                    continue

                repo = {
                    "type": "repo",
                    "id": r.id,
                    "owner": email,
                    "owner_name": owner_name,
                    "owner_contact_email": owner_contact_email,
                    "name": r.name,
                    "mtime": r.last_modify,
                    "modifier_email": r.last_modifier,
                    "modifier_contact_email": contact_email_dict.get(r.last_modifier, ''),
                    "modifier_name": nickname_dict.get(r.last_modifier, ''),
                    "mtime_relative": translate_seahub_time(r.last_modify),
                    "size": r.size,
                    "size_formatted": filesizeformat(r.size),
                    "encrypted": r.encrypted,
                    "permission": 'rw',  # Always have read-write permission to owned repo
                    "virtual": False,
                    "root": '',
                    "head_commit_id": r.head_cmmt_id,
                    "version": r.version,
                    "salt": r.salt if r.enc_version >= 3 else '',
                }

                if is_pro_version() and ENABLE_STORAGE_CLASSES:
                    repo['storage_name'] = r.storage_name
                    repo['storage_id'] = r.storage_id

                repos_json.append(repo)

        if filter_by['shared']:

            if is_org_context(request):
                org_id = request.user.org.org_id
                shared_repos = seafile_api.get_org_share_in_repo_list(org_id,
                        email, -1, -1)
            else:
                shared_repos = seafile_api.get_share_in_repo_list(
                        email, -1, -1)

            repos_with_admin_share_to = ExtraSharePermission.objects.\
                    get_repos_with_admin_permission(email)

            # Reduce memcache fetch ops.
            owners_set = {x.user for x in shared_repos}
            modifiers_set = {x.last_modifier for x in shared_repos}
            for e in owners_set | modifiers_set:
                if e not in contact_email_dict:
                    contact_email_dict[e] = email2contact_email(e)
                if e not in nickname_dict:
                    nickname_dict[e] = email2nickname(e)

            shared_repos.sort(key=lambda x: x.last_modify, reverse=True)
            for r in shared_repos:
                if q and q.lower() not in r.name.lower():
                    continue

                library_group_name = ''
                if '@seafile_group' in r.user:
                    library_group_id = get_group_id_by_repo_owner(r.user)
                    library_group_name= group_id_to_name(library_group_id)

                if parse_repo_perm(r.permission).can_download is False:
                    if not is_web_request(request):
                        continue

                r.password_need = seafile_api.is_password_set(r.repo_id, email)
                repo = {
                    "type": "srepo",
                    "id": r.repo_id,
                    "owner": r.user,
                    "owner_name": nickname_dict.get(r.user, ''),
                    "owner_contact_email": contact_email_dict.get(r.user, ''),
                    "name": r.repo_name,
                    "owner_nickname": nickname_dict.get(r.user, ''),
                    "mtime": r.last_modify,
                    "mtime_relative": translate_seahub_time(r.last_modify),
                    "modifier_email": r.last_modifier,
                    "modifier_contact_email": contact_email_dict.get(r.last_modifier, ''),
                    "modifier_name": nickname_dict.get(r.last_modifier, ''),
                    "size": r.size,
                    "size_formatted": filesizeformat(r.size),
                    "encrypted": r.encrypted,
                    "permission": r.permission,
                    "share_type": r.share_type,
                    "root": '',
                    "head_commit_id": r.head_cmmt_id,
                    "version": r.version,
                    "group_name": library_group_name,
                    "salt": r.salt if r.enc_version >= 3 else '',
                }

                if r.repo_id in repos_with_admin_share_to:
                    repo['is_admin'] = True
                else:
                    repo['is_admin'] = False

                repos_json.append(repo)

        if filter_by['group']:
            if is_org_context(request):
                org_id = request.user.org.org_id
                group_repos = seafile_api.get_org_group_repos_by_user(email,
                        org_id)
            else:
                group_repos = seafile_api.get_group_repos_by_user(email)

            group_repos.sort(key=lambda x: x.last_modify, reverse=True)

            # Reduce memcache fetch ops.
            share_from_set = {x.user for x in group_repos}
            modifiers_set = {x.last_modifier for x in group_repos}
            for e in modifiers_set | share_from_set:
                if e not in contact_email_dict:
                    contact_email_dict[e] = email2contact_email(e)
                if e not in nickname_dict:
                    nickname_dict[e] = email2nickname(e)

            for r in group_repos:
                if q and q.lower() not in r.name.lower():
                    continue

                if parse_repo_perm(r.permission).can_download is False:
                    if not is_web_request(request):
                        continue

                repo = {
                    "type": "grepo",
                    "id": r.repo_id,
                    "name": r.repo_name,
                    "groupid": r.group_id,
                    "group_name": r.group_name,
                    "owner": r.group_name,
                    "mtime": r.last_modify,
                    "mtime_relative": translate_seahub_time(r.last_modify),
                    "modifier_email": r.last_modifier,
                    "modifier_name": nickname_dict.get(r.last_modifier, ''),
                    "modifier_contact_email": contact_email_dict.get(r.last_modifier, ''),
                    "size": r.size,
                    "encrypted": r.encrypted,
                    "permission": r.permission,
                    "root": '',
                    "head_commit_id": r.head_cmmt_id,
                    "version": r.version,
                    "share_from": r.user,
                    "share_from_name": nickname_dict.get(r.user, ''),
                    "share_from_contact_email": contact_email_dict.get(r.user, ''),
                    "salt": r.salt if r.enc_version >= 3 else '',
                }
                repos_json.append(repo)

        if filter_by['org'] and request.user.permissions.can_view_org():
            public_repos = list_inner_pub_repos(request)

            # Reduce memcache fetch ops.
            share_from_set = {x.user for x in public_repos}
            modifiers_set = {x.last_modifier for x in public_repos}
            for e in modifiers_set | share_from_set:
                if e not in contact_email_dict:
                    contact_email_dict[e] = email2contact_email(e)
                if e not in nickname_dict:
                    nickname_dict[e] = email2nickname(e)

            for r in public_repos:
                if q and q.lower() not in r.name.lower():
                    continue

                repo = {
                    "type": "grepo",
                    "id": r.repo_id,
                    "name": r.repo_name,
                    "owner": "Organization",
                    "mtime": r.last_modified,
                    "mtime_relative": translate_seahub_time(r.last_modified),
                    "modifier_email": r.last_modifier,
                    "modifier_contact_email": contact_email_dict.get(r.last_modifier, ''),
                    "modifier_name": nickname_dict.get(r.last_modifier, ''),
                    "size": r.size,
                    "size_formatted": filesizeformat(r.size),
                    "encrypted": r.encrypted,
                    "permission": r.permission,
                    "share_from": r.user,
                    "share_from_name": nickname_dict.get(r.user, ''),
                    "share_from_contact_email": contact_email_dict.get(r.user, ''),
                    "share_type": r.share_type,
                    "root": '',
                    "head_commit_id": r.head_cmmt_id,
                    "version": r.version,
                    "salt": r.salt if r.enc_version >= 3 else '',
                }
                repos_json.append(repo)

        utc_dt = datetime.datetime.utcnow()
        timestamp = utc_dt.strftime('%Y-%m-%d %H:%M:%S')
        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id

        try:
            seafile_api.publish_event('seahub.stats', 'user-login\t%s\t%s\t%s' % (email, timestamp, org_id))
        except Exception as e:
            logger.error('Error when sending user-login message: %s' % str(e))
        response = HttpResponse(json.dumps(repos_json), status=200,
                                content_type=json_content_type)
        response["enable_encrypted_library"] = config.ENABLE_ENCRYPTED_LIBRARY
        return response

    def post(self, request, format=None):

        if not request.user.permissions.can_add_repo():
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to create library.')

        req_from = request.GET.get('from', "")
        if req_from == 'web':
            gen_sync_token = False  # Do not generate repo sync token
        else:
            gen_sync_token = True

        username = request.user.username
        repo_name = request.data.get("name", None)
        if not repo_name:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Library name is required.')

        if not is_valid_dirent_name(repo_name):
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'name invalid.')

        repo_desc = request.data.get("desc", '')
        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id

        repo_id = request.data.get('repo_id', '')
        try:
            if repo_id:
                # client generates magic and random key
                repo_id, error = self._create_enc_repo(request, repo_id, repo_name, repo_desc, username, org_id)
            else:
                repo_id, error = self._create_repo(request, repo_name, repo_desc, username, org_id)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             'Failed to create library.')
        if error is not None:
            return error
        if not repo_id:
            return api_error(HTTP_520_OPERATION_FAILED,
                             'Failed to create library.')
        else:
            library_template = request.data.get("library_template", '')
            repo_created.send(sender=None,
                              org_id=org_id,
                              creator=username,
                              repo_id=repo_id,
                              repo_name=repo_name,
                              library_template=library_template)
            resp = repo_download_info(request, repo_id,
                                      gen_sync_token=gen_sync_token)

            # FIXME: according to the HTTP spec, need to return 201 code and
            # with a corresponding location header
            # resp['Location'] = reverse('api2-repo', args=[repo_id])
            return resp

    def _create_repo(self, request, repo_name, repo_desc, username, org_id):
        passwd = request.data.get("passwd", None)

        # to avoid 'Bad magic' error when create repo, passwd should be 'None'
        # not an empty string when create unencrypted repo
        if not passwd:
            passwd = None

        if (passwd is not None) and (not config.ENABLE_ENCRYPTED_LIBRARY):
            return None, api_error(status.HTTP_403_FORBIDDEN,
                             'NOT allow to create encrypted library.')

        if org_id and org_id > 0:
            repo_id = seafile_api.create_org_repo(repo_name,
                    repo_desc, username, org_id, passwd,
                    enc_version=settings.ENCRYPTED_LIBRARY_VERSION)
        else:
            if is_pro_version() and ENABLE_STORAGE_CLASSES:

                if STORAGE_CLASS_MAPPING_POLICY in ('USER_SELECT',
                        'ROLE_BASED'):

                    storages = get_library_storages(request)
                    storage_id = request.data.get("storage_id", None)
                    if storage_id and storage_id not in [s['storage_id'] for s in storages]:
                        error_msg = 'storage_id invalid.'
                        return None, api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                    repo_id = seafile_api.create_repo(repo_name,
                            repo_desc, username, passwd,
                            enc_version=settings.ENCRYPTED_LIBRARY_VERSION,
                            storage_id=storage_id )
                else:
                    # STORAGE_CLASS_MAPPING_POLICY == 'REPO_ID_MAPPING'
                    repo_id = seafile_api.create_repo(repo_name,
                            repo_desc, username, passwd,
                            enc_version=settings.ENCRYPTED_LIBRARY_VERSION)
            else:
                repo_id = seafile_api.create_repo(repo_name,
                        repo_desc, username, passwd,
                        enc_version=settings.ENCRYPTED_LIBRARY_VERSION)

        if passwd and ENABLE_RESET_ENCRYPTED_REPO_PASSWORD:
            add_encrypted_repo_secret_key_to_database(repo_id, passwd)

        return repo_id, None

    def _create_enc_repo(self, request, repo_id, repo_name, repo_desc, username, org_id):
        if not config.ENABLE_ENCRYPTED_LIBRARY:
            return None, api_error(status.HTTP_403_FORBIDDEN, 'NOT allow to create encrypted library.')
        if not _REPO_ID_PATTERN.match(repo_id):
            return None, api_error(status.HTTP_400_BAD_REQUEST, 'Repo id must be a valid uuid')
        magic = request.data.get('magic', '')
        random_key = request.data.get('random_key', '')

        try:
            enc_version = int(request.data.get('enc_version', 0))
        except ValueError:
            return None, api_error(status.HTTP_400_BAD_REQUEST,
                             'Invalid enc_version param.')

        if enc_version > settings.ENCRYPTED_LIBRARY_VERSION:
            return None, api_error(status.HTTP_400_BAD_REQUEST,
                             'Invalid enc_version param.')

        salt = None
        if enc_version >= 3 and settings.ENCRYPTED_LIBRARY_VERSION >= 3:
            salt = request.data.get('salt', '')
            if not salt:
                error_msg = 'salt invalid.'
                return None, api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if len(magic) != 64 or len(random_key) != 96 or enc_version < 0:
            return None, api_error(status.HTTP_400_BAD_REQUEST,
                             'You must provide magic, random_key and enc_version.')

        if org_id and org_id > 0:
            repo_id = seafile_api.create_org_enc_repo(repo_id, repo_name, repo_desc,
                                                      username, magic, random_key,
                                                      salt, enc_version, org_id)
        else:
            if is_pro_version() and ENABLE_STORAGE_CLASSES and \
                    STORAGE_CLASS_MAPPING_POLICY == 'ROLE_BASED':

                storages = get_library_storages(request)

                if not storages:
                    logger.error('no library storage found.')
                    repo_id = seafile_api.create_enc_repo(repo_id, repo_name, \
                            repo_desc, username, magic, random_key, \
                            salt, enc_version)
                else:
                    repo_id = seafile_api.create_enc_repo(repo_id, repo_name, \
                            repo_desc, username, magic, random_key, \
                            salt, enc_version, \
                            storage_id=storages[0].get('storage_id', None))
            else:
                repo_id = seafile_api.create_enc_repo(repo_id, repo_name, \
                        repo_desc, username, magic, random_key, \
                        salt, enc_version)

        return repo_id, None


class PubRepos(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        # List public repos
        if not request.user.permissions.can_view_org():
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to view public libraries.')

        repos_json = []
        public_repos = list_inner_pub_repos(request)
        for r in public_repos:
            repo = {
                "id": r.repo_id,
                "name": r.repo_name,
                "owner": r.user,
                "owner_nickname": email2nickname(r.user),
                "owner_name": email2nickname(r.user),
                "mtime": r.last_modified,
                "mtime_relative": translate_seahub_time(r.last_modified),
                "size": r.size,
                "size_formatted": filesizeformat(r.size),
                "encrypted": r.encrypted,
                "permission": r.permission,
            }
            repos_json.append(repo)

        return Response(repos_json)

    def post(self, request, format=None):
        # Create public repo
        if not request.user.permissions.can_add_public_repo():
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to create library.')

        username = request.user.username
        repo_name = request.data.get("name", None)
        if not repo_name:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Library name is required.')
        repo_desc = request.data.get("desc", '')
        passwd = request.data.get("passwd", None)

        # to avoid 'Bad magic' error when create repo, passwd should be 'None'
        # not an empty string when create unencrypted repo
        if not passwd:
            passwd = None

        if (passwd is not None) and (not config.ENABLE_ENCRYPTED_LIBRARY):
            return api_error(status.HTTP_403_FORBIDDEN,
                             'NOT allow to create encrypted library.')

        permission = request.data.get("permission", 'r')
        if permission != 'r' and permission != 'rw':
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid permission')

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id
            repo_id = seafile_api.create_org_repo(repo_name, repo_desc,
                                                  username, org_id, passwd,
                                                  enc_version=settings.ENCRYPTED_LIBRARY_VERSION)
            repo = seafile_api.get_repo(repo_id)
            seafile_api.set_org_inner_pub_repo(org_id, repo.id, permission)
        else:
            if is_pro_version() and ENABLE_STORAGE_CLASSES:

                if STORAGE_CLASS_MAPPING_POLICY in ('USER_SELECT',
                        'ROLE_BASED'):

                    storages = get_library_storages(request)
                    storage_id = request.data.get("storage_id", None)
                    if storage_id and storage_id not in [s['storage_id'] for s in storages]:
                        error_msg = 'storage_id invalid.'
                        return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                    repo_id = seafile_api.create_repo(repo_name,
                            repo_desc, username, passwd,
                            enc_version=settings.ENCRYPTED_LIBRARY_VERSION,
                            storage_id=storage_id)
                else:
                    # STORAGE_CLASS_MAPPING_POLICY == 'REPO_ID_MAPPING'
                    repo_id = seafile_api.create_repo(repo_name,
                            repo_desc, username, passwd,
                            enc_version=settings.ENCRYPTED_LIBRARY_VERSION)
            else:
                repo_id = seafile_api.create_repo(repo_name,
                        repo_desc, username, passwd,
                        enc_version=settings.ENCRYPTED_LIBRARY_VERSION)

            repo = seafile_api.get_repo(repo_id)
            seafile_api.add_inner_pub_repo(repo.id, permission)

        try:
            send_perm_audit_msg('add-repo-perm',
                    username, 'all', repo_id, '/', permission)
        except Exception as e:
            logger.error(e)


        library_template = request.data.get("library_template", '')
        repo_created.send(sender=None,
                          org_id=org_id,
                          creator=username,
                          repo_id=repo_id,
                          repo_name=repo_name,
                          library_template=library_template)
        pub_repo = {
            "id": repo.id,
            "name": repo.name,
            "desc": repo.desc,
            "size": repo.size,
            "size_formatted": filesizeformat(repo.size),
            "mtime": repo.last_modify,
            "mtime_relative": translate_seahub_time(repo.last_modify),
            "encrypted": repo.encrypted,
            "permission": 'rw',  # Always have read-write permission to owned repo
            "owner": username,
            "owner_nickname": email2nickname(username),
            "owner_name": email2nickname(username),
        }

        return Response(pub_repo, status=201)

def set_repo_password(request, repo, password):
    assert password, 'password must not be none'

    repo_id = repo.id
    try:
        seafile_api.set_passwd(repo_id, request.user.username, password)

        if ENABLE_RESET_ENCRYPTED_REPO_PASSWORD:
            add_encrypted_repo_secret_key_to_database(repo_id, password)

    except SearpcError as e:
        if e.msg == 'Bad arguments':
            return api_error(status.HTTP_400_BAD_REQUEST, e.msg)
        elif e.msg == 'Repo is not encrypted':
            return api_error(status.HTTP_409_CONFLICT, e.msg)
        elif e.msg == 'Incorrect password':
            return api_error(status.HTTP_400_BAD_REQUEST, e.msg)
        elif e.msg == 'Internal server error':
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, e.msg)
        else:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, e.msg)


def check_set_repo_password(request, repo):
    if not check_permission(repo.id, request.user.username):
        return api_error(status.HTTP_403_FORBIDDEN,
                'You do not have permission to access this library.')

    if repo.encrypted:
        password = request.POST.get('password', default=None)
        if not password:
            return api_error(HTTP_440_REPO_PASSWD_REQUIRED,
                             'Library password is needed.')

        return set_repo_password(request, repo, password)


class Repo(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        username = request.user.username
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to access this library.')

        # check whether user is repo owner
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo.id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo.id)
        owner = "self" if username == repo_owner else "share"

        last_commit = get_commits(repo.id, 0, 1)[0]
        repo.latest_modify = last_commit.ctime if last_commit else None

        # query repo infomation
        repo.size = seafile_api.get_repo_size(repo_id)
        current_commit = get_commits(repo_id, 0, 1)[0]
        root_id = current_commit.root_id if current_commit else None

        repo_json = {
            "type": "repo",
            "id": repo.id,
            "owner": owner,
            "name": repo.name,
            "mtime": repo.latest_modify,
            "size": repo.size,
            "encrypted": repo.encrypted,
            "root": root_id,
            "permission": check_permission(repo.id, username),
            "modifier_email": repo.last_modifier,
            "modifier_contact_email": email2contact_email(repo.last_modifier),
            "modifier_name": email2nickname(repo.last_modifier),
            "file_count": repo.file_count,
            }
        if repo.encrypted:
            repo_json["enc_version"] = repo.enc_version
            repo_json["salt"] = repo.salt if repo.enc_version >= 3 else ''
            repo_json["magic"] = repo.magic
            repo_json["random_key"] = repo.random_key

        return Response(repo_json)

    def post(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        op = request.GET.get('op', 'setpassword')
        if op == 'checkpassword':
            magic = request.GET.get('magic', default=None)
            if not magic:
                return api_error(HTTP_441_REPO_PASSWD_MAGIC_REQUIRED,
                                 'Library password magic is needed.')

            if not check_folder_permission(request, repo_id, '/'):
                return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

            try:
                seafile_api.check_passwd(repo.id, magic)
            except SearpcError as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "SearpcError:" + e.msg)
            return Response("success")
        elif op == 'setpassword':
            resp = check_set_repo_password(request, repo)
            if resp:
                return resp
            return Response("success")
        elif op == 'rename':
            username = request.user.username
            repo_name = request.POST.get('repo_name')
            repo_desc = request.POST.get('repo_desc')

            if not is_valid_dirent_name(repo_name):
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'name invalid.')

            # check permission
            if is_org_context(request):
                repo_owner = seafile_api.get_org_repo_owner(repo.id)
            else:
                repo_owner = seafile_api.get_repo_owner(repo.id)
            is_owner = True if username == repo_owner else False
            if not is_owner:
                return api_error(status.HTTP_403_FORBIDDEN,
                        'You do not have permission to rename this library.')

            # check repo status
            repo_status = repo.status
            if repo_status != 0:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if edit_repo(repo_id, repo_name, repo_desc, username):
                return Response("success")
            else:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "Unable to rename library")

        return Response("unsupported operation")

    def delete(self, request, repo_id, format=None):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check permission
        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id
            repo_owner = seafile_api.get_org_repo_owner(repo.id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo.id)

        username = request.user.username
        if username != repo_owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            usernames = get_related_users_by_repo(repo_id, org_id)
        except Exception as e:
            logger.error(e)
            usernames = []

        # remove repo
        seafile_api.remove_repo(repo_id)

        repo_deleted.send(sender=None,
                          org_id=org_id,
                          operator=username,
                          usernames=usernames,
                          repo_owner=repo_owner,
                          repo_id=repo_id,
                          repo_name=repo.name)
        return Response('success', status=status.HTTP_200_OK)

class RepoHistory(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            current_page = 1
            per_page = 25

        commits_all = get_commits(repo_id, per_page * (current_page - 1),
                                  per_page + 1)
        commits = commits_all[:per_page]

        if len(commits_all) == per_page + 1:
            page_next = True
        else:
            page_next = False

        return HttpResponse(json.dumps({"commits": commits,
                                        "page_next": page_next},
                                       cls=SearpcObjEncoder),
                            status=200, content_type=json_content_type)

class RepoHistoryLimit(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check permission
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        username = request.user.username
        # no settings for virtual repo
        if repo.is_virtual:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if '@seafile_group' in repo_owner:
            group_id = get_group_id_by_repo_owner(repo_owner)
            if not is_group_admin(group_id, username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        else:
            if username != repo_owner:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            keep_days = seafile_api.get_repo_history_limit(repo_id)
            return Response({'keep_days': keep_days})
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    def put(self, request, repo_id, format=None):

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check permission
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        username = request.user.username
        # no settings for virtual repo
        if repo.is_virtual or not config.ENABLE_REPO_HISTORY_SETTING:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if '@seafile_group' in repo_owner:
            group_id = get_group_id_by_repo_owner(repo_owner)
            if not is_group_admin(group_id, username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        else:
            if username != repo_owner:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check arg validation
        keep_days = request.data.get('keep_days', None)
        if not keep_days:
            error_msg = 'keep_days invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            keep_days = int(keep_days)
        except ValueError:
            error_msg = 'keep_days invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            # days <= -1, keep full history
            # days = 0, not keep history
            # days > 0, keep a period of days
            res = seafile_api.set_repo_history_limit(repo_id, keep_days)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if res == 0:
            new_limit = seafile_api.get_repo_history_limit(repo_id)
            return Response({'keep_days': new_limit})
        else:
            error_msg = 'Failed to set library history limit.'
            return api_error(status.HTTP_520_OPERATION_FAILED, error_msg)


class DownloadRepo(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        perm = check_folder_permission(request, repo_id, '/')
        if not perm:
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to access this library.')

        username = request.user.username
        if not seafile_api.is_repo_syncable(repo_id, username, perm):
            return api_error(status.HTTP_403_FORBIDDEN,
                             'unsyncable share permission')

        return repo_download_info(request, repo_id)


class RepoOwner(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        # check permission
        if org_id:
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if request.user.username != repo_owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        return HttpResponse(json.dumps({"owner": repo_owner}), status=200,
                            content_type=json_content_type)

    def put(self, request, repo_id, format=None):
        """ Currently only for transfer repo.

        Permission checking:
        1. only repo owner can transfer repo.
        """

        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        # argument check
        new_owner = request.data.get('owner', '').lower()
        if not new_owner:
            error_msg = 'owner invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            new_owner_obj = User.objects.get(email=new_owner)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % new_owner
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        if org_id:
            # transfer to department
            if '@seafile_group' in new_owner:
                group_id = get_group_id_by_repo_owner(new_owner)
                if not is_group_admin(group_id, username):
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)
            # transfer to org user
            else:
                if not ccnet_api.org_user_exists(org_id, new_owner):
                    error_msg = _('User %s not found in organization.') % new_owner
                    return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if org_id:
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if username != repo_owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not new_owner_obj.permissions.can_add_repo():
            error_msg = _('Transfer failed: role of %s is %s, can not add library.') % \
                    (new_owner, new_owner_obj.role)
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if new_owner == repo_owner:
            error_msg = _("Library can not be transferred to owner.")
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        pub_repos = []
        if org_id:
            # get repo shared to user/group list
            shared_users = seafile_api.list_org_repo_shared_to(org_id,
                    repo_owner, repo_id)
            shared_groups = seafile_api.list_org_repo_shared_group(org_id,
                    repo_owner, repo_id)

            # get all org pub repos
            pub_repos = seaserv.seafserv_threaded_rpc.list_org_inner_pub_repos_by_owner(
                    org_id, repo_owner)
        else:
            # get repo shared to user/group list
            shared_users = seafile_api.list_repo_shared_to(
                    repo_owner, repo_id)
            shared_groups = seafile_api.list_repo_shared_group_by_user(
                    repo_owner, repo_id)

            # get all pub repos
            if not request.cloud_mode:
                pub_repos = seafile_api.list_inner_pub_repos_by_owner(repo_owner)

        # transfer repo
        try:
            if org_id:
                if '@seafile_group' in new_owner:
                    group_id = int(new_owner.split('@')[0])
                    seafile_api.org_transfer_repo_to_group(repo_id, org_id, group_id, PERMISSION_READ_WRITE)
                else:
                    seafile_api.set_org_repo_owner(org_id, repo_id, new_owner)
            else:
                if ccnet_api.get_orgs_by_user(new_owner):
                    # can not transfer library to organization user %s.
                    error_msg = 'Email %s invalid.' % new_owner
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
                else:
                    if '@seafile_group' in new_owner:
                        group_id = int(new_owner.split('@')[0])
                        seafile_api.transfer_repo_to_group(repo_id, group_id, PERMISSION_READ_WRITE)
                    else:
                        seafile_api.set_repo_owner(repo_id, new_owner)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # reshare repo to user
        for shared_user in shared_users:
            shared_username = shared_user.user

            if new_owner == shared_username:
                continue

            if org_id:
                seaserv.seafserv_threaded_rpc.org_add_share(org_id, repo_id,
                        new_owner, shared_username, shared_user.perm)
            else:
                seafile_api.share_repo(repo_id, new_owner,
                        shared_username, shared_user.perm)

        # reshare repo to group
        for shared_group in shared_groups:
            shared_group_id = shared_group.group_id

            if ('@seafile_group' not in new_owner) and\
                    (not is_group_member(shared_group_id, new_owner)):
                continue

            if org_id:
                seafile_api.add_org_group_repo(repo_id, org_id,
                        shared_group_id, new_owner, shared_group.perm)
            else:
                seafile_api.set_group_repo(repo_id, shared_group_id,
                        new_owner, shared_group.perm)

        # reshare repo to links
        try:
            UploadLinkShare.objects.filter(username=username, repo_id=repo_id).update(username=new_owner)
            FileShare.objects.filter(username=username, repo_id=repo_id).update(username=new_owner)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # check if current repo is pub-repo
        # if YES, reshare current repo to public
        for pub_repo in pub_repos:
            if repo_id != pub_repo.id:
                continue

            if org_id:
                seafile_api.set_org_inner_pub_repo(org_id, repo_id,
                        pub_repo.permission)
            else:
                seaserv.seafserv_threaded_rpc.set_inner_pub_repo(
                        repo_id, pub_repo.permission)

            break

        # send a signal when successfully transfered repo
        try:
            repo_transfer.send(sender=None, org_id=org_id,
                    repo_owner=repo_owner, to_user=new_owner, repo_id=repo_id,
                    repo_name=repo.name)
        except Exception as e:
            logger.error(e)

        return HttpResponse(json.dumps({'success': True}),
                content_type=json_content_type)

########## File related
class FileBlockDownloadLinkView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, file_id, block_id, format=None):
        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir = request.GET.get('p', '/')
        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, parent_dir) is None:
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to access this repo.')

        if check_quota(repo_id) < 0:
            return api_error(HTTP_443_ABOVE_QUOTA, _("Out of quota."))

        token = seafile_api.get_fileserver_access_token(
                repo_id, file_id, 'downloadblks', request.user.username)

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        url = gen_block_get_url(token, block_id)
        return Response(url)

class UploadLinkView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):
        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir = request.GET.get('p', '/')
        if not parent_dir:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_upload is False:
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to access this folder.')

        if check_quota(repo_id) < 0:
            return api_error(HTTP_443_ABOVE_QUOTA, _("Out of quota."))

        obj_id = json.dumps({'parent_dir': parent_dir})
        token = seafile_api.get_fileserver_access_token(repo_id,
                obj_id, 'upload', request.user.username, use_onetime=False)

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        req_from = request.GET.get('from', 'api')
        if req_from == 'api':
            try:
                replace = to_python_boolean(request.GET.get('replace', '0'))
                if 'custom' in check_folder_permission(request, repo_id, parent_dir):
                    replace = False
            except ValueError:
                replace = False
            url = gen_file_upload_url(token, 'upload-api', replace)
        elif req_from == 'web':
            url = gen_file_upload_url(token, 'upload-aj')
        else:
            error_msg = 'from invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return Response(url)

class UpdateLinkView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):
        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir = request.GET.get('p', '/')
        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        perm = check_folder_permission(request, repo_id, parent_dir)
        if parse_repo_perm(perm).can_edit_on_web is False:
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to access this folder.')

        if check_quota(repo_id) < 0:
            return api_error(HTTP_443_ABOVE_QUOTA, _("Out of quota."))

        token = seafile_api.get_fileserver_access_token(repo_id,
                'dummy', 'update', request.user.username, use_onetime=False)

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        req_from = request.GET.get('from', 'api')
        if req_from == 'api':
            url = gen_file_upload_url(token, 'update-api')
        elif req_from == 'web':
            url = gen_file_upload_url(token, 'update-aj')
        else:
            error_msg = 'from invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return Response(url)

class UploadBlksLinkView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir = request.GET.get('p', '/')
        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, parent_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to access this folder.')

        if check_quota(repo_id) < 0:
            return api_error(HTTP_443_ABOVE_QUOTA, _("Out of quota."))

        obj_id = json.dumps({'parent_dir': parent_dir})
        token = seafile_api.get_fileserver_access_token(repo_id,
                obj_id, 'upload-blks-api', request.user.username, use_onetime=False)

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        url = gen_file_upload_url(token, 'upload-blks-api')
        return Response(url)


    def get_blklist_missing(self, repo_id, blks):
        if not blks:
            return []

        blklist = blks.split(',')
        try:
            return json.loads(seafile_api.check_repo_blocks_missing(
                repo_id, json.dumps(blklist)))
        except Exception as e:
            pass

        return blklist

    def post(self, request, repo_id, format=None):
        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir = request.GET.get('p', '/')
        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, parent_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to access this folder.')

        if check_quota(repo_id) < 0:
            return api_error(HTTP_443_ABOVE_QUOTA, _("Out of quota."))

        obj_id = json.dumps({'parent_dir': parent_dir})
        token = seafile_api.get_fileserver_access_token(repo_id,
                obj_id, 'upload', request.user.username, use_onetime=False)

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        blksurl = gen_file_upload_url(token, 'upload-raw-blks-api')
        commiturl = '%s?commitonly=true&ret-json=true' %  gen_file_upload_url(
            token, 'upload-blks-api')
        blks = request.POST.get('blklist', None)
        blklist = self.get_blklist_missing(repo_id, blks)
        res = {
            'rawblksurl': blksurl,
            'commiturl': commiturl,
            'blklist': blklist
        }

        return HttpResponse(json.dumps(res), status=200,
                            content_type=json_content_type)


class UpdateBlksLinkView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir = request.GET.get('p', '/')
        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, parent_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to access this folder.')

        if check_quota(repo_id) < 0:
            return api_error(HTTP_443_ABOVE_QUOTA, _("Out of quota."))

        token = seafile_api.get_fileserver_access_token(repo_id,
                'dummy', 'update-blks-api', request.user.username, use_onetime=False)

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        url = gen_file_upload_url(token, 'update-blks-api')
        return Response(url)

def get_dir_file_recursively(username, repo_id, path, all_dirs):
    is_pro = is_pro_version()
    path_id = seafile_api.get_dir_id_by_path(repo_id, path)
    dirs = seafile_api.list_dir_with_perm(repo_id, path,
            path_id, username, -1, -1)

    for dirent in dirs:

        if dirent.permission == PERMISSION_INVISIBLE:
            continue

        entry = {}
        if stat.S_ISDIR(dirent.mode):
            entry["type"] = 'dir'
        else:
            entry["type"] = 'file'
            entry['modifier_email'] = dirent.modifier
            entry["size"] = dirent.size

            if is_pro:
                entry["is_locked"] = dirent.is_locked
                entry["lock_owner"] = dirent.lock_owner
                if dirent.lock_owner:
                    entry["lock_owner_name"] = email2nickname(dirent.lock_owner)
                entry["lock_time"] = dirent.lock_time
                if username == dirent.lock_owner:
                    entry["locked_by_me"] = True
                else:
                    entry["locked_by_me"] = False

        entry["parent_dir"] = path
        entry["id"] = dirent.obj_id
        entry["name"] = dirent.obj_name
        entry["mtime"] = dirent.mtime
        entry["permission"] = dirent.permission

        all_dirs.append(entry)

        # Use dict to reduce memcache fetch cost in large for-loop.
        file_list =  [item for item in all_dirs if item['type'] == 'file']
        contact_email_dict = {}
        nickname_dict = {}
        modifiers_set = {x['modifier_email'] for x in file_list}
        for e in modifiers_set:
            if e not in contact_email_dict:
                contact_email_dict[e] = email2contact_email(e)
            if e not in nickname_dict:
                nickname_dict[e] = email2nickname(e)

        for e in file_list:
            e['modifier_contact_email'] = contact_email_dict.get(e['modifier_email'], '')
            e['modifier_name'] = nickname_dict.get(e['modifier_email'], '')


        if stat.S_ISDIR(dirent.mode):
            sub_path = posixpath.join(path, dirent.obj_name)
            get_dir_file_recursively(username, repo_id, sub_path, all_dirs)

    return all_dirs

def get_dir_entrys_by_id(request, repo, path, dir_id, request_type=None):
    """ Get dirents in a dir

    if request_type is 'f', only return file list,
    if request_type is 'd', only return dir list,
    else, return both.
    """
    username = request.user.username
    try:
        dirs = seafile_api.list_dir_with_perm(repo.id, path, dir_id,
                username, -1, -1)
        dirs = dirs if dirs else []
    except SearpcError as e:
        logger.error(e)
        return api_error(HTTP_520_OPERATION_FAILED,
                         "Failed to list dir.")

    dir_list, file_list = [], []
    for dirent in dirs:

        if dirent.permission == PERMISSION_INVISIBLE:
            continue

        entry = {}
        if stat.S_ISDIR(dirent.mode):
            dtype = "dir"
        else:
            dtype = "file"
            entry['modifier_email'] = dirent.modifier
            if repo.version == 0:
                entry["size"] = get_file_size(repo.store_id, repo.version,
                                              dirent.obj_id)
            else:
                entry["size"] = dirent.size
            if is_pro_version():
                entry["is_locked"] = dirent.is_locked
                entry["lock_owner"] = dirent.lock_owner
                if dirent.lock_owner:
                    entry["lock_owner_name"] = email2nickname(dirent.lock_owner)
                entry["lock_time"] = dirent.lock_time
                if username == dirent.lock_owner:
                    entry["locked_by_me"] = True
                else:
                    entry["locked_by_me"] = False

        entry["type"] = dtype
        entry["name"] = dirent.obj_name
        entry["id"] = dirent.obj_id
        entry["mtime"] = dirent.mtime
        entry["permission"] = dirent.permission
        if dtype == 'dir':
            dir_list.append(entry)
        else:
            file_list.append(entry)

    # Use dict to reduce memcache fetch cost in large for-loop.
    contact_email_dict = {}
    nickname_dict = {}
    modifiers_set = {x['modifier_email'] for x in file_list}
    for e in modifiers_set:
        if e not in contact_email_dict:
            contact_email_dict[e] = email2contact_email(e)
        if e not in nickname_dict:
            nickname_dict[e] = email2nickname(e)

    starred_files = get_dir_starred_files(username, repo.id, path)
    files_tags_in_dir = get_files_tags_in_dir(repo.id, path)

    for e in file_list:
        e['modifier_contact_email'] = contact_email_dict.get(e['modifier_email'], '')
        e['modifier_name'] = nickname_dict.get(e['modifier_email'], '')

        file_tags = files_tags_in_dir.get(e['name'])
        if file_tags:
            e['file_tags'] = []
            for file_tag in file_tags:
                e['file_tags'].append(file_tag)
        file_path = posixpath.join(path, e['name'])
        e['starred'] = False
        if normalize_file_path(file_path) in starred_files:
            e['starred'] = True

    dir_list.sort(key=lambda x: x['name'].lower())
    file_list.sort(key=lambda x: x['name'].lower())

    if request_type == 'f':
        dentrys = file_list
    elif request_type == 'd':
        dentrys = dir_list
    else:
        dentrys = dir_list + file_list

    response = HttpResponse(json.dumps(dentrys), status=200,
                            content_type=json_content_type)
    response["oid"] = dir_id
    response["dir_perm"] = seafile_api.check_permission_by_path(repo.id, path, username)
    return response

def get_shared_link(request, repo_id, path):
    l = FileShare.objects.filter(repo_id=repo_id).filter(
        username=request.user.username).filter(path=path)
    token = None
    if len(l) > 0:
        fileshare = l[0]
        token = fileshare.token
    else:
        token = gen_token(max_length=10)

        fs = FileShare()
        fs.username = request.user.username
        fs.repo_id = repo_id
        fs.path = path
        fs.token = token

        try:
            fs.save()
        except IntegrityError as e:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, e.msg)

    http_or_https = request.is_secure() and 'https' or 'http'
    domain = get_current_site(request).domain
    file_shared_link = '%s://%s%sf/%s/' % (http_or_https, domain,
                                           settings.SITE_ROOT, token)
    return file_shared_link

def get_repo_file(request, repo_id, file_id, file_name, op,
                  use_onetime=dj_settings.FILESERVER_TOKEN_ONCE_ONLY):
    if op == 'download':
        token = seafile_api.get_fileserver_access_token(repo_id,
                file_id, op, request.user.username, use_onetime)

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        redirect_url = gen_file_get_url(token, file_name)
        response = HttpResponse(json.dumps(redirect_url), status=200,
                                content_type=json_content_type)
        response["oid"] = file_id
        return response

    if op == 'downloadblks':
        blklist = []
        encrypted = False
        enc_version = 0
        if file_id != EMPTY_SHA1:
            try:
                blks = seafile_api.list_blocks_by_file_id(repo_id, file_id)
                blklist = blks.split('\n')
            except SearpcError as e:
                logger.error(e)
                return api_error(HTTP_520_OPERATION_FAILED,
                                 'Failed to get file block list')
        blklist = [i for i in blklist if len(i) == 40]
        if len(blklist) > 0:
            repo = get_repo(repo_id)
            encrypted = repo.encrypted
            enc_version = repo.enc_version

        res = {
            'file_id': file_id,
            'blklist': blklist,
            'encrypted': encrypted,
            'enc_version': enc_version,
            }
        response = HttpResponse(json.dumps(res), status=200,
                                content_type=json_content_type)
        response["oid"] = file_id
        return response

    if op == 'sharelink':
        path = request.GET.get('p', None)
        if path is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        file_shared_link = get_shared_link(request, repo_id, path)
        return Response(file_shared_link)

def reloaddir(request, repo, parent_dir):
    try:
        dir_id = seafile_api.get_dir_id_by_path(repo.id, parent_dir)
    except SearpcError as e:
        logger.error(e)
        return api_error(HTTP_520_OPERATION_FAILED,
                         "Failed to get dir id by path")

    if not dir_id:
        return api_error(status.HTTP_404_NOT_FOUND, "Path does not exist")

    return get_dir_entrys_by_id(request, repo, parent_dir, dir_id)

def reloaddir_if_necessary(request, repo, parent_dir, obj_info=None):

    reload_dir = False
    s = request.GET.get('reloaddir', None)
    if s and s.lower() == 'true':
        reload_dir = True

    if not reload_dir:
        if obj_info:
            return Response(obj_info)
        else:
            return Response('success')

    return reloaddir(request, repo, parent_dir)

# deprecated
class OpDeleteView(APIView):
    """
    Delete files.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )

    def post(self, request, repo_id, format=None):

        parent_dir = request.GET.get('p')
        file_names = request.POST.get("file_names")
        if not parent_dir or not file_names:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'File or directory not found.')

        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        username = request.user.username
        if check_folder_permission(request, repo_id, parent_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to delete this file.')

        allowed_file_names = []
        locked_files = get_locked_files_by_dir(request, repo_id, parent_dir)
        for file_name in file_names.split(':'):
            if file_name not in list(locked_files.keys()):
                # file is not locked
                allowed_file_names.append(file_name)
            elif locked_files[file_name] == username:
                # file is locked by current user
                allowed_file_names.append(file_name)

        try:
            seafile_api.del_file(repo_id, parent_dir,
                                 json.dumps(allowed_file_names),
                                 username)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to delete file.")

        return reloaddir_if_necessary(request, repo, parent_dir)

class OpMoveView(APIView):
    """
    Move files.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )

    def post(self, request, repo_id, format=None):

        username = request.user.username
        parent_dir = request.GET.get('p', '/')
        dst_repo = request.POST.get('dst_repo', None)
        dst_dir = request.POST.get('dst_dir', None)
        obj_names = request.POST.get("file_names", None)

        # argument check
        if not parent_dir or not obj_names or not dst_repo or not dst_dir:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Missing argument.')

        if repo_id == dst_repo and parent_dir == dst_dir:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'The destination directory is the same as the source.')

        # src resource check
        repo = get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(repo_id, parent_dir):
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # dst resource check
        if not get_repo(dst_repo):
            error_msg = 'Library %s not found.' % dst_repo
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(dst_repo, dst_dir):
            error_msg = 'Folder %s not found.' % dst_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, parent_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to move file in this folder.')

        if check_folder_permission(request, dst_repo, dst_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to move file to destination folder.')

        allowed_obj_names = []
        locked_files = get_locked_files_by_dir(request, repo_id, parent_dir)
        for file_name in obj_names.split(':'):
            if file_name not in list(locked_files.keys()):
                # file is not locked
                allowed_obj_names.append(file_name)
            elif locked_files[file_name] == username:
                # file is locked by current user
                allowed_obj_names.append(file_name)

        # check if all file/dir existes
        obj_names = allowed_obj_names
        dirents = seafile_api.list_dir_by_path(repo_id, parent_dir)
        exist_obj_names = [dirent.obj_name for dirent in dirents]
        if not set(obj_names).issubset(exist_obj_names):
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'file_names invalid.')

        # only check quota when move file/dir between different user's repo
        if get_repo_owner(request, repo_id) != get_repo_owner(request, dst_repo):
            # get total size of file/dir to be copied
            total_size = 0
            for obj_name in obj_names:

                current_size = 0
                current_path = posixpath.join(parent_dir, obj_name)

                current_file_id = seafile_api.get_file_id_by_path(repo_id,
                        current_path)
                if current_file_id:
                    current_size = seafile_api.get_file_size(repo.store_id,
                            repo.version, current_file_id)

                total_size += current_size

            # check if above quota for dst repo
            if seafile_api.check_quota(dst_repo, total_size) < 0:
                return api_error(HTTP_443_ABOVE_QUOTA, _("Out of quota."))

        # make new name
        dst_dirents = seafile_api.list_dir_by_path(dst_repo, dst_dir)
        dst_obj_names = [dirent.obj_name for dirent in dst_dirents]

        new_obj_names = []
        for obj_name in obj_names:
            new_obj_name = get_no_duplicate_obj_name(obj_name, dst_obj_names)
            new_obj_names.append(new_obj_name)

        # move file
        try:
            seafile_api.move_file(repo_id, parent_dir,
                                  json.dumps(obj_names),
                                  dst_repo, dst_dir,
                                  json.dumps(new_obj_names),
                                  replace=False, username=username,
                                  need_progress=0, synchronous=1)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to move file.")

        obj_info_list = []
        for new_obj_name in new_obj_names:
            obj_info = {}
            obj_info['repo_id'] = dst_repo
            obj_info['parent_dir'] = dst_dir
            obj_info['obj_name'] = new_obj_name
            obj_info_list.append(obj_info)

        return reloaddir_if_necessary(request, repo, parent_dir, obj_info_list)


class OpCopyView(APIView):
    """
    Copy files.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )

    def post(self, request, repo_id, format=None):

        username = request.user.username
        parent_dir = request.GET.get('p', '/')
        dst_repo = request.POST.get('dst_repo', None)
        dst_dir = request.POST.get('dst_dir', None)
        obj_names = request.POST.get("file_names", None)

        # argument check
        if not parent_dir or not obj_names or not dst_repo or not dst_dir:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Missing argument.')

        # src resource check
        repo = get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(repo_id, parent_dir):
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # dst resource check
        if not get_repo(dst_repo):
            error_msg = 'Library %s not found.' % dst_repo
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(dst_repo, dst_dir):
            error_msg = 'Folder %s not found.' % dst_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_copy is False:
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to copy file of this folder.')

        if check_folder_permission(request, dst_repo, dst_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to copy file to destination folder.')

        # check if all file/dir existes
        obj_names = obj_names.strip(':').split(':')
        dirents = seafile_api.list_dir_by_path(repo_id, parent_dir)
        exist_obj_names = [dirent.obj_name for dirent in dirents]
        if not set(obj_names).issubset(exist_obj_names):
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'file_names invalid.')

        # get total size of file/dir to be copied
        total_size = 0
        for obj_name in obj_names:

            current_size = 0
            current_path = posixpath.join(parent_dir, obj_name)

            current_file_id = seafile_api.get_file_id_by_path(repo_id,
                    current_path)
            if current_file_id:
                current_size = seafile_api.get_file_size(repo.store_id,
                        repo.version, current_file_id)

            total_size += current_size

        # check if above quota for dst repo
        if seafile_api.check_quota(dst_repo, total_size) < 0:
            return api_error(HTTP_443_ABOVE_QUOTA, _("Out of quota."))

        # make new name
        dst_dirents = seafile_api.list_dir_by_path(dst_repo, dst_dir)
        dst_obj_names = [dirent.obj_name for dirent in dst_dirents]

        new_obj_names = []
        for obj_name in obj_names:
            new_obj_name = get_no_duplicate_obj_name(obj_name, dst_obj_names)
            new_obj_names.append(new_obj_name)

        # copy file
        try:
            seafile_api.copy_file(repo_id, parent_dir,
                                  json.dumps(obj_names),
                                  dst_repo, dst_dir,
                                  json.dumps(new_obj_names),
                                  username, 0, synchronous=1)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to copy file.")

        obj_info_list = []
        for new_obj_name in new_obj_names:
            obj_info = {}
            obj_info['repo_id'] = dst_repo
            obj_info['parent_dir'] = dst_dir
            obj_info['obj_name'] = new_obj_name
            obj_info_list.append(obj_info)

        return reloaddir_if_necessary(request, repo, parent_dir, obj_info_list)


class StarredFileView(APIView):
    """
    Support uniform interface for starred file operation,
    including add/delete/list starred files.
    """

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        # list starred files
        personal_files = UserStarredFiles.objects.get_starred_files_by_username(
            request.user.username)
        starred_files = prepare_starred_files(personal_files)
        return Response(starred_files)

    def post(self, request, format=None):
        # add starred file
        repo_id = request.POST.get('repo_id', '')
        path = request.POST.get('p', '')

        if not (repo_id and path):
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Library ID or path is missing.')

        if check_folder_permission(request, repo_id, path) is None:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied')

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, "File not found")

        if path[-1] == '/':     # Should not contain '/' at the end of path.
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid file path.')

        star_file(request.user.username, repo_id, path, is_dir=False,
                  org_id=-1)

        resp = Response('success', status=status.HTTP_201_CREATED)
        resp['Location'] = reverse('starredfiles')

        return resp

    def delete(self, request, format=None):
        # remove starred file
        repo_id = request.GET.get('repo_id', '')
        path = request.GET.get('p', '')

        if not (repo_id and path):
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Library ID or path is missing.')

        if check_folder_permission(request, repo_id, path) is None:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied')

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, "File not found")

        if path[-1] == '/':     # Should not contain '/' at the end of path.
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid file path.')

        unstar_file(request.user.username, repo_id, path)
        return Response('success', status=status.HTTP_200_OK)

class OwaFileView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        """ Get action url and access token when view file through Office Web App
        """

        # check args
        repo = get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        action = request.GET.get('action', 'view')
        if action not in ('view', 'edit'):
            error_msg = 'action invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = request.GET.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check permission
        if not is_pro_version():
            error_msg = 'Office Web App feature only supported in professional edition.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if check_folder_permission(request, repo_id, path) is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if repo.encrypted:
            error_msg = 'Library encrypted.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not ENABLE_OFFICE_WEB_APP:
            error_msg = 'Office Web App feature not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        filename = os.path.basename(path)
        filetype, fileext = get_file_type_and_ext(filename)
        if fileext not in OFFICE_WEB_APP_FILE_EXTENSION:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # get wopi dict
        username = request.user.username
        wopi_dict = get_wopi_dict(username, repo_id, path,
                action_name=action, language_code=request.LANGUAGE_CODE)

        # send stats message
        send_file_access_msg(request, repo, path, 'api')
        return Response(wopi_dict)


class DevicesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        """ List user's devices.

        Permission checking:
        1. All authenticated users.
        """

        username = request.user.username
        devices = TokenV2.objects.get_user_devices(username)

        for device in devices:
            device['last_accessed'] = datetime_to_isoformat_timestr(device['last_accessed'])
            device['is_desktop_client'] = False
            if device['platform'] in DESKTOP_PLATFORMS:
                device['is_desktop_client'] = True

        return Response(devices)

    def delete(self, request, format=None):

        platform = request.data.get('platform', '')
        device_id = request.data.get('device_id', '')
        remote_wipe = request.data.get('wipe_device', '')

        if not platform:
            error_msg = 'platform invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not device_id:
            error_msg = 'device_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        remote_wipe = True if remote_wipe == 'true' else False

        try:
            do_unlink_device(request.user.username,
                             platform,
                             device_id,
                             remote_wipe=remote_wipe)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class FileMetaDataView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        # file metadata
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        path = request.GET.get('p', None)
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        parent_dir = os.path.dirname(path)
        if check_folder_permission(request, repo_id, parent_dir) is None:
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to access this file.')

        file_id = None
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to get file id by path.")

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, "File not found")

        return Response({
            'id': file_id,
        })


class FileView(APIView):
    """
    Support uniform interface for file related operations,
    including create/delete/rename/view, etc.
    """

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        # view file
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        path = request.GET.get('p', None)
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        parent_dir = os.path.dirname(path)
        if check_folder_permission(request, repo_id, parent_dir) is None:
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to access this file.')

        file_id = None
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to get file id by path.")

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, "File not found")

        # send stats message
        send_file_access_msg(request, repo, path, 'api')

        file_name = os.path.basename(path)
        op = request.GET.get('op', 'download')

        reuse = request.GET.get('reuse', '0')
        if reuse not in ('1', '0'):
            return api_error(status.HTTP_400_BAD_REQUEST,
                    "If you want to reuse file server access token for download file, you should set 'reuse' argument as '1'.")

        use_onetime = False if reuse == '1' else True
        return get_repo_file(request, repo_id, file_id,
                file_name, op, use_onetime)

    def post(self, request, repo_id, format=None):
        # rename, move, copy or create file
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        path = request.GET.get('p', '')
        if not path or path[0] != '/':
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Path is missing or invalid.')

        username = request.user.username
        parent_dir = os.path.dirname(path)
        operation = request.POST.get('operation', '')
        is_draft = request.POST.get('is_draft', '')

        file_info = {}
        if operation.lower() == 'rename':
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to rename file.')

            newname = request.POST.get('newname', '')
            if not newname:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'New name is missing')

            if len(newname) > settings.MAX_UPLOAD_FILE_NAME_LEN:
                return api_error(status.HTTP_400_BAD_REQUEST, 'New name is too long')

            if not seafile_api.is_valid_filename('fake_repo_id', newname):
                error_msg = 'File name invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            oldname = os.path.basename(path)
            if oldname == newname:
                return api_error(status.HTTP_409_CONFLICT,
                                 'The new name is the same to the old')

            newname = check_filename_with_rename(repo_id, parent_dir, newname)
            try:
                seafile_api.rename_file(repo_id, parent_dir, oldname, newname,
                                        username)
            except SearpcError as e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 "Failed to rename file: %s" % e)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, repo, parent_dir)
            else:
                resp = Response('success', status=status.HTTP_301_MOVED_PERMANENTLY)
                uri = reverse('FileView', args=[repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(parent_dir.encode('utf-8')) + quote(newname.encode('utf-8'))
                return resp

        elif operation.lower() == 'move':
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to move file.')

            src_dir = os.path.dirname(path)
            src_repo_id = repo_id
            dst_repo_id = request.POST.get('dst_repo', '')
            dst_dir = request.POST.get('dst_dir', '')
            if dst_dir[-1] != '/': # Append '/' to the end of directory if necessary
                dst_dir += '/'
            # obj_names   = request.POST.get('obj_names', '')

            if not (dst_repo_id and dst_dir):
                return api_error(status.HTTP_400_BAD_REQUEST, 'Missing arguments.')

            if src_repo_id == dst_repo_id and src_dir == dst_dir:
                return Response('success', status=status.HTTP_200_OK)

            if check_folder_permission(request, dst_repo_id, dst_dir) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to move file.')

            filename = os.path.basename(path)
            new_filename = check_filename_with_rename(dst_repo_id, dst_dir, filename)
            try:
                seafile_api.move_file(src_repo_id, src_dir,
                                      json.dumps([filename]),
                                      dst_repo_id, dst_dir,
                                      json.dumps([new_filename]),
                                      replace=False, username=username,
                                      need_progress=0, synchronous=1)
            except SearpcError as e:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "SearpcError:" + e.msg)

            dst_repo = get_repo(dst_repo_id)
            if not dst_repo:
                return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, dst_repo, dst_dir)
            else:
                file_info['repo_id'] = dst_repo_id
                file_info['parent_dir'] = dst_dir
                file_info['obj_name'] = new_filename
                resp = Response(file_info, status=status.HTTP_301_MOVED_PERMANENTLY)
                uri = reverse('FileView', args=[dst_repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(dst_dir.encode('utf-8')) + quote(new_filename.encode('utf-8'))
                return resp

        elif operation.lower() == 'copy':
            src_repo_id = repo_id
            src_dir = os.path.dirname(path)
            dst_repo_id = request.POST.get('dst_repo', '')
            dst_dir = request.POST.get('dst_dir', '')

            if dst_dir[-1] != '/': # Append '/' to the end of directory if necessary
                dst_dir += '/'

            if not (dst_repo_id and dst_dir):
                return api_error(status.HTTP_400_BAD_REQUEST, 'Missing arguments.')

            # check src folder permission

            if parse_repo_perm(check_folder_permission(request, repo_id, src_dir)).can_copy is False:
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to copy file.')

            # check dst folder permission
            if check_folder_permission(request, dst_repo_id, dst_dir) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to copy file.')

            filename = os.path.basename(path)
            new_filename = check_filename_with_rename(dst_repo_id, dst_dir, filename)
            try:
                seafile_api.copy_file(src_repo_id, src_dir,
                                      json.dumps([filename]),
                                      dst_repo_id, dst_dir,
                                      json.dumps([new_filename]),
                                      username, 0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "SearpcError:" + e.msg)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, dst_repo, dst_dir)
            else:
                file_info['repo_id'] = dst_repo_id
                file_info['parent_dir'] = dst_dir
                file_info['obj_name'] = new_filename
                resp = Response(file_info, status=status.HTTP_200_OK)
                uri = reverse('FileView', args=[dst_repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(dst_dir.encode('utf-8')) + quote(new_filename.encode('utf-8'))
                return resp

        elif operation.lower() == 'create':
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to create file.')

            if is_draft.lower() == 'true':
                file_name = os.path.basename(path)
                file_dir = os.path.dirname(path)

                draft_type = os.path.splitext(file_name)[0][-7:]
                file_type = os.path.splitext(file_name)[-1]

                if draft_type != '(draft)':
                    f = os.path.splitext(file_name)[0]
                    path = file_dir + '/' + f + '(draft)' + file_type

            new_file_name = os.path.basename(path)

            if not seafile_api.is_valid_filename('fake_repo_id', new_file_name):
                error_msg = 'File name invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            new_file_name = check_filename_with_rename(repo_id, parent_dir, new_file_name)

            try:
                seafile_api.post_empty_file(repo_id, parent_dir,
                                            new_file_name, username)
            except SearpcError as e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 'Failed to create file.')

            if is_draft.lower() == 'true':
                Draft.objects.add(username, repo, path, file_exist=False)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, repo, parent_dir)
            else:
                resp = Response('success', status=status.HTTP_201_CREATED)
                uri = reverse('FileView', args=[repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(parent_dir.encode('utf-8')) + \
                    quote(new_file_name.encode('utf-8'))
                return resp
        else:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             "Operation can only be rename, create or move.")

    def put(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        path = request.data.get('p', '')
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not path or not file_id:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Path is missing or invalid.')

        username = request.user.username
        # check file access permission
        parent_dir = os.path.dirname(path)
        if check_folder_permission(request, repo_id, parent_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # check file lock
        try:
            is_locked, locked_by_me = check_file_lock(repo_id, path, username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        operation = request.data.get('operation', '')
        if operation.lower() == 'lock':
            if is_locked:
                return api_error(status.HTTP_403_FORBIDDEN, 'File is already locked')

            # lock file
            expire = request.data.get('expire', FILE_LOCK_EXPIRATION_DAYS)
            try:
                seafile_api.lock_file(repo_id, path.lstrip('/'), username, expire)
                return Response('success', status=status.HTTP_200_OK)
            except SearpcError as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if operation.lower() == 'unlock':
            if not is_locked:
                return api_error(status.HTTP_403_FORBIDDEN, 'File is not locked')
            if not locked_by_me:
                return api_error(status.HTTP_403_FORBIDDEN, 'You can not unlock this file')

            # unlock file
            try:
                seafile_api.unlock_file(repo_id, path.lstrip('/'))
                return Response('success', status=status.HTTP_200_OK)
            except SearpcError as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        else:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             "Operation can only be lock or unlock")

    def delete(self, request, repo_id, format=None):
        # delete file
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        path = request.GET.get('p', None)
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        parent_dir = os.path.dirname(path)
        if check_folder_permission(request, repo_id, parent_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        parent_dir = os.path.dirname(path)
        file_name = os.path.basename(path)

        try:
            seafile_api.del_file(repo_id, parent_dir,
                                 json.dumps([file_name]),
                                 request.user.username)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to delete file.")

        try:  # rm sdoc fileuuid
            filetype, fileext = get_file_type_and_ext(file_name)
            if filetype == SEADOC:
                from seahub.seadoc.utils import get_seadoc_file_uuid
                file_uuid = get_seadoc_file_uuid(repo, path)
                FileUUIDMap.objects.delete_fileuuidmap_by_path(
                    repo_id, parent_dir, file_name, is_dir=False)
                SeadocHistoryName.objects.filter(doc_uuid=file_uuid).delete()
                SeadocDraft.objects.filter(doc_uuid=file_uuid).delete()
        except Exception as e:
            logger.error(e)

        return reloaddir_if_necessary(request, repo, parent_dir)

class FileDetailView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):

        # argument check
        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = normalize_file_path(path)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        commit_id = request.GET.get('commit_id', None)
        try:
            if commit_id:
                obj_id = seafile_api.get_file_id_by_commit_and_path(repo_id,
                        commit_id, path)
            else:
                obj_id = seafile_api.get_file_id_by_path(repo_id, path)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not obj_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        parent_dir = os.path.dirname(path)
        permission = check_folder_permission(request, repo_id, parent_dir)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get real path for sub repo
        if repo.is_virtual:
            real_path = posixpath.join(repo.origin_path, path.lstrip('/'))
            real_repo_id = repo.origin_repo_id
        else:
            real_path = path
            real_repo_id = repo_id

        file_name = os.path.basename(path)
        entry = {}
        entry["type"] = "file"
        entry["id"] = obj_id
        entry["name"] = file_name
        entry["permission"] = permission

        file_type, file_ext = get_file_type_and_ext(file_name)
        if file_type == MARKDOWN:
            is_draft = is_draft_file(repo_id, path)

            has_draft = False
            if not is_draft:
                has_draft = has_draft_file(repo_id, path)

            draft = get_file_draft(repo_id, path, is_draft, has_draft)

            entry['is_draft'] = is_draft
            entry['has_draft'] = has_draft
            entry['draft_file_path'] = draft['draft_file_path']
            entry['draft_id'] = draft['draft_id']

        # fetch file contributors and latest contributor
        try:
            # get real path for sub repo
            dirent = seafile_api.get_dirent_by_path(real_repo_id, real_path)
        except Exception as e:
            logger.error(e)
            dirent = None

        last_modified = dirent.mtime if dirent else ''
        latest_contributor = dirent.modifier if dirent else ''

        entry["mtime"] = last_modified
        entry["last_modified"] = timestamp_to_isoformat_timestr(last_modified)
        entry["last_modifier_email"] = latest_contributor
        entry["last_modifier_name"] = email2nickname(latest_contributor)
        entry["last_modifier_contact_email"] = email2contact_email(latest_contributor)

        try:
            file_size = get_file_size(real_repo_id, repo.version, obj_id)
        except Exception as e:
            logger.error(e)
            file_size = 0
        entry["size"] = file_size

        starred_files = UserStarredFiles.objects.filter(repo_id=repo_id,
                path=path)
        entry["starred"] = True if len(starred_files) > 0 else False
        file_comments = FileComment.objects.get_by_file_path(repo_id, path)
        comment_total = file_comments.count()
        entry["comment_total"] = comment_total

        entry["can_edit"], _ = can_edit_file(file_name, file_size, repo)

        return Response(entry)


class FileRevert(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def put(self, request, repo_id, format=None):
        path = request.data.get('p', None)
        commit_id = request.data.get('commit_id', None)

        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not commit_id:
            error_msg = 'commit_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not seafile_api.get_repo(repo_id):
            error_msg = 'library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_file_id_by_commit_and_path(repo_id, commit_id, path):
            error_msg = 'file %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if check_folder_permission(request, repo_id, '/') != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        try:
            seafile_api.revert_file(repo_id, commit_id, path, username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class FileRevision(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        path = request.GET.get('p', None)
        if path is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        file_name = os.path.basename(path)
        commit_id = request.GET.get('commit_id', None)

        try:
            obj_id = seafserv_threaded_rpc.get_file_id_by_commit_and_path(
                repo_id, commit_id, path)
        except:
            return api_error(status.HTTP_404_NOT_FOUND, 'Revision not found.')

        return get_repo_file(request, repo_id, obj_id, file_name, 'download')

class FileHistory(APIView):
    authentication_classes = (TokenAuthentication,)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):
        """ Get file history.
        """

        path = request.GET.get('p', None)
        if path is None:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)


        permission = check_folder_permission(request, repo_id, path)
        if permission not in get_available_repo_perms():
            permission = normalize_custom_permission_name(permission)
            if not permission:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            commits = get_file_revisions_after_renamed(repo_id, path)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        for commit in commits:
            creator_name = getattr(commit, 'creator_name', '')

            user_info = {}
            user_info['email'] = creator_name
            user_info['name'] = email2nickname(creator_name)
            user_info['contact_email'] = Profile.objects.get_contact_email_by_user(creator_name)

            commit._dict['user_info'] = user_info

        return HttpResponse(json.dumps({"commits": commits},
            cls=SearpcObjEncoder), status=200, content_type=json_content_type)

class FileSharedLinkView(APIView):
    """
    Support uniform interface for file shared link.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, repo_id, format=None):

        repo = seaserv.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, "Library does not exist")

        if repo.encrypted:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        path = request.data.get('p', None)
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing')

        username = request.user.username
        password = request.data.get('password', None)
        share_type = request.data.get('share_type', 'download')

        if password and len(password) < config.SHARE_LINK_PASSWORD_MIN_LENGTH:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Password is too short')

        if share_type.lower() == 'download':
            if parse_repo_perm(check_folder_permission(request, repo_id, path)).can_download is False:
                return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied')

            if not request.user.permissions.can_generate_share_link():
                error_msg = 'Can not generate share link.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                expire_days = int(request.data.get('expire', 0))
            except ValueError:
                error_msg = 'expire invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if expire_days <= 0:
                if SHARE_LINK_EXPIRE_DAYS_DEFAULT > 0:
                    expire_days = SHARE_LINK_EXPIRE_DAYS_DEFAULT

            if SHARE_LINK_EXPIRE_DAYS_MIN > 0:
                if expire_days < SHARE_LINK_EXPIRE_DAYS_MIN:
                    error_msg = _('Expire days should be greater or equal to %s') % \
                            SHARE_LINK_EXPIRE_DAYS_MIN
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if SHARE_LINK_EXPIRE_DAYS_MAX > 0:
                if expire_days > SHARE_LINK_EXPIRE_DAYS_MAX:
                    error_msg = _('Expire days should be less than or equal to %s') % \
                            SHARE_LINK_EXPIRE_DAYS_MAX
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if expire_days <= 0:
                expire_date = None
            else:
                expire_date = timezone.now() + relativedelta(days=expire_days)

            is_dir = False
            if path == '/':
                is_dir = True
            else:
                try:
                    real_path = repo.origin_path + path if repo.origin_path else path
                    dirent = seafile_api.get_dirent_by_path(repo.store_id, real_path)
                except SearpcError as e:
                    logger.error(e)
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Internal Server Error")

                if not dirent:
                    return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid path')

                if stat.S_ISDIR(dirent.mode):
                    is_dir = True

            if is_dir:
                # generate dir download link
                fs = FileShare.objects.get_dir_link_by_path(username, repo_id, path)
                if fs is None:
                    fs = FileShare.objects.create_dir_link(username, repo_id, path,
                                                           password, expire_date)
                    if is_org_context(request):
                        org_id = request.user.org.org_id
                        OrgFileShare.objects.set_org_file_share(org_id, fs)

            else:
                # generate file download link
                fs = FileShare.objects.get_file_link_by_path(username, repo_id, path)
                if fs is None:
                    fs = FileShare.objects.create_file_link(username, repo_id, path,
                                                            password, expire_date)
                    if is_org_context(request):
                        org_id = request.user.org.org_id
                        OrgFileShare.objects.set_org_file_share(org_id, fs)

            token = fs.token
            shared_link = gen_shared_link(token, fs.s_type)

        elif share_type.lower() == 'upload':
            if not seafile_api.get_dir_id_by_path(repo_id, path):
                return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid path')

            if check_folder_permission(request, repo_id, path) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied')

            if not request.user.permissions.can_generate_upload_link():
                error_msg = 'Can not generate upload link.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # generate upload link
            uls = UploadLinkShare.objects.get_upload_link_by_path(username, repo_id, path)
            if uls is None:
                uls = UploadLinkShare.objects.create_upload_link_share(
                    username, repo_id, path, password)

            token = uls.token
            shared_link = gen_shared_upload_link(token)

        else:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             "Operation can only be download or upload.")

        resp = Response(status=status.HTTP_201_CREATED)
        resp['Location'] = shared_link
        return resp

########## Directory related
class DirMetaDataView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        # recource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('p', '/')
        path = normalize_dir_path(path)

        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, path)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        return Response({
            'id': dir_id,
        })


class DirView(APIView):
    """
    Support uniform interface for directory operations, including
    create/delete/rename/list, etc.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):

        # argument check
        recursive = request.GET.get('recursive', '0')
        if recursive not in ('1', '0'):
            error_msg = "If you want to get recursive dir entries, you should set 'recursive' argument as '1'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        request_type = request.GET.get('t', '')
        if request_type and request_type not in ('f', 'd'):
            error_msg = "'t'(type) should be 'f' or 'd'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # recource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('p', '/')
        path = normalize_dir_path(path)

        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, path)
        if parse_repo_perm(permission).can_download is False and \
           not is_web_request(request):
            # preview only repo and this request does not came from web brower
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        old_oid = request.GET.get('oid', None)
        if old_oid and old_oid == dir_id:
            response = HttpResponse(json.dumps("uptodate"), status=200,
                                    content_type=json_content_type)
            response["oid"] = dir_id
            return response

        if recursive == '1':
            result = []
            username = request.user.username
            dir_file_list = get_dir_file_recursively(username, repo_id, path, [])
            if request_type == 'f':
                for item in dir_file_list:
                    if item['type'] == 'file':
                        result.append(item)
            elif request_type == 'd':
                for item in dir_file_list:
                    if item['type'] == 'dir':
                        result.append(item)
            else:
                result = dir_file_list

            response = HttpResponse(json.dumps(result), status=200,
                                    content_type=json_content_type)
            response["oid"] = dir_id
            response["dir_perm"] = permission
            return response

        return get_dir_entrys_by_id(request, repo, path, dir_id, request_type)

    def post(self, request, repo_id, format=None):
        # new dir
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        path = request.GET.get('p', '')

        if not path or path[0] != '/':
            return api_error(status.HTTP_400_BAD_REQUEST, "Path is missing.")
        if path == '/':         # Can not make or rename root dir.
            return api_error(status.HTTP_400_BAD_REQUEST, "Path is invalid.")
        if path[-1] == '/':     # Cut out last '/' if possible.
            path = path[:-1]

        username = request.user.username
        operation = request.POST.get('operation', '')
        parent_dir = os.path.dirname(path)

        if operation.lower() == 'mkdir':
            new_dir_name = os.path.basename(path)

            if not seafile_api.is_valid_filename('fake_repo_id', new_dir_name):
                error_msg = 'Folder name invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            create_parents = request.POST.get('create_parents', '').lower() in ('true', '1')
            if not create_parents:
                # check whether parent dir exists
                if not seafile_api.get_dir_id_by_path(repo_id, parent_dir):
                    error_msg = 'Folder %s not found.' % parent_dir
                    return api_error(status.HTTP_404_NOT_FOUND, error_msg)

                if parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web is False:
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                retry_count = 0
                while retry_count < 10:
                    new_dir_name = check_filename_with_rename(repo_id,
                            parent_dir, new_dir_name)
                    try:
                        seafile_api.post_dir(repo_id,
                                parent_dir, new_dir_name, username)
                        break
                    except SearpcError as e:
                        if str(e) == 'file already exists':
                            retry_count += 1
                        else:
                            logger.error(e)
                            return api_error(HTTP_520_OPERATION_FAILED,
                                         'Failed to make directory.')
            else:
                if parse_repo_perm(check_folder_permission(request, repo_id, '/')).can_edit_on_web is False:
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                try:
                    seafile_api.mkdir_with_parents(repo_id, '/',
                                                   path[1:], username)
                except SearpcError as e:
                    logger.error(e)
                    return api_error(HTTP_520_OPERATION_FAILED,
                                     'Failed to make directory.')

            if request.GET.get('reloaddir', '').lower() == 'true':
                resp = reloaddir(request, repo, parent_dir)
            else:
                resp = Response('success', status=status.HTTP_201_CREATED)
                uri = reverse('DirView', args=[repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(
                    parent_dir.encode('utf-8') + '/'.encode('utf-8') + new_dir_name.encode('utf-8'))
            return resp

        elif operation.lower() == 'rename':
            if not seafile_api.get_dir_id_by_path(repo_id, path):
                error_msg = 'Folder %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if parse_repo_perm(check_folder_permission(request, repo.id, path)).can_edit_on_web is False:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            old_dir_name = os.path.basename(path)

            newname = request.POST.get('newname', '')
            if not newname:
                return api_error(status.HTTP_400_BAD_REQUEST, "New name is mandatory.")

            if newname == old_dir_name:
                return Response('success', status=status.HTTP_200_OK)

            try:
                # rename duplicate name
                checked_newname = check_filename_with_rename(
                    repo_id, parent_dir, newname)
                # rename dir
                seafile_api.rename_file(repo_id, parent_dir, old_dir_name,
                                        checked_newname, username)
                return Response('success', status=status.HTTP_200_OK)
            except SearpcError as e:
                logger.error(e)
                return api_error(HTTP_520_OPERATION_FAILED,
                                 'Failed to rename folder.')
        # elif operation.lower() == 'move':
        #     pass
        else:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             "Operation not supported.")

    def delete(self, request, repo_id, format=None):
        # delete dir or file
        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if check_folder_permission(request, repo_id, path) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if path == '/':         # Can not delete root path.
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is invalid.')

        if path[-1] == '/':     # Cut out last '/' if possible.
            path = path[:-1]

        parent_dir = os.path.dirname(path)
        file_name = os.path.basename(path)

        username = request.user.username
        try:
            seafile_api.del_file(repo_id, parent_dir,
                                 json.dumps([file_name]),
                                 username)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to delete file.")

        return reloaddir_if_necessary(request, repo, parent_dir)

class DirRevert(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def put(self, request, repo_id):
        path = request.data.get('p', None)
        commit_id = request.data.get('commit_id', None)

        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not commit_id:
            error_msg = 'commit_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not seafile_api.get_repo(repo_id):
            error_msg = 'library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_commit_and_path(repo_id, commit_id, path):
            error_msg = 'folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if check_folder_permission(request, repo_id, '/') != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        try:
            seafile_api.revert_dir(repo_id, commit_id, path, username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class DirSubRepoView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):
        """ Create sub-repo for folder

        Permission checking:
        1. user with `r` or `rw` permission.
        2. password correct for encrypted repo.
        """

        # argument check
        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        name = request.GET.get('name', None)
        if not name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # recourse check
        repo = get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, path):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        password = request.GET.get('password', '')
        if repo.encrypted:
            # check password for encrypted repo
            if not password:
                error_msg = 'password invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            else:
                try:
                    seafile_api.set_passwd(repo_id, username, password)
                except SearpcError as e:
                    if e.msg == 'Bad arguments':
                        error_msg = 'Bad arguments'
                        return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
                    elif e.msg == 'Incorrect password':
                        error_msg = _('Wrong password')
                        return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
                    elif e.msg == 'Internal server error':
                        error_msg = _('Internal Server Error')
                        return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
                    else:
                        error_msg = _('Decrypt library error')
                        return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            # create sub-lib for encrypted repo
            try:
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    sub_repo_id = seafile_api.create_org_virtual_repo(
                            org_id, repo_id, path, name, name, username, password)
                else:
                    sub_repo_id = seafile_api.create_virtual_repo(
                            repo_id, path, name, name, username, password)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        else:
            # create sub-lib for common repo
            try:
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    sub_repo_id = seafile_api.create_org_virtual_repo(
                            org_id, repo_id, path, name, name, username)
                else:
                    sub_repo_id = seafile_api.create_virtual_repo(
                            repo_id, path, name, name, username)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'sub_repo_id': sub_repo_id})

########## Sharing
class SharedRepos(APIView):
    """
    List repos that a user share to others/groups/public.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        username = request.user.username
        shared_repos = []

        shared_repos += list_share_repos(username, 'from_email', -1, -1)
        shared_repos += get_group_repos_by_owner(username)
        if not CLOUD_MODE:
            shared_repos += seafile_api.list_inner_pub_repos_by_owner(username)

        return HttpResponse(json.dumps(shared_repos, cls=SearpcObjEncoder),
                            status=200, content_type=json_content_type)

class BeSharedRepos(APIView):
    """
    List repos that others/groups share to user.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        username = request.user.username
        shared_repos = []
        shared_repos += seafile_api.get_share_in_repo_list(username, -1, -1)

        joined_groups = ccnet_api.get_groups(username)
        for grp in joined_groups:
            # Get group repos, and for each group repos...
            for r_id in get_group_repoids(grp.id):
                # No need to list my own repo
                if seafile_api.is_repo_owner(username, r_id):
                    continue
                # Convert repo properties due to the different collumns in Repo
                # and SharedRepo
                r = get_repo(r_id)
                if not r:
                    continue
                r.repo_id = r.id
                r.repo_name = r.name
                r.repo_desc = r.desc
                cmmts = get_commits(r_id, 0, 1)
                last_commit = cmmts[0] if cmmts else None
                r.last_modified = last_commit.ctime if last_commit else 0
                r._dict['share_type'] = 'group'
                r.user = seafile_api.get_repo_owner(r_id)
                r.user_perm = check_permission(r_id, username)
                shared_repos.append(r)

        if not CLOUD_MODE:
            shared_repos += seafile_api.get_inner_pub_repo_list()

        return HttpResponse(json.dumps(shared_repos, cls=SearpcObjEncoder),
                            status=200, content_type=json_content_type)


class SharedFileView(APIView):
    # Anyone should be able to access a Shared File assuming they have the token
    throttle_classes = (UserRateThrottle, )

    def get(self, request, token, format=None):
        assert token is not None    # Checked by URLconf

        try:
            fileshare = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND, "Token not found")

        repo_id = fileshare.repo_id
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, "Library not found")

        path = fileshare.path.rstrip('/') # Normalize file path
        file_name = os.path.basename(path)

        file_id = None
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to get file id by path.")

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, "File not found")

        # Increase file shared link view_cnt, this operation should be atomic
        fileshare.view_cnt = F('view_cnt') + 1
        fileshare.save()

        op = request.GET.get('op', 'download')
        return get_repo_file(request, repo_id, file_id, file_name, op)

class SharedFileDetailView(APIView):
    throttle_classes = (UserRateThrottle, )

    def get(self, request, token, format=None):
        assert token is not None    # Checked by URLconf

        try:
            fileshare = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND, "Token not found")

        if fileshare.is_encrypted():
            password = request.GET.get('password', '')

            if not password:
                return api_error(status.HTTP_403_FORBIDDEN, _('Password is required.'))

            if not (check_password(password, fileshare.password) or password == fileshare.get_password()):
                return api_error(status.HTTP_403_FORBIDDEN, "Invalid Password")

        repo_id = fileshare.repo_id
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, "Library not found")

        path = fileshare.path.rstrip('/') # Normalize file path
        file_name = os.path.basename(path)

        file_id = None
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
            commits = get_file_revisions_after_renamed(repo_id, path)
            c = commits[0]
        except SearpcError as e:
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to get file id by path.")

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, "File not found")

        entry = {}
        try:
            entry["size"] = get_file_size(repo.store_id, repo.version, file_id)
        except Exception as e:
            logger.error(e)
            entry["size"] = 0

        entry["type"] = "file"
        entry["name"] = file_name
        entry["id"] = file_id
        entry["mtime"] = c.ctime
        entry["repo_id"] = repo_id
        entry["path"] = path

        return HttpResponse(json.dumps(entry), status=200,
                            content_type=json_content_type)


class FileShareEncoder(json.JSONEncoder):
    def default(self, obj):
        if not isinstance(obj, FileShare):
            return None
        return {'username':obj.username, 'repo_id':obj.repo_id,
                'path':obj.path, 'token':obj.token,
                'ctime':obj.ctime, 'view_cnt':obj.view_cnt,
                's_type':obj.s_type}

class SharedLinksView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        username = request.user.username

        fileshares = FileShare.objects.filter(username=username)
        p_fileshares = []           # personal file share
        for fs in fileshares:
            if is_personal_repo(fs.repo_id):  # only list files in personal repos
                r = seafile_api.get_repo(fs.repo_id)
                if not r:
                    fs.delete()
                    continue

                if fs.s_type == 'f':
                    if seafile_api.get_file_id_by_path(r.id, fs.path) is None:
                        fs.delete()
                        continue
                    fs.filename = os.path.basename(fs.path)
                    fs.shared_link = gen_file_share_link(fs.token)
                else:
                    if seafile_api.get_dir_id_by_path(r.id, fs.path) is None:
                        fs.delete()
                        continue
                    fs.filename = os.path.basename(fs.path.rstrip('/'))
                    fs.shared_link = gen_dir_share_link(fs.token)
                fs.repo = r
                p_fileshares.append(fs)
        return HttpResponse(json.dumps({"fileshares": p_fileshares}, cls=FileShareEncoder), status=200, content_type=json_content_type)

    def delete(self, request, format=None):
        token = request.GET.get('t', None)
        if not token:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Token is missing')

        username = request.user.username
        share = FileShare.objects.filter(token=token).filter(username=username) or \
                UploadLinkShare.objects.filter(token=token).filter(username=username)

        if not share:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid token')

        share.delete()

        return HttpResponse(json.dumps({}), status=200, content_type=json_content_type)

class SharedDirView(APIView):
    throttle_classes = (UserRateThrottle, )

    def get(self, request, token, format=None):
        """List dirents in dir download shared link
        """
        fileshare = FileShare.objects.get_valid_dir_link_by_token(token)
        if not fileshare:
            return api_error(status.HTTP_400_BAD_REQUEST, "Invalid token")

        repo_id = fileshare.repo_id
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_400_BAD_REQUEST, "Invalid token")

        if fileshare.is_encrypted():
            password = request.GET.get('password', '')

            if not password:
                return api_error(status.HTTP_403_FORBIDDEN, _('Password is required.'))

            if not (check_password(password, fileshare.password) or password == fileshare.get_password()):
                return api_error(status.HTTP_403_FORBIDDEN, "Invalid Password")

        req_path = request.GET.get('p', '/')
        req_path = normalize_dir_path(req_path)

        if req_path == '/':
            real_path = fileshare.path
        else:
            real_path = posixpath.join(fileshare.path, req_path.lstrip('/'))

        real_path = normalize_dir_path(real_path)

        dir_id = seafile_api.get_dir_id_by_path(repo_id, real_path)
        if not dir_id:
            return api_error(status.HTTP_400_BAD_REQUEST, "Invalid path")

        username = fileshare.username
        try:
            dirs = seafserv_threaded_rpc.list_dir_with_perm(repo_id, real_path, dir_id,
                    username, -1, -1)
            dirs = dirs if dirs else []
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED, "Failed to list dir.")

        dir_list, file_list = [], []
        for dirent in dirs:
            dtype = "file"
            entry = {}
            if stat.S_ISDIR(dirent.mode):
                dtype = "dir"
            else:
                if repo.version == 0:
                    entry["size"] = get_file_size(repo.store_id, repo.version,
                                                  dirent.obj_id)
                else:
                    entry["size"] = dirent.size

            entry["type"] = dtype
            entry["name"] = dirent.obj_name
            entry["id"] = dirent.obj_id
            entry["mtime"] = dirent.mtime
            if dtype == 'dir':
                dir_list.append(entry)
            else:
                file_list.append(entry)

        dir_list.sort(key=lambda x: x['name'].lower())
        file_list.sort(key=lambda x: x['name'].lower())
        dentrys = dir_list + file_list

        content_type = 'application/json; charset=utf-8'
        return HttpResponse(json.dumps(dentrys), status=200, content_type=content_type)

class DefaultRepoView(APIView):
    """
    Get user's default library.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        username = request.user.username
        repo_id = UserOptions.objects.get_default_repo(username)
        if repo_id is None or (get_repo(repo_id) is None):
            json = {
                'exists': False,
            }
            return Response(json)
        else:
            return self.default_repo_info(repo_id)

    def default_repo_info(self, repo_id):
        repo_json = {
            'exists': False,
        }

        if repo_id is not None:
            repo_json['exists'] = True
            repo_json['repo_id'] = repo_id

        return Response(repo_json)

    def post(self, request):
        if not request.user.permissions.can_add_repo():
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to create library.')

        username = request.user.username

        repo_id = UserOptions.objects.get_default_repo(username)
        if repo_id and (get_repo(repo_id) is not None):
            return self.default_repo_info(repo_id)

        repo_id = create_default_library(request)

        return self.default_repo_info(repo_id)

class SharedRepo(APIView):
    """
    Support uniform interface for shared libraries.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def delete(self, request, repo_id, format=None):
        """
        Unshare a library.
        Repo owner and system admin can perform this operation.
        """
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        username = request.user.username
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if not request.user.is_staff and not username == repo_owner:
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to unshare library.')

        share_type = request.GET.get('share_type', '')
        if not share_type:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Share type is required.')

        if share_type == 'personal':
            user = request.GET.get('user', '')
            if not user:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'User is required.')

            if not is_valid_username(user):
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'User is not valid')

            remove_share(repo_id, username, user)
        elif share_type == 'group':
            group_id = request.GET.get('group_id', '')
            if not group_id:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'Group ID is required.')

            try:
                group_id = int(group_id)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'Group ID is not valid.')

            seafile_api.unset_group_repo(repo_id, int(group_id), username)
        elif share_type == 'public':
            if is_org_context(request):
                org_id = request.user.org.org_id
                seaserv.seafserv_threaded_rpc.unset_org_inner_pub_repo(org_id, repo_id)
            else:
                seafile_api.remove_inner_pub_repo(repo_id)
        else:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Share type can only be personal or group or public.')

        return Response('success', status=status.HTTP_200_OK)

    def put(self, request, repo_id, format=None):
        """
        Share a repo to users/groups/public.
        """

        # argument check
        share_type = request.GET.get('share_type')
        permission = request.GET.get('permission')

        if permission not in get_available_repo_perms():
            permission = normalize_custom_permission_name(permission)
            if not permission:
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if share_type not in ('personal', 'group', 'public'):
            error_msg = 'share_type invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        repo_owner = get_repo_owner(request, repo_id)
        if username != repo_owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if share_type == 'personal':

            user = request.GET.get('user')
            users = request.GET.get('users')
            if not user and not users:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'User or users (comma separated are mandatory) are not provided')
            usernames = []
            if user:
                usernames += user.split(",")
            if users:
                usernames += users.split(",")

            shared_users = []
            invalid_users = []
            notexistent_users = []
            notsharable_errors = []

            for u in usernames:
                if not u:
                    continue

                if not is_valid_username(u):
                    invalid_users.append(u)
                    continue

                if not is_registered_user(u):
                    notexistent_users.append(u)
                    continue

                try:
                    seafile_api.share_repo(repo_id, username, u, permission)
                    shared_users.append(u)
                except SearpcError as e:
                    logger.error(e)
                    notsharable_errors.append(e)

                try:
                    send_perm_audit_msg('add-repo-perm',
                            username, u, repo_id, '/', permission)
                except Exception as e:
                    logger.error(e)

            if invalid_users or notexistent_users or notsharable_errors:
                # removing already created share
                for s_user in shared_users:
                    try:
                        remove_share(repo_id, username, s_user)
                    except SearpcError as e:
                        # ignoring this error, go to next unsharing
                        continue

            if invalid_users:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'Some users are not valid, sharing rolled back')
            if notexistent_users:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'Some users are not existent, sharing rolled back')
            if notsharable_errors:
                # show the first sharing error
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 'Internal error occurs, sharing rolled back')

        if share_type == 'group':

            group_id = request.GET.get('group_id')
            if not group_id:
                error_msg = 'group_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                group_id = int(group_id)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'Group ID must be integer.')

            group = get_group(group_id)
            if not group:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'Group does not exist .')
            try:
                seafile_api.set_group_repo(repo_id,
                        group_id, username, permission)
            except SearpcError as e:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "Searpc Error: " + e.msg)
            try:
                send_perm_audit_msg('add-repo-perm',
                        username, group_id, repo_id, '/', permission)
            except Exception as e:
                logger.error(e)

        if share_type == 'public':
            try:
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    seafile_api.set_org_inner_pub_repo(org_id, repo_id, permission)
                else:
                    if not request.user.permissions.can_add_public_repo():
                        error_msg = 'Permission denied.'
                        return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                    seafile_api.add_inner_pub_repo(repo_id, permission)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            try:
                send_perm_audit_msg('add-repo-perm',
                        username, 'all', repo_id, '/', permission)
            except Exception as e:
                logger.error(e)

        return Response('success', status=status.HTTP_200_OK)


class UnseenMessagesCountView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        username = request.user.username
        ret = { 'count' : UserNotification.objects.count_unseen_user_notifications(username)
                }
        return Response(ret)

########## Groups related
class Groups(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):

        size = request.GET.get('size', 36)
        limit = int(request.GET.get('limit', 8))
        with_msg = request.GET.get('with_msg', 'true')

        # To not broken the old API, we need to make with_msg default
        if with_msg == 'true':
            group_json, replynum = get_groups(request.user.username)
            res = {"groups": group_json, "replynum": replynum}
            return Response(res)
        else:
            groups_json = []
            joined_groups = ccnet_api.get_groups(request.user.username)

            for g in joined_groups:

                if limit <= 0:
                    break;

                group = {
                    "id": g.id,
                    "name": g.group_name,
                    "creator": g.creator_name,
                    "ctime": g.timestamp,
                    "avatar": grp_avatar(g.id, int(size)),
                }
                groups_json.append(group)
                limit = limit - 1

            return Response(groups_json)

    def put(self, request, format=None):
        # modified slightly from groups/views.py::group_list
        """
        Add a new group.
        """
        result = {}
        content_type = 'application/json; charset=utf-8'
        username = request.user.username

        if not request.user.permissions.can_add_group():
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to create group.')

        # check plan
        num_of_groups = getattr(request.user, 'num_of_groups', -1)
        if num_of_groups > 0:
            current_groups = len(ccnet_api.get_groups(username))
            if current_groups > num_of_groups:
                result['error'] = 'You can only create %d groups.' % num_of_groups
                return HttpResponse(json.dumps(result), status=500,
                                    content_type=content_type)

        group_name = request.data.get('group_name', None)
        group_name = group_name.strip()
        if not validate_group_name(group_name):
            result['error'] = _('Name can only contain letters, numbers, spaces, hyphen, dot, single quote, brackets or underscore.')
            return HttpResponse(json.dumps(result), status=403,
                                content_type=content_type)

        # Check whether group name is duplicated.
        if request.cloud_mode:
            checked_groups = ccnet_api.get_groups(username)
        else:
            checked_groups = get_personal_groups(-1, -1)
        for g in checked_groups:
            if g.group_name == group_name:
                result['error'] = 'There is already a group with that name.'
                return HttpResponse(json.dumps(result), status=400,
                                    content_type=content_type)

        # Group name is valid, create that group.
        try:
            group_id = ccnet_api.create_group(group_name, username)
            return HttpResponse(json.dumps({'success': True, 'group_id': group_id}),
                                content_type=content_type)
        except SearpcError as e:
            result['error'] = e.msg
            return HttpResponse(json.dumps(result), status=500,
                                content_type=content_type)

    def delete(self, request, group_id, format=None):
        try:
            group_id = int(group_id)
        except ValueError:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Bad group id format')

        group = seaserv.get_group(group_id)
        if not group:
            return api_error(status.HTTP_404_NOT_FOUND, 'Group not found')

        # permission check
        username = request.user.username
        if not seaserv.check_group_staff(group_id, username):
            return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to delete group')

        # delete group
        if is_org_context(request):
            org_id = request.user.org.org_id
        else:
            org_id = None

        try:
            remove_group_common(group.id, username, org_id=org_id)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             'Failed to remove group.')

        return Response('success', status=status.HTTP_200_OK)

    def post(self, request, group_id, format=None):
        group = seaserv.get_group(group_id)
        if not group:
            return api_error(status.HTTP_404_NOT_FOUND, 'Group not found')

        # permission check
        username = request.user.username
        if not seaserv.check_group_staff(group.id, username):
            return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to rename group')

        operation = request.POST.get('operation', '')
        if operation.lower() == 'rename':
            newname = request.POST.get('newname', '')
            if not newname:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'New name is missing')

            try:
                rename_group_with_new_name(request, group.id, newname)
            except BadGroupNameError:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'Group name is not valid.')
            except ConflictGroupNameError:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'There is already a group with that name.')

            return Response('success', status=status.HTTP_200_OK)
        else:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             "Operation can only be rename.")

class GroupMembers(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, group_id, format=None):
        """
        Add group members.
        """
        try:
            group_id_int = int(group_id)
        except ValueError:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid group ID')

        group = get_group(group_id_int)
        if not group:
            return api_error(status.HTTP_404_NOT_FOUND, 'Group not found')

        if not is_group_staff(group, request.user):
            return api_error(status.HTTP_403_FORBIDDEN, 'Only administrators can add group members')

        user_name = request.data.get('user_name', None)
        if not is_registered_user(user_name):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Not a valid user')

        try:
            ccnet_threaded_rpc.group_add_member(group.id, request.user.username, user_name)
        except SearpcError as e:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Unable to add user to group')

        return HttpResponse(json.dumps({'success': True}), status=200, content_type=json_content_type)

    def delete(self, request, group_id, format=None):
        """
        Delete group members.
        """
        try:
            group_id_int = int(group_id)
        except ValueError:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid group ID')

        group = get_group(group_id_int)
        if not group:
            return api_error(status.HTTP_404_NOT_FOUND, 'Group not found')

        if not is_group_staff(group, request.user):
            return api_error(status.HTTP_403_FORBIDDEN, 'Only administrators can remove group members')

        user_name = request.data.get('user_name', None)

        try:
            ccnet_threaded_rpc.group_remove_member(group.id, request.user.username, user_name)
        except SearpcError as e:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Unable to add user to group')

        return HttpResponse(json.dumps({'success': True}), status=200, content_type=json_content_type)

class GroupRepos(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_group_check
    def post(self, request, group, format=None):
        # add group repo
        username = request.user.username
        repo_name = request.data.get("name", None)
        repo_desc = request.data.get("desc", '')
        passwd = request.data.get("passwd", None)

        # to avoid 'Bad magic' error when create repo, passwd should be 'None'
        # not an empty string when create unencrypted repo
        if not passwd:
            passwd = None

        if (passwd is not None) and (not config.ENABLE_ENCRYPTED_LIBRARY):
            return api_error(status.HTTP_403_FORBIDDEN,
                             'NOT allow to create encrypted library.')

        permission = request.data.get("permission", 'r')
        if permission not in get_available_repo_perms():
            permission = normalize_custom_permission_name(permission)
            if not permission:
                return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid permission')

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id
            repo_id = seafile_api.create_org_repo(repo_name, repo_desc,
                                                  username, org_id, passwd,
                                                  enc_version=settings.ENCRYPTED_LIBRARY_VERSION)
            repo = seafile_api.get_repo(repo_id)
            seafile_api.add_org_group_repo(repo_id, org_id, group.id,
                                           username, permission)
        else:
            if is_pro_version() and ENABLE_STORAGE_CLASSES:

                if STORAGE_CLASS_MAPPING_POLICY in ('USER_SELECT',
                        'ROLE_BASED'):

                    storages = get_library_storages(request)
                    storage_id = request.data.get("storage_id", None)
                    if storage_id and storage_id not in [s['storage_id'] for s in storages]:
                        error_msg = 'storage_id invalid.'
                        return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                    repo_id = seafile_api.create_repo(repo_name,
                            repo_desc, username, passwd, storage_id,
                            enc_version=settings.ENCRYPTED_LIBRARY_VERSION)
                else:
                    # STORAGE_CLASS_MAPPING_POLICY == 'REPO_ID_MAPPING'
                    repo_id = seafile_api.create_repo(repo_name,
                            repo_desc, username, passwd,
                            enc_version=settings.ENCRYPTED_LIBRARY_VERSION)
            else:
                repo_id = seafile_api.create_repo(repo_name,
                        repo_desc, username, passwd,
                        enc_version=settings.ENCRYPTED_LIBRARY_VERSION)

            repo = seafile_api.get_repo(repo_id)
            seafile_api.set_group_repo(repo.id, group.id, username, permission)

        library_template = request.data.get("library_template", '')
        repo_created.send(sender=None,
                          org_id=org_id,
                          creator=username,
                          repo_id=repo_id,
                          repo_name=repo_name,
                          library_template=library_template)
        group_repo = {
            "id": repo.id,
            "name": repo.name,
            "desc": repo.desc,
            "size": repo.size,
            "size_formatted": filesizeformat(repo.size),
            "mtime": repo.last_modified,
            "mtime_relative": translate_seahub_time(repo.last_modified),
            "encrypted": repo.encrypted,
            "permission": permission,
            "owner": username,
            "owner_nickname": email2nickname(username),
            "owner_name": email2nickname(username),
            "share_from_me": True,
            "modifier_email": repo.last_modifier,
            "modifier_contact_email": email2contact_email(repo.last_modifier),
            "modifier_name": email2nickname(repo.last_modifier),
        }

        return Response(group_repo, status=200)

    @api_group_check
    def get(self, request, group, format=None):
        username = request.user.username

        if group.is_pub:
            if not request.user.is_staff and not is_group_member(group.id, username):
                return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if is_org_context(request):
            org_id = request.user.org.org_id
            repos = seafile_api.get_org_group_repos(org_id, group.id)
        else:
            repos = seafile_api.get_repos_by_group(group.id)

        repos.sort(key=lambda x: x.last_modified, reverse=True)
        group.is_staff = is_group_staff(group, request.user)

        # Use dict to reduce memcache fetch cost in large for-loop.
        contact_email_dict = {}
        nickname_dict = {}
        owner_set = {x.user for x in repos}
        modifiers_set = {x.modifier for x in repos}
        for e in owner_set | modifiers_set:
            if e not in contact_email_dict:
                contact_email_dict[e] = email2contact_email(e)
            if e not in nickname_dict:
                nickname_dict[e] = email2nickname(e)

        # Get repos that is admin permission in group.
        admin_repos = ExtraGroupsSharePermission.objects.\
                get_repos_with_admin_permission(group.id)
        repos_json = []
        for r in repos:

            group_name_of_address_book_library = ''
            if '@seafile_group' in r.user:
                group_id_of_address_book_library = get_group_id_by_repo_owner(r.user)
                group_name_of_address_book_library = group_id_to_name(group_id_of_address_book_library)

            repo = {
                "id": r.id,
                "name": r.name,
                "size": r.size,
                "size_formatted": filesizeformat(r.size),
                "mtime": r.last_modified,
                "mtime_relative": translate_seahub_time(r.last_modified),
                "encrypted": r.encrypted,
                "permission": r.permission,
                "owner": r.user,
                "owner_nickname": nickname_dict.get(r.user, ''),
                "owner_name": nickname_dict.get(r.user, ''),
                "share_from_me": True if username == r.user else False,
                "modifier_email": r.last_modifier,
                "modifier_contact_email": contact_email_dict.get(r.last_modifier, ''),
                "modifier_name": nickname_dict.get(r.last_modifier, ''),
                "is_admin": r.id in admin_repos,
                "group_name": group_name_of_address_book_library,
            }
            repos_json.append(repo)

        req_from = request.GET.get('from', "")
        if req_from == 'web':
            return Response({"is_staff": group.is_staff, "repos": repos_json})
        else:
            return Response(repos_json)

class GroupRepo(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_group_check
    def delete(self, request, group, repo_id, format=None):
        username = request.user.username
        group_id = group.id

        # only admin or owner can delete share record.
        repo_owner = get_repo_owner(request, repo_id)
        if not group.is_staff and repo_owner != username and not is_repo_admin(username, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        is_org = seaserv.is_org_group(group_id)
        repo = seafile_api.get_group_shared_repo_by_path(repo_id, None, group_id, is_org)
        permission = check_group_share_in_permission(repo_id, group_id, is_org)

        if is_org:
            org_id = seaserv.get_org_id_by_group(group_id)
            seaserv.del_org_group_repo(repo_id, org_id, group_id)
        else:
            seafile_api.unset_group_repo(repo_id, group_id, username)

        # delete extra share permission
        ExtraGroupsSharePermission.objects.delete_share_permission(repo_id, group_id)
        if repo.is_virtual:
            send_perm_audit_msg('delete-repo-perm', username, group_id,
                                repo.origin_repo_id, repo.origin_path, permission)
        else:
            send_perm_audit_msg('delete-repo-perm', username, group_id,
                                repo_id, '/', permission)
        return HttpResponse(json.dumps({'success': True}), status=200,
                            content_type=json_content_type)

class UserAvatarView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, user, size, format=None):
        url, is_default, date_uploaded = api_avatar_url(user, int(size))
        ret = {
            "url": url,
            "is_default": is_default,
            "mtime": get_timestamp(date_uploaded) }
        return Response(ret)

class GroupAvatarView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, group_id, size, format=None):
        url, is_default, date_uploaded = api_grp_avatar_url(group_id, int(size))
        ret = {
            "url": request.build_absolute_uri(url),
            "is_default": is_default,
            "mtime": get_timestamp(date_uploaded)}
        return Response(ret)

class RepoHistoryChange(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return HttpResponse(json.dumps({"err": 'Library does not exist'}),
                                status=400,
                                content_type=json_content_type)

        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        commit_id = request.GET.get('commit_id', '')
        if not commit_id:
            return HttpResponse(json.dumps({"err": 'Invalid argument'}),
                                status=400,
                                content_type=json_content_type)

        details = get_diff_details(repo_id, '', commit_id)

        return HttpResponse(json.dumps(details),
                            content_type=json_content_type)


# based on views/file.py::office_convert_query_status
class OfficeConvertQueryStatus(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        if not HAS_OFFICE_CONVERTER:
            return api_error(status.HTTP_404_NOT_FOUND, 'Office converter not enabled.')

        content_type = 'application/json; charset=utf-8'

        ret = {'success': False}

        file_id = request.GET.get('file_id', '')
        if len(file_id) != 40:
            ret['error'] = 'invalid param'
        else:
            try:
                d = query_office_convert_status(file_id)
                if d.error:
                    ret['error'] = d.error
                else:
                    ret['success'] = True
                    ret['status'] = d.status
            except Exception as e:
                logging.exception('failed to call query_office_convert_status')
                ret['error'] = str(e)

        return HttpResponse(json.dumps(ret), content_type=content_type)

# based on views/file.py::view_file and views/file.py::handle_document
class OfficeGenerateView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        username = request.user.username
        # check arguments
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')


        path = request.GET.get('p', '/').rstrip('/')
        commit_id = request.GET.get('commit_id', None)

        if commit_id:
            try:
                obj_id = seafserv_threaded_rpc.get_file_id_by_commit_and_path(
                    repo.id, commit_id, path)
            except:
                return api_error(status.HTTP_404_NOT_FOUND, 'Revision not found.')
        else:
            try:
                obj_id = seafile_api.get_file_id_by_path(repo_id, path)
            except:
                return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        if not obj_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        # Check whether user has permission to view file and get file raw path,
        # render error page if permission deny.
        raw_path, inner_path, user_perm = get_file_view_path_and_perm(request,
                                                                      repo_id,
                                                                      obj_id, path)

        if not user_perm:
            return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to view this file.')

        u_filename = os.path.basename(path)
        filetype, fileext = get_file_type_and_ext(u_filename)
        if filetype != DOCUMENT:
            return api_error(status.HTTP_400_BAD_REQUEST, 'File is not a convertable document')

        ret_dict = {}
        if HAS_OFFICE_CONVERTER:
            err = prepare_converted_html(raw_path, obj_id, fileext, ret_dict)
            # populate return value dict
            ret_dict['err'] = err
            ret_dict['obj_id'] = obj_id
        else:
            ret_dict['filetype'] = 'Unknown'

        return HttpResponse(json.dumps(ret_dict), status=200, content_type=json_content_type)

class ThumbnailView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):

        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        size = request.GET.get('size', None)
        if size is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Size is missing.')

        try:
            size = int(size)
        except ValueError as e:
            logger.error(e)
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid size.')

        path = request.GET.get('p', None)
        obj_id = get_file_id_by_path(repo_id, path)
        if path is None or obj_id is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong path.')

        if repo.encrypted or \
            check_folder_permission(request, repo_id, path) is None:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        success, status_code = generate_thumbnail(request, repo_id, size, path)
        if success:
            thumbnail_dir = os.path.join(THUMBNAIL_ROOT, str(size))
            thumbnail_file = os.path.join(thumbnail_dir, obj_id)
            try:
                with open(thumbnail_file, 'rb') as f:
                    thumbnail = f.read()
                return HttpResponse(thumbnail, 'image/' + THUMBNAIL_EXTENSION)
            except IOError as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Failed to get thumbnail.')
        else:
            if status_code == 400:
                return api_error(status.HTTP_400_BAD_REQUEST, "Invalid argument")
            if status_code == 403:
                return api_error(status.HTTP_403_FORBIDDEN, 'Forbidden')
            if status_code == 500:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Failed to generate thumbnail.')

_REPO_ID_PATTERN = re.compile(r'[-0-9a-f]{36}')

class RepoTokensView(APIView):
    authentication_classes = (TokenAuthentication,)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    @json_response
    def get(self, request, format=None):
        repos_id_str = request.GET.get('repos', None)
        if not repos_id_str:
            return api_error(status.HTTP_400_BAD_REQUEST, "You must specify libaries ids")

        repos_id = [repo_id for repo_id in repos_id_str.split(',') if repo_id]
        if any([not _REPO_ID_PATTERN.match(repo_id) for repo_id in repos_id]):
            return api_error(status.HTTP_400_BAD_REQUEST, "Libraries ids are invalid")

        tokens = {}
        for repo_id in repos_id:
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                continue

            if not check_folder_permission(request, repo.id, '/'):
                continue

            tokens[repo_id] = seafile_api.generate_repo_token(repo_id, request.user.username)

        return tokens

class OrganizationView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request, format=None):

        if not CLOUD_MODE or not MULTI_TENANCY:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.POST.get('username', None)
        password = request.POST.get('password', None)
        org_name = request.POST.get('org_name', None)
        prefix = request.POST.get('prefix', None)
        quota = request.POST.get('quota', None)
        member_limit = request.POST.get('member_limit', ORG_MEMBER_QUOTA_DEFAULT)

        if not org_name or not username or not password or \
                not prefix or not quota or not member_limit:
            return api_error(status.HTTP_400_BAD_REQUEST, "Missing argument")

        if not is_valid_username(username):
            return api_error(status.HTTP_400_BAD_REQUEST, "Email is not valid")

        try:
            quota_mb = int(quota)
        except ValueError as e:
            logger.error(e)
            return api_error(status.HTTP_400_BAD_REQUEST, "Quota is not valid")

        try:
            User.objects.get(email = username)
            user_exist = True
        except User.DoesNotExist:
            user_exist = False

        if user_exist:
            return api_error(status.HTTP_400_BAD_REQUEST, "A user with this email already exists")

        slug_re = re.compile(r'^[-a-zA-Z0-9_]+$')
        if not slug_re.match(prefix):
            return api_error(status.HTTP_400_BAD_REQUEST, "URL prefix can only be letters(a-z), numbers, and the underscore character")

        if ccnet_threaded_rpc.get_org_by_url_prefix(prefix):
            return api_error(status.HTTP_400_BAD_REQUEST, "An organization with this prefix already exists")

        try:
            User.objects.create_user(username, password, is_staff=False, is_active=True)
            create_org(org_name, prefix, username)

            org = ccnet_threaded_rpc.get_org_by_url_prefix(prefix)
            org_id = org.org_id

            # set member limit
            from seahub.organizations.models import OrgMemberQuota
            OrgMemberQuota.objects.set_quota(org_id, member_limit)

            # set quota
            quota = quota_mb * get_file_size_unit('MB')
            seafserv_threaded_rpc.set_org_quota(org_id, quota)

            org_info = {}
            org_info['org_id'] = org_id
            org_info['org_name'] = org.org_name
            org_info['ctime'] = timestamp_to_isoformat_timestr(org.ctime)
            org_info['org_url_prefix'] = org.url_prefix

            creator = org.creator
            org_info['creator_email'] = creator
            org_info['creator_name'] = email2nickname(creator)
            org_info['creator_contact_email'] = email2contact_email(creator)

            return Response(org_info, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Internal Server Error")

class RepoDownloadSharedLinks(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        # check permission
        if org_id:
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if request.user.username != repo_owner or repo.is_virtual:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        shared_links = []
        fileshares = FileShare.objects.filter(repo_id=repo_id)
        for fs in fileshares:
            size = None
            shared_link = {}
            if fs.is_file_share_link():
                path = fs.path.rstrip('/') # Normalize file path
                if seafile_api.get_file_id_by_path(repo.id, fs.path) is None:
                    continue

                obj_id = seafile_api.get_file_id_by_path(repo_id, path)
                size = seafile_api.get_file_size(repo.store_id, repo.version, obj_id)
            else:
                path = fs.path
                if path[-1] != '/': # Normalize dir path
                    path += '/'

                if seafile_api.get_dir_id_by_path(repo.id, fs.path) is None:
                    continue

            shared_link['create_by'] = fs.username
            shared_link['creator_name'] = email2nickname(fs.username)
            shared_link['create_time'] = datetime_to_isoformat_timestr(fs.ctime)
            shared_link['token'] = fs.token
            shared_link['path'] = path
            shared_link['name'] = os.path.basename(path.rstrip('/')) if path != '/' else '/'
            shared_link['view_count'] = fs.view_cnt
            shared_link['share_type'] = fs.s_type
            shared_link['size'] = size if size else ''
            shared_links.append(shared_link)

        return Response(shared_links)

class RepoDownloadSharedLink(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def delete(self, request, repo_id, token, format=None):
        repo = get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        # check permission
        if org_id:
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if request.user.username != repo_owner or repo.is_virtual:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            link = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        link.delete()
        result = {'success': True}
        return Response(result)

class RepoUploadSharedLinks(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        # check permission
        if org_id:
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if request.user.username != repo_owner or repo.is_virtual:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        shared_links = []
        fileshares = UploadLinkShare.objects.filter(repo_id=repo_id)
        for fs in fileshares:
            shared_link = {}
            path = fs.path
            if path[-1] != '/': # Normalize dir path
                path += '/'

            if seafile_api.get_dir_id_by_path(repo.id, fs.path) is None:
                continue

            shared_link['create_by'] = fs.username
            shared_link['creator_name'] = email2nickname(fs.username)
            shared_link['create_time'] = datetime_to_isoformat_timestr(fs.ctime)
            shared_link['token'] = fs.token
            shared_link['path'] = path
            shared_link['name'] = os.path.basename(path.rstrip('/')) if path != '/' else '/'
            shared_link['view_count'] = fs.view_cnt
            shared_links.append(shared_link)

        return Response(shared_links)

class RepoUploadSharedLink(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def delete(self, request, repo_id, token, format=None):
        repo = get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        # check permission
        if org_id:
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if request.user.username != repo_owner or repo.is_virtual:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            link = UploadLinkShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        link.delete()
        result = {'success': True}
        return Response(result)

class RepoUserFolderPerm(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def _get_user_folder_perm_info(self, email, repo_id, path, perm):
        result = {}
        if email and repo_id and path and perm:
            result['repo_id'] = repo_id
            result['user_email'] = email
            result['user_name'] = email2nickname(email)
            result['folder_path'] = path
            result['folder_name'] = path if path == '/' else os.path.basename(path.rstrip('/'))
            result['permission'] = perm

        return result

    def get(self, request, repo_id, format=None):
        """ List repo user folder perms (by folder_path).

        Permission checking:
        1. ( repo owner | admin ) & pro edition & enable folder perm.
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        username = request.user.username
        if not (is_pro_version() and can_set_folder_perm_by_user(username, repo, repo_owner)):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get perm list
        results = []
        path = request.GET.get('folder_path', None)
        folder_perms = seafile_api.list_folder_user_perm_by_repo(repo_id)
        for perm in folder_perms:
            result = {}
            if path:
                if path == perm.path:
                    result = self._get_user_folder_perm_info(
                            perm.user, perm.repo_id, perm.path, perm.permission)
            else:
                result = self._get_user_folder_perm_info(
                        perm.user, perm.repo_id, perm.path, perm.permission)

            if result:
                results.append(result)

        return Response(results)

    def post(self, request, repo_id, format=None):
        """ Add repo user folder perm.

        Permission checking:
        1. ( repo owner | admin ) & pro edition & enable folder perm.
        """

        # argument check
        path = request.data.get('folder_path', None)
        if not path:
            error_msg = 'folder_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        perm = request.data.get('permission', None)
        if not perm or perm not in get_available_repo_perms():
            perm = normalize_custom_permission_name(perm)
            if not perm:
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = path.rstrip('/') if path != '/' else path
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        username = request.user.username
        if not (is_pro_version() and can_set_folder_perm_by_user(username, repo, repo_owner)):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # add repo user folder perm
        result = {}
        result['failed'] = []
        result['success'] = []

        users = request.data.getlist('user_email')
        for user in users:
            if not is_valid_username(user):
                result['failed'].append({
                    'user_email': user,
                    'error_msg': 'user_email invalid.'
                })
                continue

            try:
                User.objects.get(email=user)
            except User.DoesNotExist:
                result['failed'].append({
                    'user_email': user,
                    'error_msg': 'User %s not found.' % user
                })
                continue

            permission = seafile_api.get_folder_user_perm(repo_id, path, user)
            if permission:
                result['failed'].append({
                    'user_email': user,
                    'error_msg': 'Permission already exists.'
                })
                continue

            try:
                seafile_api.add_folder_user_perm(repo_id, path, perm, user)
                send_perm_audit_msg('add-repo-perm', username, user, repo_id, path, perm)
            except SearpcError as e:
                logger.error(e)
                result['failed'].append({
                    'user_email': user,
                    'error_msg': 'Internal Server Error'
                })

            new_perm = seafile_api.get_folder_user_perm(repo_id, path, user)
            new_perm_info = self._get_user_folder_perm_info(
                    user, repo_id, path, new_perm)
            result['success'].append(new_perm_info)

        return Response(result)

    def put(self, request, repo_id, format=None):
        """ Modify repo user folder perm.

        Permission checking:
        1. ( repo owner | admin ) & pro edition & enable folder perm.
        """

        # argument check
        path = request.data.get('folder_path', None)
        if not path:
            error_msg = 'folder_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        perm = request.data.get('permission', None)
        if not perm or perm not in get_available_repo_perms():
            perm = normalize_custom_permission_name(perm)
            if not perm:
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        user = request.data.get('user_email', None)
        if not user:
            error_msg = 'user_email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = path.rstrip('/') if path != '/' else path
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            User.objects.get(email=user)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % user
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        username = request.user.username
        if not (is_pro_version() and can_set_folder_perm_by_user(username, repo, repo_owner)):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        permission = seafile_api.get_folder_user_perm(repo_id, path, user)
        if not permission:
            error_msg = 'Folder permission not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # modify permission
        try:
            seafile_api.set_folder_user_perm(repo_id, path, perm, user)
            send_perm_audit_msg('modify-repo-perm', username, user, repo_id, path, perm)
            new_perm = seafile_api.get_folder_user_perm(repo_id, path, user)
            result = self._get_user_folder_perm_info(user, repo_id, path, new_perm)
            return Response(result)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    def delete(self, request, repo_id, format=None):
        """ Remove repo user folder perms.

        Permission checking:
        1. ( repo owner | admin ) & pro edition & enable folder perm.
        """

        # argument check
        user = request.data.get('user_email', None)
        path = request.data.get('folder_path', None)

        if not user:
            error_msg = 'user_email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not path:
            error_msg = 'folder_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            User.objects.get(email=user)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % user
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        username = request.user.username
        if not (is_pro_version() and can_set_folder_perm_by_user(username, repo, repo_owner)):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # delete permission
        path = path.rstrip('/') if path != '/' else path
        permission = seafile_api.get_folder_user_perm(repo_id, path, user)
        if not permission:
            return Response({'success': True})

        try:
            seafile_api.rm_folder_user_perm(repo_id, path, user)
            send_perm_audit_msg('delete-repo-perm', username,
                    user, repo_id, path, permission)
            return Response({'success': True})
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

class RepoGroupFolderPerm(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def _get_group_folder_perm_info(self, group_id, repo_id, path, perm):
        result = {}
        if group_id and repo_id and path and perm:
            group = ccnet_api.get_group(group_id)
            result['repo_id'] = repo_id
            result['group_id'] = group_id
            result['group_name'] = group.group_name
            result['folder_path'] = path
            result['folder_name'] = path if path == '/' else os.path.basename(path.rstrip('/'))
            result['permission'] = perm

        return result

    def get(self, request, repo_id, format=None):
        """ List repo group folder perms (by folder_path).

        Permission checking:
        1. ( repo owner | admin ) & pro edition & enable folder perm.
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        username = request.user.username
        if not (is_pro_version() and can_set_folder_perm_by_user(username, repo, repo_owner)):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        results = []
        path = request.GET.get('folder_path', None)
        group_folder_perms = seafile_api.list_folder_group_perm_by_repo(repo_id)
        for perm in group_folder_perms:
            result = {}
            if path:
                if path == perm.path:
                    result = self._get_group_folder_perm_info(
                            perm.group_id, perm.repo_id, perm.path,
                            perm.permission)
            else:
                result = self._get_group_folder_perm_info(
                        perm.group_id, perm.repo_id, perm.path,
                        perm.permission)

            if result:
                results.append(result)
        return Response(results)

    def post(self, request, repo_id, format=None):
        """ Add repo group folder perm.

        Permission checking:
        1. ( repo owner | admin ) & pro edition & enable folder perm.
        """

        # argument check
        path = request.data.get('folder_path', None)
        if not path:
            error_msg = 'folder_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        perm = request.data.get('permission', None)
        if not perm or perm not in get_available_repo_perms():
            perm = normalize_custom_permission_name(perm)
            if not perm:
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = path.rstrip('/') if path != '/' else path
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        username = request.user.username
        if not (is_pro_version() and can_set_folder_perm_by_user(username, repo, repo_owner)):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []

        group_ids = request.data.getlist('group_id')
        for group_id in group_ids:
            try:
                group_id = int(group_id)
            except ValueError:
                result['failed'].append({
                    'group_id': group_id,
                    'error_msg': 'group_id invalid.'
                })
                continue

            if not ccnet_api.get_group(group_id):
                result['failed'].append({
                    'group_id': group_id,
                    'error_msg': 'Group %s not found.' % group_id
                })
                continue

            permission = seafile_api.get_folder_group_perm(repo_id, path, group_id)
            if permission:
                result['failed'].append({
                    'group_id': group_id,
                    'error_msg': 'Permission already exists.'
                })
                continue

            try:
                seafile_api.add_folder_group_perm(repo_id, path, perm, group_id)
                send_perm_audit_msg('add-repo-perm', username, group_id, repo_id, path, perm)
            except SearpcError as e:
                logger.error(e)
                result['failed'].append({
                    'group_id': group_id,
                    'error_msg': 'Internal Server Error'
                })

            new_perm = seafile_api.get_folder_group_perm(repo_id, path, group_id)
            new_perm_info = self._get_group_folder_perm_info(
                    group_id, repo_id, path, new_perm)
            result['success'].append(new_perm_info)

        return Response(result)

    def put(self, request, repo_id, format=None):
        """ Modify repo group folder perm.

        Permission checking:
        1. ( repo owner | admin ) & pro edition & enable folder perm.
        """

        # argument check
        path = request.data.get('folder_path', None)
        if not path:
            error_msg = 'folder_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        perm = request.data.get('permission', None)
        if not perm or perm not in get_available_repo_perms():
            perm = normalize_custom_permission_name(perm)
            if not perm:
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        group_id = request.data.get('group_id')
        if not group_id:
            error_msg = 'group_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            group_id = int(group_id)
        except ValueError:
            error_msg = 'group_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = path.rstrip('/') if path != '/' else path
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        username = request.user.username
        if not (is_pro_version() and can_set_folder_perm_by_user(username, repo, repo_owner)):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        permission = seafile_api.get_folder_group_perm(repo_id, path, group_id)
        if not permission:
            error_msg = 'Folder permission not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # modify permission
        try:
            seafile_api.set_folder_group_perm(repo_id, path, perm, group_id)
            send_perm_audit_msg('modify-repo-perm', username, group_id, repo_id, path, perm)
            new_perm = seafile_api.get_folder_group_perm(repo_id, path, group_id)
            result = self._get_group_folder_perm_info(group_id, repo_id, path, new_perm)
            return Response(result)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    def delete(self, request, repo_id, format=None):
        """ Remove repo group folder perm.

        Permission checking:
        1. ( repo owner | admin ) & pro edition & enable folder perm.
        """
        # arguments check
        group_id = request.data.get('group_id', None)
        path = request.data.get('folder_path', None)

        if not group_id:
            error_msg = 'group_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not path:
            error_msg = 'folder_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            group_id = int(group_id)
        except ValueError:
            error_msg = 'group_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        username = request.user.username
        if not (is_pro_version() and can_set_folder_perm_by_user(username, repo, repo_owner)):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # delete permission
        path = path.rstrip('/') if path != '/' else path
        permission = seafile_api.get_folder_group_perm(repo_id, path, group_id)
        if not permission:
            return Response({'success': True})

        try:
            seafile_api.rm_folder_group_perm(repo_id, path, group_id)
            send_perm_audit_msg('delete-repo-perm', username, group_id,
                                repo_id, path, permission)
            return Response({'success': True})
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)


class RemoteWipeReportView(APIView):
    throttle_classes = (UserRateThrottle,)

    @json_response
    def post(self, request):
        token = request.data.get('token', '')
        if not token or len(token) != 40:
            error_msg = 'token invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            entry = TokenV2.objects.get(key=token)
        except TokenV2.DoesNotExist:
            error_msg = 'token %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        else:
            if not entry.wiped_at:
                return api_error(status.HTTP_400_BAD_REQUEST, "invalid device token")
            entry.delete()

        return {}
