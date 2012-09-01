#!/usr/bin/env python
# encoding: utf-8
import os
import re
import time
import random
import stat

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.hashcompat import sha_constructor

from django.core.files.uploadhandler import FileUploadHandler, StopUpload, \
    StopFutureHandlers
from django.core.cache import cache

from seaserv import seafserv_rpc, ccnet_threaded_rpc, seafserv_threaded_rpc, \
    get_repo, get_commits, get_group_repoids, CCNET_SERVER_ADDR, \
    CCNET_SERVER_PORT, get_org_id_by_repo_id, get_org_by_id, is_org_staff, \
    get_org_id_by_group
try:
    from settings import CROCODOC_API_TOKEN
except ImportError:
    CROCODOC_API_TOKEN = None
    
import settings

EMPTY_SHA1 = '0000000000000000000000000000000000000000'
MAX_INT = 2147483647 

PREVIEW_FILEEXT = {
    'Text': ('ac', 'am', 'bat', 'c', 'cc', 'cmake', 'cpp', 'css', 'diff', 'el', 'h', 'html', 'htm', 'java', 'js', 'json', 'less', 'make', 'org', 'php', 'pl', 'properties', 'py', 'rb', 'scala', 'script', 'sh', 'sql', 'txt', 'text', 'tex', 'vi', 'vim', 'xhtml', 'xml'),
    'Image': ('gif', 'jpeg', 'jpg', 'png'),
    'Document': ('doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'),
    'SVG': ('svg',),
    'PDF': ('pdf',),
    'Markdown': ('markdown', 'md'),
}

def gen_fileext_type_map():
    """
    Generate previewed file extension and file type relation map.
    
    """
    d = {}
    for filetype in PREVIEW_FILEEXT.keys():
        for fileext in PREVIEW_FILEEXT.get(filetype):
            d[fileext] = filetype

    return d
FILEEXT_TYPE_MAP = gen_fileext_type_map()

def render_permission_error(request, msg=None, extra_ctx=None):
    """
    Return permisson error page.

    """
    ctx = {}
    ctx['error_msg'] = msg or u'权限错误'

    if extra_ctx:
        for k in extra_ctx:
            ctx[k] = extra_ctx[k]

    return render_to_response('permission_error.html', ctx,
                              context_instance=RequestContext(request))

def render_error(request, msg=None, extra_ctx=None):
    """
    Return normal error page.

    """
    ctx = {}
    ctx['error_msg'] = msg or u'内部错误'

    if extra_ctx:
        for k in extra_ctx:
            ctx[k] = extra_ctx[k]

    return render_to_response('error.html', ctx,
                              context_instance=RequestContext(request))

def list_to_string(l):
    """
    Return string of a list.

    """
    return ','.join(l)

def get_httpserver_root():
    """
    Get seafile http server address and port from settings.py,
    and cut out last '/'.

    """
    if settings.HTTP_SERVER_ROOT[-1] == '/':
        http_server_root = settings.HTTP_SERVER_ROOT[:-1]
    else:
        http_server_root = settings.HTTP_SERVER_ROOT
    return http_server_root

def get_ccnetapplet_root():
    """
    Get ccnet applet address and port from settings.py,
    and cut out last '/'.

    """
    if settings.CCNET_APPLET_ROOT[-1] == '/':
        ccnet_applet_root = settings.CCNET_APPLET_ROOT[:-1]
    else:
        ccnet_applet_root = settings.CCNET_APPLET_ROOT
    return ccnet_applet_root

def gen_token(max_length=5):
    """
    Generate a random token.

    """

    secret_key = settings.SECRET_KEY
    rstr = str(random.random())
    token = sha_constructor(secret_key + rstr).hexdigest()[:max_length]
    return token

def validate_group_name(group_name):
    """
    Check whether group name is valid.
    A valid group name only contains alphanumeric character.

    """
    return re.match('^\w+$', group_name, re.U)

def calculate_repo_last_modify(repo_list):
    """
    Get last modify time for repo. 
    
    """
    for repo in repo_list:
        try:
            repo.latest_modify = get_commits(repo.id, 0, 1)[0].ctime
        except:
            repo.latest_modify = None

class UploadProgressCachedHandler(FileUploadHandler):
    """Tracks progress for file uploads. The http post request must contain a
    header or query parameter, 'X-Progress-ID', which should contain a unique
    string to identify the upload to be tracked.

    """

    def __init__(self, request=None):
        super(UploadProgressCachedHandler, self).__init__(request)
        self.progress_id = None
        self.cache_key = None

    def handle_raw_input(self, input_data, META, content_length, boundary, encoding=None):
        self.content_length = content_length
        if 'X-Progress-ID' in self.request.GET :
            self.progress_id = self.request.GET['X-Progress-ID']
        elif 'X-Progress-ID' in self.request.META:
            self.progress_id = self.request.META['X-Progress-ID']
        # print "handle_raw_input: ", self.progress_id
        if self.progress_id:
            self.cache_key = "%s_%s" % (self.request.user.username, self.progress_id )
            # make cache expiring in 30 seconds
            cache.set(self.cache_key, {
                'length': self.content_length,
                'uploaded' : 0
            }, 30)            

    def new_file(self, field_name, file_name, content_type, content_length, charset=None):
        pass

    def receive_data_chunk(self, raw_data, start):
        if self.cache_key:
            data = cache.get(self.cache_key)
            data['uploaded'] += self.chunk_size
            cache.set(self.cache_key, data, 30)
        return raw_data
    
    def file_complete(self, file_size):
        pass

    def upload_complete(self):
        if self.cache_key:
            cache.delete(self.cache_key)

def check_filename_with_rename(repo_id, parent_dir, filename):
    latest_commit = get_commits(repo_id, 0, 1)[0]
    dirents = seafserv_threaded_rpc.list_dir_by_path(latest_commit.id,
                                         parent_dir.encode('utf-8'))

    def no_duplicate(name):
        for dirent in dirents:
            if dirent.obj_name == name:
                return False
        return True

    def make_new_name(filename, i):
        base, ext = os.path.splitext(filename)
        if ext:
            new_base = "%s (%d)" % (base, i)
            return new_base + ext
        else:
            return "%s (%d)" % (filename, i)

    if no_duplicate(filename):
        return filename
    else:
        i = 1
        while True:
            new_name = make_new_name (filename, i)
            if no_duplicate(new_name):
                return new_name
            else:
                i += 1


def get_accessible_repos(request, repo):
    """Get all repos the current user can access when coping/moving files
    online. If the repo is encrypted, then files can only be copied/moved
    within the same repo. Otherwise, files can be copied/moved between
    owned/shared/group repos of the current user.

    """
    def check_has_subdir(repo):
        latest_commit = get_commits(repo.props.id, 0, 1)[0]
        if latest_commit.root_id == EMPTY_SHA1:
            return False

        dirs = seafserv_threaded_rpc.list_dir_by_path(latest_commit.id, '/')

        for dirent in dirs:
            if stat.S_ISDIR(dirent.props.mode):
                return True

    if repo.encrypted:
        repo.has_subdir = check_has_subdir(repo)
        accessible_repos = [repo]
        return accessible_repos

    accessible_repos = []

    email = request.user.username
    owned_repos = seafserv_threaded_rpc.list_owned_repos(email)
    shared_repos = seafserv_threaded_rpc.list_share_repos(email, 'to_email', -1, -1)
    groups_repos = []
    groups = ccnet_threaded_rpc.get_groups(email)
    for group in groups:
        group_repo_ids = get_group_repoids(group.id)
        for repo_id in group_repo_ids:
            if not repo_id:
                continue
            group_repo = get_repo(repo_id)
            if not group_repo:
                continue
            group_repo.share_from = seafserv_threaded_rpc.get_group_repo_share_from(repo_id)
            if email != group_repo.share_from:
                groups_repos.append(group_repo)

    def has_repo(repos, repo):
        for r in repos:
            if repo.id == r.id:
                return True
        return False

    for repo in owned_repos + shared_repos + groups_repos:
        if not has_repo(accessible_repos, repo):
            if not repo.props.encrypted:
                accessible_repos.append(repo)
                repo.props.has_subdir = check_has_subdir(repo)

    return accessible_repos

def valid_previewed_file(filename):
    """
    Check whether file can preview on web
    
    """
    fileExt = os.path.splitext(filename)[1][1:]
    filetype = FILEEXT_TYPE_MAP.get(fileExt)
    if filetype:
        # Check whether this kind of file can be previewd.
        if filetype == 'Document':
            return (filetype, fileExt) if CROCODOC_API_TOKEN \
                else ('Unknown', fileExt)
        else:
            return (filetype, fileExt)
    else:
        return ('Unknown', fileExt)

def get_file_revision_id_size (commit_id, path):
    """Given a commit and a file path in that commit, return the seafile id
    and size of the file blob

    """
    dirname  = os.path.dirname(path)
    filename = os.path.basename(path)
    seafdir = seafserv_threaded_rpc.list_dir_by_path (commit_id, dirname)
    for dirent in seafdir:
        if dirent.obj_name == filename:
            file_size = seafserv_threaded_rpc.get_file_size(dirent.obj_id)
            return dirent.obj_id, file_size

    return None, None

def gen_file_get_url(token, filename):
    """
    Generate httpserver file url.
    Format: http://<domain:port>/files/<token>/<filename>
    """
    return '%s/files/%s/%s' % (get_httpserver_root(), token, filename)

def gen_file_upload_url(token, op):
    return '%s/%s/%s' % (get_httpserver_root(), op, token)

def get_ccnet_server_addr_port():
    """get ccnet server host and port"""
    return CCNET_SERVER_ADDR, CCNET_SERVER_PORT

def string2list(string):
    """
    Split strings contacted with diffent separator to a list, and remove
    duplicated string.
    """
    tmp_str = string.replace(';', ',').replace('\n', ',').replace('\r', ',')
    # Remove empty and duplicate strings
    s = set()
    for e in tmp_str.split(','):
        e = e.strip(' ')
        if not e:
            continue
        s.add(e)
    return [ x for x in s ]
        
# def get_cur_ctx(request):
#     ctx_dict = request.session.get('current_context', {
#             'base_template': 'myhome_base.html',
#             'org_dict': None})
#     return ctx_dict

# def set_cur_ctx(request, ctx_dict):
#     request.session['current_context'] = ctx_dict
#     request.user.org = ctx_dict.get('org_dict', None)

def check_and_get_org_by_repo(repo_id, user):
    """
    Check whether repo is org repo, get org info if it is, and set
    base template.
    """
    org_id = get_org_id_by_repo_id(repo_id)
    if org_id > 0:
        # this repo is org repo, get org info
        org = get_org_by_id(org_id)
        org.is_staff = is_org_staff(org_id, user)
        org.email = user
        base_template = 'org_base.html'
    else:
        org = None
        base_template = 'myhome_base.html'
    
    return org, base_template

def check_and_get_org_by_group(group_id, user):
    """
    Check whether repo is org repo, get org info if it is, and set
    base template.
    """
    org_id = get_org_id_by_group(group_id)
    if org_id > 0:
        # this repo is org repo, get org info
        org = get_org_by_id(org_id)
        org.is_staff = is_org_staff(org_id, user)
        org.email = user
        base_template = 'org_base.html'
    else:
        org = None
        base_template = 'myhome_base.html'
    
    return org, base_template
