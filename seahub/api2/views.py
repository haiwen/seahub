# encoding: utf-8
import os
import stat
import simplejson as json
from urllib2 import unquote, quote
import seahub.settings as settings

from rest_framework import parsers
from rest_framework import status
from rest_framework import renderers
from rest_framework.permissions import IsAuthenticated
from rest_framework.reverse import reverse
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView
from django.contrib.sites.models import RequestSite
from django.http import HttpResponse

from models import Token
from authentication import TokenAuthentication
from permissions import IsRepoWritable, IsRepoAccessible, IsRepoOwner
from serializers import AuthTokenSerializer
from seahub.base.accounts import User
from seahub.share.models import FileShare
from seahub.views import access_to_repo, validate_owner ,is_registered_user
from seahub.utils import gen_file_get_url, gen_token, gen_file_upload_url, \
    check_filename_with_rename, get_starred_files, get_ccnetapplet_root, \
    get_dir_files_last_modified, \
    get_ccnet_server_addr_port, star_file, unstar_file, string2list
try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False

from pysearpc import SearpcError, SearpcObjEncoder
from seaserv import seafserv_rpc, seafserv_threaded_rpc, server_repo_size, \
    get_personal_groups_by_user, get_session_info, get_repo_token_nonnull, \
    get_group_repos, get_repo, check_permission, get_commits, is_passwd_set,\
    list_personal_repos_by_owner, list_personal_shared_repos, check_quota, \
    list_share_repos, get_group_repos_by_owner, get_group_repoids, list_inner_pub_repos_by_owner,\
    list_inner_pub_repos,remove_share, unshare_group_repo, unset_inner_pub_repo, get_user_quota, \
    get_user_share_usage, get_user_quota_usage, CALC_SHARE_USAGE, get_group
from seaserv import seafile_api


json_content_type = 'application/json; charset=utf-8'

# Define custom HTTP status code. 4xx starts from 440, 5xx starts from 520.
HTTP_440_REPO_PASSWD_REQUIRED = 440
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

class Account(APIView):
    """
    Show account info.
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
                    "name":r.name,
                    "desc":r.desc,
                    "mtime":r.latest_modify,
                    "root":r.root,
                    "size":r.size,
                    "encrypted":r.encrypted,
                    "permission": check_permission(r.id, email),
                    }
                repos_json.append(repo)

        return Response(repos_json)

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

def check_repo_access_permission(request, repo):
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

class Repo(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, IsRepoAccessible, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

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
            }

        return Response(repo_json)

    def post(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')
        
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp
        op = request.GET.get('op', 'setpassword')
        if op == 'setpassword':
            return Response("success")

        return Response("unsupported operation")

class DownloadRepo(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, IsRepoAccessible, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        # generate download url for client
        ccnet_applet_root = get_ccnetapplet_root()
        relay_id = get_session_info().id
        addr, port = get_ccnet_server_addr_port ()
        email = request.user.username
        token = get_repo_token_nonnull(repo_id, request.user.username)
        repo_name = repo.name
        enc = 1 if repo.encrypted else ''
        magic = repo.magic if repo.encrypted else ''

        info_json = {
            'relay_id': relay_id,
            'relay_addr': addr,
            'relay_port': port,
            'email': email,
            'token': token,
            'repo_id': repo_id,
            'repo_name': repo_name,
            'encrypted': enc,
            'magic': magic,
            }
        return Response(info_json)

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
    
def get_file_size (id):
    size = seafserv_threaded_rpc.get_file_size(id)
    return size if size else 0

def get_dir_entrys_by_id(request, repo_id, path, dir_id):
    try:
        dirs = seafserv_threaded_rpc.list_dir(dir_id)
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
            return api_err(status.HTTP_500_INTERNAL_SERVER_ERROR, e.msg)

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
        #return Response(redirect_url)
        response = HttpResponse(json.dumps(redirect_url), status=200,
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
    permission_classes = (IsAuthenticated, IsRepoWritable, )    

    def post(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')
        
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
                                               file_name, request.user.username)
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
    personal_files = get_starred_files(request.user.username, -1)
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
    permission_classes = (IsAuthenticated, IsRepoWritable, )
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

        return get_repo_file(request, repo_id, file_id, file_name, 'download')

    def post(self, request, repo_id, format=None):
        # rename or move file
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

        operation = request.POST.get('operation', '')
        if operation.lower() == 'rename':
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
                                                   request.user.username)
            except SearpcError,e:
                return api_error(HTTP_520_OPERATION_FAILED,
                                 "Failed to rename file: %s" % e)

            if request.GET.get('reloaddir', '').lower() == 'true':
                reloaddir(request, repo_id, parent_dir)
            else:
                resp = Response('success', status=status.HTTP_301_MOVED_PERMANENTLY)
                uri = reverse('FileView', args=[repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(parent_dir_utf8) + quote(newname_utf8)
                return resp

        elif operation.lower() == 'move':
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
                                                request.user.username)
            except SearpcError, e:
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                 "SearpcError:" + e.msg)

            if request.GET.get('reloaddir', '').lower() == 'true':
                reloaddir(request, dst_repo_id, dst_dir)
            else:
                resp = Response('success', status=status.HTTP_301_MOVED_PERMANENTLY)
                uri = reverse('FileView', args=[repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(dst_dir_utf8) + quote(new_filename_utf8)
                return resp
        else:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             "Operation can only be rename or move.")

    def put(self, request, repo_id, format=None):
        # update file
        # TODO
        pass

    def delete(self, request, repo_id, format=None):
        # delete file
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')
        
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
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Path is missing.')

        if path[-1] == '/':
            path = path[:-1]
        l = FileShare.objects.filter(repo_id=repo_id).filter(
            username=request.user.username).filter(path=path)
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
                return api_err(status.HTTP_500_INTERNAL_SERVER_ERROR, e.msg)

        http_or_https = request.is_secure() and 'https' or 'http'
        domain = RequestSite(request).domain
        file_shared_link = '%s://%s%sf/%s/' % (http_or_https, domain,
                                               settings.SITE_ROOT, token)
        resp = Response(status=status.HTTP_201_CREATED)
        resp['Location'] = file_shared_link
        return resp

class DirView(APIView):
    """
    Support uniform interface for directory operations, including
    create/delete/rename/list, etc.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, IsRepoWritable, )
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

        operation = request.POST.get('operation', '')
        if operation.lower() == 'mkdir':
            parent_dir = os.path.dirname(path)
            parent_dir_utf8 = parent_dir.encode('utf-8')
            new_dir_name = os.path.basename(path)
            new_dir_name = check_filename_with_rename(repo_id, parent_dir,
                                                      new_dir_name)
            new_dir_name_utf8 = new_dir_name.encode('utf-8')
            
            try:
                seafserv_threaded_rpc.post_dir(repo_id, parent_dir,
                                               new_dir_name,
                                               request.user.username)
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
                                           file_name_utf8,
                                           request.user.username)
        except SearpcError, e:
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to delete file.")

        return reloaddir_if_neccessary(request, repo_id, parent_dir)

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
        shared_type = request.GET.get('type')
        shared_repos = []
        if shared_type == "group" :
            joined_groups = get_personal_groups_by_user(username)
            for grp in joined_groups:
            # Get group repos, and for each group repos...
                for r_id in get_group_repoids(grp.id):
                    if seafile_api.is_repo_owner(username, r_id):
                        continue
                    r = get_repo(r_id)
                    shared_repos.append(r)
        if username and not shared_type :
            shared_repos += list_share_repos(username, 'to_email', -1, -1)
            if not CLOUD_MODE:
                shared_repos += list_inner_pub_repos(username)

        return HttpResponse(json.dumps(shared_repos, cls=SearpcObjEncoder),
                            status=200, content_type=json_content_type)


class SharedRepo(APIView):
    """
    Support uniform interface for shared libraries.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, IsRepoOwner)
    throttle_classes = (UserRateThrottle, )    
    
    def delete(self, request, repo_id, format=None):
        """
        Unshare a library. Only repo owner can perform this operation.
        """
        share_type = request.GET.get('share_type', '')
        user = request.GET.get('user', '')
        group_id = request.GET.get('group_id', '')
        if not (share_type and user and group_id):
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'share_type and user and group_id is required.')

        if share_type == 'personal':
            remove_share(repo_id, request.user.username, user)
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


class CreateRepo(APIView):
    """
    Support uniform interface for create libraries.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )
    
    def put(self, request, format=None):
        repo_name = None
        username = request.user.username
        repo_desc = request.GET.get("desc",'new repo')
        passwd = request.GET.get("passwd")
        permission = request.GET.get("perm","rw")
        repo_name = request.GET.get("name")
        if not repo_name:
            return api_error(status.HTTP_400_BAD_REQUEST,\
                    'Please write repo name.')
        if permission != "rw" and permission != "r" :
            return api_error(status.HTTP_400_BAD_REQUEST,\
                    'Perm can only to be r or rw .')
        # create a repo 
        try : 
            repo_id = seafserv_threaded_rpc.create_repo(repo_name, repo_desc,
                                                        username, passwd)
        except:
            repo_id = None
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST,\
                    'Failed to create library.')
        else:
            return Response('success', status=status.HTTP_200_OK)


class RepoOperation(APIView):
    """
    Support uniform interface for operation like change the name and desc of repo or delete repo.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,IsRepoOwner)
    throttle_classes = (UserRateThrottle, )
    def delete(self, request,repo_id,format=None):
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_400_BAD_REQUEST,\
                    'Library does not exist.')
        remove_repo(repo_id)
        return Response('success', status=status.HTTP_200_OK)

    def post(self, request,repo_id,format=None):
        repo_desc = request.GET.get("desc",None)
        repo_name = request.POST.get("name",None)
        username = request.user.username
        if not repo_desc or not  repo_name :
            return api_error(status.HTTP_400_BAD_REQUEST,\
                    'Desc and Name is needed')
        if not edit_repo(repo_id, repo_name, repo_desc, username):
            return api_error(status.HTTP_400_BAD_REQUEST,\
                    'Failed to edit library information.')
        return Response('success', status=status.HTTP_200_OK)
