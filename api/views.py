# Create your views here.
import re
import sys
import os
import stat
import simplejson as json
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseServerError

from auth.decorators import login_required, api_login_required

from seaserv import ccnet_rpc, ccnet_threaded_rpc, get_groups, get_users, get_repos, \
    get_repo, get_commits, get_branches, \
    seafserv_threaded_rpc, seafserv_rpc, get_binding_peerids, get_ccnetuser, \
    get_group_repoids, check_group_staff

from seahub.utils import list_to_string, \
    get_httpserver_root, gen_token, \
    calculate_repo_last_modify, valid_previewed_file, \
    check_filename_with_rename, get_accessible_repos, EMPTY_SHA1

from seahub.views import access_to_repo, validate_owner
from pysearpc import SearpcError

from djangorestframework.renderers import JSONRenderer
from djangorestframework.compat import View
from djangorestframework.mixins import ResponseMixin
from djangorestframework.response import Response
from django.core.urlresolvers import reverse



json_content_type = 'application/json; charset=utf-8'


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


def get_dir_entrys_by_path(reqquest, commit, path):
    dentrys = []
    if path[-1] != '/':
        path = path + '/'

    if not commit.root_id == EMPTY_SHA1:
        try:
            dirs = seafserv_threaded_rpc.list_dir_by_path(commit.id,
                                                          path.encode('utf-8'))
        except SearpcError, e:
            return api_error(request, "404", e.msg)
        for dirent in dirs:
            is_dir = False
            entry={}
            if stat.S_ISDIR(dirent.props.mode):
                is_dir = True
            else:
                try:
                    entry["size"] = seafserv_rpc.get_file_size(dirent.obj_id)
                except:
                    entry["size"]=0
            entry["is_dir"]=is_dir
            entry["name"]=dirent.obj_name
            entry["id"]=dirent.obj_id
            dentrys.append(entry)
        return HttpResponse(json.dumps(dentrys), status=200,
                            content_type=json_content_type)

def get_dir_entrys_by_id(reqquest, dir_id):
    dentrys = []
    try:
        dirs = seafserv_threaded_rpc.list_dir(dir_id)
    except SearpcError, e:
        return api_error(request, "404", e.msg)
    for dirent in dirs:
        is_dir = False
        entry={}
        if stat.S_ISDIR(dirent.props.mode):
            is_dir = True
        else:
            try:
                entry["size"] = seafserv_rpc.get_file_size(dirent.obj_id)
            except:
                entry["size"]=0
        entry["is_dir"]=is_dir
        entry["name"]=dirent.obj_name
        entry["id"]=dirent.obj_id
        dentrys.append(entry)
    return HttpResponse(json.dumps(dentrys), status=200,
                        content_type=json_content_type)

class ReposView(ResponseMixin, View):
    renderers = (JSONRenderer,)

    @api_login_required
    def get(self, request):
        email = request.user.username

        owned_repos = seafserv_threaded_rpc.list_owned_repos(email)
        calculate_repo_last_modify(owned_repos)
        owned_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))

        n_repos = seafserv_threaded_rpc.list_share_repos(email,
                                                         'to_email', -1, -1)
        calculate_repo_last_modify(owned_repos)
        owned_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))

        repos_json = []
        for r in owned_repos:
            repo = {
                "id":r.props.id,
                "owner":"self",
                "name":r.props.name,
                "desc":r.props.desc,
                "mtime":r.lastest_modify,
                }
            repos_json.append(repo)

        for r in n_repos:
            repo = {
                "id":r.props.id,
                "owner":r.props.shared_email,
                "name":r.props.name,
                "desc":r.props.desc,
                "mtime":r.lastest_modify,
                }
            repos_json.append(repo)

        response = Response(200, repos_json)
        return self.render(response)

class RepoView(ResponseMixin, View):
    renderers = (JSONRenderer,)

    @api_login_required
    def get_repo_info(request, repo_id):
        # check whether user can view repo
        if not can_access_repo(request, repo_id):
            return api_error(request, '403', "can not access repo")

        # check whether use is repo owner
        if validate_owner(request, repo_id):
            owner = "self"
        else:
            owner = "share"

        repo = get_repo(repo_id)
        if not repo:
            return api_error(request, '404', "repo not found")

        try:
            repo.latest_modify = get_commits(repo.id, 0, 1)[0].ctime
        except:
            repo.latest_modify = None

        # query whether set password if repo is encrypted
        password_set = False
        if repo.props.encrypted:
            try:
                ret = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
                if ret == 1:
                    password_set = True
            except SearpcError, e:
                    return api_error(request, '403', e.msg)

        # query repo infomation
        repo_size = seafserv_threaded_rpc.server_repo_size(repo_id)
        current_commit = get_commits(repo_id, 0, 1)[0]

        repo_json = {
            "id":repo.props.id,
            "owner":owner,
            "name":repo.props.name,
            "desc":repo.props.desc,
            "mtime":repo.lastest_modify,
            "password_set":password_set,
            "size":repo_size,
            "commit":current_commit.id,
            }

        response = Response(200, repo_json)
        return self.render(response)


class RepoDirPathView(ResponseMixin, View):
    renderers = (JSONRenderer,)

    @api_login_required
    def get(self, request, repo_id):
        if not can_access_repo(request, repo_id):
            return api_error(request, '403', "can not access repo")
        current_commit = get_commits(repo_id, 0, 1)[0]

        repo = get_repo(repo_id)
        if not repo:
            return api_error(request, '404', "repo not found")

        password_set = False
        if repo.props.encrypted:
            try:
                ret = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
                if ret == 1:
                    password_set = True
            except SearpcError, e:
                return api_error(request, '403', e.msg)

        if repo.props.encrypted and not password_set:
            return api_error(request, '403', "password needed")

        path = request.GET.get('p', '/')
        return get_dir_entrys_by_path(request, current_commit, path)



class RepoDirIdView(ResponseMixin, View):
    renderers = (JSONRenderer,)

    @api_login_required
    def get(self, request, repo_id, dir_id):
        if not can_access_repo(request, repo_id):
            return api_error(request, '403', "can not access repo")

        repo = get_repo(repo_id)
        if not repo:
            return api_error(request, '404', "repo not found")

        password_set = False
        if repo.props.encrypted:
            try:
                ret = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
                if ret == 1:
                    password_set = True
            except SearpcError, e:
                return api_error(request, '403', e.msg)

        if repo.props.encrypted and not password_set:
            return api_error(request, '403', "password needed")

        return get_dir_entrys_by_id(request, dir_id)


class RepoFileView(ResponseMixin, View):
    renderers = (JSONRenderer,)

    @api_login_required
    def get(self, request, repo_id, file_id):
        if not can_access_repo(request, repo_id):
            return api_error(request, '403', "can not access repo")

        repo = get_repo(repo_id)
        if not repo:
            return api_error(request, '404', "repo not found")

        password_set = False
        if repo.props.encrypted:
            try:
                ret = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
                if ret == 1:
                    password_set = True
            except SearpcError, e:
                return api_error(request, '403', e.msg)

        if repo.props.encrypted and not password_set:
            return api_error(request, '403', "password needed")
        file_name = request.GET.get('file_name', file_id)
        token = gen_token()
        # put token into memory in seaf-server
        seafserv_rpc.web_save_access_token(token, file_id)

        http_server_root = get_httpserver_root()
        op='download'
        redirect_url = '%s/access?repo_id=%s&id=%s&filename=%s&op=%s&t=%s&u=%s' % (http_server_root,
                                                                             repo_id, file_id,
                                                                             file_name, op,
                                                                             token,
                                                                             request.user.username)

        return HttpResponseRedirect(redirect_url)


