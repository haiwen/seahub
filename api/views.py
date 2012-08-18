# Create your views here.
import re
import sys
import os
import stat
import simplejson as json
from django.http import HttpResponse, HttpResponseServerError

from auth.decorators import login_required, api_login_required

from seaserv import ccnet_rpc, ccnet_threaded_rpc, get_repos, \
    get_repo, get_commits, get_branches, \
    seafserv_threaded_rpc, seafserv_rpc, get_binding_peerids, \
    get_group_repoids, check_group_staff

from seahub.utils import list_to_string, \
    get_httpserver_root, gen_token, \
    check_filename_with_rename, get_accessible_repos, EMPTY_SHA1, \
    gen_file_get_url

from seahub.views import access_to_repo, validate_owner
from pysearpc import SearpcError

from djangorestframework.renderers import JSONRenderer
from djangorestframework.compat import View
from djangorestframework.mixins import ResponseMixin
from djangorestframework.response import Response
from django.core.urlresolvers import reverse

from auth.forms import AuthenticationForm
from auth import login as auth_login
from django.views.decorators.csrf import csrf_exempt

from mime import MIME_MAP

json_content_type = 'application/json; charset=utf-8'

def get_file_mime(name):
    sufix = os.path.splitext(name)[1][1:]
    if sufix:
        return MIME_MAP[sufix]
    return None

def calculate_repo_info(repo_list, username):
    """
    Get some info for repo.

    """
    for repo in repo_list:
        try:
            commit = get_commits(repo.id, 0, 1)[0]
            repo.latest_modify = commit.ctime
            repo.root = commit.root_id
            repo.size = seafserv_threaded_rpc.server_repo_size(repo.id)
            if not repo.size :
                repo.size = 0;
            password_need = False
            if repo.encrypted:
                try:
                    ret = seafserv_rpc.is_passwd_set(repo.id, username)
                    if ret != 1:
                        password_need = True
                except SearpcErroe, e:
                    pass
            repo.password_need = password_need
        except:
            repo.latest_modify = None
            repo.commit = None
            repo.size = -1
            repo.password_need = None

def api_error(request, code='404', msg=None):
    err_resp = {'error_msg':msg}
    return HttpResponse(json.dumps(err_resp), status=code,
                        content_type=json_content_type)

def can_access_repo(request, repo_id):
    repo_ap = seafserv_threaded_rpc.repo_query_access_property(repo_id)
    if not repo_ap:
        repo_ap = 'own'

    # check whether user can view repo
    return access_to_repo(request, repo_id, repo_ap)

def get_file_size (id):
    size = seafserv_threaded_rpc.get_file_size(id)
    if size:
        return size
    else:
        return 0

def get_dir_entrys_by_id(request, dir_id):
    dentrys = []
    try:
        dirs = seafserv_threaded_rpc.list_dir(dir_id)
    except SearpcError, e:
        return api_error(request, "404", e.msg)
    for dirent in dirs:
        dtype = "file"
        entry={}
        if stat.S_ISDIR(dirent.mode):
            dtype = "dir"
        else:
            mime = get_file_mime (dirent.obj_name)
            if mime:
                entry["mime"] = mime
            try:
                entry["size"] = get_file_size(dirent.obj_id)
            except Exception, e:
                print e
                entry["size"]=0

        entry["type"]=dtype
        entry["name"]=dirent.obj_name
        entry["id"]=dirent.obj_id
        dentrys.append(entry)
    response = HttpResponse(json.dumps(dentrys), status=200,
                            content_type=json_content_type)
    response["oid"] = dir_id
    return response


def check_repo_access_permission(request, repo):
    if not repo:
        return api_error(request, '404', "repo not found")

    if not can_access_repo(request, repo.id):
        return api_error(request, '403', "can not access repo")

    password_set = False
    if repo.encrypted:
        try:
            ret = seafserv_rpc.is_passwd_set(repo.id, request.user.username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return api_error(request, '403', e.msg)

    if repo.encrypted and not password_set:
        return api_error(request, '403', "password needed")


@csrf_exempt
def api_login(request):
    if request.method == "POST" :
        form = AuthenticationForm(data=request.POST)
    else:
        return api_error(request, 400, "method not supported")

    if form.is_valid():
        auth_login(request, form.get_user())
        return HttpResponse(json.dumps(request.session.session_key), status=200,
            content_type=json_content_type)
    else:
        return HttpResponse(json.dumps("failed"), status=401,
            content_type=json_content_type)

class Ping(ResponseMixin, View):

    def get(self, request):
        response = HttpResponse(json.dumps("pong"), status=200, content_type=json_content_type)
        if request.user.is_authenticated():
            response["logined"] = True
        else:
            response["logined"] = False
        return response

class ReposView(ResponseMixin, View):
    renderers = (JSONRenderer,)

    @api_login_required
    def get(self, request):
        email = request.user.username

        owned_repos = seafserv_threaded_rpc.list_owned_repos(email)
        calculate_repo_info (owned_repos, email)
        owned_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))

        n_repos = seafserv_threaded_rpc.list_share_repos(email,
                                                         'to_email', -1, -1)
        calculate_repo_info (n_repos, email)
        owned_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))

        repos_json = []
        for r in owned_repos:
            repo = {
                "type":"repo",
                "id":r.id,
                "owner":email,
                "name":r.name,
                "desc":r.desc,
                "mtime":r.lastest_modify,
                "root":r.root,
                "size":r.size,
                "password_need":r.password_need,
                }
            repos_json.append(repo)

        for r in n_repos:
            repo = {
                "type":"repo",
                "id":r.id,
                "owner":r.shared_email,
                "name":r.name,
                "desc":r.desc,
                "mtime":r.lastest_modify,
                "root":r.root,
                "size":r.size,
                "password_need":r.password_need,
                }
            repos_json.append(repo)

        response = Response(200, repos_json)
        return self.render(response)


class RepoView(ResponseMixin, View):
    renderers = (JSONRenderer,)

    @api_login_required
    def get_repo_info(request, repo_id):
        # check whether user can view repo
        repo = get_repo(repo_id)
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        # check whether use is repo owner
        if validate_owner(request, repo_id):
            owner = "self"
        else:
            owner = "share"

        try:
            repo.latest_modify = get_commits(repo.id, 0, 1)[0].ctime
        except:
            repo.latest_modify = None

        # query repo infomation
        repo_size = seafserv_threaded_rpc.server_repo_size(repo_id)
        current_commit = get_commits(repo_id, 0, 1)[0]
        repo_json = {
            "type":"repo",
            "id":repo.id,
            "owner":owner,
            "name":repo.name,
            "desc":repo.desc,
            "mtime":repo.lastest_modify,
            "password_need":password_need,
            "size":repo_size,
            "root":current_commit.root_id,
            }

        response = Response(200, repo_json)
        return self.render(response)


class RepoDirPathView(ResponseMixin, View):
    renderers = (JSONRenderer,)

    @api_login_required
    def get(self, request, repo_id):
        repo = get_repo(repo_id)
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        current_commit = get_commits(repo_id, 0, 1)[0]
        path = request.GET.get('p', '/')
        if path[-1] != '/':
            path = path + '/'

        dir_id = None
        try:
            dir_id = seafserv_threaded_rpc.get_dirid_by_path(current_commit.id,
                                                             path.encode('utf-8'))
        except SearpcError, e:
            return api_error(request, "404", e.msg)

        old_oid = request.GET.get('oid', None)
        if old_oid and old_oid == dir_id :
            return HttpResponse(json.dumps("uptodate"), status=304,
                                content_type=json_content_type)
        else:
            return get_dir_entrys_by_id(request, dir_id)



class RepoDirIdView(ResponseMixin, View):
    renderers = (JSONRenderer,)

    @api_login_required
    def get(self, request, repo_id, dir_id):
        repo = get_repo(repo_id)
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        return get_dir_entrys_by_id(request, dir_id)


def get_repo_file(request, repo_id, file_id, file_name):
    token = gen_token()
    op='download'
    seafserv_rpc.web_save_access_token(token, repo_id, file_id,
                                       op, request.user.username)
    redirect_url = gen_file_get_url(token, file_name)

    response = HttpResponse(json.dumps(redirect_url), status=200,
                            content_type=json_content_type)
    response["oid"] = file_id
    return response

class RepoFileIdView(ResponseMixin, View):
    renderers = (JSONRenderer,)

    @api_login_required
    def get(self, request, repo_id, file_id):
        repo = get_repo(repo_id)
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        file_name = request.GET.get('file_name', file_id)
        return get_repo_file (request, repo_id, file_id, file_name)


class RepoFilePathView(ResponseMixin, View):

    @api_login_required
    def get(self, request, repo_id):
        repo = get_repo(repo_id)
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        path = request.GET.get('p', None)
        if not path:
            return api_error(request, '404', "Path invalid")

        file_id = None
        try:
            file_id = seafserv_threaded_rpc.get_file_by_path(commit.id,
                                                             path.encode('utf-8'))
        except SearpcError, e:
            return api_error(request, '403', e.msg)

        if not file_id:
            return api_error(request, '400', "Path invalid")

        file_name = request.GET.get('file_name', file_id)
        return get_repo_file(request, repo_id, file_name)

    @api_login_required
    def post(self, request, repo_id):
        pass
