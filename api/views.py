# encoding: utf-8
import re
import sys
import os
import stat
import simplejson as json
import settings

from django.http import HttpResponse
from django.contrib.sites.models import RequestSite
from django.core.urlresolvers import reverse
from django.template import loader

from djangorestframework.renderers import JSONRenderer
from djangorestframework.compat import View
from djangorestframework.mixins import ResponseMixin
from djangorestframework.response import Response


try:
    from functools import update_wrapper, wraps
except ImportError:
    from django.utils.functional import update_wrapper, wraps  # Python 2.4 fallback.
from django.utils.decorators import available_attrs

from auth.forms import AuthenticationForm
from auth import login as auth_login

from pysearpc import SearpcError
from seaserv import ccnet_rpc, ccnet_threaded_rpc, get_repos, \
    get_repo, get_commits, get_branches, \
    seafserv_threaded_rpc, seafserv_rpc, get_binding_peerids, \
    check_group_staff

from seahub.utils import list_to_string, \
    get_httpserver_root, gen_token, \
    check_filename_with_rename, get_accessible_repos, EMPTY_SHA1, \
    gen_file_get_url, string2list

from seahub.views import access_to_repo, validate_owner
from seahub.contacts.signals import mail_sended
from share.models import FileShare

from mime import get_file_mime

json_content_type = 'application/json; charset=utf-8'

HTTP_ERRORS = {
    '400':'Bad arguments',
    '401':'Repo is not encrypted',
    '402':'Incorrect password',
    '403':'Can not access repo',
    '404':'Repo not found',
    '405':'Query password set error',
    '406':'Password needed',
    '407':'Method not supported',
    '408':'Login failed',
    '410':'Path does not exist',
    '411':'Failed to get dirid by path',
    '412':'Failed to get fileid by path',
    '413':'Path needed',
    '414':'Emails required',
    '415':'Operation not supported',
    '416':'Failed to list dir',
    '417':'Set password error',

    '499':'Unknow Error',

    '500':'Internal server error',
    '501':'Failed to get shared link',
    '502':'Failed to send shared link',
}

def api_error(request, code='499', msg=None):
    err_resp = { 'error_msg': msg if msg is not None else HTTP_ERRORS[code] }
    return HttpResponse(json.dumps(err_resp), status=code,
                        content_type=json_content_type)

def api_user_passes_test(test_func):
    """
    Decorator for views that checks that the user passes the given test,
    redirecting to the log-in page if necessary. The test should be a callable
    that takes the user object and returns True if the user passes.
    """
    def decorator(view_func):
        def _wrapped_view(obj, request, *args, **kwargs):
            if test_func(request.user):
                return view_func(obj, request, *args, **kwargs)
            json_content_type = 'application/json; charset=utf-8'

            return HttpResponse(json.dumps('login required'), status=401,
                                content_type=json_content_type)
        return wraps(view_func, assigned=available_attrs(view_func))(_wrapped_view)
    return decorator


def api_login_required(function=None):
    """
    Decorator for views that checks that the user is logged in, redirecting
    to the log-in page if necessary.
    """
    actual_decorator = api_user_passes_test(
        lambda u: u.is_authenticated()
    )
    if function:
        return actual_decorator(function)
    return actual_decorator


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
        except Exception,e:
            repo.latest_modify = 0
            repo.commit = None
            repo.size = -1
            repo.password_need = None

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
        return api_error(request, "416")

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
                entry["size"]=0

        entry["type"]=dtype
        entry["name"]=dirent.obj_name
        entry["id"]=dirent.obj_id
        dentrys.append(entry)
    response = HttpResponse(json.dumps(dentrys), status=200,
                            content_type=json_content_type)
    response["oid"] = dir_id
    return response

def set_repo_password(request, repo, password):
    if not password:
        return api_error(request, '406')

    try:
        seafserv_threaded_rpc.set_passwd(repo.id, request.user.username, password)
    except SearpcError, e:
        if e.msg == 'Bad arguments':
            return api_error(request, '400')
        elif e.msg == 'Repo is not encrypted':
            return api_error(request, '401')
        elif e.msg == 'Incorrect password':
            return api_error(request, '402')
        elif e.msg == 'Internal server error':
            return api_error(request, '500')
        else:
            return api_error(request, '417', e.msg)

def check_repo_access_permission(request, repo):
    if not repo:
        return api_error(request, '404')

    if not can_access_repo(request, repo.id):
        return api_error(request, '403')

    password_set = False
    if repo.encrypted:
        try:
            ret = seafserv_rpc.is_passwd_set(repo.id, request.user.username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return api_error(request, '405', e.msg)

        if not password_set:
            password = request.REQUEST['password']
            if not password:
                return api_error(request, '406')

            return set_repo_password(request, repo, password)


def api_login(request):
    if request.method == "POST" :
        form = AuthenticationForm(data=request.POST)
    else:
        return api_error(request, '407')

    if form.is_valid():
        auth_login(request, form.get_user())
        return HttpResponse(json.dumps(request.session.session_key), status=200,
            content_type=json_content_type)
    else:
        return api_error(request, '408')


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
                "mtime":r.latest_modify,
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
                "mtime":r.latest_modify,
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
        if not repo:
            return api_error(request, '404')

        if not can_access_repo(request, repo.id):
            return api_error(request, '403')

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
        repo.size = seafserv_threaded_rpc.server_repo_size(repo_id)
        current_commit = get_commits(repo_id, 0, 1)[0]
        repo_json = {
            "type":"repo",
            "id":repo.id,
            "owner":owner,
            "name":repo.name,
            "desc":repo.desc,
            "mtime":repo.lastest_modify,
            "password_need":repo.password_need,
            "size":repo.size,
            "root":current_commit.root_id,
            }

        response = Response(200, repo_json)
        return self.render(response)

    @api_login_required
    def post(self, request, repo_id):
        resp = check_repo_access_permission(request, get_repo(repo_id))
        if resp:
            return resp
        op = request.GET.get('op', 'setpassword')
        if op == 'setpassword':
            return HttpResponse(json.dumps("success"), status=200,
                                content_type=json_content_type)

        return HttpResponse(json.dumps("unsupported operation"), status=200,
                            content_type=json_content_type)

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
            return api_error(request, "411", e.msg)

        if not dir_id:
            return api_error(request, '410')

        old_oid = request.GET.get('oid', None)
        if old_oid and old_oid == dir_id :
            response = HttpResponse(json.dumps("uptodate"), status=200,
                                    content_type=json_content_type)
            response["oid"] = dir_id
            return response
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
            return api_err(request, '501')

    domain = RequestSite(request).domain
    file_shared_link = 'http://%s%sf/%s/' % (domain,
                                           settings.SITE_ROOT, token)
    return HttpResponse(json.dumps(file_shared_link), status=200, content_type=json_content_type)

def get_repo_file(request, repo_id, file_id, file_name, op):
    if op == 'download':
        token = gen_token()
        seafserv_rpc.web_save_access_token(token, repo_id, file_id,
                                           op, request.user.username)
        redirect_url = gen_file_get_url(token, file_name)
        response = HttpResponse(json.dumps(redirect_url), status=200,
                                content_type=json_content_type)
        response["oid"] = file_id
        return response

    if op == 'sharelink':
        path = request.GET.get('p', None)
        assert path, 'path must be passed in the url'
        return get_shared_link(request, repo_id, path)

def send_share_link(request, repo_id, path, emails):
    l = FileShare.objects.filter(repo_id=repo_id).filter(\
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
            return api_err(request, '501')

    domain = RequestSite(request).domain
    file_shared_link = 'http://%s%sf/%s/' % (domain,
                                           settings.SITE_ROOT, token)

    t = loader.get_template('shared_link_email.html')
    to_email_list = string2list(emails)
    for to_email in to_email_list:
        mail_sended.send(sender=None, user=request.user.username,
                         email=to_email)
        c = {
            'email': request.user.username,
            'to_email': to_email,
            'file_shared_link': file_shared_link,
            }
        try:
            send_mail('您的好友通过SeaCloud分享了一个文件给您',
                      t.render(Context(c)), None, [to_email],
                      fail_silently=False)
        except:
            return api_error(request, '502')
    return HttpResponse(json.dumps(file_shared_link), status=200, content_type=json_content_type)

class RepoFileIdView(ResponseMixin, View):
    renderers = (JSONRenderer,)

    @api_login_required
    def get(self, request, repo_id, file_id):
        repo = get_repo(repo_id)
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        file_name = request.GET.get('file_name', file_id)
        return get_repo_file (request, repo_id, file_id, file_name, 'download')


class RepoFilePathView(ResponseMixin, View):

    @api_login_required
    def get(self, request, repo_id):
        repo = get_repo(repo_id)
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        path = request.GET.get('p', None)
        if not path:
            return api_error(request, '413')

        file_id = None
        try:
            file_id = seafserv_threaded_rpc.get_file_by_path(repo_id,
                                                             path.encode('utf-8'))
        except SearpcError, e:
            return api_error(request, '412', e.msg)

        if not file_id:
            return api_error(request, '410')

        file_name = request.GET.get('file_name', file_id)
        op = request.GET.get('op', 'download')
        return get_repo_file(request, repo_id, file_id, file_name, op)

    @api_login_required
    def post(self, request, repo_id):
        repo = get_repo(repo_id)
        resp = check_repo_access_permission(request, repo)
        if resp:
            return resp

        path = request.GET.get('p', None)
        if not path:
            return api_error(request, '413')

        op = request.GET.get('op', 'delete')
        if op == 'delete':
            pass
        if op == 'sendsharelink':
            emails = request.POST.get('email', None)
            if not emails:
                return api_error(request, '414')
            return send_share_link(request, path, emails)

        return api_error(request, '415')

