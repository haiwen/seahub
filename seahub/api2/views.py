# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import logging
import os
import stat
import json
import datetime
import posixpath
import re
from dateutil.relativedelta import relativedelta
from urllib2 import unquote, quote

from rest_framework import parsers
from rest_framework import status
from rest_framework import renderers
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.reverse import reverse
from rest_framework.response import Response

from django.contrib.auth.hashers import check_password
from django.contrib.sites.models import RequestSite
from django.db import IntegrityError
from django.db.models import F
from django.http import HttpResponse
from django.template import RequestContext
from django.template.loader import render_to_string
from django.template.defaultfilters import filesizeformat
from django.shortcuts import render_to_response
from django.utils import timezone
from django.utils.translation import ugettext as _

from .throttling import ScopedRateThrottle, AnonRateThrottle, UserRateThrottle
from .authentication import TokenAuthentication
from .serializers import AuthTokenSerializer
from .utils import get_diff_details, \
    api_error, get_file_size, prepare_starred_files, \
    get_groups, get_group_and_contacts, prepare_events, \
    api_group_check, get_timestamp, json_response, is_seafile_pro, \
    api_repo_user_folder_perm_check, api_repo_setting_permission_check, \
    api_repo_group_folder_perm_check

from seahub.api2.base import APIView
from seahub.api2.models import TokenV2, DESKTOP_PLATFORMS
from seahub.avatar.templatetags.avatar_tags import api_avatar_url, avatar
from seahub.avatar.templatetags.group_avatar_tags import api_grp_avatar_url, \
        grp_avatar
from seahub.base.accounts import User
from seahub.base.models import UserStarredFiles, DeviceToken
from seahub.base.templatetags.seahub_tags import email2nickname, \
    translate_seahub_time, translate_commit_desc_escape
from seahub.group.views import remove_group_common, \
    rename_group_with_new_name, is_group_staff
from seahub.group.utils import BadGroupNameError, ConflictGroupNameError, \
    validate_group_name
from seahub.thumbnail.utils import generate_thumbnail
from seahub.notifications.models import UserNotification
from seahub.options.models import UserOptions
from seahub.profile.models import Profile, DetailedProfile
from seahub.signals import (repo_created, repo_deleted)
from seahub.share.models import FileShare, OrgFileShare, UploadLinkShare
from seahub.utils import gen_file_get_url, gen_token, gen_file_upload_url, \
    check_filename_with_rename, is_valid_username, EVENTS_ENABLED, \
    get_user_events, EMPTY_SHA1, get_ccnet_server_addr_port, is_pro_version, \
    gen_block_get_url, get_file_type_and_ext, HAS_FILE_SEARCH, \
    gen_file_share_link, gen_dir_share_link, is_org_context, gen_shared_link, \
    get_org_user_events, calculate_repos_last_modify, send_perm_audit_msg, \
    gen_shared_upload_link, convert_cmmt_desc_link, \
    is_org_repo_creation_allowed, is_windows_operating_system
from seahub.utils.devices import do_unlink_device
from seahub.utils.repo import get_sub_repo_abbrev_origin_path
from seahub.utils.star import star_file, unstar_file
from seahub.utils.file_types import DOCUMENT
from seahub.utils.file_size import get_file_size_unit
from seahub.utils.timeutils import utc_to_local, datetime_to_isoformat_timestr
from seahub.views import is_registered_user, check_file_lock, \
    group_events_data, get_diff, create_default_library, \
    list_inner_pub_repos, check_folder_permission
from seahub.views.ajax import get_share_in_repo_list, get_groups_by_user, \
    get_group_repos
from seahub.views.file import get_file_view_path_and_perm, send_file_access_msg
if HAS_FILE_SEARCH:
    from seahub_extra.search.views import search_keyword
from seahub.utils import HAS_OFFICE_CONVERTER
if HAS_OFFICE_CONVERTER:
    from seahub.utils import query_office_convert_status, prepare_converted_html
import seahub.settings as settings
from seahub.settings import THUMBNAIL_EXTENSION, THUMBNAIL_ROOT, \
    FILE_LOCK_EXPIRATION_DAYS, \
    ENABLE_THUMBNAIL, ENABLE_FOLDER_PERM
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
    get_personal_groups_by_user, get_session_info, is_personal_repo, \
    get_repo, check_permission, get_commits, is_passwd_set,\
    check_quota, list_share_repos, get_group_repos_by_owner, get_group_repoids, \
    is_group_user, remove_share, get_group, \
    get_commit, get_file_id_by_path, MAX_DOWNLOAD_DIR_SIZE, edit_repo, \
    ccnet_threaded_rpc, get_personal_groups, seafile_api, \
    create_org, ccnet_api

from constance import config

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'

# Define custom HTTP status code. 4xx starts from 440, 5xx starts from 520.
HTTP_440_REPO_PASSWD_REQUIRED = 440
HTTP_441_REPO_PASSWD_MAGIC_REQUIRED = 441
HTTP_520_OPERATION_FAILED = 520

def UTF8Encode(s):
    if isinstance(s, unicode):
        return s.encode('utf-8')
    else:
        return s

def check_filename_with_rename_utf8(repo_id, parent_dir, filename):
    newname = check_filename_with_rename(repo_id, parent_dir, filename)
    return UTF8Encode(newname)

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
        context = { 'request': request }
        serializer = AuthTokenSerializer(data=request.data, context=context)
        if serializer.is_valid():
            key = serializer.validated_data
            return Response({'token': key})
        headers = {}
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
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        info = {}
        email = request.user.username
        p = Profile.objects.get_profile_by_user(email)
        d_p = DetailedProfile.objects.get_detailed_profile_by_user(email)

        info['email'] = email
        info['name'] = email2nickname(email)
        info['total'] = seafile_api.get_user_quota(email)
        info['usage'] = seafile_api.get_user_self_usage(email)
        info['login_id'] = p.login_id if p and p.login_id else ""
        info['department'] = d_p.department if d_p else ""
        info['contact_email'] = p.contact_email if p else ""
        info['institution'] = p.institution if p and p.institution else ""

        return Response(info)

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
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        if not HAS_FILE_SEARCH:
            return api_error(status.HTTP_404_NOT_FOUND, "Search not supported")

        keyword = request.GET.get('q', None)
        if not keyword:
            return api_error(status.HTTP_400_BAD_REQUEST, "Missing argument")

        results, total, has_more = search_keyword(request, keyword)
        for e in results:
            e.pop('repo', None)
            e.pop('content_highlight', None)
            e.pop('exists', None)
            e.pop('last_modified_by', None)
            e.pop('name_highlight', None)
            e.pop('score', None)
            try:
                path = e['fullpath'].encode('utf-8')
                file_id = seafile_api.get_file_id_by_path(e['repo_id'], path)
                e['oid'] = file_id
                repo = get_repo(e['repo_id'])
                e['size'] = get_file_size(repo.store_id, repo.version, file_id)
            except SearpcError, err:
                pass


        res = { "total":total, "results":results, "has_more":has_more }
        return Response(res)

########## Repo related
def repo_download_info(request, repo_id, gen_sync_token=True):
    repo = get_repo(repo_id)
    if not repo:
        return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

    # generate download url for client
    relay_id = get_session_info().id
    addr, port = get_ccnet_server_addr_port()
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
        'relay_id': relay_id,
        'relay_addr': addr,
        'relay_port': port,
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
        'magic': magic,
        'random_key': random_key,
        'repo_version': repo_version,
        'head_commit_id': repo.head_cmmt_id,
        }
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

        rtype = request.GET.get('type', "")
        if not rtype:
            # set all to True, no filter applied
            filter_by = filter_by.fromkeys(filter_by.iterkeys(), True)

        for f in rtype.split(','):
            f = f.strip()
            filter_by[f] = True

        email = request.user.username

        repos_json = []
        if filter_by['mine']:
            if is_org_context(request):
                org_id = request.user.org.org_id
                owned_repos = seafile_api.get_org_owned_repo_list(org_id,
                        email, ret_corrupted=True)
            else:
                owned_repos = seafile_api.get_owned_repo_list(email,
                        ret_corrupted=True)

            owned_repos.sort(lambda x, y: cmp(y.last_modify, x.last_modify))
            for r in owned_repos:
                # do not return virtual repos
                if r.is_virtual:
                    continue

                repo = {
                    "type": "repo",
                    "id": r.id,
                    "owner": email,
                    "name": r.name,
                    "desc": r.desc,
                    "mtime": r.last_modify,
                    "mtime_relative": translate_seahub_time(r.last_modify),
                    "size": r.size,
                    "size_formatted": filesizeformat(r.size),
                    "encrypted": r.encrypted,
                    "permission": 'rw',  # Always have read-write permission to owned repo
                    "virtual": r.is_virtual,
                    "root": r.root,
                    "head_commit_id": r.head_cmmt_id,
                    "version": r.version,
                }
                if r.encrypted:
                    repo["enc_version"] = r.enc_version
                    repo["magic"] = r.magic
                    repo["random_key"] = r.random_key
                repos_json.append(repo)

        if filter_by['shared']:
            shared_repos = get_share_in_repo_list(request, -1, -1)
            shared_repos.sort(lambda x, y: cmp(y.last_modify, x.last_modify))
            for r in shared_repos:
                r.password_need = is_passwd_set(r.repo_id, email)
                repo = {
                    "type": "srepo",
                    "id": r.repo_id,
                    "owner": r.user,
                    "name": r.repo_name,
                    "owner_nickname": email2nickname(r.user),
                    "desc": r.repo_desc,
                    "mtime": r.last_modify,
                    "mtime_relative": translate_seahub_time(r.last_modify),
                    "size": r.size,
                    "size_formatted": filesizeformat(r.size),
                    "encrypted": r.encrypted,
                    "permission": r.user_perm,
                    "share_type": r.share_type,
                    "root": r.root,
                    "head_commit_id": r.head_cmmt_id,
                    "version": r.version,
                }
                if r.encrypted:
                    repo["enc_version"] = r.enc_version
                    repo["magic"] = r.magic
                    repo["random_key"] = r.random_key
                repos_json.append(repo)

        if filter_by['group']:
            groups = get_groups_by_user(request)
            group_repos = get_group_repos(request, groups)
            group_repos.sort(lambda x, y: cmp(y.last_modify, x.last_modify))
            for r in group_repos:
                repo = {
                    "type": "grepo",
                    "id": r.id,
                    "owner": r.group.group_name,
                    "groupid": r.group.id,
                    "name": r.name,
                    "desc": r.desc,
                    "mtime": r.last_modify,
                    "size": r.size,
                    "encrypted": r.encrypted,
                    "permission": check_permission(r.id, email),
                    "root": r.root,
                    "head_commit_id": r.head_cmmt_id,
                    "version": r.version,
                }
                if r.encrypted:
                    repo["enc_version"] = r.enc_version
                    repo["magic"] = r.magic
                    repo["random_key"] = r.random_key
                repos_json.append(repo)

        if filter_by['org'] and request.user.permissions.can_view_org():
            public_repos = list_inner_pub_repos(request)
            for r in public_repos:
                repo = {
                    "type": "grepo",
                    "id": r.repo_id,
                    "name": r.repo_name,
                    "desc": r.repo_desc,
                    "owner": "Organization",
                    "mtime": r.last_modified,
                    "mtime_relative": translate_seahub_time(r.last_modified),
                    "size": r.size,
                    "size_formatted": filesizeformat(r.size),
                    "encrypted": r.encrypted,
                    "permission": r.permission,
                    "share_from": r.user,
                    "share_type": r.share_type,
                    "root": r.root,
                    "head_commit_id": r.head_cmmt_id,
                    "version": r.version,
                }
                if r.encrypted:
                    repo["enc_version"] = r.enc_version
                    repo["magic"] = r.magic
                    repo["random_key"] = r.random_key
                repos_json.append(repo)

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
            return api_error(status.HTTP_403_FORBIDDEN,
                             'NOT allow to create encrypted library.')

        if org_id > 0:
            repo_id = seafile_api.create_org_repo(repo_name, repo_desc,
                                                  username, passwd, org_id)
        else:
            repo_id = seafile_api.create_repo(repo_name, repo_desc,
                                                username, passwd)
        return repo_id, None

    def _create_enc_repo(self, request, repo_id, repo_name, repo_desc, username, org_id):
        if not _REPO_ID_PATTERN.match(repo_id):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Repo id must be a valid uuid')
        magic = request.data.get('magic', '')
        random_key = request.data.get('random_key', '')
        try:
            enc_version = int(request.data.get('enc_version', 0))
        except ValueError:
            return None, api_error(status.HTTP_400_BAD_REQUEST,
                             'Invalid enc_version param.')
        if len(magic) != 64 or len(random_key) != 96 or enc_version < 0:
            return None, api_error(status.HTTP_400_BAD_REQUEST,
                             'You must provide magic, random_key and enc_version.')

        if org_id > 0:
            repo_id = seafile_api.create_org_enc_repo(repo_id, repo_name, repo_desc,
                                                      username, magic, random_key, enc_version, org_id)
        else:
            repo_id = seafile_api.create_enc_repo(
                repo_id, repo_name, repo_desc, username,
                magic, random_key, enc_version)
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
                "desc": r.repo_desc,
                "owner": r.user,
                "owner_nickname": email2nickname(r.user),
                "mtime": r.last_modified,
                "mtime_relative": translate_seahub_time(r.last_modified),
                "size": r.size,
                "size_formatted": filesizeformat(r.size),
                "encrypted": r.encrypted,
                "permission": r.permission,
                "root": r.root,
            }
            if r.encrypted:
                repo["enc_version"] = r.enc_version
                repo["magic"] = r.magic
                repo["random_key"] = r.random_key
            repos_json.append(repo)

        return Response(repos_json)

    def post(self, request, format=None):
        # Create public repo
        if not request.user.permissions.can_add_repo():
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
                                                  username, passwd, org_id)
            repo = seafile_api.get_repo(repo_id)
            seaserv.seafserv_threaded_rpc.set_org_inner_pub_repo(
                org_id, repo.id, permission)
        else:
            repo_id = seafile_api.create_repo(repo_name, repo_desc,
                                              username, passwd)
            repo = seafile_api.get_repo(repo_id)
            seafile_api.add_inner_pub_repo(repo.id, permission)

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
        }

        return Response(pub_repo, status=201)

def set_repo_password(request, repo, password):
    assert password, 'password must not be none'

    try:
        seafile_api.set_passwd(repo.id, request.user.username, password)
    except SearpcError, e:
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
        password = request.REQUEST.get('password', default=None)
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
            "type":"repo",
            "id":repo.id,
            "owner":owner,
            "name":repo.name,
            "desc":repo.desc,
            "mtime":repo.latest_modify,
            "size":repo.size,
            "encrypted":repo.encrypted,
            "root":root_id,
            "permission": check_permission(repo.id, username),
            }
        if repo.encrypted:
            repo_json["enc_version"] = repo.enc_version
            repo_json["magic"] = repo.magic
            repo_json["random_key"] = repo.random_key

        return Response(repo_json)

    def post(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        op = request.GET.get('op', 'setpassword')
        if op == 'checkpassword':
            magic = request.REQUEST.get('magic', default=None)
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

            # check permission
            if is_org_context(request):
                repo_owner = seafile_api.get_org_repo_owner(repo.id)
            else:
                repo_owner = seafile_api.get_repo_owner(repo.id)
            is_owner = True if username == repo_owner else False
            if not is_owner:
                return api_error(status.HTTP_403_FORBIDDEN,
                        'You do not have permission to rename this library.')

            if edit_repo(repo_id, repo_name, repo_desc, username):
                return Response("success")
            else:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "Unable to rename library")

        return Response("unsupported operation")

    def delete(self, request, repo_id, format=None):
        username = request.user.username
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Library does not exist.')

        # check permission
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo.id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo.id)
        is_owner = True if username == repo_owner else False
        if not is_owner:
            return api_error(
                status.HTTP_403_FORBIDDEN,
                'You do not have permission to delete this library.'
            )

        usernames = seaserv.get_related_users_by_repo(repo_id)
        seafile_api.remove_repo(repo_id)
        repo_deleted.send(sender=None,
                          org_id=-1,
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
        if repo.is_virtual or username != repo_owner:
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
        if repo.is_virtual or \
            not config.ENABLE_REPO_HISTORY_SETTING or \
            username != repo_owner:

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
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to access this library.')

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

        if org_id and not ccnet_api.org_user_exists(org_id, new_owner):
            error_msg = _(u'User %s not found in organization.') % new_owner
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if org_id:
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        username = request.user.username
        if username != repo_owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not new_owner_obj.permissions.can_add_repo():
            error_msg = 'Transfer failed: role of %s is %s, can not add library.' % \
                    (new_owner, new_owner_obj.role)
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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
                seafile_api.set_org_repo_owner(org_id, repo_id, new_owner)
            else:
                if ccnet_api.get_orgs_by_user(new_owner):
                    # can not transfer library to organization user %s.
                    error_msg = 'Email %s invalid.' % new_owner
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
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

            if not ccnet_api.is_group_user(shared_group_id, new_owner):
                continue

            if org_id:
                seafile_api.add_org_group_repo(repo_id, org_id,
                        shared_group_id, new_owner, shared_group.perm)
            else:
                seafile_api.set_group_repo(repo_id, shared_group_id,
                        new_owner, shared_group.perm)

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
            return api_error(HTTP_520_OPERATION_FAILED, 'Above quota')

        token = seafile_api.get_fileserver_access_token(
                repo_id, file_id, 'downloadblks', request.user.username)
        url = gen_block_get_url(token, block_id)
        return Response(url)

class UploadLinkView(APIView):
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
            return api_error(HTTP_520_OPERATION_FAILED, 'Above quota')

        token = seafile_api.get_fileserver_access_token(
            repo_id, 'dummy', 'upload', request.user.username, use_onetime = False)
        url = gen_file_upload_url(token, 'upload-api')
        return Response(url)

class UpdateLinkView(APIView):
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
            return api_error(HTTP_520_OPERATION_FAILED, 'Above quota')

        token = seafile_api.get_fileserver_access_token(
            repo_id, 'dummy', 'update', request.user.username)
        url = gen_file_upload_url(token, 'update-api')
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
            return api_error(HTTP_520_OPERATION_FAILED, 'Above quota')

        token = seafile_api.get_fileserver_access_token(
            repo_id, 'dummy', 'upload-blks-api', request.user.username,
            use_onetime = False)
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
            return api_error(HTTP_520_OPERATION_FAILED, 'Above quota')

        token = seafile_api.get_fileserver_access_token(
            repo_id, 'dummy', 'upload', request.user.username,
            use_onetime = False)
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
            return api_error(HTTP_520_OPERATION_FAILED, 'Above quota')

        token = seafile_api.get_fileserver_access_token(
            repo_id, 'dummy', 'update-blks-api', request.user.username,
            use_onetime = False)
        url = gen_file_upload_url(token, 'update-blks-api')
        return Response(url)

def get_dir_recursively(username, repo_id, path, all_dirs):
    path_id = seafile_api.get_dir_id_by_path(repo_id, path)
    dirs = seafserv_threaded_rpc.list_dir_with_perm(repo_id, path,
            path_id, username, -1, -1)

    for dirent in dirs:
        if stat.S_ISDIR(dirent.mode):
            entry = {}
            entry["type"] = 'dir'
            entry["parent_dir"] = path
            entry["id"] = dirent.obj_id
            entry["name"] = dirent.obj_name
            entry["mtime"] = dirent.mtime
            entry["permission"] = dirent.permission
            all_dirs.append(entry)

            sub_path = posixpath.join(path, dirent.obj_name)
            get_dir_recursively(username, repo_id, sub_path, all_dirs)

    return all_dirs

def get_dir_entrys_by_id(request, repo, path, dir_id, request_type=None):
    """ Get dirents in a dir

    if request_type is 'f', only return file list,
    if request_type is 'd', only return dir list,
    else, return both.
    """
    username = request.user.username
    try:
        dirs = seafserv_threaded_rpc.list_dir_with_perm(repo.id, path, dir_id,
                username, -1, -1)
        dirs = dirs if dirs else []
    except SearpcError, e:
        logger.error(e)
        return api_error(HTTP_520_OPERATION_FAILED,
                         "Failed to list dir.")

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

            if is_pro_version():
                entry["is_locked"] = dirent.is_locked
                entry["lock_owner"] = dirent.lock_owner
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

    dir_list.sort(lambda x, y: cmp(x['name'].lower(), y['name'].lower()))
    file_list.sort(lambda x, y: cmp(x['name'].lower(), y['name'].lower()))

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
        except IntegrityError, e:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, e.msg)

    http_or_https = request.is_secure() and 'https' or 'http'
    domain = RequestSite(request).domain
    file_shared_link = '%s://%s%sf/%s/' % (http_or_https, domain,
                                           settings.SITE_ROOT, token)
    return file_shared_link

def get_repo_file(request, repo_id, file_id, file_name, op, use_onetime=True):
    if op == 'download':
        token = seafile_api.get_fileserver_access_token(repo_id, file_id, op,
                                                        request.user.username,
                                                        use_onetime)

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
    except SearpcError, e:
        logger.error(e)
        return api_error(HTTP_520_OPERATION_FAILED,
                         "Failed to get dir id by path")

    if not dir_id:
        return api_error(status.HTTP_404_NOT_FOUND, "Path does not exist")

    return get_dir_entrys_by_id(request, repo, parent_dir, dir_id)

def reloaddir_if_necessary (request, repo, parent_dir):

    reload_dir = False
    s = request.GET.get('reloaddir', None)
    if s and s.lower() == 'true':
        reload_dir = True

    if not reload_dir:
        return Response('success')

    return reloaddir(request, repo, parent_dir)

# deprecated
class OpDeleteView(APIView):
    """
    Delete files.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )

    def post(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        username = request.user.username
        if check_folder_permission(request, repo_id, '/') != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to delete this file.')

        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        parent_dir = request.GET.get('p')
        file_names = request.POST.get("file_names")

        if not parent_dir or not file_names:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'File or directory not found.')

        parent_dir_utf8 = parent_dir.encode('utf-8')
        for file_name in file_names.split(':'):
            file_name = unquote(file_name.encode('utf-8'))
            try:
                seafile_api.del_file(repo_id, parent_dir_utf8,
                                     file_name, username)
            except SearpcError, e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 "Failed to delete file.")

        return reloaddir_if_necessary (request, repo, parent_dir_utf8)

class OpMoveView(APIView):
    """
    Move files.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )

    def post(self, request, repo_id, format=None):

        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        username = request.user.username
        parent_dir = request.GET.get('p', '/')
        dst_repo = request.POST.get('dst_repo', None)
        dst_dir = request.POST.get('dst_dir', None)
        file_names = request.POST.get("file_names", None)

        if not parent_dir or not file_names or not dst_repo or not dst_dir:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Missing argument.')

        if check_folder_permission(request, repo_id, parent_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to move file in this folder.')

        if check_folder_permission(request, dst_repo, dst_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to move file to destination folder.')

        if repo_id == dst_repo and parent_dir == dst_dir:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'The destination directory is the same as the source.')

        parent_dir_utf8 = parent_dir.encode('utf-8')
        for file_name in file_names.split(':'):
            file_name = unquote(file_name.encode('utf-8'))
            new_filename = check_filename_with_rename_utf8(dst_repo, dst_dir,
                                                           file_name)
            try:
                seafile_api.move_file(repo_id, parent_dir_utf8, file_name,
                                      dst_repo, dst_dir, new_filename,
                                      replace=False, username=username,
                                      need_progress=0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                return api_error(HTTP_520_OPERATION_FAILED,
                                 "Failed to move file.")

        return reloaddir_if_necessary (request, repo, parent_dir_utf8)

class OpCopyView(APIView):
    """
    Copy files.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )

    def post(self, request, repo_id, format=None):

        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        username = request.user.username
        parent_dir = request.GET.get('p', '/')
        dst_repo = request.POST.get('dst_repo', None)
        dst_dir = request.POST.get('dst_dir', None)
        file_names = request.POST.get("file_names", None)

        if not parent_dir or not file_names or not dst_repo or not dst_dir:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Missing argument.')

        if check_folder_permission(request, repo_id, parent_dir) is None:
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to copy file of this folder.')

        if check_folder_permission(request, dst_repo, dst_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN,
                    'You do not have permission to copy file to destination folder.')

        if not get_repo(dst_repo):
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        if seafile_api.get_dir_id_by_path(repo_id, parent_dir) is None or \
            seafile_api.get_dir_id_by_path(dst_repo, dst_dir) is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path does not exist.')

        parent_dir_utf8 = parent_dir.encode('utf-8')
        for file_name in file_names.split(':'):
            file_name = unquote(file_name.encode('utf-8'))
            new_filename = check_filename_with_rename_utf8(dst_repo, dst_dir,
                                                           file_name)
            try:
                seafile_api.copy_file(repo_id, parent_dir_utf8, file_name,
                                      dst_repo, dst_dir, new_filename,
                                      username, 0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                return api_error(HTTP_520_OPERATION_FAILED,
                                 "Failed to copy file.")

        return reloaddir_if_necessary(request, repo, parent_dir_utf8)


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
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal error')

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
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal error')

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
        from seahub_extra.wopi.utils import get_wopi_dict
        username = request.user.username
        wopi_dict = get_wopi_dict(username, repo_id, path)

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
            file_id = seafile_api.get_file_id_by_path(repo_id,
                                                      path.encode('utf-8'))
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

        if operation.lower() == 'rename':
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to rename file.')

            newname = request.POST.get('newname', '')
            if not newname:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'New name is missing')
            newname = newname.encode('utf-8')
            if len(newname) > settings.MAX_UPLOAD_FILE_NAME_LEN:
                return api_error(status.HTTP_400_BAD_REQUEST, 'New name is too long')

            parent_dir_utf8 = parent_dir.encode('utf-8')
            oldname = os.path.basename(path)
            if oldname == newname:
                return api_error(status.HTTP_409_CONFLICT,
                                 'The new name is the same to the old')

            newname = check_filename_with_rename_utf8(repo_id, parent_dir,
                                                      newname)
            try:
                seafile_api.rename_file(repo_id, parent_dir, oldname, newname,
                                        username)
            except SearpcError,e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 "Failed to rename file: %s" % e)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, repo, parent_dir_utf8)
            else:
                resp = Response('success', status=status.HTTP_301_MOVED_PERMANENTLY)
                uri = reverse('FileView', args=[repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(parent_dir_utf8) + quote(newname)
                return resp

        elif operation.lower() == 'move':
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to move file.')

            src_dir = os.path.dirname(path)
            src_dir_utf8 = src_dir.encode('utf-8')
            src_repo_id = repo_id
            dst_repo_id = request.POST.get('dst_repo', '')
            dst_dir = request.POST.get('dst_dir', '')
            dst_dir_utf8 = dst_dir.encode('utf-8')
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
            filename_utf8 = filename.encode('utf-8')
            new_filename_utf8 = check_filename_with_rename_utf8(dst_repo_id,
                                                                dst_dir,
                                                                filename)
            try:
                seafile_api.move_file(src_repo_id, src_dir_utf8,
                                      filename_utf8, dst_repo_id,
                                      dst_dir_utf8, new_filename_utf8,
                                      replace=False, username=username,
                                      need_progress=0, synchronous=1)
            except SearpcError, e:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "SearpcError:" + e.msg)

            dst_repo = get_repo(dst_repo_id)
            if not dst_repo:
                return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, dst_repo, dst_dir)
            else:
                resp = Response('success', status=status.HTTP_301_MOVED_PERMANENTLY)
                uri = reverse('FileView', args=[dst_repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(dst_dir_utf8) + quote(new_filename_utf8)
                return resp

        elif operation.lower() == 'copy':
            src_repo_id = repo_id
            src_dir = os.path.dirname(path)
            src_dir_utf8 = src_dir.encode('utf-8')
            dst_repo_id = request.POST.get('dst_repo', '')
            dst_dir = request.POST.get('dst_dir', '')
            dst_dir_utf8 = dst_dir.encode('utf-8')

            if dst_dir[-1] != '/': # Append '/' to the end of directory if necessary
                dst_dir += '/'

            if not (dst_repo_id and dst_dir):
                return api_error(status.HTTP_400_BAD_REQUEST, 'Missing arguments.')

            if src_repo_id == dst_repo_id and src_dir == dst_dir:
                return Response('success', status=status.HTTP_200_OK)

            # check src folder permission
            if check_folder_permission(request, repo_id, src_dir) is None:
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to copy file.')

            # check dst folder permission
            if check_folder_permission(request, dst_repo_id, dst_dir) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to copy file.')

            filename = os.path.basename(path)
            filename_utf8 = filename.encode('utf-8')
            new_filename_utf8 = check_filename_with_rename_utf8(dst_repo_id,
                                                                dst_dir,
                                                                filename)
            try:
                seafile_api.copy_file(src_repo_id, src_dir_utf8,
                                      filename_utf8, dst_repo_id,
                                      dst_dir_utf8, new_filename_utf8,
                                      username, 0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "SearpcError:" + e.msg)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, dst_repo, dst_dir)
            else:
                resp = Response('success', status=status.HTTP_200_OK)
                uri = reverse('FileView', args=[dst_repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(dst_dir_utf8) + quote(new_filename_utf8)
                return resp

        elif operation.lower() == 'create':
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to create file.')

            parent_dir_utf8 = parent_dir.encode('utf-8')
            new_file_name = os.path.basename(path)
            new_file_name_utf8 = check_filename_with_rename_utf8(repo_id,
                                                                 parent_dir,
                                                                 new_file_name)

            try:
                seafile_api.post_empty_file(repo_id, parent_dir,
                                            new_file_name_utf8, username)
            except SearpcError, e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 'Failed to create file.')

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, repo, parent_dir)
            else:
                resp = Response('success', status=status.HTTP_201_CREATED)
                uri = reverse('FileView', args=[repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(parent_dir_utf8) + \
                    quote(new_file_name_utf8)
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

        operation = request.data.get('operation', '')
        if operation.lower() == 'lock':

            is_locked, locked_by_me = check_file_lock(repo_id, path, username)
            if is_locked:
                return api_error(status.HTTP_403_FORBIDDEN, 'File is already locked')

            # lock file
            expire = request.data.get('expire', FILE_LOCK_EXPIRATION_DAYS)
            try:
                seafile_api.lock_file(repo_id, path.lstrip('/'), username, expire)
                return Response('success', status=status.HTTP_200_OK)
            except SearpcError, e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal error')

        if operation.lower() == 'unlock':
            is_locked, locked_by_me = check_file_lock(repo_id, path, username)
            if not is_locked:
                return api_error(status.HTTP_403_FORBIDDEN, 'File is not locked')
            if not locked_by_me:
                return api_error(status.HTTP_403_FORBIDDEN, 'You can not unlock this file')

            # unlock file
            try:
                seafile_api.unlock_file(repo_id, path.lstrip('/'))
                return Response('success', status=status.HTTP_200_OK)
            except SearpcError, e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal error')
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

        parent_dir_utf8 = os.path.dirname(path).encode('utf-8')
        file_name_utf8 = os.path.basename(path).encode('utf-8')

        try:
            seafile_api.del_file(repo_id, parent_dir_utf8,
                                 file_name_utf8,
                                 request.user.username)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to delete file.")

        return reloaddir_if_necessary(request, repo, parent_dir_utf8)

class FileDetailView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = seafile_api.get_repo(repo_id)
        if repo is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Library not found.')

        path = request.GET.get('p', None)
        if path is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        commit_id = request.GET.get('commit_id', None)
        if commit_id:
            try:
                obj_id = seafserv_threaded_rpc.get_file_id_by_commit_and_path(
                    repo.id, commit_id, path)
            except SearpcError as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 'Failed to get file id.')
        else:
            try:
                obj_id = seafile_api.get_file_id_by_path(repo_id,
                                                         path.encode('utf-8'))
            except SearpcError as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 'Failed to get file id.')

        if not obj_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        # fetch file contributors and latest contributor
        try:
            # get real path for sub repo
            real_path = repo.origin_path + path if repo.origin_path else path
            dirent = seafile_api.get_dirent_by_path(repo.store_id, real_path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
            else:
                latest_contributor, last_modified = None, 0
        except SearpcError as e:
            logger.error(e)
            latest_contributor, last_modified = None, 0

        entry = {}
        try:
            entry["size"] = get_file_size(repo.store_id, repo.version, obj_id)
        except Exception, e:
            entry["size"] = 0

        entry["type"] = "file"
        entry["name"] = os.path.basename(path)
        entry["id"] = obj_id
        entry["mtime"] = last_modified

        return HttpResponse(json.dumps(entry), status=200,
                            content_type=json_content_type)

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
    authentication_classes = (TokenAuthentication, )
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
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        path = request.GET.get('p', None)
        if path is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        try:
            commits = seafserv_threaded_rpc.list_file_revisions(repo_id, path,
                                                                -1, -1)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Internal error")

        if not commits:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        return HttpResponse(json.dumps({"commits": commits}, cls=SearpcObjEncoder), status=200, content_type=json_content_type)

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

        path = request.data.get('p', None)
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing')

        username = request.user.username
        password = request.data.get('password', None)
        share_type = request.data.get('share_type', 'download')

        if password and len(password) < config.SHARE_LINK_PASSWORD_MIN_LENGTH:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Password is too short')

        if share_type.lower() == 'download':

            if check_folder_permission(request, repo_id, path) is None:
                return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied')

            if not request.user.permissions.can_generate_share_link():
                error_msg = 'Can not generate share link.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            expire = request.data.get('expire', None)
            if expire:
                try:
                    expire_days = int(expire)
                except ValueError:
                    return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid expiration days')
                else:
                    expire_date = timezone.now() + relativedelta(days=expire_days)
            else:
                expire_date = None

            is_dir = False
            if path == '/':
                is_dir = True
            else:
                try:
                    real_path = repo.origin_path + path if repo.origin_path else path
                    dirent = seafile_api.get_dirent_by_path(repo.store_id, real_path)
                except SearpcError as e:
                    logger.error(e)
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Internal error")

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
class DirView(APIView):
    """
    Support uniform interface for directory operations, including
    create/delete/rename/list, etc.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        # list dir
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        path = request.GET.get('p', '/')
        if path[-1] != '/':
            path = path + '/'

        if check_folder_permission(request, repo_id, path) is None:
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this folder.')

        try:
            dir_id = seafile_api.get_dir_id_by_path(repo_id,
                                                    path.encode('utf-8'))
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to get dir id by path.")

        if not dir_id:
            return api_error(status.HTTP_404_NOT_FOUND, "Path does not exist")

        old_oid = request.GET.get('oid', None)
        if old_oid and old_oid == dir_id:
            response = HttpResponse(json.dumps("uptodate"), status=200,
                                    content_type=json_content_type)
            response["oid"] = dir_id
            return response
        else:
            request_type = request.GET.get('t', None)
            if request_type and request_type not in ('f', 'd'):
                return api_error(status.HTTP_400_BAD_REQUEST,
                        "'t'(type) should be 'f' or 'd'.")

            if request_type == 'd':
                recursive = request.GET.get('recursive', '0')
                if recursive not in ('1', '0'):
                    return api_error(status.HTTP_400_BAD_REQUEST,
                            "If you want to get recursive dir entries, you should set 'recursive' argument as '1'.")

                if recursive == '1':
                    username = request.user.username
                    dir_list = get_dir_recursively(username, repo_id, path, [])
                    dir_list.sort(lambda x, y: cmp(x['name'].lower(), y['name'].lower()))
                    response = HttpResponse(json.dumps(dir_list), status=200,
                                            content_type=json_content_type)
                    response["oid"] = dir_id
                    response["dir_perm"] = seafile_api.check_permission_by_path(repo_id, path, username)

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
        parent_dir_utf8 = parent_dir.encode('utf-8')

        if operation.lower() == 'mkdir':
            parent_dir = os.path.dirname(path)
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to access this folder.')

            create_parents = request.POST.get('create_parents', '').lower() in ('true', '1')
            if not create_parents:
                # check whether parent dir exists
                if not seafile_api.get_dir_id_by_path(repo_id, parent_dir):
                    return api_error(status.HTTP_400_BAD_REQUEST,
                                     'Parent dir does not exist')

                new_dir_name = os.path.basename(path)
                new_dir_name_utf8 = check_filename_with_rename_utf8(repo_id,
                                                                    parent_dir,
                                                                    new_dir_name)
                try:
                    seafile_api.post_dir(repo_id, parent_dir,
                                         new_dir_name_utf8, username)
                except SearpcError as e:
                    logger.error(e)
                    return api_error(HTTP_520_OPERATION_FAILED,
                                     'Failed to make directory.')
            else:
                if not is_seafile_pro():
                    return api_error(status.HTTP_400_BAD_REQUEST,
                                     'Feature not supported.')
                try:
                    seafile_api.mkdir_with_parents(repo_id, '/',
                                                   path[1:], username)
                except SearpcError as e:
                    logger.error(e)
                    return api_error(HTTP_520_OPERATION_FAILED,
                                     'Failed to make directory.')
                new_dir_name_utf8 = os.path.basename(path).encode('utf-8')

            if request.GET.get('reloaddir', '').lower() == 'true':
                resp = reloaddir(request, repo, parent_dir)
            else:
                resp = Response('success', status=status.HTTP_201_CREATED)
                uri = reverse('DirView', args=[repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(parent_dir_utf8) + \
                    quote(new_dir_name_utf8)
            return resp
        elif operation.lower() == 'rename':
            if check_folder_permission(request, repo.id, path) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to access this folder.')

            parent_dir = os.path.dirname(path)
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
            except SearpcError, e:
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
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        path = request.GET.get('p', None)
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        if check_folder_permission(request, repo_id, path) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to access this folder.')

        if path == '/':         # Can not delete root path.
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is invalid.')

        if path[-1] == '/':     # Cut out last '/' if possible.
            path = path[:-1]

        parent_dir = os.path.dirname(path)
        parent_dir_utf8 = os.path.dirname(path).encode('utf-8')
        file_name_utf8 = os.path.basename(path).encode('utf-8')

        username = request.user.username
        try:
            seafile_api.del_file(repo_id, parent_dir_utf8,
                                 file_name_utf8, username)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to delete file.")

        return reloaddir_if_necessary(request, repo, parent_dir_utf8)

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
        if not check_folder_permission(request, repo_id, path) or \
                not request.user.permissions.can_add_repo():
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
                        error_msg = _(u'Wrong password')
                        return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
                    elif e.msg == 'Internal server error':
                        error_msg = _(u'Internal server error')
                        return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
                    else:
                        error_msg = _(u'Decrypt library error')
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

        joined_groups = get_personal_groups_by_user(username)
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
            shared_repos += seaserv.list_inner_pub_repos(username)

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
            file_id = seafserv_threaded_rpc.get_file_id_by_path(repo_id,
                                                                path.encode('utf-8'))
        except SearpcError, e:
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
                return api_error(status.HTTP_403_FORBIDDEN, "Password is required")

            if not check_password(password, fileshare.password):
                return api_error(status.HTTP_403_FORBIDDEN, "Invalid Password")

        repo_id = fileshare.repo_id
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, "Library not found")

        path = fileshare.path.rstrip('/') # Normalize file path
        file_name = os.path.basename(path)

        file_id = None
        try:
            file_id = seafserv_threaded_rpc.get_file_id_by_path(repo_id,
                                                                path.encode('utf-8'))
            commits = seafserv_threaded_rpc.list_file_revisions(repo_id, path,
                                                                -1, -1)
            c = commits[0]
        except SearpcError, e:
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
                return api_error(status.HTTP_403_FORBIDDEN, "Password is required")

            if not check_password(password, fileshare.password):
                return api_error(status.HTTP_403_FORBIDDEN, "Invalid Password")

        req_path = request.GET.get('p', '/')

        if req_path[-1] != '/':
            req_path += '/'

        if req_path == '/':
            real_path = fileshare.path
        else:
            real_path = posixpath.join(fileshare.path, req_path.lstrip('/'))

        if real_path[-1] != '/':         # Normalize dir path
            real_path += '/'

        dir_id = seafile_api.get_dir_id_by_path(repo_id, real_path)
        if not dir_id:
            return api_error(status.HTTP_400_BAD_REQUEST, "Invalid path")

        username = fileshare.username
        try:
            dirs = seafserv_threaded_rpc.list_dir_with_perm(repo_id, real_path, dir_id,
                    username, -1, -1)
            dirs = dirs if dirs else []
        except SearpcError, e:
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

        dir_list.sort(lambda x, y: cmp(x['name'].lower(), y['name'].lower()))
        file_list.sort(lambda x, y: cmp(x['name'].lower(), y['name'].lower()))
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
        username = request.user.username

        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if username != repo_owner:
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to share library.')

        share_type = request.GET.get('share_type')
        user = request.GET.get('user')
        users = request.GET.get('users')
        group_id = request.GET.get('group_id')
        permission = request.GET.get('permission')

        if permission != 'rw' and permission != "r":
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Permission need to be rw or r.')

        if share_type == 'personal':
            from_email = seafile_api.get_repo_owner(repo_id)
            shared_users = []
            invalid_users = []
            notexistent_users = []
            notsharable_errors = []

            usernames = []
            if user:
                usernames += user.split(",")
            if users:
                usernames += users.split(",")
            if not user and not users:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'User or users (comma separated are mandatory) are not provided')
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
                    seafile_api.share_repo(repo_id, from_email, u, permission)
                    shared_users.append(u)
                except SearpcError, e:
                    logger.error(e)
                    notsharable_errors.append(e)

            if invalid_users or notexistent_users or notsharable_errors:
                # removing already created share
                for s_user in shared_users:
                    try:
                        remove_share(repo_id, from_email, s_user)
                    except SearpcError, e:
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

        elif share_type == 'group':
            try:
                group_id = int(group_id)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'Group ID must be integer.')

            from_email = seafile_api.get_repo_owner(repo_id)
            group = get_group(group_id)
            if not group:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'Group does not exist .')
            try:
                seafile_api.set_group_repo(repo_id, int(group_id),
                                           from_email, permission)
            except SearpcError, e:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "Searpc Error: " + e.msg)

        elif share_type == 'public':
            if not CLOUD_MODE:
                if not is_org_repo_creation_allowed(request):
                    return api_error(status.HTTP_403_FORBIDDEN,
                                     'Failed to share library to public: permission denied.')

                try:
                    seafile_api.add_inner_pub_repo(repo_id, permission)
                except SearpcError, e:
                    logger.error(e)
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                     'Failed to share library to public.')
            else:
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    try:
                        seaserv.seafserv_threaded_rpc.set_org_inner_pub_repo(org_id, repo_id, permission)
                        send_perm_audit_msg('add-repo-perm', username, 'all', repo_id, '/', permission)
                    except SearpcError, e:
                        logger.error(e)
                        return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                         'Failed to share library to public.')
                else:
                    return api_error(status.HTTP_403_FORBIDDEN,
                                     'Failed to share library to public.')
        else:
            return api_error(status.HTTP_400_BAD_REQUEST,
                    'Share type can only be personal or group or public.')

        return Response('success', status=status.HTTP_200_OK)

class GroupAndContacts(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        contacts, umsgnum, group_json, gmsgnum, replies, replynum = get_group_and_contacts(request.user.username)
        res = {
            "groups": group_json,
            "contacts": contacts,
            "newreplies":replies,
            "replynum": replynum,
            "umsgnum" : umsgnum,
            "gmsgnum" : gmsgnum,
            }
        return Response(res)

class EventsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        if not EVENTS_ENABLED:
            events = None
            return api_error(status.HTTP_404_NOT_FOUND, 'Events not enabled.')

        start = request.GET.get('start', '')

        if not start:
            start = 0
        else:
            try:
                start = int(start)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST, 'Start id must be integer')

        email = request.user.username
        events_count = 15

        if is_org_context(request):
            org_id = request.user.org.org_id
            events, events_more_offset = get_org_user_events(org_id, email,
                                                             start,
                                                             events_count)
        else:
            events, events_more_offset = get_user_events(email, start,
                                                         events_count)
        events_more = True if len(events) == events_count else False

        l = []
        for e in events:
            d = dict(etype=e.etype)
            l.append(d)
            if e.etype == 'repo-update':
                d['author'] = e.commit.creator_name
                d['time'] = e.commit.ctime
                d['desc'] = e.commit.desc
                d['repo_id'] = e.repo.id
                d['repo_name'] = e.repo.name
                d['commit_id'] = e.commit.id
                d['converted_cmmt_desc'] = translate_commit_desc_escape(convert_cmmt_desc_link(e.commit))
                d['more_files'] = e.commit.more_files
                d['repo_encrypted'] = e.repo.encrypted
            else:
                d['repo_id'] = e.repo_id
                d['repo_name'] = e.repo_name
                if e.etype == 'repo-create':
                    d['author'] = e.creator
                else:
                    d['author'] = e.repo_owner

                epoch = datetime.datetime(1970, 1, 1)
                local = utc_to_local(e.timestamp)
                time_diff = local - epoch
                d['time'] = time_diff.seconds + (time_diff.days * 24 * 3600)

            size = request.GET.get('size', 36)
            url, is_default, date_uploaded = api_avatar_url(d['author'], size)
            d['nick'] = email2nickname(d['author'])
            d['name'] = email2nickname(d['author'])
            d['avatar'] = avatar(d['author'], size)
            d['avatar_url'] = request.build_absolute_uri(url)
            d['time_relative'] = translate_seahub_time(utc_to_local(e.timestamp))
            d['date'] = utc_to_local(e.timestamp).strftime("%Y-%m-%d")

        ret = {
            'events': l,
            'more': events_more,
            'more_offset': events_more_offset,
            }
        return Response(ret)

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
            joined_groups = get_personal_groups_by_user(request.user.username)

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
            current_groups = len(get_personal_groups_by_user(username))
            if current_groups > num_of_groups:
                result['error'] = 'You can only create %d groups.' % num_of_groups
                return HttpResponse(json.dumps(result), status=500,
                                    content_type=content_type)

        group_name = request.data.get('group_name', None)
        group_name = group_name.strip()
        if not validate_group_name(group_name):
            result['error'] = 'Failed to rename group, group name can only contain letters, numbers, blank, hyphen or underscore.'
            return HttpResponse(json.dumps(result), status=403,
                                content_type=content_type)

        # Check whether group name is duplicated.
        if request.cloud_mode:
            checked_groups = get_personal_groups_by_user(username)
        else:
            checked_groups = get_personal_groups(-1, -1)
        for g in checked_groups:
            if g.group_name == group_name:
                result['error'] = 'There is already a group with that name.'
                return HttpResponse(json.dumps(result), status=400,
                                    content_type=content_type)

        # Group name is valid, create that group.
        try:
            group_id = ccnet_threaded_rpc.create_group(group_name.encode('utf-8'),
                                                       username)
            return HttpResponse(json.dumps({'success': True, 'group_id': group_id}),
                                content_type=content_type)
        except SearpcError, e:
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
        except SearpcError, e:
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
        except SearpcError, e:
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
        if permission != 'r' and permission != 'rw':
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid permission')

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id
            repo_id = seafile_api.create_org_repo(repo_name, repo_desc,
                                                  username, passwd, org_id)
            repo = seafile_api.get_repo(repo_id)
            seafile_api.add_org_group_repo(repo_id, org_id, group.id,
                                           username, permission)
        else:
            repo_id = seafile_api.create_repo(repo_name, repo_desc,
                                              username, passwd)
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
            "share_from_me": True,
        }

        return Response(group_repo, status=200)

    @api_group_check
    def get(self, request, group, format=None):
        username = request.user.username

        if group.is_pub:
            if not request.user.is_staff and not is_group_user(group.id, username):
                return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if is_org_context(request):
            org_id = request.user.org.org_id
            repos = seafile_api.get_org_group_repos(org_id, group.id)
        else:
            repos = seafile_api.get_repos_by_group(group.id)

        repos.sort(lambda x, y: cmp(y.last_modified, x.last_modified))
        group.is_staff = is_group_staff(group, request.user)

        repos_json = []
        for r in repos:
            repo = {
                "id": r.id,
                "name": r.name,
                "desc": r.desc,
                "size": r.size,
                "size_formatted": filesizeformat(r.size),
                "mtime": r.last_modified,
                "mtime_relative": translate_seahub_time(r.last_modified),
                "encrypted": r.encrypted,
                "permission": r.permission,
                "owner": r.user,
                "owner_nickname": email2nickname(r.user),
                "share_from_me": True if username == r.user else False,
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

        if not group.is_staff and not seafile_api.is_repo_owner(username, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if seaserv.is_org_group(group_id):
            org_id = seaserv.get_org_id_by_group(group_id)
            seaserv.del_org_group_repo(repo_id, org_id, group_id)
        else:
            seafile_api.unset_group_repo(repo_id, group_id, username)

        return HttpResponse(json.dumps({'success': True}), status=200,
                            content_type=json_content_type)

class UserAvatarView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, user, size, format=None):
        url, is_default, date_uploaded = api_avatar_url(user, int(size))
        ret = {
            "url": request.build_absolute_uri(url),
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
            except Exception, e:
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
                obj_id = seafile_api.get_file_id_by_path(repo_id,
                                                      path.encode('utf-8'))
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
            err = prepare_converted_html(inner_path, obj_id, fileext, ret_dict)
            # populate return value dict
            ret_dict['err'] = err
            ret_dict['obj_id'] = obj_id
        else:
            ret_dict['filetype'] = 'Unknown'

        return HttpResponse(json.dumps(ret_dict), status=200, content_type=json_content_type)

class ThumbnailView(APIView):
    authentication_classes = (TokenAuthentication,)
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

        if repo.encrypted or not ENABLE_THUMBNAIL or \
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
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied')

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

            new_org = ccnet_threaded_rpc.get_org_by_url_prefix(prefix)

            # set member limit
            from seahub_extra.organizations.models import OrgMemberQuota
            OrgMemberQuota.objects.set_quota(new_org.org_id, member_limit)

            # set quota
            quota = quota_mb * get_file_size_unit('MB')
            seafserv_threaded_rpc.set_org_quota(new_org.org_id, quota)

            return Response('success', status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Internal error")

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

def get_repo_user_folder_perm_result(repo_id, path, user):
    result = {}
    permission = seafile_api.get_folder_user_perm(repo_id, path, user)
    if permission:
        result['repo_id'] = repo_id
        result['user_email'] = user
        result['user_name'] = email2nickname(user)
        result['folder_path'] = path
        result['folder_name'] = path if path == '/' else os.path.basename(path.rstrip('/'))
        result['permission'] = permission

    return result

class RepoUserFolderPerm(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    @api_repo_setting_permission_check
    def get(self, request, repo_id, format=None):

        if not is_pro_version():
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        results = []
        folder_perms = seafile_api.list_folder_user_perm_by_repo(repo_id)
        for perm in folder_perms:
            result = {}
            result['repo_id'] = perm.repo_id
            result['user_email'] = perm.user
            result['user_name'] = email2nickname(perm.user)
            result['folder_path'] = perm.path
            result['folder_name'] = perm.path if perm.path == '/' else os.path.basename(perm.path.rstrip('/'))
            result['permission'] = perm.permission

            results.append(result)

        return Response(results)

    @api_repo_user_folder_perm_check
    def post(self, request, repo_id, format=None):

        if not (is_pro_version() and ENABLE_FOLDER_PERM):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        user = request.data.get('user_email')
        path = request.data.get('folder_path')
        perm = request.data.get('permission')
        path = path.rstrip('/') if path != '/' else path

        permission = seafile_api.get_folder_user_perm(repo_id, path, user)
        if permission:
            error_msg = 'Permission already exists.'
            return api_error(status.HTTP_409_CONFLICT, error_msg)

        username = request.user.username
        try:
            seafile_api.add_folder_user_perm(repo_id, path, perm, user)
            send_perm_audit_msg('add-repo-perm', username, user, repo_id, path, perm)
            result = get_repo_user_folder_perm_result(repo_id, path, user)
            return Response(result)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    @api_repo_user_folder_perm_check
    def put(self, request, repo_id, format=None):

        if not (is_pro_version() and ENABLE_FOLDER_PERM):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        user = request.data.get('user_email')
        path = request.data.get('folder_path')
        perm = request.data.get('permission')
        path = path.rstrip('/') if path != '/' else path

        permission = seafile_api.get_folder_user_perm(repo_id, path, user)
        if not permission:
            error_msg = 'Folder permission not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        try:
            seafile_api.set_folder_user_perm(repo_id, path, perm, user)
            send_perm_audit_msg('modify-repo-perm', username, user, repo_id, path, perm)
            result = get_repo_user_folder_perm_result(repo_id, path, user)
            return Response(result)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    def delete(self, request, repo_id, format=None):

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
        if not (is_pro_version() and ENABLE_FOLDER_PERM) or \
                repo.is_virtual or username != repo_owner:
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

def get_repo_group_folder_perm_result(repo_id, path, group_id):
    result = {}
    group = seaserv.get_group(group_id)
    permission = seafile_api.get_folder_group_perm(repo_id, path, group_id)
    if permission:
        result['repo_id'] = repo_id
        result['group_id'] = group_id
        result['group_name'] = group.group_name
        result['folder_path'] = path
        result['folder_name'] = path if path == '/' else os.path.basename(path.rstrip('/'))
        result['permission'] = permission

    return result

class RepoGroupFolderPerm(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    @api_repo_setting_permission_check
    def get(self, request, repo_id, format=None):

        if not is_pro_version():
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        results = []
        group_folder_perms = seafile_api.list_folder_group_perm_by_repo(repo_id)
        for perm in group_folder_perms:
            result = {}
            group = seaserv.get_group(perm.group_id)
            result['repo_id'] = perm.repo_id
            result['group_id'] = perm.group_id
            result['group_name'] = group.group_name
            result['folder_path'] = perm.path
            result['folder_name'] = perm.path if perm.path == '/' else os.path.basename(perm.path.rstrip('/'))
            result['permission'] = perm.permission

            results.append(result)

        return Response(results)

    @api_repo_group_folder_perm_check
    def post(self, request, repo_id, format=None):

        if not (is_pro_version() and ENABLE_FOLDER_PERM):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        group_id = request.data.get('group_id')
        path = request.data.get('folder_path')
        perm = request.data.get('permission')
        group_id = int(group_id)
        path = path.rstrip('/') if path != '/' else path

        permission = seafile_api.get_folder_group_perm(repo_id, path, group_id)
        if permission:
            error_msg = 'Permission already exists.'
            return api_error(status.HTTP_409_CONFLICT, error_msg)

        username = request.user.username
        try:
            seafile_api.add_folder_group_perm(repo_id, path, perm, group_id)
            send_perm_audit_msg('add-repo-perm', username, group_id, repo_id, path, perm)
            result = get_repo_group_folder_perm_result(repo_id, path, group_id)
            return Response(result)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    @api_repo_group_folder_perm_check
    def put(self, request, repo_id, format=None):

        if not (is_pro_version() and ENABLE_FOLDER_PERM):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        group_id = request.data.get('group_id')
        path = request.data.get('folder_path')
        perm = request.data.get('permission')
        group_id = int(group_id)
        path = path.rstrip('/') if path != '/' else path

        permission = seafile_api.get_folder_group_perm(repo_id, path, group_id)
        if not permission:
            error_msg = 'Folder permission not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        try:
            seafile_api.set_folder_group_perm(repo_id, path, perm, group_id)
            send_perm_audit_msg('modify-repo-perm', username, group_id, repo_id, path, perm)
            result = get_repo_group_folder_perm_result(repo_id, path, group_id)
            return Response(result)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    def delete(self, request, repo_id, format=None):

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
        if not (is_pro_version() and ENABLE_FOLDER_PERM) or \
                repo.is_virtual or username != repo_owner:
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
