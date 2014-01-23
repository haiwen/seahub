# encoding: utf-8
import os
import stat
import time
import simplejson as json
from urllib2 import unquote, quote

from rest_framework import parsers
from rest_framework import status
from rest_framework import renderers
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.reverse import reverse
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from django.contrib.sites.models import RequestSite
from django.core.paginator import EmptyPage, InvalidPage
from django.db import IntegrityError
from django.http import HttpResponse, Http404, HttpResponseRedirect
from django.template import Context, loader, RequestContext
from django.template.loader import render_to_string
from django.shortcuts import render_to_response
from django.utils.translation import ugettext as _

from models import Token
from authentication import TokenAuthentication
from serializers import AuthTokenSerializer, AccountSerializer
from utils import is_repo_writable, is_repo_accessible
from seahub.base.accounts import User
from seahub.base.models import FileDiscuss, UserStarredFiles
from seahub.share.models import FileShare
from seahub.views import access_to_repo, validate_owner, is_registered_user, events, group_events_data, get_diff
from seahub.utils import gen_file_get_url, gen_token, gen_file_upload_url, \
    check_filename_with_rename, get_ccnetapplet_root, \
    get_dir_files_last_modified, get_user_events, EMPTY_SHA1, \
    get_ccnet_server_addr_port, string2list, \
    gen_block_get_url
from seahub.utils.star import star_file, unstar_file
import seahub.settings as settings
try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False
from seahub.group.forms import MessageForm
from seahub.notifications.models import UserNotification
from seahub.utils.paginator import Paginator
from seahub.group.models import GroupMessage, MessageReply, MessageAttachment
from seahub.group.settings import GROUP_MEMBERS_DEFAULT_DISPLAY
from seahub.group.signals import grpmsg_added, grpmsg_reply_added
from seahub.group.views import group_check
from seahub.signals import repo_created, share_file_to_user_successful
from seahub.share.models import PrivateFileDirShare
from seahub.utils import EVENTS_ENABLED, TRAFFIC_STATS_ENABLED, \
    api_convert_desc_link, api_tsstr_sec, get_file_type_and_ext, \
    gen_file_share_link, gen_dir_share_link
from seahub.utils.file_types import IMAGE
from seaserv import get_group_repoids, is_repo_owner, get_personal_groups, get_emailusers
from seahub.profile.models import Profile
from seahub.contacts.models import Contact
from seahub.shortcuts import get_first_object_or_none

from pysearpc import SearpcError, SearpcObjEncoder
from seaserv import seafserv_rpc, seafserv_threaded_rpc, server_repo_size, \
    get_personal_groups_by_user, get_session_info, is_personal_repo, \
    get_group_repos, get_repo, check_permission, get_commits, is_passwd_set,\
    list_personal_repos_by_owner, list_personal_shared_repos, check_quota, \
    list_share_repos, get_group_repos_by_owner, get_group_repoids, list_inner_pub_repos_by_owner,\
    list_inner_pub_repos,remove_share, unshare_group_repo, unset_inner_pub_repo, get_user_quota, \
    get_user_share_usage, get_user_quota_usage, CALC_SHARE_USAGE, get_group, \
    get_commit, get_file_id_by_path, MAX_DOWNLOAD_DIR_SIZE
from seaserv import seafile_api


json_content_type = 'application/json; charset=utf-8'

# Define custom HTTP status code. 4xx starts from 440, 5xx starts from 520.
HTTP_440_REPO_PASSWD_REQUIRED = 440
HTTP_441_REPO_PASSWD_MAGIC_REQUIRED = 441
HTTP_520_OPERATION_FAILED = 520

class Ping(APIView):
    """
    Returns a simple `pong` message when client calls `api2/ping/`.
    For example:
    	curl http://127.0.0.1:8000/api2/ping/
    """
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

    def get(self, request, format=None):
        return Response('pong')

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
    model = Token

    def post(self, request):
        serializer = AuthTokenSerializer(data=request.DATA)
        if serializer.is_valid():
            token, created = Token.objects.get_or_create(user=serializer.object['user'].username)
            return Response({'token': token.key})

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def api_error(code, msg):
    err_resp = {'error_msg': msg}
    return Response(err_resp, status=code)

class Accounts(APIView):
    """List all accounts.
    Administator permission is required.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        # list accounts
        start = int(request.GET.get('start', '0'))
        limit = int(request.GET.get('limit', '100'))
        accounts = get_emailusers(start, limit)

        accounts_json = []
        for account in accounts:
            accounts_json.append({'email': account.email})

        return Response(accounts_json)

class Account(APIView):
    """Query/Add/Delete a specific account.
    Administator permission is required.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, email, format=None):
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

        info['total'] = get_user_quota(email)
        if CALC_SHARE_USAGE:
            my_usage = get_user_quota_usage(email)
            share_usage = get_user_share_usage(email)
            info['usage'] = my_usage + share_usage
        else:
            info['usage'] = get_user_quota_usage(email)

        return Response(info)

    def put(self, request, email, format=None):
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

            if update:
                resp = Response('success')
            else:
                resp = Response('success', status=status.HTTP_201_CREATED)
                resp['Location'] = reverse('api2-account', args=[email])
            return resp
        else:
            return api_error(status.HTTP_400_BAD_REQUEST, serializer.errors)

    def delete(self, request, email, format=None):
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
        info['total'] = get_user_quota(email)

        if CALC_SHARE_USAGE:
            my_usage = get_user_quota_usage(email)
            share_usage = get_user_share_usage(email)
            info['usage'] = my_usage + share_usage
        else:
            info['usage'] = get_user_quota_usage(email)

        return Response(info)

def calculate_repo_info(repo_list, username):
    """
    Get some info for repo.

    """
    for repo in repo_list:
        commit = get_commits(repo.id, 0, 1)[0]
        if not commit:
            continue
        repo.latest_modify = commit.ctime
        repo.root = commit.root_id
        repo.size = server_repo_size(repo.id)

def repo_download_info(request, repo_id):
    repo = get_repo(repo_id)
    if not repo:
        return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

    # generate download url for client
    ccnet_applet_root = get_ccnetapplet_root()
    relay_id = get_session_info().id
    addr, port = get_ccnet_server_addr_port ()
    email = request.user.username
    token = seafserv_threaded_rpc.generate_repo_token(repo_id,
                                                      request.user.username)
    repo_name = repo.name
    enc = 1 if repo.encrypted else ''
    magic = repo.magic if repo.encrypted else ''
    random_key = repo.random_key if repo.random_key else ''
    enc_version = repo.enc_version

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
        'random_key': random_key
        }
    return Response(info_json)


class Repos(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        email = request.user.username
        repos_json = []

        owned_repos = list_personal_repos_by_owner(email)
        calculate_repo_info(owned_repos, email)
        owned_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
        for r in owned_repos:
            if r.is_virtual:
                continue        # No need to list virtual libraries
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
                }
            if r.encrypted:
                repo["enc_version"] = r.enc_version
                repo["magic"] = r.magic
                repo["random_key"] = r.random_key
            repos_json.append(repo)

        shared_repos = seafile_api.get_share_in_repo_list(email, -1, -1)
        for r in shared_repos:
            commit = get_commits(r.repo_id, 0, 1)[0]
            if not commit:
                continue
            r.latest_modify = commit.ctime
            r.root = commit.root_id
            r.size = server_repo_size(r.repo_id)
            r.password_need = is_passwd_set(r.repo_id, email)
            r.permission = check_permission(r.repo_id, email)
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
                "permission": r.permission,
                }
            if r.encrypted:
                repo["enc_version"] = r.enc_version
                repo["magic"] = r.magic
                repo["random_key"] = r.random_key
            repos_json.append(repo)

        groups = get_personal_groups_by_user(email)
        for group in groups:
            g_repos = get_group_repos(group.id, email)
            calculate_repo_info (g_repos, email)
            g_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
            for r in g_repos:
                repo = {
                    "type":"grepo",
                    "id":r.id,
                    "owner":group.group_name,
                    "groupid":group.id,
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

        if not CLOUD_MODE:
            public_repos = list_inner_pub_repos(email)
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
        username = request.user.username
        repo_name = request.POST.get("name", None)
        repo_desc= request.POST.get("desc", 'new repo')
        passwd = request.POST.get("passwd")
        if not repo_name:
            return api_error(status.HTTP_400_BAD_REQUEST, \
                    'Library name is required.')

        # create a repo
        try:
            repo_id = seafserv_threaded_rpc.create_repo(repo_name, repo_desc,
                                                        username, passwd)
        except:
            return api_error(HTTP_520_OPERATION_FAILED, \
                    'Failed to create library.')
        if not repo_id:
            return api_error(HTTP_520_OPERATION_FAILED, \
                    'Failed to create library.')
        else:
            repo_created.send(sender=None,
                              org_id=-1,
                              creator=username,
                              repo_id=repo_id,
                              repo_name=repo_name)
            resp = repo_download_info(request, repo_id)


            # FIXME: according to the HTTP spec, need to return 201 code and
            # with a corresponding location header 
            # resp['Location'] = reverse('api2-repo', args=[repo_id])

            return resp


def can_access_repo(request, repo_id):
    if not check_permission(repo_id, request.user.username):
        return False
    return True

def set_repo_password(request, repo, password):
    assert password, 'password must not be none'

    try:
        seafserv_threaded_rpc.set_passwd(repo.id, request.user.username, password)
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
    if not can_access_repo(request, repo.id):
        return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this repo.')

    password_set = False
    if repo.encrypted:
        try:
            ret = seafserv_rpc.is_passwd_set(repo.id, request.user.username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                             "SearpcError:" + e.msg)

        if not password_set:
            password = request.REQUEST.get('password', default=None)
            if not password:
                return api_error(HTTP_440_REPO_PASSWD_REQUIRED,
                                 'Repo password is needed.')

            return set_repo_password(request, repo, password)


def check_repo_access_permission(request, repo):
    if not can_access_repo(request, repo.id):
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
        if validate_owner(request, repo_id):
            owner = "self"
        else:
            owner = "share"

        last_commit = get_commits(repo.id, 0, 1)[0]
        repo.latest_modify = last_commit.ctime if last_commit else None

        # query repo infomation
        repo.size = seafserv_threaded_rpc.server_repo_size(repo_id)
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

        return Response("unsupported operation")

    def delete(self, request, repo_id, format=None):
        username = request.user.username
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_400_BAD_REQUEST, \
                    'Library does not exist.')

        if not seafile_api.is_repo_owner(username, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, \
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

        commits_all = get_commits(repo_id, per_page * (current_page -1), per_page + 1)
        commits = commits_all[:per_page]

        if len(commits_all) == per_page + 1:
            page_next = True
        else:
            page_next = False

        return HttpResponse(json.dumps({"commits": commits, "page_next": page_next}, cls=SearpcObjEncoder), status=200, content_type=json_content_type)

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

class UploadLinkView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        if check_permission(repo_id, request.user.username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, "Can not access repo")

        if check_quota(repo_id) < 0:
            return api_error(HTTP_520_OPERATION_FAILED, 'Above quota')

        token = seafserv_rpc.web_get_access_token(repo_id,
                                                  'dummy',
                                                  'upload',
                                                  request.user.username)
        url = gen_file_upload_url(token, 'upload-api')
        return Response(url)

class UpdateLinkView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        if check_permission(repo_id, request.user.username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, "Can not access repo")

        if check_quota(repo_id) < 0:
            return api_error(HTTP_520_OPERATION_FAILED, 'Above quota')

        token = seafserv_rpc.web_get_access_token(repo_id,
                                                  'dummy',
                                                  'update',
                                                  request.user.username)
        url = gen_file_upload_url(token, 'update-api')
        return Response(url)

class UploadBlksLinkView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        if check_permission(repo_id, request.user.username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, "Can not access repo")

        if check_quota(repo_id) < 0:
            return api_error(HTTP_520_OPERATION_FAILED, 'Above quota')

        token = seafserv_rpc.web_get_access_token(repo_id,
                                                  'dummy',
                                                  'upload-blks',
                                                  request.user.username)
        url = gen_file_upload_url(token, 'upload-blks-api')
        return Response(url)

class UpdateBlksLinkView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        if check_permission(repo_id, request.user.username) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, "Can not access repo")

        if check_quota(repo_id) < 0:
            return api_error(HTTP_520_OPERATION_FAILED, 'Above quota')

        token = seafserv_rpc.web_get_access_token(repo_id,
                                                  'dummy',
                                                  'update-blks',
                                                  request.user.username)
        url = gen_file_upload_url(token, 'update-blks-api')
        return Response(url)


def get_file_size (id):
    size = seafserv_threaded_rpc.get_file_size(id)
    return size if size else 0

def get_dir_entrys_by_id(request, repo_id, path, dir_id):
    try:
        dirs = seafile_api.list_dir_by_dir_id(dir_id)
    except SearpcError, e:
        return api_error(HTTP_520_OPERATION_FAILED,
                         "Failed to list dir.")

    mtimes = get_dir_files_last_modified (repo_id, path, dir_id)

    dir_list, file_list = [], []
    for dirent in dirs:
        dtype = "file"
        entry={}
        if stat.S_ISDIR(dirent.mode):
            dtype = "dir"
        else:
            try:
                entry["size"] = get_file_size(dirent.obj_id)
            except Exception, e:
                entry["size"]=0

        entry["type"]=dtype
        entry["name"]=dirent.obj_name
        entry["id"]=dirent.obj_id
        entry["mtime"]=mtimes.get(dirent.obj_name, None)
        if dtype == 'dir':
            dir_list.append(entry)
        else:
            file_list.append(entry)


    dir_list.sort(lambda x, y : cmp(x['name'].lower(),y['name'].lower()))
    file_list.sort(lambda x, y : cmp(x['name'].lower(),y['name'].lower()))
    dentrys = dir_list + file_list

    response = HttpResponse(json.dumps(dentrys), status=200,
                            content_type=json_content_type)
    response["oid"] = dir_id
    return response

def get_shared_link(request, repo_id, path):
    l = FileShare.objects.filter(repo_id=repo_id).filter(\
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
        token = seafserv_rpc.web_get_access_token(repo_id, file_id,
                                                  op, request.user.username)
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
                blks = seafile_api.list_file_by_file_id(file_id)
                blklist = blks.split('\n')
            except SearpcError, e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 'Failed to get file block list')
        blklist = [i for i in blklist if len(i) == 40]
        if len(blklist) > 0:
            repo = get_repo(repo_id)
            encrypted = repo.encrypted
            enc_version = repo.enc_version
        token = seafserv_rpc.web_get_access_token(repo_id, file_id,
                                                  op, request.user.username)
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
        assert path, 'path must be passed in the url'
        return get_shared_link(request, repo_id, path)

def reloaddir(request, repo_id, parent_dir):
    current_commit = get_commits(repo_id, 0, 1)[0]
    if not current_commit:
        return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                         'Failed to get current commit of repo %s.' % repo_id)

    try:
        dir_id = seafserv_threaded_rpc.get_dirid_by_path(current_commit.id,
                                                         parent_dir.encode('utf-8'))
    except SearpcError, e:
        return api_error(HTTP_520_OPERATION_FAILED,
                         "Failed to get dir id by path")

    if not dir_id:
        return api_error(status.HTTP_404_NOT_FOUND, "Path does not exist")

    return get_dir_entrys_by_id(request, repo_id, parent_dir, dir_id)

def reloaddir_if_neccessary (request, repo_id, parent_dir):

    reload_dir = False
    s = request.GET.get('reloaddir', None)
    if s and s.lower() == 'true':
        reload_dir = True

    if not reload_dir:
        return Response('success')

    return reloaddir(request, repo_id, parent_dir)

# deprecated
class OpDeleteView(APIView):
    """
    Delete a file.
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

        parent_dir = request.GET.get('p', '/')
        file_names = request.POST.get("file_names")

        if not parent_dir or not file_names:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'File or directory not found.')

        for file_name in file_names.split(':'):
            file_name = unquote(file_name.encode('utf-8'))
            try:
                seafserv_threaded_rpc.del_file(repo_id, parent_dir,
                                               file_name, username)
            except SearpcError,e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 "Failed to delete file.")

        return reloaddir_if_neccessary (request, repo_id, parent_dir)

def append_starred_files(array, files):
    for f in files:
        sfile = {'org' : f.org_id,
                 'repo' : f.repo.id,
                 'path' : f.path,
                 'mtime' : f.last_modified,
                 'dir' : f.is_dir,
                 'size' : f.size
                 }
        array.append(sfile)

def api_starred_files(request):
    starred_files = []
    personal_files = UserStarredFiles.objects.get_starred_files_by_username(
        request.user.username)
    append_starred_files (starred_files, personal_files)
    return Response(starred_files)

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
        return api_starred_files(request)

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
            file_id = seafserv_threaded_rpc.get_file_id_by_path(repo_id,
                                                             path.encode('utf-8'))
        except SearpcError, e:
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to get file id by path.")

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, "File not found")

        op = request.GET.get('op', 'download')
        return get_repo_file(request, repo_id, file_id, file_name, op)

    def post(self, request, repo_id, format=None):
        # rename, move or create file
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        path = request.GET.get('p', '')
        if not path or path[0] != '/':
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Path is missing or invalid.')

        username = request.user.username        
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
            oldname_utf8 = oldname.encode('utf-8')
            if oldname == newname:
                return api_error(status.HTTP_409_CONFLICT,
                                 'The new name is the same to the old')

            newname = check_filename_with_rename(repo_id, parent_dir, newname)
            newname_utf8 = newname.encode('utf-8')
            try:
                seafserv_threaded_rpc.rename_file (repo_id, parent_dir_utf8,
                                                   oldname_utf8, newname,
                                                   username)
            except SearpcError,e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 "Failed to rename file: %s" % e)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, repo_id, parent_dir)
            else:
                resp = Response('success', status=status.HTTP_301_MOVED_PERMANENTLY)
                uri = reverse('FileView', args=[repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(parent_dir_utf8) + quote(newname_utf8)
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
            new_filename = check_filename_with_rename(dst_repo_id, dst_dir,
                                                      filename)
            new_filename_utf8 = new_filename.encode('utf-8')

            try:
                seafserv_threaded_rpc.move_file(src_repo_id, src_dir_utf8,
                                                filename_utf8, dst_repo_id,
                                                dst_dir_utf8, new_filename_utf8,
                                                username)
            except SearpcError, e:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "SearpcError:" + e.msg)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, dst_repo_id, dst_dir)
            else:
                resp = Response('success', status=status.HTTP_301_MOVED_PERMANENTLY)
                uri = reverse('FileView', args=[repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(dst_dir_utf8) + quote(new_filename_utf8)
                return resp
        elif operation.lower() == 'create':
            if not is_repo_writable(repo.id, username):
                return api_error(status.HTTP_403_FORBIDDEN,
                                 'You do not have permission to create file.')
            
            parent_dir = os.path.dirname(path)
            parent_dir_utf8 = parent_dir.encode('utf-8')
            new_file_name = os.path.basename(path)
            new_file_name = check_filename_with_rename(repo_id, parent_dir,
                                                       new_file_name)
            new_file_name_utf8 = new_file_name.encode('utf-8')

            try:
                seafserv_threaded_rpc.post_empty_file(repo_id, parent_dir,
                                                      new_file_name, username)
            except SearpcError, e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 'Failed to create file.')

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, repo_id, parent_dir)
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
        
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        path = request.GET.get('p', None)
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        parent_dir = os.path.dirname(path)
        parent_dir_utf8 = os.path.dirname(path).encode('utf-8')
        file_name_utf8 = os.path.basename(path).encode('utf-8')

        try:
            seafserv_threaded_rpc.del_file(repo_id, parent_dir_utf8,
                                           file_name_utf8,
                                           request.user.username)
        except SearpcError, e:
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to delete file.")

        return reloaddir_if_neccessary(request, repo_id, parent_dir)

class FileRevert(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def put(self, request, repo_id, format=None):
        path = unquote(request.DATA.get('p', '').encode('utf-8'))
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')
        commit_id = unquote(request.DATA.get('commit_id', '').encode('utf-8'))
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')
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
        assert path, 'path must be passed in the url'

        file_name = os.path.basename(path)
        commit_id = request.GET.get('commit_id', None)

        try:
            obj_id = seafserv_threaded_rpc.get_file_id_by_commit_and_path( \
                                        commit_id, path)
        except:
            return api_error(status.HTTP_404_NOT_FOUND, 'Revision not found.')

        return get_repo_file(request, repo_id, obj_id, file_name, 'download')

class FileHistory(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        path = request.GET.get('p', None)
        assert path, 'path must be passed in the url'

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
        path = unquote(request.DATA.get('p', '').encode('utf-8'))
        type = unquote(request.DATA.get('type', 'f').encode('utf-8'))

        if type not in ('d', 'f'):
            return api_error(status.HTTP_400_BAD_REQUEST, 'invalid type')

        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        if path[-1] == '/':
            path = path[:-1]
        l = FileShare.objects.filter(repo_id=repo_id).filter(
            username=request.user.username).filter(path=path)
        if len(l) > 0:
            fileshare = l[0]
            token = fileshare.token
            type = fileshare.s_type
        else:
            token = gen_token(max_length=10)

            fs = FileShare()
            fs.username = request.user.username
            fs.repo_id = repo_id
            fs.path = path
            fs.token = token
            fs.s_type = type

            try:
                fs.save()
            except IntegrityError, e:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, e.msg)

        http_or_https = request.is_secure() and 'https' or 'http'
        domain = RequestSite(request).domain
        file_shared_link = '%s://%s%s%s/%s/' % (http_or_https, domain,
                                               settings.SITE_ROOT, type, token)
        resp = Response(status=status.HTTP_201_CREATED)
        resp['Location'] = file_shared_link
        return resp

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
            dir_id = seafserv_threaded_rpc.get_dir_id_by_path(repo_id,
                                                             path.encode('utf-8'))
        except SearpcError, e:
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to get dir id by path.")

        if not dir_id:
            return api_error(status.HTTP_404_NOT_FOUND, "Path does not exist")

        old_oid = request.GET.get('oid', None)
        if old_oid and old_oid == dir_id :
            response = HttpResponse(json.dumps("uptodate"), status=200,
                                    content_type=json_content_type)
            response["oid"] = dir_id
            return response
        else:
            return get_dir_entrys_by_id(request, repo_id, path, dir_id)

    def post(self, request, repo_id, format=None):
        # new dir
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        path = request.GET.get('p', '')
        if not path or path[0] != '/':
            return api_error(status.HTTP_400_BAD_REQUEST, "Path is missing.")
        if path == '/':         # Can not make root dir.
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
            parent_dir_utf8 = parent_dir.encode('utf-8')
            new_dir_name = os.path.basename(path)
            new_dir_name = check_filename_with_rename(repo_id, parent_dir,
                                                      new_dir_name)
            new_dir_name_utf8 = new_dir_name.encode('utf-8')

            try:
                seafserv_threaded_rpc.post_dir(repo_id, parent_dir,
                                               new_dir_name, username)
            except SearpcError, e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 'Failed to make directory.')

            if request.GET.get('reloaddir', '').lower() == 'true':
                resp = reloaddir(request, repo_id, parent_dir)
            else:
                resp = Response('success', status=status.HTTP_201_CREATED)
                uri = reverse('DirView', args=[repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(parent_dir_utf8) + \
                    quote(new_dir_name_utf8)
            return resp
        # elif operation.lower() == 'rename':
        #     pass
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
        
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        path = request.GET.get('p', None)
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        if path == '/':         # Can not delete root path.
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is invalid.')

        if path[-1] == '/':     # Cut out last '/' if possible.
            path = path[:-1]

        parent_dir = os.path.dirname(path)
        parent_dir_utf8 = os.path.dirname(path).encode('utf-8')
        file_name_utf8 = os.path.basename(path).encode('utf-8')

        try:
            seafserv_threaded_rpc.del_file(repo_id, parent_dir_utf8,
                                           file_name_utf8, username)
        except SearpcError, e:
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to delete file.")

        return reloaddir_if_neccessary(request, repo_id, parent_dir)

class DirDownloadView(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return render_error(request, _(u'Library does not exist'))

        path = request.GET.get('p', None)
        assert path, 'path must be passed in the url'

        if path[-1] != '/':         # Normalize dir path
            path += '/'

        if len(path) > 1:
            dirname = os.path.basename(path.rstrip('/')) # Here use `rstrip` to cut out last '/' in path
        else:
            dirname = repo.name

        current_commit = get_commits(repo_id, 0, 1)[0]
        if not current_commit:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                         'Failed to get current commit of repo %s.' % repo_id)

        try:
            dir_id = seafserv_threaded_rpc.get_dirid_by_path(current_commit.id,
                                                         path.encode('utf-8'))
        except SearpcError, e:
            return api_error(HTTP_520_OPERATION_FAILED,
                         "Failed to get dir id by path")

        if not dir_id:
            return api_error(status.HTTP_404_NOT_FOUND, "Path does not exist")

        try:
            total_size = seafserv_threaded_rpc.get_dir_size(dir_id)
        except Exception, e:
            logger.error(str(e))
            return api_error(status.HTTP_520_OPERATION_FAILED, "Internal error")

        if total_size > MAX_DOWNLOAD_DIR_SIZE:
            return render_error(request, _(u'Unable to download directory "%s": size is too large.') % dirname)

        token = seafserv_rpc.web_get_access_token(repo_id,
                                                  dir_id,
                                                  'download-dir',
                                                  request.user.username)

        redirect_url = gen_file_get_url(token, dirname)
        return HttpResponse(json.dumps(redirect_url), status=200, content_type=json_content_type)
    

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

        content_type = 'application/json; charset=utf-8'
        result = {}

        path = request.GET.get('p') 
        name = request.GET.get('name')
        if not (path and name):
            result['error'] = _('Argument missing')
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)

        username = request.user.username

        # check if the sub-lib exist
        try:
            sub_repo = seafile_api.get_virtual_repo(repo_id, path, username)
        except SearpcError, e:
            result['error'] = e.msg
            return HttpResponse(json.dumps(result), status=500, content_type=content_type)

        if sub_repo:
            result['sub_repo_id'] = sub_repo.id
        else:
            # create a sub-lib
            try:
                # use name as 'repo_name' & 'repo_desc' for sub_repo
                sub_repo_id = seafile_api.create_virtual_repo(repo_id, path, name, name, username)
                result['sub_repo_id'] = sub_repo_id
            except SearpcError, e:
                result['error'] = e.msg
                return HttpResponse(json.dumps(result), status=500, content_type=content_type)

        return HttpResponse(json.dumps(result), content_type=content_type)

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
            shared_repos += list_inner_pub_repos(username)

        return HttpResponse(json.dumps(shared_repos, cls=SearpcObjEncoder),
                            status=200, content_type=json_content_type)

class PrivateFileDirShareEncoder(json.JSONEncoder):
    def default(self, obj):
        if not isinstance(obj, PrivateFileDirShare):
            return None
        return {'from_user':obj.from_user, 'to_user':obj.to_user, 'repo_id':obj.repo_id, 'path':obj.path, 'token':obj.token,
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
        content_type = 'application/json; charset=utf-8'
        result = {}

        username = request.user.username
        try:
            result['virtual-repos'] = seafile_api.get_virtual_repos_by_owner(username)
        except SearpcError, e:
            result['error'] = e.msg
            return HttpResponse(json.dumps(result), status=500, content_type=content_type)

        return HttpResponse(json.dumps(result, cls=SearpcObjEncoder), content_type=content_type)
    
class FileShareEncoder(json.JSONEncoder):
    def default(self, obj):
        if not isinstance(obj, FileShare):
            return None
        return {'username':obj.username, 'repo_id':obj.repo_id, 'path':obj.path, 'token':obj.token,
                'ctime':obj.ctime, 'view_cnt':obj.view_cnt, 's_type':obj.s_type}

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
        user = request.GET.get('user', '')
        group_id = request.GET.get('group_id', '')
        if not (share_type and user and group_id):
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'share_type and user and group_id is required.')

        if share_type == 'personal':
            remove_share(repo_id, username, user)
        elif share_type == 'group':
            unshare_group_repo(repo_id, group_id, user)
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
        group_id = request.GET.get('group_id')
        permission = request.GET.get('permission')

        if permission !='rw' and permission != "r":
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Permission need to be rw or r.')

        if share_type == 'personal':
            if not is_registered_user(user) :
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'User does not exist')
            try :
                from_email = seafile_api.get_repo_owner(repo_id)
                seafserv_threaded_rpc.add_share(repo_id, from_email, user,
                                                permission)
            except SearpcError, e:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "Searpc Error: " + e.msg)

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
                seafile_api.group_share_repo(repo_id, int(group_id),
                                             from_email, permission)
            except SearpcError, e:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "Searpc Error: " + e.msg)

        elif share_type == 'public':
            if not CLOUD_MODE:
                try:
                    seafserv_threaded_rpc.set_inner_pub_repo(repo_id, permission)
                except SearpcError, e:
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                     "Searpc Error: " + e.msg)
        else :
            return api_error(status.HTTP_400_BAD_REQUEST,
                    'share_type can only be personal or group or public.')

        return Response('success', status=status.HTTP_200_OK)

def api_pre_events(event_groups):
    for g in event_groups:
        for e in g["events"]:
            if e.etype != "repo-delete":
                e.link = "api://repos/%s" % e.repo_id

            if e.etype == "repo-update":
                api_convert_desc_link(e)


def activity(request):
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
    api_pre_events(event_groups)

    return render_to_response('api2/events.html', {
            "events": events,
            "events_more_offset": events_more_offset,
            "events_more": events_more,
            "event_groups": event_groups,
            "events_count": events_count,
            }, context_instance=RequestContext(request))


def events(request):
    events_count = 15
    username = request.user.username
    start = int(request.GET.get('start', 0))

    events, start = get_user_events(username, start, events_count)
    events_more = True if len(events) == events_count else False

    event_groups = group_events_data(events)

    api_pre_events(event_groups)
    ctx = {'event_groups': event_groups}
    html = render_to_string("api2/events_body.html", ctx)

    return HttpResponse(json.dumps({'html':html, 'events_more':events_more,
                                    'new_start': start}),
                            content_type='application/json; charset=utf-8')


@group_check
def group_discuss(request, group):
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
                              from_email=username)

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
        return HttpResponse(serialized_data, content_type="application/json; charset=utf-8")

    # remove user notifications
    UserNotification.objects.filter(to_user=username, msg_type='group_msg',
                                    detail=str(group.id)).delete()

    group_msgs = get_group_msgs(group.id, page=1, username=request.user.username)

    return render_to_response("api2/discussions.html", {
            "group" : group,
            "group_msgs": group_msgs,
            }, context_instance=RequestContext(request))


def get_group_msgs(groupid, page, username):

    # Show 15 group messages per page.
    paginator = Paginator(GroupMessage.objects.filter(
            group_id=groupid).order_by('-timestamp'), 15)

    # If page request (9999) is out of range, return None
    try:
        group_msgs = paginator.page(page)
    except (EmptyPage, InvalidPage):
        return None

    # Force evaluate queryset to fix some database error for mysql.
    group_msgs.object_list = list(group_msgs.object_list)

    attachments = MessageAttachment.objects.filter(group_message__in=group_msgs.object_list)

    msg_replies = MessageReply.objects.filter(reply_to__in=group_msgs.object_list)
    reply_to_list = [ r.reply_to_id for r in msg_replies ]

    for msg in group_msgs.object_list:
        msg.reply_cnt = reply_to_list.count(msg.id)
        msg.replies = []
        for r in msg_replies:
            if msg.id == r.reply_to_id:
                msg.replies.append(r)
        msg.replies = msg.replies[-3:]

        for att in attachments:
            if att.group_message_id != msg.id:
                continue

            # Attachment name is file name or directory name.
            # If is top directory, use repo name instead.
            path = att.path
            if path == '/':
                repo = get_repo(att.repo_id)
                if not repo:
                    # TODO: what should we do here, tell user the repo
                    # is no longer exists?
                    continue
                att.name = repo.name
            else:
                path = path.rstrip('/') # cut out last '/' if possible
                att.name = os.path.basename(path)

            # Load to discuss page if attachment is a image and from recommend.
            if att.attach_type == 'file' and att.src == 'recommend':
                att.filetype, att.fileext = get_file_type_and_ext(att.name)
                if att.filetype == IMAGE:
                    att.obj_id = get_file_id_by_path(att.repo_id, path)
                    if not att.obj_id:
                        att.err = _(u'File does not exist')
                    else:
                        att.token = seafserv_rpc.web_get_access_token(att.repo_id, att.obj_id,
                                                         'view', username)
                        att.img_url = gen_file_get_url(att.token, att.name)

            msg.attachment = att

    return group_msgs

@group_check
def more_discussions(request, group):
    content_type = 'application/json; charset=utf-8'
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
    return HttpResponse(json.dumps({"html": html, 'next_page': next_page}), content_type=content_type)

def discussion(request, msg_id):
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
                att.err = _(u'the libray does not exist')
        else:
            path = path.rstrip('/') # cut out last '/' if possible
            att.name = os.path.basename(path)

        # Load to discuss page if attachment is a image and from recommend.
        if att.attach_type == 'file' and att.src == 'recommend':
            att.filetype, att.fileext = get_file_type_and_ext(att.name)
            if att.filetype == IMAGE:
                att.obj_id = get_file_id_by_path(att.repo_id, path)
                if not att.obj_id:
                    att.err = _(u'File does not exist')
                else:
                    att.token = seafserv_rpc.web_get_access_token(att.repo_id, att.obj_id,
                                                     'view', request.user.username)
                    att.img_url = gen_file_get_url(att.token, att.name)

        msg.attachment = att

    msg.replies = MessageReply.objects.filter(reply_to=msg)
    msg.reply_cnt = len(msg.replies)

    return render_to_response("api2/discussion.html", {
            "msg": msg,
            }, context_instance=RequestContext(request))


def msg_reply(request, msg_id):
    """Show group message replies, and process message reply in ajax"""

    content_type = 'application/json; charset=utf-8'
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

    # send signal if reply other's message
    if group_msg.from_email != request.user.username:
        grpmsg_reply_added.send(sender=MessageReply,
                                msg_id=msg_id,
                                from_email=request.user.username)
    replies = MessageReply.objects.filter(reply_to=group_msg)
    r_num = len(replies)
    ctx['r'] = msg_reply
    html = render_to_string("api2/reply.html", ctx)
    serialized_data = json.dumps({"html": html})
    return HttpResponse(serialized_data, content_type=content_type)


def repo_history_changes(request, repo_id):
    changes = {}
    content_type = 'application/json; charset=utf-8'

    if not access_to_repo(request, repo_id, ''):
        return HttpResponse(json.dumps({"err": _(u'Permission denied')}), status=400, content_type=content_type)

    repo = get_repo(repo_id)
    if not repo:
        return HttpResponse(json.dumps({"err": _(u'Library does not exist')}), status=400, content_type=content_type)

    if repo.encrypted and not is_passwd_set(repo_id, request.user.username):
        return HttpResponse(json.dumps({"err": _(u'Library is encrypted')}), status=400, content_type=content_type)

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        return HttpResponse(json.dumps({"err": _(u'Invalid argument')}), status=400, content_type=content_type)

    changes = get_diff(repo_id, '', commit_id)

    c = get_commit(commit_id)
    if c.parent_id is None:
        # A commit is a first commit only if its parent id is None.
        changes['cmt_desc'] = repo.desc
    elif c.second_parent_id is None:
        # Normal commit only has one parent.
        if c.desc.startswith('Changed library'):
            changes['cmt_desc'] = _('Changed library name or description')
    else:
        # A commit is a merge only if it has two parents.
        changes['cmt_desc'] = _('No conflict in the merge.')
    for k in changes:
        changes[k] = [f.replace ('a href="/', 'a class="normal" href="api://') for f in changes[k] ]

    html = render_to_string('api2/event_details.html', {'changes': changes})
    return HttpResponse(json.dumps({"html": html}), content_type=content_type)


def msg_reply_new(request):
    notes = UserNotification.objects.filter(to_user=request.user.username)
    grpmsg_reply_list = [ n.detail for n in notes if n.msg_type == 'grpmsg_reply']
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
    UserNotification.objects.filter(to_user=request.user.username,
                                    msg_type='grpmsg_reply').delete()
    
    return render_to_response("api2/new_msg_reply.html", {
            'group_msgs': group_msgs,
            }, context_instance=RequestContext(request))


class Groups(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        email = request.user.username
        group_json = []

        joined_groups = get_personal_groups_by_user(email)
        grpmsgs = {}
        for g in joined_groups:
            grpmsgs[g.id] = 0;

        notes = UserNotification.objects.filter(to_user=request.user.username)
        replynum = 0;
        for n in notes:
            if n.msg_type == 'group_msg':
                gid = int(n.detail)
                if gid not in grpmsgs:
                    continue
                grpmsgs[gid] = grpmsgs[gid] + 1;
            elif n.msg_type == 'grpmsg_reply':
                replynum = replynum + 1

        for g in joined_groups:
            msg = GroupMessage.objects.filter(group_id=g.id).order_by('-timestamp')[:1]
            mtime = 0
            if len(msg) >= 1:
                mtime = int(time.mktime(msg[0].timestamp.timetuple()))
            group = {
                "id":g.id,
                "name":g.group_name,
                "creator":g.creator_name,
                "ctime":g.timestamp,
                "mtime":mtime,
                "msgnum":grpmsgs[g.id],
                }
            group_json.append(group)
        res = {"groups": group_json, "replynum":replynum}
        return Response(res)

class AjaxEvents(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        return events(request)

class AjaxDiscussions(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, group_id, format=None):
        return more_discussions(request, group_id)

class ActivityHtml(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        return activity(request)

class NewReplyHtml(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        return msg_reply_new(request)

class DiscussionsHtml(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, group_id, format=None):
        return group_discuss(request, group_id)

    def post(self, request, group_id, format=None):
        return group_discuss(request, group_id)


class DiscussionHtml(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, msg_id, format=None):
        return discussion(request, msg_id)

    def post(self, request, msg_id, format=None):
        return msg_reply (request, msg_id)


class RepoHistoryChangeHtml(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        return api_repo_history_changes (request, repo_id)


#Following is only for debug
from seahub.auth.decorators import login_required
@login_required
def activity2(request):
    return activity(request)

@login_required
def discussions2(request, group_id):
    return group_discuss(request, group_id)

@login_required
def more_discussions2(request, group_id):
    return more_discussions(request, group_id)

@login_required
def discussion2(request, msg_id):
    return discussion(request, msg_id)

@login_required
def events2(request):
    return events(request)

@login_required
def api_repo_history_changes(request, repo_id):
    return repo_history_changes(request, repo_id)

@login_required
def api_msg_reply(request, msg_id):
    return msg_reply(request, msg_id)

@login_required
def api_new_replies(request):
    return msg_reply_new(request)
