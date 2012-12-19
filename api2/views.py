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
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.sites.models import RequestSite
from django.http import HttpResponse

from models import Token
from authentication import TokenAuthentication
from permissions import IsRepoWritable
from serializers import AuthTokenSerializer
from base.accounts import User
from share.models import FileShare
from seahub.views import access_to_repo, validate_owner
from seahub.utils import gen_file_get_url, gen_token, gen_file_upload_url, \
    check_filename_with_rename, get_starred_files, get_ccnetapplet_root, \
    get_ccnet_server_addr_port

from pysearpc import SearpcError
from seaserv import seafserv_rpc, seafserv_threaded_rpc, server_repo_size, \
    get_personal_groups_by_user, get_session_info, get_repo_token_nonnull, \
    get_group_repos, get_repo, check_permission, get_commits, is_passwd_set,\
    list_personal_repos_by_owner, list_personal_shared_repos

json_content_type = 'application/json; charset=utf-8'

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
    	curl -d "username=xiez1989@gmail.com&password=123456" http://127.0.0.1:8000/api2/auth-token/
    """
    throttle_classes = ()
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

HTTP_ERRORS = {
    '400':'Bad arguments',
    '401':'Login required',
    '402':'Incorrect repo password',
    '403':'Can not access repo',
    '404':'Repo not found',
    '405':'Query password set error',
    '406':'Repo is not encrypted',
    '407':'Method not supported',
    '408':'Login failed',
    '409':'Repo password required',
    '410':'Path does not exist',
    '411':'Failed to get dirid by path',
    '412':'Failed to get fileid by path',
    '413':'Above quota',
    '415':'Operation not supported',
    '416':'Failed to list dir',
    '417':'Set password error',
    '418':'Failed to delete',
    '419':'Failed to move',
    '420':'Failed to rename',
    '421':'Failed to mkdir',
    '422':'Failed to get current commit',

    '499':'Unknow Error',

    '500':'Internal server error',
    '501':'Failed to get shared link',
    '502':'Failed to send shared link',
}

def api_error(code='499', msg=None):
    err_resp = {'error_msg': msg if msg else HTTP_ERRORS[code]}
    return Response(err_resp, status=code)

class Account(APIView):
    """
    Show account info.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)

    def get(self, request, format=None):
        info = {}
        email = request.user.username
        info['email'] = email
        info['usage'] = seafserv_threaded_rpc.get_user_quota_usage(email)
        info['total'] = seafserv_threaded_rpc.get_user_quota(email)
        info['feedback'] = settings.DEFAULT_FROM_EMAIL
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
                }
            repos_json.append(repo)
        
        shared_repos = list_personal_shared_repos(email, 'to_email', -1, -1)
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
                    }
                repos_json.append(repo)

        return Response(repos_json)

def can_access_repo(request, repo_id):
    if not check_permission(repo_id, request.user.username):
        return False
    return True
    
class Repo(APIView):
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)

    def head(self, request, repo_id, format=None):
        # TODO
        assert False

    def get(self, request, repo_id, format=None):
        # check whether user can view repo
        repo = get_repo(repo_id)
        if not repo:
            return api_error('404')

        # if not can_access_repo(request, repo.id):
        #     return api_error('403')

        # check whether use is repo owner
        if validate_owner(request, repo_id):
            owner = "self"
        else:
            owner = "share"

        last_commit = get_commits(repo.id, 0, 1)[0].ctime
        repo.latest_modify = last_commit.ctime if last_commit else None

        # query repo infomation
        repo.size = seafserv_threaded_rpc.server_repo_size(repo_id)
        current_commit = get_commits(repo_id, 0, 1)[0]
        root_id = current_commit.root_id if current_commit else None

        # generate download url for client
        ccnet_applet_root = get_ccnetapplet_root()
        relay_id = get_session_info().id
        addr, port = get_ccnet_server_addr_port ()
        email = quote(request.user.username)
        token = get_repo_token_nonnull(repo_id, request.user.username)
        quote_repo_name = quote(repo.name.encode('utf-8'))
        enc = 1 if repo.encrypted else ''

        url = ccnet_applet_root + "/repo/download/"
        url += "?relay_id=%s&relay_addr=%s&relay_port=%s" % (relay_id, addr, port)
        url += "&email=%s&token=%s" % (email, token)
        url += "&repo_id=%s&repo_name=%s&encrypted=%s" % (repo_id, quote_repo_name, enc)
        
        repo_json = {
            "type":"repo",
            "id":repo.id,
            "owner":owner,
            "name":repo.name,
            "desc":repo.desc,
            "mtime":repo.lastest_modify,
            "size":repo.size,
            "encrypted":repo.encrypted,
            "root":root_id,
            "download_url": url,
            }

        return Response(repo_json)

    def post(self, request, repo_id, format=None):
        resp = check_repo_access_permission(request, get_repo(repo_id))
        if resp:
            return resp
        op = request.GET.get('op', 'setpassword')
        if op == 'setpassword':
            return Response("success")

        return Response("unsupported operation")

def check_repo_access_permission(request, repo):
    if not repo:
        return api_error('404')

    if not can_access_repo(request, repo.id):
        return api_error('403')

    password_set = False
    if repo.encrypted:
        try:
            ret = seafserv_rpc.is_passwd_set(repo.id, request.user.username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return api_error('405', "SearpcError:" + e.msg)

        if not password_set:
            password = request.REQUEST.get('password', default=None)
            if not password:
                return api_error('409')

            return set_repo_password(request, repo, password)

def get_file_size (id):
    size = seafserv_threaded_rpc.get_file_size(id)
    return size if size else 0

def get_dir_entrys_by_id(request, dir_id):
    dentrys = []
    try:
        dirs = seafserv_threaded_rpc.list_dir(dir_id)
    except SearpcError, e:
        return api_error("416")

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
        dentrys.append(entry)
    #return Response(dentrys)
    response = HttpResponse(json.dumps(dentrys), status=200,
                            content_type=json_content_type)
    response["oid"] = dir_id
    return response
        
class RepoDirents(APIView):
    """
    List directory entries of a repo.
    TODO: may be better use dirent id instead of path.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)
    
    def get(self, request, repo_id):
        repo = get_repo(repo_id)
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        current_commit = get_commits(repo_id, 0, 1)[0]
        if not current_commit:
            return api_error('422')

        path = request.GET.get('p', '/')
        if path[-1] != '/':
            path = path + '/'

        dir_id = None
        try:
            dir_id = seafserv_threaded_rpc.get_dirid_by_path(current_commit.id,
                                                             path.encode('utf-8'))
        except SearpcError, e:
            return api_error("411", "SearpcError:" + e.msg)

        if not dir_id:
            return api_error('410')

        old_oid = request.GET.get('oid', None)
        if old_oid and old_oid == dir_id :
            response = HttpResponse(json.dumps("uptodate"), status=200,
                                    content_type=json_content_type)
            response["oid"] = dir_id
            return response
        else:
            return get_dir_entrys_by_id(request, dir_id)
    
class RepoDirs(APIView):
    """
    List directory entries based on dir_id.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)

    def get(self, request, repo_id, dir_id, format=None):
        repo = get_repo(repo_id)
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        return get_dir_entrys_by_id(request, dir_id)

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
            return api_err('501')

    domain = RequestSite(request).domain
    file_shared_link = 'http://%s%sf/%s/' % (domain,
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

class RepoFilepath(APIView):
    """
    
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)

    def get(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        path = request.GET.get('p', None)
        if not path:
            return api_error('413')

        file_id = None
        try:
            file_id = seafserv_threaded_rpc.get_file_by_path(repo_id,
                                                             path.encode('utf-8'))
        except SearpcError, e:
            return api_error('412', "SearpcError:" + e.msg)

        if not file_id:
            return api_error('410')

        file_name = request.GET.get('file_name', file_id)
        op = request.GET.get('op', 'download')
        return get_repo_file(request, repo_id, file_id, file_name, op)

    def post(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        path = request.GET.get('p', None)
        if not path:
            return api_error('413', 'Path needed')

        op = request.GET.get('op', 'sendsharelink')
        if op == 'sendsharelink':
            emails = request.POST.get('email', None)
            if not emails:
                return api_error('400', "Email required")
            return send_share_link(request, path, emails)
        elif op == 'star':
            org_id = int(request.GET.get('org', '-1'))
            star_file(request.user.username, repo_id, path, False, org_id=org_id)
            return HttpResponse('success')
        elif op == 'unstar':
            unstar_file(request.user.username, repo_id, path)
            return HttpResponse('success')
        return api_error('415')

class RepoFiles(APIView):
    """
    
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)

    def get(self, request, repo_id, file_id, format=None):
        repo = get_repo(repo_id)
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        file_name = request.GET.get('file_name', file_id)
        return get_repo_file(request, repo_id, file_id, file_name, 'download')

def reloaddir_if_neccessary (request, repo_id, parent_dir):
    reloaddir = False
    s = request.GET.get('reloaddir', None)
    if s and s.lower() == 'true':
        reloaddir = True

    if not reloaddir:
        return Response('success')

    current_commit = get_commits(repo_id, 0, 1)[0]
    if not current_commit:
        return api_error('422')

    try:
        dir_id = seafserv_threaded_rpc.get_dirid_by_path(current_commit.id,
                                                         parent_dir.encode('utf-8'))
    except SearpcError, e:
        return api_error("411", "SearpcError:" + e.msg)

    if not dir_id:
        return api_error('410')
    return get_dir_entrys_by_id(request, dir_id)
    
class OpDeleteView(APIView):
    """
    Delete a file.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, IsRepoWritable, )    

    def post(self, request, repo_id, format=None):
        resp = check_repo_access_permission(request, get_repo(repo_id))
        if resp:
            return resp

        parent_dir = request.GET.get('p', '/')
        file_names = request.POST.get("file_names")

        if not parent_dir or not file_names:
            return api_error('400')

        names =  file_names.split(':')
        names = map(lambda x: unquote(x).decode('utf-8'), names)

        for file_name in names:
            try:
                seafserv_threaded_rpc.del_file(repo_id, parent_dir,
                                               file_name, request.user.username)
            except SearpcError,e:
                return api_error('418', 'SearpcError:' + e.msg)

        return reloaddir_if_neccessary (request, repo_id, parent_dir)
        
class OpRenameView(APIView):
    """
    Rename a file.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, IsRepoWritable, )

    def post(self, request, repo_id, format=None):
        resp = check_repo_access_permission(request, get_repo(repo_id))
        if resp:
            return resp

        path = request.GET.get('p')
        newname = request.POST.get("newname")
        if not path or path[0] != '/' or not newname:
            return api_error('400')

        newname = unquote(newname).decode('utf-8')
        if len(newname) > settings.MAX_UPLOAD_FILE_NAME_LEN:
            return api_error('420', 'New name too long')

        parent_dir = os.path.dirname(path)
        oldname = os.path.basename(path)

        if oldname == newname:
            return api_error('420', 'The new name is the same to the old')

        newname = check_filename_with_rename(repo_id, parent_dir, newname)

        try:
            seafserv_threaded_rpc.rename_file (repo_id, parent_dir, oldname,
                                               newname, request.user.username)
        except SearpcError,e:
            return api_error('420', "SearpcError:" + e.msg)

        return reloaddir_if_neccessary (request, repo_id, parent_dir)
        
class OpMoveView(APIView):
    """
    Move a file.
    TODO: should be refactored and splited.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, IsRepoWritable, )    

    def post(self, request, repo_id, format=None):
        src_repo_id = request.POST.get('src_repo')
        src_dir     = unquote(request.POST.get('src_dir')).decode('utf-8')
        dst_repo_id = request.POST.get('dst_repo')
        dst_dir     = unquote(request.POST.get('dst_dir')).decode('utf-8')
        op          = request.POST.get('operation')
        obj_names   = request.POST.get('obj_names')

        if not (src_repo_id and src_dir  and dst_repo_id \
                and dst_dir and op and obj_names):
            return api_error('400')

        if src_repo_id == dst_repo_id and src_dir == dst_dir:
            return api_error('419', 'The src_dir is same to dst_dir')

        names = obj_names.split(':')
        names = map(lambda x: unquote(x).decode('utf-8'), names)

        if dst_dir.startswith(src_dir):
            for obj_name in names:
                if dst_dir.startswith('/'.join([src_dir, obj_name])):
                    return api_error('419', 'Can not move a dirctory to its subdir')

        for obj_name in names:
            new_obj_name = check_filename_with_rename(dst_repo_id, dst_dir, obj_name)

            try:
                if op == 'cp':
                    seafserv_threaded_rpc.copy_file (src_repo_id, src_dir, obj_name,
                                                     dst_repo_id, dst_dir, new_obj_name,
                                                     request.user.username)
                elif op == 'mv':
                    seafserv_threaded_rpc.move_file (src_repo_id, src_dir, obj_name,
                                                     dst_repo_id, dst_dir, new_obj_name,
                                                     request.user.username)
            except SearpcError, e:
                return api_error('419', "SearpcError:" + e.msg)

        return reloaddir_if_neccessary (request, dst_repo_id, dst_dir)

class OpMkdirView(APIView):
    """
    Make a new directory.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, IsRepoWritable, )

    def post(self, request, repo_id, format=None):
        resp = check_repo_access_permission(request, get_repo(repo_id))
        if resp:
            return resp
        path = request.GET.get('p')
        if not path or path[0] != '/':
            return api_error('400')

        parent_dir = os.path.dirname(path)
        new_dir_name = os.path.basename(path)
        new_dir_name = check_filename_with_rename(repo_id, parent_dir, new_dir_name)

        try:
            seafserv_threaded_rpc.post_dir(repo_id, parent_dir, new_dir_name,
                                           request.user.username)
        except SearpcError, e:
            return api_error('421', e.msg)

        return reloaddir_if_neccessary (request, repo_id, parent_dir)
        
class OpUploadView(APIView):
    """
    Upload a file.
    """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated, IsRepoWritable, )

    def get(self, request, repo_id, format=None):
        repo = get_repo(repo_id)
        if check_permission(repo_id, request.user.username) == 'rw':
            token = seafserv_rpc.web_get_access_token(repo_id,
                                                      'dummy',
                                                      'upload',
                                                      request.user.username)
        else:
            return api_error('403')

        if request.cloud_mode and seafserv_threaded_rpc.check_quota(repo_id) < 0:
            return api_error('413')

        upload_url = gen_file_upload_url(token, 'upload')
        return Response(upload_url)

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
    Get starred files list.
    """

    authentication_classes = (TokenAuthentication, )
    permission_classes = (IsAuthenticated,)

    def get(self, request, format=None):
        return api_starred_files(request)

