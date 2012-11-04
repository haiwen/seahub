# encoding: utf-8
import re
import sys
import os
import stat
import simplejson as json
import settings

from urllib2 import unquote, quote

from django.http import HttpResponse
from django.contrib.sites.models import RequestSite
from django.core.urlresolvers import reverse
from django.template import loader
from django.core.mail import send_mail

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
    check_group_staff, check_permission, get_personal_groups_by_user, get_group_repos

from seahub.utils import list_to_string, \
    get_httpserver_root, gen_token, \
    check_filename_with_rename, get_accessible_repos, EMPTY_SHA1, \
    gen_file_get_url, string2list, gen_file_upload_url, \
    get_starred_files, star_file, unstar_file

from seahub.views import access_to_repo, validate_owner
from seahub.contacts.signals import mail_sended
from share.models import FileShare

from mime import get_file_mime

json_content_type = 'application/json; charset=utf-8'

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
            return api_error (request, '401')
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
    if not check_permission(repo_id, request.user.username):
        return False
    return True

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
    assert password, 'password must not be none'

    try:
        seafserv_threaded_rpc.set_passwd(repo.id, request.user.username, password)
    except SearpcError, e:
        if e.msg == 'Bad arguments':
            return api_error(request, '400')
        elif e.msg == 'Repo is not encrypted':
            return api_error(request, '406')
        elif e.msg == 'Incorrect password':
            return api_error(request, '402')
        elif e.msg == 'Internal server error':
            return api_error(request, '500')
        else:
            return api_error(request, '417', "SearpcError:" + e.msg)

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
            return api_error(request, '405', "SearpcError:" + e.msg)

        if not password_set:
            password = request.REQUEST.get('password', default=None)
            if not password:
                return api_error(request, '409')

            return set_repo_password(request, repo, password)


def api_login(request):
    if request.method == "POST" :
        form = AuthenticationForm(data=request.POST)
    else:
        return api_error(request, '407')

    if form.is_valid():
        auth_login(request, form.get_user())
        info = {}
        email = request.user.username
        info['email'] = email
        info['feedback'] = settings.DEFAULT_FROM_EMAIL
        info['sessionid'] = request.session.session_key
        info['usage'] = seafserv_threaded_rpc.get_user_quota_usage(email)
        info['total'] = seafserv_threaded_rpc.get_user_quota(email)
        return HttpResponse(json.dumps([info]), status=200, content_type=json_content_type)
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

class Account(ResponseMixin, View):
    renderers = (JSONRenderer,)

    @api_login_required
    def get(self, request):
        info = {}
        email = request.user.username
        info['email'] = email
        info['usage'] = seafserv_threaded_rpc.get_user_quota_usage(email)
        info['total'] = seafserv_threaded_rpc.get_user_quota(email)
        info['feedback'] = settings.DEFAULT_FROM_EMAIL
        response = Response(200, [info])
        return self.render(response)


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
                "encrypted":r.encrypted,
                "password_need":r.password_need,
                }
            repos_json.append(repo)

        for r in n_repos:
            repo = {
                "type":"srepo",
                "id":r.id,
                "owner":r.shared_email,
                "name":r.name,
                "desc":r.desc,
                "mtime":r.latest_modify,
                "root":r.root,
                "size":r.size,
                "encrypted":r.encrypted,
                "password_need":r.password_need,
                }
            repos_json.append(repo)

        groups = get_personal_groups_by_user(email)
        for group in groups:
            g_repos = get_group_repos(group.id, email)
            calculate_repo_info (g_repos, email)
            owned_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
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
            "size":repo.size,
            "encrypted":r.encrypted,
            "root":current_commit.root_id,
            "password_need":repo.password_need,
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
            return api_error(request, "411", "SearpcError:" + e.msg)

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
        token = seafserv_rpc.web_get_access_token(repo_id, file_id,
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
            return api_error(request, '412', "SearpcError:" + e.msg)

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
            return api_error(request, '413', 'Path needed')

        op = request.GET.get('op', 'sendsharelink')
        if op == 'sendsharelink':
            emails = request.POST.get('email', None)
            if not emails:
                return api_error(request, '400', "Email required")
            return send_share_link(request, path, emails)
        elif op == 'star':
            org_id = int(request.GET.get('org', '-1'))
            star_file(request.user.username, repo_id, path, False, org_id=org_id)
            return HttpResponse(json.dumps('success'), status=200,
                                content_type=json_content_type)
        elif op == 'unstar':
            unstar_file(request.user.username, repo_id, path)
            return HttpResponse(json.dumps('success'), status=200,
                                content_type=json_content_type)
        return api_error(request, '415')


def reloaddir_if_neccessary (request, repo_id, parent_dir):
    reloaddir = False
    s = request.GET.get('reloaddir', None)
    if s and s.lower() == 'true':
        reloaddir = True

    if not reloaddir:
        return HttpResponse(json.dumps('success'), status='200',
                            content_type=json_content_type)

    current_commit = get_commits(repo_id, 0, 1)[0]
    try:
        dir_id = seafserv_threaded_rpc.get_dirid_by_path(current_commit.id,
                                                         parent_dir.encode('utf-8'))
    except SearpcError, e:
        return api_error(request, "411", "SearpcError:" + e.msg)

    if not dir_id:
        return api_error(request, '410')
    return get_dir_entrys_by_id(request, dir_id)


class OpDeleteView(ResponseMixin, View):

    @api_login_required
    def get(self, request, repo_id):
        return api_error(request, '407')

    @api_login_required
    def post(self, request, repo_id):
        resp = check_repo_access_permission(request, get_repo(repo_id))
        if resp:
            return resp

        parent_dir = request.GET.get('p', '/')
        file_names = request.POST.get("file_names")

        if not parent_dir or not file_names:
            return api_error(request, '400')

        names =  file_names.split(':')
        names = map(lambda x: unquote(x).decode('utf-8'), names)

        for file_name in names:
            try:
                seafserv_threaded_rpc.del_file(repo_id, parent_dir,
                                               file_name, request.user.username)
            except SearpcError,e:
                return api_error(request, '418', 'SearpcError:' + e.msg)

        return reloaddir_if_neccessary (request, repo_id, parent_dir)


class OpMkdirView(ResponseMixin, View):

    @api_login_required
    def get(self, request, repo_id):
        return api_error(request, '407')

    @api_login_required
    def post(self, request, repo_id):
        resp = check_repo_access_permission(request, get_repo(repo_id))
        if resp:
            return resp

        path = request.GET.get('p')
        if not path or path[0] != '/':
            return api_error(request, '400')

        parent_dir = os.path.dirname(path)
        new_dir_name = os.path.basename(path)
        new_dir_name = check_filename_with_rename(repo_id, parent_dir, new_dir_name)

        try:
            seafserv_threaded_rpc.post_dir(repo_id, parent_dir, new_dir_name,
                                           request.user.username)
        except SearpcError, e:
            return api_error(request, '421', e.msg)

        return reloaddir_if_neccessary (request, repo_id, parent_dir)


class OpRenameView(ResponseMixin, View):

    @api_login_required
    def get(self, request, repo_id):
        return api_error(request, '407')

    @api_login_required
    def post(self, request, repo_id):
        resp = check_repo_access_permission(request, get_repo(repo_id))
        if resp:
            return resp

        path = request.GET.get('p')
        newname = request.POST.get("newname")
        if not path or path[0] != '/' or not newname:
            return api_error(request, '400')

        newname = unquote(newname).decode('utf-8')
        if len(newname) > settings.MAX_UPLOAD_FILE_NAME_LEN:
            return api_error(request, '420', 'New name too long')

        parent_dir = os.path.dirname(path)
        oldname = os.path.basename(path)

        if oldname == newname:
            return api_error(request, '420', 'The new name is the same to the old')

        newname = check_filename_with_rename(repo_id, parent_dir, newname)

        try:
            seafserv_threaded_rpc.rename_file (repo_id, parent_dir, oldname,
                                               newname, request.user.username)
        except SearpcError,e:
            return api_error(request, '420', "SearpcError:" + e.msg)

        return reloaddir_if_neccessary (request, repo_id, parent_dir)


class OpMoveView(ResponseMixin, View):

    @api_login_required
    def get(self, request):
        return api_error(request, '407')

    @api_login_required
    def post(self, request):
        src_repo_id = request.POST.get('src_repo')
        src_dir     = unquote(request.POST.get('src_dir')).decode('utf-8')
        dst_repo_id = request.POST.get('dst_repo')
        dst_dir     = unquote(request.POST.get('dst_dir')).decode('utf-8')
        op          = request.POST.get('operation')
        obj_names   = request.POST.get('obj_names')

        if not (src_repo_id and src_dir  and dst_repo_id \
                and dst_dir and op and obj_names):
            return api_error(request, '400')

        if src_repo_id == dst_repo_id and src_dir == dst_dir:
            return api_error(request, '419', 'The src_dir is same to dst_dir')

        names = obj_names.split(':')
        names = map(lambda x: unquote(x).decode('utf-8'), names)

        if dst_dir.startswith(src_dir):
            for obj_name in names:
                if dst_dir.startswith('/'.join([src_dir, obj_name])):
                    return api_error(request, '419', 'Can not move a dirctory to its subdir')

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
                return api_error(request, '419', "SearpcError:" + e.msg)

        return reloaddir_if_neccessary (request, dst_repo_id, dst_dir)


class OpUploadView(ResponseMixin, View):

    @api_login_required
    def post(self, request):
        return api_error(request, '407')

    @api_login_required
    def get(self, request, repo_id):

        repo = get_repo(repo_id)
        if check_permission(repo_id, request.user.username) == 'rw':
            token = seafserv_rpc.web_get_access_token(repo_id,
                                                      'dummy',
                                                      'upload',
                                                      request.user.username)
        else:
            return api_error(request, '403')

        if request.cloud_mode and seafserv_threaded_rpc.check_quota(repo_id) < 0:
            return api_error(request, '413')

        upload_url = gen_file_upload_url(token, 'upload')
        return HttpResponse(json.dumps(upload_url), status=200,
                            content_type=json_content_type)



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
    return HttpResponse(json.dumps(starred_files), status=200,
                        content_type=json_content_type)


class StarredFileView(ResponseMixin, View):

    @api_login_required
    def get(self, request):
        return api_starred_files(request)
