# encoding: utf-8
import logging
import os
import stat
import json
import datetime
import urllib2
from urllib2 import unquote, quote
from PIL import Image
from StringIO import StringIO

from rest_framework import parsers
from rest_framework import status
from rest_framework import renderers
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.reverse import reverse
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from django.contrib.sites.models import RequestSite
from django.db import IntegrityError
from django.db.models import F
from django.http import HttpResponse, Http404
from django.template import RequestContext
from django.template.loader import render_to_string
from django.shortcuts import render_to_response
from django.utils import timezone

from .throttling import ScopedRateThrottle
from .authentication import TokenAuthentication
from .serializers import AuthTokenSerializer, AccountSerializer
from .utils import is_repo_writable, is_repo_accessible, calculate_repo_info, \
    api_error, get_file_size, prepare_starred_files, \
    get_groups, get_group_and_contacts, prepare_events, \
    get_person_msgs, api_group_check, get_email, get_timestamp, \
    get_group_message_json, get_group_msgs, get_group_msgs_json, get_diff_details
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.avatar.templatetags.group_avatar_tags import api_grp_avatar_url
from seahub.base.accounts import User
from seahub.base.models import FileDiscuss, UserStarredFiles, DeviceToken
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.group.models import GroupMessage, MessageReply, MessageAttachment
from seahub.group.signals import grpmsg_added, grpmsg_reply_added
from seahub.group.views import group_check, remove_group_common, \
    rename_group_with_new_name
from seahub.group.utils import BadGroupNameError, ConflictGroupNameError
from seahub.message.models import UserMessage
from seahub.notifications.models import UserNotification
from seahub.options.models import UserOptions
from seahub.profile.models import Profile
from seahub.shortcuts import get_first_object_or_none
from seahub.signals import repo_created, share_file_to_user_successful
from seahub.share.models import PrivateFileDirShare, FileShare, OrgFileShare
from seahub.share.views import list_shared_repos
from seahub.utils import gen_file_get_url, gen_token, gen_file_upload_url, \
    check_filename_with_rename, is_valid_username, EVENTS_ENABLED, \
    get_user_events, EMPTY_SHA1, get_ccnet_server_addr_port, \
    gen_block_get_url, get_file_type_and_ext, HAS_FILE_SEARCH, \
    gen_file_share_link, gen_dir_share_link, is_org_context, gen_shared_link, \
    get_org_user_events
from seahub.utils.star import star_file, unstar_file
from seahub.utils.file_types import IMAGE, DOCUMENT
from seahub.views import validate_owner, is_registered_user, \
    group_events_data, get_diff, create_default_library, get_owned_repo_list, \
    list_inner_pub_repos, get_virtual_repos_by_owner, check_folder_permission
from seahub.views.ajax import get_share_in_repo_list, get_groups_by_user, \
    get_group_repos
from seahub.views.file import get_file_view_path_and_perm, send_file_download_msg
if HAS_FILE_SEARCH:
    from seahub_extra.search.views import search_keyword
from seahub.utils import HAS_OFFICE_CONVERTER
if HAS_OFFICE_CONVERTER:
    from seahub.utils import query_office_convert_status, \
        query_office_file_pages, prepare_converted_html
import seahub.settings as settings
from seahub.settings import THUMBNAIL_EXTENSION, THUMBNAIL_ROOT, \
        ENABLE_THUMBNAIL
try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False

from pysearpc import SearpcError, SearpcObjEncoder
import seaserv
from seaserv import seafserv_rpc, seafserv_threaded_rpc, server_repo_size, \
    get_personal_groups_by_user, get_session_info, is_personal_repo, \
    get_repo, check_permission, get_commits, is_passwd_set,\
    list_personal_repos_by_owner, check_quota, \
    list_share_repos, get_group_repos_by_owner, get_group_repoids, \
    list_inner_pub_repos_by_owner, \
    remove_share, unshare_group_repo, unset_inner_pub_repo, get_group, \
    get_commit, get_file_id_by_path, MAX_DOWNLOAD_DIR_SIZE, edit_repo, \
    ccnet_threaded_rpc, get_personal_groups, seafile_api, check_group_staff

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
        serializer = AuthTokenSerializer(data=request.DATA, context=context)
        if serializer.is_valid():
            key = serializer.object
            return Response({'token': key})

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        
        accounts_ldap = []
        accounts_db = []
        if scope:
            scope = scope.upper()
            if scope == 'LDAP':
                accounts_ldap = seaserv.get_emailusers('LDAP', start, limit)
            elif scope == 'DB':
                accounts_db = seaserv.get_emailusers('DB', start, limit)
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
        for account in accounts_db:
            accounts_json.append({'email': account.email, 'source' : 'DB'})

        return Response(accounts_json)

class Account(APIView):
    """Query/Add/Delete a specific account.
    Administator permission is required.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, email, format=None):
        if not is_valid_username(email):
            return api_error(status.HTTP_404_NOT_FOUND, 'User not found.')

        # query account info
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND, 'User not found.')

        info = {}
        info['email'] = user.email
        info['id'] = user.id
        info['is_staff'] = user.is_staff
        info['is_active'] = user.is_active
        info['create_time'] = user.ctime
        info['total'] = seafile_api.get_user_quota(email)
        info['usage'] = seafile_api.get_user_self_usage(email)

        return Response(info)

    def put(self, request, email, format=None):
        if not is_valid_username(email):
            return api_error(status.HTTP_404_NOT_FOUND, 'User not found.')

        # create or update account
        copy = request.DATA.copy()
        copy.update({'email': email})
        serializer = AccountSerializer(data=copy)
        if serializer.is_valid():
            try:
                User.objects.get(email=serializer.object['email'])
                update = True
            except User.DoesNotExist:
                update = False

            user = User.objects.create_user(serializer.object['email'],
                                            serializer.object['password'],
                                            serializer.object['is_staff'],
                                            serializer.object['is_active'])

            name = request.DATA.get("name", None)
            note = request.DATA.get("note", None)
            if name or note:
                try:
                    profile = Profile.objects.get(user=user.username)
                except Profile.DoesNotExist:
                    profile = Profile()

                profile.user = user.username

                if name:
                    if '/' in name:
                        return api_error(status.HTTP_400_BAD_REQUEST, "Nickname should not include '/'")
                    else:
                        profile.nickname = name
                if note:
                    profile.intro = note

                profile.save()

            if update:
                resp = Response('success')
            else:
                resp = Response('success', status=status.HTTP_201_CREATED)
                resp['Location'] = reverse('api2-account', args=[email])
            return resp
        else:
            return api_error(status.HTTP_400_BAD_REQUEST, serializer.errors)

    def delete(self, request, email, format=None):
        if not is_valid_username(email):
            return api_error(status.HTTP_404_NOT_FOUND, 'User not found.')

        # delete account
        try:
            user = User.objects.get(email=email)
            user.delete()
            return Response("success")
        except User.DoesNotExist:
            resp = Response("success", status=status.HTTP_202_ACCEPTED)
            return resp

class AccountInfo(APIView):
    """ Show account info.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        info = {}
        email = request.user.username
        info['email'] = email
        info['nickname'] = email2nickname(email)
        info['total'] = seafile_api.get_user_quota(email)
        info['usage'] = seafile_api.get_user_self_usage(email)

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
def repo_download_info(request, repo_id):
    repo = get_repo(repo_id)
    if not repo:
        return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

    # generate download url for client
    relay_id = get_session_info().id
    addr, port = get_ccnet_server_addr_port ()
    email = request.user.username
    token = seafile_api.generate_repo_token(repo_id, request.user.username)
    repo_name = repo.name
    enc = 1 if repo.encrypted else ''
    magic = repo.magic if repo.encrypted else ''
    random_key = repo.random_key if repo.random_key else ''
    enc_version = repo.enc_version
    repo_version = repo.version

    info_json = {
        'relay_id': relay_id,
        'relay_addr': addr,
        'relay_port': port,
        'email': email,
        'token': token,
        'repo_id': repo_id,
        'repo_name': repo_name,
        'encrypted': enc,
        'enc_version': enc_version,
        'magic': magic,
        'random_key': random_key,
        'repo_version': repo_version,
        }
    return Response(info_json)

class Repos(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        email = request.user.username
        repos_json = []

        owned_repos = get_owned_repo_list(request)
        calculate_repo_info(owned_repos, email)
        owned_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
        sub_lib_enabled = settings.ENABLE_SUB_LIBRARY \
            and UserOptions.objects.is_sub_lib_enabled(email)

        for r in owned_repos:
            if r.is_virtual and not sub_lib_enabled:
                continue
            repo = {
                "type":"repo",
                "id":r.id,
                "owner":email,
                "name":r.name,
                "desc":r.desc,
                "mtime":r.latest_modify,
                "root":r.root,
                "size":r.size,
                "encrypted":r.encrypted,
                "permission": 'rw', # Always have read-write permission to owned repo
                "virtual": r.is_virtual,
            }
            if r.encrypted:
                repo["enc_version"] = r.enc_version
                repo["magic"] = r.magic
                repo["random_key"] = r.random_key
            repos_json.append(repo)

        shared_repos = get_share_in_repo_list(request, -1, -1)
        for r in shared_repos:
            commit = get_commits(r.repo_id, 0, 1)[0]
            if not commit:
                continue
            r.latest_modify = commit.ctime
            r.root = commit.root_id
            r.size = server_repo_size(r.repo_id)
            r.password_need = is_passwd_set(r.repo_id, email)
            repo = {
                "type":"srepo",
                "id":r.repo_id,
                "owner":r.user,
                "name":r.repo_name,
                "desc":r.repo_desc,
                "mtime":r.latest_modify,
                "root":r.root,
                "size":r.size,
                "encrypted":r.encrypted,
                "permission": r.user_perm,
                }
            if r.encrypted:
                repo["enc_version"] = r.enc_version
                repo["magic"] = r.magic
                repo["random_key"] = r.random_key
            repos_json.append(repo)

        groups = get_groups_by_user(request)
        group_repos = get_group_repos(request, groups)
        calculate_repo_info(group_repos, email)
        group_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
        for r in group_repos:
            repo = {
                "type":"grepo",
                "id":r.id,
                "owner":r.group.group_name,
                "groupid":r.group.id,
                "name":r.name,
                "desc":r.desc,
                "mtime":r.latest_modify,
                "root":r.root,
                "size":r.size,
                "encrypted":r.encrypted,
                "permission": check_permission(r.id, email),
                }
            if r.encrypted:
                repo["enc_version"] = r.enc_version
                repo["magic"] = r.magic
                repo["random_key"] = r.random_key
            repos_json.append(repo)

        if request.user.permissions.can_view_org():
            public_repos = list_inner_pub_repos(request)
            for r in public_repos:
                commit = get_commits(r.repo_id, 0, 1)[0]
                if not commit:
                    continue
                r.root = commit.root_id
                r.size = server_repo_size(r.repo_id)
                repo = {
                    "type": "grepo",
                    "id": r.repo_id,
                    "name": r.repo_name,
                    "desc": r.repo_desc,
                    "owner": "Organization",
                    "mtime": r.last_modified,
                    "root": r.root,
                    "size": r.size,
                    "encrypted": r.encrypted,
                    "permission": r.permission,
                }
                if r.encrypted:
                    repo["enc_version"] = commit.enc_version
                    repo["magic"] = commit.magic
                    repo["random_key"] = commit.random_key
                repos_json.append(repo)

        return Response(repos_json)

    def post(self, request, format=None):
        if not request.user.permissions.can_add_repo():
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to create library.')

        username = request.user.username
        repo_name = request.POST.get("name", None)
        repo_desc = request.POST.get("desc", 'new repo')
        passwd = request.POST.get("passwd")
        if not repo_name:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Library name is required.')

        # create a repo
        org_id = -1
        try:
            if is_org_context(request):
                org_id = request.user.org.org_id
                repo_id = seafile_api.create_org_repo(repo_name, repo_desc,
                                                      username, passwd, org_id)
            else:
                repo_id = seafile_api.create_repo(repo_name, repo_desc,
                                                  username, passwd)
        except:
            return api_error(HTTP_520_OPERATION_FAILED,
                             'Failed to create library.')
        if not repo_id:
            return api_error(HTTP_520_OPERATION_FAILED,
                             'Failed to create library.')
        else:
            repo_created.send(sender=None,
                              org_id=org_id,
                              creator=username,
                              repo_id=repo_id,
                              repo_name=repo_name)
            resp = repo_download_info(request, repo_id)

            # FIXME: according to the HTTP spec, need to return 201 code and
            # with a corresponding location header
            # resp['Location'] = reverse('api2-repo', args=[repo_id])
            return resp

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
        return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this repo.')

    if repo.encrypted:
        password = request.REQUEST.get('password', default=None)
        if not password:
            return api_error(HTTP_440_REPO_PASSWD_REQUIRED,
                             'Repo password is needed.')

        return set_repo_password(request, repo, password)

def check_repo_access_permission(request, repo):
    if not seafile_api.check_repo_access_permission(repo.id,
                                                    request.user.username):
        return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this repo.')

class Repo(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        username = request.user.username
        if not is_repo_accessible(repo.id, username):
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to get repo.')

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
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        op = request.GET.get('op', 'setpassword')
        if op == 'checkpassword':
            magic = request.REQUEST.get('magic', default=None)
            if not magic:
                return api_error(HTTP_441_REPO_PASSWD_MAGIC_REQUIRED,
                                 'Repo password magic is needed.')
            resp = check_repo_access_permission(request, repo)
            if resp:
                return resp
            try:
                seafile_api.check_passwd(repo.id, magic)
            except SearpcError, e:
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
                                 'Only library owner can perform this operation.')

            if edit_repo(repo_id, repo_name, repo_desc, username):
                return Response("success")
            else:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "Unable to rename repo")

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
            return api_error(status.HTTP_403_FORBIDDEN,
                             'Only library owner can perform this operation.')

        seafile_api.remove_repo(repo_id)
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

class DownloadRepo(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        username = request.user.username
        if not is_repo_accessible(repo_id, username):
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to get repo.')

        return repo_download_info(request, repo_id)

class RepoPublic(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def post(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        if check_permission(repo_id, request.user.username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this repo.')

        try:
            seafile_api.add_inner_pub_repo(repo_id, "r")
        except:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Unable to make repo public')

        return HttpResponse(json.dumps({'success': True}), status=200,
                            content_type=json_content_type)

    def delete(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        if check_permission(repo_id, request.user.username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this repo.')

        try:
            seafile_api.remove_inner_pub_repo(repo_id)
        except:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Unable to make repo private')

        return HttpResponse(json.dumps({'success': True}), status=200,
                            content_type=json_content_type)


class RepoOwner(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo.id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo.id)

        return HttpResponse(json.dumps({"owner": repo_owner}), status=200,
                            content_type=json_content_type)

########## File related
class UploadLinkView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        parent_dir = request.GET.get('p', None)
        if parent_dir is None:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Missing argument.')

        if check_folder_permission(repo_id, parent_dir, request.user.username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this folder.')

        if check_quota(repo_id) < 0:
            return api_error(HTTP_520_OPERATION_FAILED, 'Above quota')

        token = seafile_api.get_fileserver_access_token(
            repo_id, 'dummy', 'upload', request.user.username)
        url = gen_file_upload_url(token, 'upload-api')
        return Response(url)

class UpdateLinkView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        parent_dir = request.GET.get('p', None)
        if parent_dir is None:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Missing argument.')

        if check_folder_permission(repo_id, parent_dir, request.user.username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this folder.')

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
        parent_dir = request.GET.get('p', None)
        if parent_dir is None:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Missing argument.')

        if check_folder_permission(repo_id, parent_dir, request.user.username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this folder.')

        if check_quota(repo_id) < 0:
            return api_error(HTTP_520_OPERATION_FAILED, 'Above quota')

        token = seafile_api.get_fileserver_access_token(
            repo_id, 'dummy', 'upload-blks', request.user.username)
        url = gen_file_upload_url(token, 'upload-blks-api')
        return Response(url)

class UpdateBlksLinkView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        parent_dir = request.GET.get('p', None)
        if parent_dir is None:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Missing argument.')

        if check_folder_permission(repo_id, parent_dir, request.user.username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this folder.')

        if check_quota(repo_id) < 0:
            return api_error(HTTP_520_OPERATION_FAILED, 'Above quota')

        token = seafile_api.get_fileserver_access_token(
            repo_id, 'dummy', 'update-blks', request.user.username)
        url = gen_file_upload_url(token, 'update-blks-api')
        return Response(url)

def get_dir_entrys_by_id(request, repo, path, dir_id):
    try:
        dirs = seafile_api.list_dir_by_dir_id(repo.id, dir_id)
    except SearpcError, e:
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

    response = HttpResponse(json.dumps(dentrys), status=200,
                            content_type=json_content_type)
    response["oid"] = dir_id
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
    return Response(file_shared_link)

def get_repo_file(request, repo_id, file_id, file_name, op):
    if op == 'download':
        token = seafile_api.get_fileserver_access_token(repo_id, file_id, op,
                                                        request.user.username)
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
                blks = seafile_api.list_file_by_file_id(repo_id, file_id)
                blklist = blks.split('\n')
            except SearpcError, e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 'Failed to get file block list')
        blklist = [i for i in blklist if len(i) == 40]
        if len(blklist) > 0:
            repo = get_repo(repo_id)
            encrypted = repo.encrypted
            enc_version = repo.enc_version
        token = seafile_api.get_fileserver_access_token(
            repo_id, file_id, op, request.user.username)
        url = gen_block_get_url(token, None)
        res = {
            'blklist':blklist,
            'url':url,
            'encrypted':encrypted,
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
        return get_shared_link(request, repo_id, path)

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
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        username = request.user.username
        if not is_repo_writable(repo.id, username):
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to delete file.')

        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

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
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        username = request.user.username
        if not is_repo_writable(repo.id, username):
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to delete file.')

        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        parent_dir = request.GET.get('p', None)
        dst_repo = request.POST.get('dst_repo', None)
        dst_dir = request.POST.get('dst_dir', None)
        file_names = request.POST.get("file_names", None)

        if not parent_dir or not file_names or not dst_repo or not dst_dir:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Missing argument.')
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
                                      username, 0, synchronous=1)
            except SearpcError,e:
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
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        username = request.user.username
        if not is_repo_writable(repo.id, username):
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to delete file.')

        parent_dir = request.GET.get('p', None)
        dst_repo = request.POST.get('dst_repo', None)
        dst_dir = request.POST.get('dst_dir', None)
        file_names = request.POST.get("file_names", None)

        if not parent_dir or not file_names or not dst_repo or not dst_dir:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Missing argument.')

        if check_folder_permission(repo_id, parent_dir, username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this folder.')

        parent_dir = request.GET.get('p', None)
        dst_repo = request.POST.get('dst_repo', None)
        dst_dir = request.POST.get('dst_dir', None)
        file_names = request.POST.get("file_names", None)

        if not parent_dir or not file_names or not dst_repo or not dst_dir:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Missing argument.')

        parent_dir_utf8 = parent_dir.encode('utf-8')
        for file_name in file_names.split(':'):
            file_name = unquote(file_name.encode('utf-8'))
            new_filename = check_filename_with_rename_utf8(dst_repo, dst_dir,
                                                           file_name)
            try:
                seafile_api.copy_file(repo_id, parent_dir_utf8, file_name,
                                      dst_repo, dst_dir, new_filename,
                                      username, 0, synchronous=1)
            except SearpcError,e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 "Failed to copy file.")

        return reloaddir_if_necessary(request, repo, parent_dir_utf8)


class StarredFileView(APIView):
    """
    Support uniform interface for starred file operation,
    including add/delete/list starred files.
    """

    authentication_classes = (TokenAuthentication, )
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
        path = unquote(request.POST.get('p', '').encode('utf-8'))
        if not (repo_id and path):
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Repo_id or path is missing.')

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
                             'Repo_id or path is missing.')

        if path[-1] == '/':     # Should not contain '/' at the end of path.
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid file path.')

        unstar_file(request.user.username, repo_id, path)
        return Response('success', status=status.HTTP_200_OK)

class FileView(APIView):
    """
    Support uniform interface for file related operations,
    including create/delete/rename/view, etc.
    """

    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        # view file
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        path = request.GET.get('p', None)
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')
        file_name = os.path.basename(path)

        file_id = None
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id,
                                                      path.encode('utf-8'))
        except SearpcError, e:
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to get file id by path.")

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, "File not found")

        # send stats message
        send_file_download_msg(request, repo, path, 'api')

        op = request.GET.get('op', 'download')
        return get_repo_file(request, repo_id, file_id, file_name, op)

    def post(self, request, repo_id, format=None):
        # rename, move or create file
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        path = request.GET.get('p', '')
        username = request.user.username
        parent_dir = os.path.dirname(path)
        if check_folder_permission(repo_id, parent_dir, username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this folder.')

        if not path or path[0] != '/':
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Path is missing or invalid.')

        operation = request.POST.get('operation', '')
        if operation.lower() == 'rename':
            if not is_repo_writable(repo.id, username):
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to rename file.')

            newname = request.POST.get('newname', '')
            if not newname:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'Newname is missing')
            newname = unquote(newname.encode('utf-8'))
            if len(newname) > settings.MAX_UPLOAD_FILE_NAME_LEN:
                return api_error(status.HTTP_400_BAD_REQUEST, 'Newname too long')

            parent_dir = os.path.dirname(path)
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
            if not is_repo_writable(repo.id, username):
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

            # names = obj_names.split(':')
            # names = map(lambda x: unquote(x).decode('utf-8'), names)

            # if dst_dir.startswith(src_dir):
            #     for obj_name in names:
            #         if dst_dir.startswith('/'.join([src_dir, obj_name])):
            #             return api_error(status.HTTP_409_CONFLICT,
            #                              'Can not move a dirctory to its subdir')

            filename = os.path.basename(path)
            filename_utf8 = filename.encode('utf-8')
            new_filename_utf8 = check_filename_with_rename_utf8(dst_repo_id,
                                                                dst_dir,
                                                                filename)
            try:
                seafile_api.move_file(src_repo_id, src_dir_utf8,
                                      filename_utf8, dst_repo_id,
                                      dst_dir_utf8, new_filename_utf8,
                                      username, 0, synchronous=1)
            except SearpcError, e:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "SearpcError:" + e.msg)

            dst_repo = get_repo(dst_repo_id)
            if not dst_repo:
                return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, dst_repo, dst_dir)
            else:
                resp = Response('success', status=status.HTTP_301_MOVED_PERMANENTLY)
                uri = reverse('FileView', args=[dst_repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(dst_dir_utf8) + quote(new_filename_utf8)
                return resp
        elif operation.lower() == 'create':
            if not is_repo_writable(repo.id, username):
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to create file.')

            parent_dir = os.path.dirname(path)
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
        # update file
        # TODO
        pass

    def delete(self, request, repo_id, format=None):
        # delete file
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        username = request.user.username
        if not is_repo_writable(repo.id, username):
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to delete file.')

        path = request.GET.get('p', None)
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        parent_dir = os.path.dirname(path)
        if check_folder_permission(repo_id, parent_dir, username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this folder.')

        parent_dir_utf8 = os.path.dirname(path).encode('utf-8')
        file_name_utf8 = os.path.basename(path).encode('utf-8')

        try:
            seafile_api.del_file(repo_id, parent_dir_utf8,
                                 file_name_utf8,
                                 request.user.username)
        except SearpcError, e:
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
                c = get_commit(repo.id, repo.version, commit_id)
            except:
                return api_error(status.HTTP_404_NOT_FOUND, 'Revision not found.')
        else:
            try:
                obj_id = seafile_api.get_file_id_by_path(repo_id,
                                                         path.encode('utf-8'))
                commits = seafserv_threaded_rpc.list_file_revisions(repo_id,
                                                                    path,
                                                                    -1, -1)
                c = commits[0]
            except:
                return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        if not obj_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        entry = {}
        try:
            entry["size"] = get_file_size(repo.store_id, repo.version, obj_id)
        except Exception, e:
            entry["size"] = 0

        entry["type"] = "file"
        entry["name"] = os.path.basename(path)
        entry["id"] = obj_id
        entry["mtime"] = c.ctime

        return HttpResponse(json.dumps(entry), status=200,
                            content_type=json_content_type)

class FileRevert(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def put(self, request, repo_id, format=None):
        path = request.DATA.get('p', '')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        parent_dir = os.path.dirname(path)
        username = request.uset.username
        if check_folder_permission(repo_id, parent_dir, username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this folder.')

        path = unquote(path.encode('utf-8'))
        commit_id = unquote(request.DATA.get('commit_id', '').encode('utf-8'))
        try:
            ret = seafserv_threaded_rpc.revert_file (repo_id, commit_id,
                            path, request.user.username)
        except SearpcError, e:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Server error')

        return HttpResponse(json.dumps({"ret": ret}), status=200, content_type=json_content_type)

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
        except SearpcError, e:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Server error')

        if not commits:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        return HttpResponse(json.dumps({"commits": commits}, cls=SearpcObjEncoder), status=200, content_type=json_content_type)

class FileSharedLinkView(APIView):
    """
    Support uniform interface for file shared link.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, repo_id, format=None):
        # generate file shared link
        username = request.user.username
        path = unquote(request.DATA.get('p', '').encode('utf-8'))
        type = unquote(request.DATA.get('type', 'f').encode('utf-8'))

        if type not in ('d', 'f'):
            return api_error(status.HTTP_400_BAD_REQUEST, 'invalid type')

        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        if path[-1] == '/':
            path = path[:-1]

        if type == 'f':
            fs = FileShare.objects.get_file_link_by_path(username, repo_id,
                                                         path)
            if fs is None:
                fs = FileShare.objects.create_file_link(username, repo_id,
                                                        path)
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    OrgFileShare.objects.set_org_file_share(org_id, fs)
        else:
            fs = FileShare.objects.get_dir_link_by_path(username, repo_id,
                                                        path)
            if fs is None:
                fs = FileShare.objects.create_dir_link(username, repo_id,
                                                       path)
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    OrgFileShare.objects.set_org_file_share(org_id, fs)

        token = fs.token
        shared_link = gen_shared_link(token, fs.s_type)

        resp = Response(status=status.HTTP_201_CREATED)
        resp['Location'] = shared_link
        return resp

########## Directory related
class DirView(APIView):
    """
    Support uniform interface for directory operations, including
    create/delete/rename/list, etc.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        # list dir
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        path = request.GET.get('p', '/')
        if path[-1] != '/':
            path = path + '/'

        try:
            dir_id = seafile_api.get_dir_id_by_path(repo_id,
                                                    path.encode('utf-8'))
        except SearpcError, e:
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
            return get_dir_entrys_by_id(request, repo, path, dir_id)

    def post(self, request, repo_id, format=None):
        # new dir
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        path = request.GET.get('p', '')

        if not path or path[0] != '/':
            return api_error(status.HTTP_400_BAD_REQUEST, "Path is missing.")
        if path == '/':         # Can not make or rename root dir.
            return api_error(status.HTTP_400_BAD_REQUEST, "Path is invalid.")
        if path[-1] == '/':     # Cut out last '/' if possible.
            path = path[:-1]

        username = request.user.username
        operation = request.POST.get('operation', '')

        if operation.lower() == 'mkdir':
            if not is_repo_writable(repo.id, username):
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to create folder.')

            parent_dir = os.path.dirname(path)
            if check_folder_permission(repo_id, parent_dir, username) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this folder.')

            parent_dir_utf8 = parent_dir.encode('utf-8')
            new_dir_name = os.path.basename(path)
            new_dir_name_utf8 = check_filename_with_rename_utf8(repo_id,
                                                                parent_dir,
                                                                new_dir_name)

            try:
                seafile_api.post_dir(repo_id, parent_dir,
                                     new_dir_name_utf8, username)
            except SearpcError, e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 'Failed to make directory.')

            if request.GET.get('reloaddir', '').lower() == 'true':
                resp = reloaddir(request, repo, parent_dir)
            else:
                resp = Response('success', status=status.HTTP_201_CREATED)
                uri = reverse('DirView', args=[repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(parent_dir_utf8) + \
                    quote(new_dir_name_utf8)
            return resp
        elif operation.lower() == 'rename':
            if check_folder_permission(repo.id, path, username) != 'rw':
                return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this folder.')

            if not is_repo_writable(repo.id, username):
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to rename a folder.')

            old_dir_name = os.path.basename(path)

            newname = request.POST.get('newname', '')
            if not newname:
                return api_error(status.HTTP_400_BAD_REQUEST, "newname is mandatory.")

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
                                 'Failed to rename directory.')
        # elif operation.lower() == 'move':
        #     pass
        else:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             "Operation not supported.")

    def delete(self, request, repo_id, format=None):
        # delete dir or file
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        username = request.user.username
        if not is_repo_writable(repo.id, username):
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to delete folder.')

        path = request.GET.get('p', None)
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        if check_folder_permission(repo_id, path, username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this folder.')

        if path == '/':         # Can not delete root path.
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is invalid.')

        if path[-1] == '/':     # Cut out last '/' if possible.
            path = path[:-1]

        parent_dir = os.path.dirname(path)
        parent_dir_utf8 = os.path.dirname(path).encode('utf-8')
        file_name_utf8 = os.path.basename(path).encode('utf-8')

        try:
            seafile_api.del_file(repo_id, parent_dir_utf8,
                                 file_name_utf8, username)
        except SearpcError, e:
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to delete file.")

        return reloaddir_if_necessary(request, repo, parent_dir_utf8)

class DirDownloadView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        path = request.GET.get('p', None)
        if path is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')
        if path[-1] != '/':         # Normalize dir path
            path += '/'

        if len(path) > 1:
            dirname = os.path.basename(path.rstrip('/'))
        else:
            dirname = repo.name

        current_commit = get_commits(repo_id, 0, 1)[0]
        if not current_commit:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                             'Failed to get current commit of repo %s.' % repo_id)

        try:
            dir_id = seafserv_threaded_rpc.get_dirid_by_path(current_commit.repo_id,
                                                             current_commit.id,
                                                             path.encode('utf-8'))
        except SearpcError, e:
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to get dir id by path")

        if not dir_id:
            return api_error(status.HTTP_404_NOT_FOUND, "Path does not exist")

        try:
            total_size = seafserv_threaded_rpc.get_dir_size(repo.store_id, repo.version,
                                                            dir_id)
        except Exception, e:
            logger.error(str(e))
            return api_error(HTTP_520_OPERATION_FAILED, "Internal error")

        if total_size > MAX_DOWNLOAD_DIR_SIZE:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Unable to download directory "%s": size is too large.' % dirname)

        token = seafserv_rpc.web_get_access_token(repo_id,
                                                  dir_id,
                                                  'download-dir',
                                                  request.user.username)

        redirect_url = gen_file_get_url(token, dirname)
        return HttpResponse(json.dumps(redirect_url), status=200,
                            content_type=json_content_type)

class DirShareView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    # from seahub.share.view::gen_private_file_share
    def post(self, request, repo_id, format=None):
        emails = request.POST.getlist('emails', '')
        s_type = request.POST.get('s_type', '')
        path = request.POST.get('path', '')
        perm = request.POST.get('perm', 'r')
        file_or_dir = os.path.basename(path.rstrip('/'))
        username = request.user.username

        for email in [e.strip() for e in emails if e.strip()]:
            if not is_registered_user(email):
                continue

            if s_type == 'f':
                pfds = PrivateFileDirShare.objects.add_read_only_priv_file_share(
                    username, email, repo_id, path)
            elif s_type == 'd':
                pfds = PrivateFileDirShare.objects.add_private_dir_share(
                    username, email, repo_id, path, perm)
            else:
                continue

            # send a signal when sharing file successful
            share_file_to_user_successful.send(sender=None, priv_share_obj=pfds)
        return HttpResponse(json.dumps({}), status=200, content_type=json_content_type)

class DirSubRepoView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    # from seahub.views.ajax.py::sub_repo
    def get(self, request, repo_id, format=None):
        '''
        check if a dir has a corresponding sub_repo
        if it does not have, create one
        '''

        result = {}

        path = request.GET.get('p')
        name = request.GET.get('name')
        if not (path and name):
            result['error'] = 'Argument missing'
            return HttpResponse(json.dumps(result), status=400, content_type=json_content_type)

        username = request.user.username

        # check if the sub-lib exist
        try:
            sub_repo = seafile_api.get_virtual_repo(repo_id, path, username)
        except SearpcError, e:
            result['error'] = e.msg
            return HttpResponse(json.dumps(result), status=500, content_type=json_content_type)

        if sub_repo:
            result['sub_repo_id'] = sub_repo.id
        else:
            if not request.user.permissions.can_add_repo():
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to create library.')

            # create a sub-lib
            try:
                # use name as 'repo_name' & 'repo_desc' for sub_repo
                sub_repo_id = seafile_api.create_virtual_repo(repo_id, path, name, name, username)
                result['sub_repo_id'] = sub_repo_id
            except SearpcError, e:
                result['error'] = e.msg
                return HttpResponse(json.dumps(result), status=500, content_type=json_content_type)

        return HttpResponse(json.dumps(result), content_type=json_content_type)

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
            shared_repos += list_inner_pub_repos_by_owner(username)

        return HttpResponse(json.dumps(shared_repos, cls=SearpcObjEncoder),
                            status=200, content_type=json_content_type)

class BeShared(APIView):
    """
    List repos that others/groups share to user.
    """
    authentication_classes = (TokenAuthentication, )
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
                r.share_type = 'group'
                r.user = seafile_api.get_repo_owner(r_id)
                r.user_perm = check_permission(r_id, username)
                shared_repos.append(r)

        if not CLOUD_MODE:
            shared_repos += seaserv.list_inner_pub_repos(username)

        return HttpResponse(json.dumps(shared_repos, cls=SearpcObjEncoder),
                            status=200, content_type=json_content_type)

class PrivateFileDirShareEncoder(json.JSONEncoder):
    def default(self, obj):
        if not isinstance(obj, PrivateFileDirShare):
            return None
        return {'from_user':obj.from_user, 'to_user':obj.to_user,
                'repo_id':obj.repo_id, 'path':obj.path, 'token':obj.token,
                'permission':obj.permission, 's_type':obj.s_type}

class SharedFilesView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    # from seahub.share.view::list_priv_shared_files
    def get(self, request, format=None):
        username = request.user.username

        # Private share out/in files.
        priv_share_out = PrivateFileDirShare.objects.list_private_share_out_by_user(username)
        for e in priv_share_out:
            e.file_or_dir = os.path.basename(e.path.rstrip('/'))
            e.repo = seafile_api.get_repo(e.repo_id)

        priv_share_in = PrivateFileDirShare.objects.list_private_share_in_by_user(username)
        for e in priv_share_in:
            e.file_or_dir = os.path.basename(e.path.rstrip('/'))
            e.repo = seafile_api.get_repo(e.repo_id)

        return HttpResponse(json.dumps({"priv_share_out": list(priv_share_out), "priv_share_in": list(priv_share_in)}, cls=PrivateFileDirShareEncoder),
                status=200, content_type=json_content_type)

    # from seahub.share.view:rm_private_file_share
    def delete(self, request, format=None):
        token = request.GET.get('t')
        try:
            pfs = PrivateFileDirShare.objects.get_priv_file_dir_share_by_token(token)
        except PrivateFileDirShare.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND, "Token does not exist")

        from_user = pfs.from_user
        to_user = pfs.to_user
        username = request.user.username

        if username == from_user or username == to_user:
            pfs.delete()
            return HttpResponse(json.dumps({}), status=200, content_type=json_content_type)
        else:
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to get repo.')

class VirtualRepos(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        result = {}

        try:
            virtual_repos = get_virtual_repos_by_owner(request)
        except SearpcError, e:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                             "error:" + e.msg)

        result['virtual-repos'] = virtual_repos
        return HttpResponse(json.dumps(result, cls=SearpcObjEncoder),
                            content_type=json_content_type)

class PrivateSharedFileView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, token, format=None):
        assert token is not None    # Checked by URLconf

        try:
            fileshare = PrivateFileDirShare.objects.get(token=token)
        except PrivateFileDirShare.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND, "Token not found")

        shared_to = fileshare.to_user

        if shared_to != request.user.username:
            return api_error(status.HTTP_403_FORBIDDEN, "You don't have permission to view this file")

        repo_id = fileshare.repo_id
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, "Repo not found")

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

        op = request.GET.get('op', 'download')
        return get_repo_file(request, repo_id, file_id, file_name, op)

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
            return api_error(status.HTTP_404_NOT_FOUND, "Repo not found")

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
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, token, format=None):
        assert token is not None    # Checked by URLconf

        try:
            fileshare = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND, "Token not found")

        shared_by = fileshare.username
        repo_id = fileshare.repo_id
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, "Repo not found")

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
        except Exception, e:
            entry["size"] = 0

        entry["type"] = "file"
        entry["name"] = file_name
        entry["id"] = file_id
        entry["mtime"] = c.ctime
        entry["repo_id"] = repo_id
        entry["path"] = path

        return HttpResponse(json.dumps(entry), status=200,
                            content_type=json_content_type)

class PrivateSharedFileDetailView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, token, format=None):
        assert token is not None    # Checked by URLconf

        try:
            fileshare = PrivateFileDirShare.objects.get(token=token)
        except PrivateFileDirShare.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND, "Token not found")

        shared_by = fileshare.from_user
        shared_to = fileshare.to_user

        if shared_to != request.user.username:
            return api_error(status.HTTP_403_FORBIDDEN, "You don't have permission to view this file")

        repo_id = fileshare.repo_id
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, "Repo not found")

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
        except Exception, e:
            entry["size"] = 0

        entry["type"] = "file"
        entry["name"] = file_name
        entry["id"] = file_id
        entry["mtime"] = c.ctime
        entry["repo_id"] = repo_id
        entry["path"] = path
        entry["shared_by"] = shared_by

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
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    # from seahub.share.view::list_shared_links
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
        token = request.GET.get('t')
        FileShare.objects.filter(token=token).delete()
        return HttpResponse(json.dumps({}), status=200, content_type=json_content_type)

class DefaultRepoView(APIView):
    """
    Get user's default library.
    """
    authentication_classes = (TokenAuthentication, )
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
            'exists': True,
            'repo_id': repo_id
        }

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
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def delete(self, request, repo_id, format=None):
        """
        Unshare a library. Only repo owner can perform this operation.
        """
        username = request.user.username
        if not seafile_api.is_repo_owner(username, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to unshare library.')

        share_type = request.GET.get('share_type', '')
        if not share_type:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'share_type is required.')

        if share_type == 'personal':
            user = request.GET.get('user', '')
            if not user:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'user is required.')

            if not is_valid_username(user):
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'User is not valid')

            remove_share(repo_id, username, user)
        elif share_type == 'group':
            group_id = request.GET.get('group_id', '')
            if not group_id:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'group_id is required.')

            try:
                group_id = int(group_id)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'group_id is not valid.')

            seafile_api.unset_group_repo(repo_id, int(group_id), username)
        elif share_type == 'public':
            unset_inner_pub_repo(repo_id)
        else:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'share_type can only be personal or group or public.')

        return Response('success', status=status.HTTP_200_OK)

    def put(self, request, repo_id, format=None):
        """
        Share a repo to users/groups/public.
        """
        username = request.user.username
        if not seafile_api.is_repo_owner(username, repo_id):
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
                                 'user or users (comma separated are mandatory) are not provided')
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
                                 'Group id must be integer.')

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
                try:
                    seafile_api.set_inner_pub_repo(repo_id, permission)
                except SearpcError, e:
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                     "Searpc Error: " + e.msg)
        else:
            return api_error(status.HTTP_400_BAD_REQUEST,
                    'share_type can only be personal or group or public.')

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
    authentication_classes = (TokenAuthentication, )
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
                return api_error(status.HTTP_400_BAD_REQUEST, 'start id must be integer')

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
            else:
                d['repo_id'] = e.repo_id
                d['repo_name'] = e.repo_name
                if e.etype == 'repo-create':
                    d['author'] = e.creator
                else:
                    d['author'] = e.repo_owner

                def utc_to_local(dt):
                    tz = timezone.get_default_timezone()
                    utc = dt.replace(tzinfo=timezone.utc)
                    local = timezone.make_naive(utc, tz)
                    return local

                epoch = datetime.datetime(1970, 1, 1)
                local = utc_to_local(e.timestamp)
                time_diff = local - epoch
                d['time'] = time_diff.seconds + (time_diff.days * 24 * 3600)

            d['nick'] = email2nickname(d['author'])

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
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        group_json, replynum = get_groups(request.user.username)
        res = {"groups": group_json, "replynum": replynum}
        return Response(res)
    
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

        group_name = request.DATA.get('group_name', None)

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
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to delete group')

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
            return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to rename group')

        operation = request.POST.get('operation', '')
        if operation.lower() == 'rename':
            newname = request.POST.get('newname', '')
            if not newname:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'Newname is missing')

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
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def put(self, request, group_id, format=None):
        """
        Add group members.
        """
        try:
            group_id_int = int(group_id)
        except ValueError:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid group id')

        group = get_group(group_id_int)
        if not group:
            return api_error(status.HTTP_404_NOT_FOUND, 'Unable to find group')

        if not is_group_staff(group, request.user):
            return api_error(status.HTTP_403_FORBIDDEN, 'Only administrators can add group members')

        user_name = request.DATA.get('user_name', None)
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
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid group id')

        group = get_group(group_id_int)
        if not group:
            return api_error(status.HTTP_404_NOT_FOUND, 'Unable to find group')

        if not is_group_staff(group, request.user):
            return api_error(status.HTTP_403_FORBIDDEN, 'Only administrators can remove group members')

        user_name = request.DATA.get('user_name', None)

        try:
            ccnet_threaded_rpc.group_remove_member(group.id, request.user.username, user_name)
        except SearpcError, e:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Unable to add user to group')

        return HttpResponse(json.dumps({'success': True}), status=200, content_type=json_content_type)

def is_group_staff(group, user):
    if user.is_anonymous():
        return False
    return check_group_staff(group.id, user.username)

def get_page_index(request, default=1):
    try:
        page = int(request.GET.get('page', default))
    except ValueError:
        page = default
    return page

class GroupMsgsView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_group_check
    def get(self, request, group, format=None):
        username = request.user.username
        page = get_page_index (request, 1)
        msgs, next_page  = get_group_msgs_json(group.id, page, username)
        if not msgs:
            msgs = []
        # remove user notifications
        UserNotification.objects.seen_group_msg_notices(username, group.id)
        ret = {
            'next_page' : next_page,
            'msgs' : msgs,
            }
        return Response(ret)

    @api_group_check
    def post(self, request, group, format=None):
        username = request.user.username
        msg = request.POST.get('message')
        message = GroupMessage()
        message.group_id = group.id
        message.from_email = request.user.username
        message.message = msg
        message.save()

        # send signal
        grpmsg_added.send(sender=GroupMessage, group_id=group.id,
                          from_email=username, message=msg)

        repo_id = request.POST.get('repo_id', None)
        path = request.POST.get('path', None)
        if repo_id and path:
            # save attachment
            ma = MessageAttachment(group_message=message, repo_id=repo_id,
                                   attach_type='file', path=path,
                                   src='recommend')
            ma.save()

            # save discussion
            fd = FileDiscuss(group_message=message, repo_id=repo_id, path=path)
            fd.save()

        ret = { "msgid" : message.id }
        return Response(ret)

class GroupMsgView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_group_check
    def get(self, request, group, msg_id, format=None):
        msg = get_group_message_json(group.id, msg_id, True)
        if not msg:
            return api_error(status.HTTP_404_NOT_FOUND, 'Messageg not found.')

        UserNotification.objects.seen_group_msg_reply_notice(request.user.username, msg_id)
        return Response(msg)

    @api_group_check
    def post(self, request, group, msg_id, format=None):
        try:
            group_msg = GroupMessage.objects.get(group_id=group.id, id=msg_id)
        except GroupMessage.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND, 'Messageg not found.')

        msg = request.POST.get('message')
        msg_reply = MessageReply()
        msg_reply.reply_to = group_msg
        msg_reply.from_email = request.user.username
        msg_reply.message = msg
        msg_reply.save()

        grpmsg_reply_added.send(sender=MessageReply,
                                msg_id=msg_id,
                                from_email=request.user.username,
                                grpmsg_topic=group_msg.message,
                                reply_msg=msg)
        ret = { "msgid" : msg_reply.id }
        return Response(ret)

class UserMsgsView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, id_or_email, format=None):
        username = request.user.username
        to_email = get_email(id_or_email)
        if not to_email:
            return api_error(status.HTTP_404_NOT_FOUND, 'User not found.')

        UserNotification.objects.seen_user_msg_notices(username, to_email)
        UserMessage.objects.update_unread_messages(to_email, username)
        page = get_page_index(request, 1)

        next_page = -1
        person_msgs = get_person_msgs(to_email, page, username)
        if not person_msgs:
            Response({
                    'to_email' : to_email,
                    'next_page' : next_page,
                    'msgs' : [],})
        elif person_msgs.has_next():
            next_page = person_msgs.next_page_number()

        msgs = []
        for msg in person_msgs.object_list:
            atts = []
            for att in msg.attachments:
                atts.append({
                        'repo_id' : att.repo_id,
                        'path' : att.path,
                        })
            m = {
                'from_email' : msg.from_email,
                'nickname' : email2nickname(msg.from_email),
                'timestamp' : get_timestamp(msg.timestamp),
                'msg' : msg.message,
                'attachments' : atts,
                'msgid' : msg.message_id,
                }
            msgs.append(m)

        ret = {
            'to_email' : to_email,
            'next_page' : next_page,
            'msgs' : msgs,
            }
        return Response(ret)

    def post(self, request, id_or_email, format=None):
        username = request.user.username
        to_email = get_email(id_or_email)
        if not to_email:
            return api_error(status.HTTP_404_NOT_FOUND, 'User not found.')

        mass_msg = request.POST.get('message')
        if not mass_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, "Missing argument")

        usermsg = UserMessage.objects.add_unread_message(username, to_email, mass_msg)
        ret = { 'msgid' : usermsg.message_id }
        return Response(ret)

class NewRepliesView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        notes = UserNotification.objects.get_user_notifications(request.user.username, seen=False)
        grpmsg_reply_list = [ n.grpmsg_reply_detail_to_dict().get('msg_id') for n in notes if n.msg_type == 'grpmsg_reply']
        group_msgs = []
        for msg_id in grpmsg_reply_list:
            msg = get_group_message_json (None, msg_id, True)
            if msg:
                group_msgs.append(msg)

        # remove new group msg reply notification
        UserNotification.objects.seen_group_msg_reply_notice(request.user.username)
        return Response(group_msgs)

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

# Html related code
def html_events(request):
    if not EVENTS_ENABLED:
        events = None
        return render_to_response('api2/events.html', {
            "events":events,
            }, context_instance=RequestContext(request))

    email = request.user.username
    events_count = 15
    events, events_more_offset = get_user_events(email, 0, events_count)
    events_more = True if len(events) == events_count else False
    event_groups = group_events_data(events)
    prepare_events(event_groups)

    return render_to_response('api2/events.html', {
            "events": events,
            "events_more_offset": events_more_offset,
            "events_more": events_more,
            "event_groups": event_groups,
            "events_count": events_count,
            }, context_instance=RequestContext(request))

def ajax_events(request):
    events_count = 15
    username = request.user.username
    start = int(request.GET.get('start', 0))

    events, start = get_user_events(username, start, events_count)
    events_more = True if len(events) == events_count else False

    event_groups = group_events_data(events)

    prepare_events(event_groups)
    ctx = {'event_groups': event_groups}
    html = render_to_string("api2/events_body.html", ctx)

    return HttpResponse(json.dumps({'html':html, 'events_more':events_more,
                                    'new_start': start}),
                            content_type=json_content_type)

@group_check
def html_group_discussions(request, group):
    username = request.user.username
    if request.method == 'POST':
        # only login user can post to public group
        if group.view_perm == "pub" and not request.user.is_authenticated():
            raise Http404

        msg = request.POST.get('message')
        message = GroupMessage()
        message.group_id = group.id
        message.from_email = request.user.username
        message.message = msg
        message.save()

        # send signal
        grpmsg_added.send(sender=GroupMessage, group_id=group.id,
                          from_email=username, message=msg)

        repo_id = request.POST.get('repo_id', None)
        path = request.POST.get('path', None)
        if repo_id and path:
            # save attachment
            ma = MessageAttachment(group_message=message, repo_id=repo_id,
                                   attach_type='file', path=path,
                                   src='recommend')
            ma.save()

            # save discussion
            fd = FileDiscuss(group_message=message, repo_id=repo_id, path=path)
            fd.save()

        ctx = {}
        ctx['msg'] = message
        html = render_to_string("api2/discussion_posted.html", ctx)
        serialized_data = json.dumps({"html": html})
        return HttpResponse(serialized_data, content_type=json_content_type)

    group_msgs = get_group_msgs(group.id, page=1, username=request.user.username)
    # remove user notifications
    UserNotification.objects.seen_group_msg_notices(username, group.id)
    return render_to_response("api2/discussions.html", {
            "group" : group,
            "group_msgs": group_msgs,
            }, context_instance=RequestContext(request))

@group_check
def ajax_discussions(request, group):
    try:
        page = int(request.GET.get('page'))
    except ValueError:
        page = 2

    group_msgs = get_group_msgs(group.id, page, request.user.username)
    if group_msgs.has_next():
        next_page = group_msgs.next_page_number()
    else:
        next_page = None

    html = render_to_string('api2/discussions_body.html', {"group_msgs": group_msgs}, context_instance=RequestContext(request))
    return HttpResponse(json.dumps({"html": html, 'next_page': next_page}), content_type=json_content_type)

def html_get_group_discussion(request, msg_id):
    try:
        msg = GroupMessage.objects.get(id=msg_id)
    except GroupMessage.DoesNotExist:
        raise Http404

    try:
        att = MessageAttachment.objects.get(group_message_id=msg_id)
    except MessageAttachment.DoesNotExist:
        att = None

    if att:
        path = att.path
        if path == '/':
            repo = get_repo(att.repo_id)
            if repo:
                att.name = repo.name
            else:
                att.err = 'the libray does not exist'
        else:
            path = path.rstrip('/') # cut out last '/' if possible
            att.name = os.path.basename(path)

        # Load to discuss page if attachment is a image and from recommend.
        if att.attach_type == 'file' and att.src == 'recommend':
            att.filetype, att.fileext = get_file_type_and_ext(att.name)
            if att.filetype == IMAGE:
                att.obj_id = get_file_id_by_path(att.repo_id, path)
                if not att.obj_id:
                    att.err = 'File does not exist'
                else:
                    att.token = seafile_api.get_fileserver_access_token(
                        att.repo_id, att.obj_id, 'view', request.user.username)
                    att.img_url = gen_file_get_url(att.token, att.name)

        msg.attachment = att

    msg.replies = MessageReply.objects.filter(reply_to=msg)
    msg.reply_cnt = len(msg.replies)

    return render_to_response("api2/discussion.html", {
            "msg": msg,
            }, context_instance=RequestContext(request))

def html_msg_reply(request, msg_id):
    """Show group message replies, and process message reply in ajax"""

    ctx = {}
    try:
        group_msg = GroupMessage.objects.get(id=msg_id)
    except GroupMessage.DoesNotExist:
        raise Http404

    msg = request.POST.get('message')
    msg_reply = MessageReply()
    msg_reply.reply_to = group_msg
    msg_reply.from_email = request.user.username
    msg_reply.message = msg
    msg_reply.save()

    grpmsg_reply_added.send(sender=MessageReply,
                            msg_id=msg_id,
                            from_email=request.user.username,
                            reply_msg=msg)
    ctx['r'] = msg_reply
    html = render_to_string("api2/reply.html", ctx)
    serialized_data = json.dumps({"html": html})
    return HttpResponse(serialized_data, content_type=json_content_type)

def html_user_messages(request, id_or_email):
    to_email = get_email(id_or_email)
    if not to_email:
        return api_error(status.HTTP_404_NOT_FOUND, 'User not found.')

    username = request.user.username

    if request.method == 'POST':
        mass_msg = request.POST.get('message')
        if not mass_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, "Missing argument")

        usermsg = UserMessage.objects.add_unread_message(username, to_email, mass_msg)
        ctx = { 'msg' : usermsg }
        html = render_to_string("api2/user_msg.html", ctx)
        serialized_data = json.dumps({"html": html})
        return HttpResponse(serialized_data, content_type=json_content_type)

    UserNotification.objects.seen_user_msg_notices(username, to_email)
    UserMessage.objects.update_unread_messages(to_email, username)
    person_msgs = get_person_msgs(to_email, 1, username)

    return render_to_response("api2/user_msg_list.html", {
            "person_msgs": person_msgs,
            "to_email": to_email,
            }, context_instance=RequestContext(request))

def ajax_usermsgs(request, id_or_email):
    try:
        page = int(request.GET.get('page'))
    except ValueError:
        page = 2

    to_email = get_email(id_or_email)
    if not to_email:
        return api_error(status.HTTP_404_NOT_FOUND, 'User not found.')

    person_msgs = get_person_msgs(to_email, page, request.user.username)
    if person_msgs.has_next():
        next_page = person_msgs.next_page_number()
    else:
        next_page = None

    html = render_to_string('api2/user_msg_body.html', {"person_msgs": person_msgs}, context_instance=RequestContext(request))
    return HttpResponse(json.dumps({"html": html, 'next_page': next_page}), content_type=json_content_type)

def html_repo_history_changes(request, repo_id):
    changes = {}

    repo = get_repo(repo_id)
    if not repo:
        return HttpResponse(json.dumps({"err": 'Library does not exist'}), status=400, content_type=json_content_type)

    resp = check_repo_access_permission(request, repo)
    if resp:
        return resp

    if repo.encrypted and not is_passwd_set(repo_id, request.user.username):
        return HttpResponse(json.dumps({"err": 'Library is encrypted'}), status=400, content_type=json_content_type)

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        return HttpResponse(json.dumps({"err": 'Invalid argument'}), status=400, content_type=json_content_type)

    changes = get_diff(repo_id, '', commit_id)

    c = get_commit(repo_id, repo.version, commit_id)
    if c.parent_id is None:
        # A commit is a first commit only if its parent id is None.
        changes['cmt_desc'] = repo.desc
    elif c.second_parent_id is None:
        # Normal commit only has one parent.
        if c.desc.startswith('Changed library'):
            changes['cmt_desc'] = 'Changed library name or description'
    else:
        # A commit is a merge only if it has two parents.
        changes['cmt_desc'] = 'No conflict in the merge.'
    for k in changes:
        changes[k] = [f.replace ('a href="/', 'a class="normal" href="api://') for f in changes[k] ]

    html = render_to_string('api2/event_details.html', {'changes': changes})
    return HttpResponse(json.dumps({"html": html}), content_type=json_content_type)

def html_new_replies(request):
    notes = UserNotification.objects.get_user_notifications(request.user.username, seen=False)
    grpmsg_reply_list = [ n.grpmsg_reply_detail_to_dict().get('msg_id') for n in notes if n.msg_type == 'grpmsg_reply']
    group_msgs = []
    for msg_id in grpmsg_reply_list:
        try:
            m = GroupMessage.objects.get(id=msg_id)
        except GroupMessage.DoesNotExist:
            continue
        else:
            # get group name
            group = get_group(m.group_id)
            if not group:
                continue
            m.group_name = group.group_name

            # get attachement
            attachment = get_first_object_or_none(m.messageattachment_set.all())
            if attachment:
                path = attachment.path
                if path == '/':
                    repo = get_repo(attachment.repo_id)
                    if not repo:
                        continue
                    attachment.name = repo.name
                else:
                    attachment.name = os.path.basename(path)
                m.attachment = attachment

            # get message replies
            reply_list = MessageReply.objects.filter(reply_to=m)
            m.reply_cnt = reply_list.count()
            if m.reply_cnt > 3:
                m.replies = reply_list[m.reply_cnt - 3:]
            else:
                m.replies = reply_list

            group_msgs.append(m)

    # remove new group msg reply notification
    UserNotification.objects.seen_group_msg_reply_notice(request.user.username)

    return render_to_response("api2/new_msg_reply.html", {
            'group_msgs': group_msgs,
            }, context_instance=RequestContext(request))

class AjaxEvents(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        return ajax_events(request)

class AjaxDiscussions(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, group_id, format=None):
        return ajax_discussions(request, group_id)

class AjaxUserMsgs(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, id_or_email, format=None):
        return ajax_usermsgs(request, id_or_email)

class EventsHtml(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        return html_events(request)

class NewReplyHtml(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        return html_new_replies(request)

class DiscussionsHtml(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, group_id, format=None):
        return html_group_discussions(request, group_id)

    def post(self, request, group_id, format=None):
        return html_group_discussions(request, group_id)

class UserMsgsHtml(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, id_or_email, format=None):
        return html_user_messages(request, id_or_email)

    def post(self, request, id_or_email, format=None):
        return html_user_messages(request, id_or_email)

class DiscussionHtml(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, msg_id, format=None):
        return html_get_group_discussion(request, msg_id)

    def post(self, request, msg_id, format=None):
        return html_msg_reply(request, msg_id)

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

        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        if repo.encrypted and not is_passwd_set(repo_id, request.user.username):
            return HttpResponse(json.dumps({"err": 'Library is encrypted'}),
                                status=400,
                                content_type=json_content_type)

        commit_id = request.GET.get('commit_id', '')
        if not commit_id:
            return HttpResponse(json.dumps({"err": 'Invalid argument'}),
                                status=400,
                                content_type=json_content_type)

        details = get_diff_details(repo_id, '', commit_id)

        return HttpResponse(json.dumps(details),
                            content_type=json_content_type)

class RepoHistoryChangeHtml(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        return html_repo_history_changes(request, repo_id)

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

# based on views/file.py::office_convert_query_page_num
class OfficeConvertQueryPageNum(APIView):
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
                d = query_office_file_pages(file_id)
                if d.error:
                    ret['error'] = d.error
                else:
                    ret['success'] = True
                    ret['count'] = d.count
            except Exception, e:
                logging.exception('failed to call query_office_file_pages')
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
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')


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
            err, html_exists = prepare_converted_html(inner_path, obj_id, fileext, ret_dict)
            # populate return value dict
            ret_dict['err'] = err
            ret_dict['html_exists'] = html_exists
            ret_dict['obj_id'] = obj_id
        else:
            ret_dict['filetype'] = 'Unknown'

        return HttpResponse(json.dumps(ret_dict), status=200, content_type=json_content_type)

class ThumbnailView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, path):

        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Library not found.')

        if repo.encrypted:
            return api_error(status.HTTP_403_FORBIDDEN,
                             'Image thumbnail is not supported in encrypted libraries.')

        if not ENABLE_THUMBNAIL:
            return api_error(status.HTTP_403_FORBIDDEN,
                             'Thumbnail function is not enabled.')

        size = request.GET.get('s', None)
        if size is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Size is missing.')

        obj_id = get_file_id_by_path(repo_id, path)

        if obj_id is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong path')

        raw_path, inner_path, user_perm = get_file_view_path_and_perm(request,
                                                                      repo_id,
                                                                      obj_id, path)

        if user_perm is None:
            return api_error(status.HTTP_403_FORBIDDEN,
                             'Permission denied.')

        thumbnail_dir = os.path.join(THUMBNAIL_ROOT, size)
        if not os.path.exists(thumbnail_dir):
            os.makedirs(thumbnail_dir)

        thumbnail_file = os.path.join(thumbnail_dir, obj_id)
        if not os.path.exists(thumbnail_file):
            try:
                f = StringIO(urllib2.urlopen(raw_path).read())
                image = Image.open(f)
                image.thumbnail((int(size), int(size)), Image.ANTIALIAS)
                image.save(thumbnail_file, THUMBNAIL_EXTENSION)
            except IOError as e:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(e))

        try:
            with open(thumbnail_file, 'rb') as f:
                thumbnail = f.read()
            f.close()
            return HttpResponse(thumbnail, 'image/' + THUMBNAIL_EXTENSION)
        except IOError as e:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, str(e))

#Following is only for debug
# from seahub.auth.decorators import login_required
# @login_required
# def activity2(request):
#     return html_events(request)

# @login_required
# def discussions2(request, group_id):
#     return html_group_discussions(request, group_id)

# @login_required
# def more_discussions2(request, group_id):
#     return ajax_discussions(request, group_id)

# @login_required
# def discussion2(request, msg_id):
#     return html_get_group_discussion(request, msg_id)

# @login_required
# def events2(request):
#     return ajax_events(request)

# @login_required
# def api_repo_history_changes(request, repo_id):
#     return html_repo_history_changes(request, repo_id)

# @login_required
# def api_msg_reply(request, msg_id):
#     return html_msg_reply(request, msg_id)

# @login_required
# def api_new_replies(request):
#     return html_new_replies(request)

# @login_required
# def api_usermsgs(request, id_or_email):
#     return html_user_messages(request, id_or_email)

# @login_required
# def api_more_usermsgs(request, id_or_email):
#     return ajax_usermsgs(request, id_or_email)
