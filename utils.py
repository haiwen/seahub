#!/usr/bin/env python
# encoding: utf-8
import os
import re
import random
import stat
import urllib2

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.hashcompat import sha_constructor

from base.models import FileContributors, UserStarredFiles
from django.utils.hashcompat import md5_constructor

from pysearpc import SearpcError

from seaserv import seafserv_rpc, ccnet_threaded_rpc, seafserv_threaded_rpc, \
    get_repo, get_commits, get_group_repoids, CCNET_SERVER_ADDR, \
    CCNET_SERVER_PORT, get_org_id_by_repo_id, get_org_by_id, is_org_staff, \
    get_org_id_by_group, list_personal_shared_repos, get_org_group_repos,\
    get_personal_groups_by_user, list_personal_repos_by_owner, get_group_repos, \
    list_org_repos_by_owner, get_org_groups_by_user
try:
    from settings import DOCUMENT_CONVERTOR_ROOT
except ImportError:
    DOCUMENT_CONVERTOR_ROOT = None
    
import settings

EMPTY_SHA1 = '0000000000000000000000000000000000000000'
MAX_INT = 2147483647 

PREVIEW_FILEEXT = {
    'Text': ('ac', 'am', 'bat', 'c', 'cc', 'cmake', 'cpp', 'cs', 'css', 'diff', 'el', 'h', 'html', 'htm', 'java', 'js', 'json', 'less', 'make', 'org', 'php', 'pl', 'properties', 'py', 'rb', 'scala', 'script', 'sh', 'sql', 'txt', 'text', 'tex', 'vi', 'vim', 'xhtml', 'xml'),
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
        latest_commit = get_commits(repo.id, 0, 1)[0]
        if latest_commit.root_id == EMPTY_SHA1:
            return False

        dirs = seafserv_threaded_rpc.list_dir_by_path(latest_commit.id, '/')

        for dirent in dirs:
            if stat.S_ISDIR(dirent.props.mode):
                return True
        return False

    if repo and repo.encrypted:
        repo.has_subdir = check_has_subdir(repo)
        accessible_repos = [repo]
        return accessible_repos

    email = request.user.username

    if request.user.org:
        # org context
        org_id = request.user.org['org_id']
        owned_repos = list_org_repos_by_owner(org_id, email)
        shared_repos = list_personal_shared_repos(email, 'to_email', -1, -1)
        groups_repos = []
        for group in get_org_groups_by_user(org_id, email):
            groups_repos += get_org_group_repos(org_id, group.id, email)
    else:
        # personal context
        owned_repos = list_personal_repos_by_owner(email)
        shared_repos = list_personal_shared_repos(email, 'to_email', -1, -1)
        groups_repos = []
        for group in get_personal_groups_by_user(email):
            groups_repos += get_group_repos(group.id, email)

    def has_repo(repos, repo):
        for r in repos:
            if repo.id == r.id:
                return True
        return False

    accessible_repos = []
    for r in owned_repos + groups_repos:
        if not has_repo(accessible_repos, r) and not r.encrypted:
            r.has_subdir = check_has_subdir(r)
            accessible_repos.append(r)

    for r in shared_repos:
        # For compatibility with diffrent fields names in Repo and
        # SharedRepo objects.
        r.id = r.repo_id
        r.name = r.repo_name
        r.desc = r.repo_desc

        if not has_repo(accessible_repos, r) and not r.encrypted:
            r.has_subdir = check_has_subdir(r)
            accessible_repos.append(r)

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
            return (filetype, fileExt) if DOCUMENT_CONVERTOR_ROOT \
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
        org._dict['is_staff'] = is_org_staff(org_id, user)
        org._dict['email'] = user
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
        org._dict['is_staff'] = is_org_staff(org_id, user)
        org._dict['email'] = user
        base_template = 'org_base.html'
    else:
        org = None
        base_template = 'myhome_base.html'
    
    return org, base_template

def get_file_contributors_from_revisions(repo_id, file_path):
    """Inspect the file history and get a list of users who have modified the
    it.

    """
    commits = []
    try:
        commits = seafserv_threaded_rpc.list_file_revisions(repo_id, file_path, -1)
    except SearpcError:
        return []

    # Commits are already sorted by date, so the user list is also sorted.
    users = [ commit.creator_name for commit in commits if commit.creator_name ]

    # Remove duplicate elements in a list
    ret = []
    for user in users:
        if user not in ret:
            ret.append(user)

    return ret, commits[0].ctime, commits[0].id

def get_file_contributors(repo_id, file_path, file_path_hash, file_id):
    """Get file contributors list and last modfied time from database cache.
    If not found in cache, try to get it from seaf-server.

    """
    contributors = []
    last_modified = 0
    last_commit_id = ''
    try:
        fc = FileContributors.objects.get(repo_id=repo_id,
                                          file_path_hash=file_path_hash)
    except FileContributors.DoesNotExist:
        # has no cache yet
        contributors, last_modified, last_commit_id = get_file_contributors_from_revisions (repo_id, file_path)
        if not contributors:
            return [], 0
        emails = ','.join(contributors)
        file_contributors = FileContributors(repo_id=repo_id,
                                             file_id=file_id,
                                             file_path=file_path,
                                             file_path_hash=file_path_hash,
                                             last_modified=last_modified,
                                             last_commit_id=last_commit_id,
                                             emails=emails)
        file_contributors.save()
    else:
        # cache found
        if fc.file_id != file_id or not fc.last_commit_id:
            # but cache is outdated
            fc.delete()
            contributors, last_modified, last_commit_id = get_file_contributors_from_revisions (repo_id, file_path)
            if not contributors:
                return [], 0, ''
            emails = ','.join(contributors)
            file_contributors = FileContributors(repo_id=repo_id,
                                                 file_id=file_id,
                                                 file_path=file_path,
                                                 file_path_hash=file_path_hash,
                                                 last_modified=last_modified,
                                                 last_commit_id=last_commit_id,
                                                 emails=emails)
            file_contributors.save()
        else:
            # cache is valid
            if fc.emails:
                contributors = fc.emails.split(',')
            else:
                contributors = []
            last_modified = fc.last_modified
            last_commit_id = fc.last_commit_id

    return contributors, last_modified, last_commit_id 


if hasattr(settings, 'EVENTS_CONFIG_FILE'):
    import seafevents

    EVENTS_ENABLED = True
    SeafEventsSession = seafevents.init_db_session_class(settings.EVENTS_CONFIG_FILE)

    def get_user_events(username):
        ev_session = SeafEventsSession()
        events = seafevents.get_user_events(ev_session, username, 0, 10)
        ev_session.close()
        for ev in events:
            if ev.etype == 'repo-update':
                repo = get_repo(ev.repo_id)
                if not repo:
                    ev.etype = 'dummy'
                    continue
                if repo.encrypted:
                    repo.password_set = seafserv_rpc.is_passwd_set(repo.id, username)
                ev.repo = repo
                ev.commit = seafserv_threaded_rpc.get_commit(ev.commit_id)

        return events

    def get_org_user_events(org_id, username):
        ev_session = SeafEventsSession()
        events = seafevents.get_org_user_events(ev_session, \
                            org_id, username, 0, 10)
        ev_session.close()
        for ev in events:
            if ev.etype == 'repo-update':
                repo = get_repo(ev.repo_id)
                if not repo:
                    ev.etype = 'dummy'
                    continue
                if repo.encrypted:
                    repo.password_set = seafserv_rpc.is_passwd_set(repo.id, username)
                ev.repo = repo
                ev.commit = seafserv_threaded_rpc.get_commit(ev.commit_id)
        return events
else:
    EVENTS_ENABLED = False
    def get_user_events():
        pass
    def get_org_user_events():
        pass

class StarredFile(object):
    def format_path(self):
        if self.path == "/":
            return self.path

        # strip leading slash
        path = self.path[1:]
        if path[-1:] == '/':
            path = path[:-1]
        return path.replace('/', ' / ')
            
    def __init__(self, org_id, repo, path, is_dir, last_modified):
        # always 0 for non-org repo
        self.org_id = org_id
        self.repo = repo
        self.path = path
        self.formatted_path = self.format_path()
        self.is_dir = is_dir
        # always 0 for dir
        self.last_modified = last_modified

# org_id > 0: get starred files in org repos
# org_id < 0: get starred files in personal repos
def get_starred_files(email, org_id=-1):
    """Return a list of starred files for some user, sorted descending by the
    last modified time.

    """
    starred_files = UserStarredFiles.objects.filter(email=email, org_id=org_id)

    ret = []
    for sfile in starred_files:
        # repo still exists?
        try:
            repo = get_repo(sfile.repo_id)
        except SearpcError:
            continue

        if not repo:
            sfile.delete()
            continue

        # file still exists?
        file_id = ''
        if sfile.path != "/":
            try:
                file_id = seafserv_threaded_rpc.get_file_by_path(sfile.repo_id, sfile.path)
            except SearpcError:
                continue

            if not file_id:
                sfile.delete()
                continue

        last_modified = 0
        if not sfile.is_dir:
            # last modified
            path_hash = md5_constructor(urllib2.quote(sfile.path.encode('utf-8'))).hexdigest()[:12]
            last_modified = get_file_contributors(sfile.repo_id, sfile.path, path_hash, file_id)[1]

        f = StarredFile(sfile.org_id, repo, sfile.path, sfile.is_dir, last_modified)

        ret.append(f)
        
    # First sort by repo
    # Within the same repo:
    # dir > file
    # dirs are sorted by name ascending
    # files are sorted by last_modified descending
    def sort_func(fa, fb):
        # Different repo?
        if fa.repo.id != fb.repo.id:
            ret = cmp(fa.repo.name, fb.repo.name)
            if ret != 0:
                return ret
            else:
                # two different repo has the same name, compare the id
                return cmp(fa.repo.id, fb.repo.id)

        # OK, same repo
        if fa.is_dir and fb.is_dir:
            return cmp(fa.path, fb.path)
        elif fa.is_dir and not fb.is_dir:
            return -1
        elif fb.is_dir and not fa.is_dir:
            return 1
        else:
            return cmp(fb.last_modified, fa.last_modified)
        
    ret.sort(sort_func)
    return ret

def star_file(email, repo_id, path, is_dir, org_id=-1):
    if is_file_starred(email, repo_id, path, org_id):
        return

    f = UserStarredFiles(email=email,
                         org_id=org_id,
                         repo_id=repo_id,
                         path=path,
                         is_dir=is_dir)
    f.save()

def unstar_file(email, repo_id, path):
    try:
        f = UserStarredFiles.objects.get(email=email,
                                         repo_id=repo_id,
                                         path=path)
    except UserStarredFiles.DoesNotExist:
        pass
    else:
        f.delete()
            
def is_file_starred(email, repo_id, path, org_id=-1):
    try:
        f = UserStarredFiles.objects.get(email=email,
                                         repo_id=repo_id,
                                         path=path,
                                         org_id=org_id)
        return True
    except UserStarredFiles.DoesNotExist:
        return False
