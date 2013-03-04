#!/usr/bin/env python
# encoding: utf-8
import os
import re
import stat
import urllib2
import uuid
import logging
import json

from django.contrib.sites.models import RequestSite
from django.db import IntegrityError
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.hashcompat import sha_constructor, md5_constructor
from django.utils.translation import ugettext as _

from base.models import FileContributors, UserStarredFiles, DirFilesLastModifiedInfo

from pysearpc import SearpcError
from seaserv import seafserv_rpc, ccnet_threaded_rpc, seafserv_threaded_rpc, \
    get_repo, get_commits, get_group_repoids, CCNET_SERVER_ADDR, \
    CCNET_SERVER_PORT, get_org_id_by_repo_id, get_org_by_id, is_org_staff, \
    get_org_id_by_group, list_share_repos, get_org_group_repos, \
    get_personal_groups_by_user, list_personal_repos_by_owner, get_group_repos, \
    list_org_repos_by_owner, get_org_groups_by_user, check_permission, \
    list_inner_pub_repos, list_org_inner_pub_repos
try:
    from settings import DOCUMENT_CONVERTOR_ROOT
except ImportError:
    DOCUMENT_CONVERTOR_ROOT = None
try:
    from settings import EMAIL_HOST
    IS_EMAIL_CONFIGURED = True
except ImportError:
    IS_EMAIL_CONFIGURED = False
try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False
    
import settings

# Get an instance of a logger
logger = logging.getLogger(__name__)

EMPTY_SHA1 = '0000000000000000000000000000000000000000'
MAX_INT = 2147483647 

PREVIEW_FILEEXT = {
    'Text': ('ac', 'am', 'bat', 'c', 'cc', 'cmake', 'cpp', 'cs', 'css', 'diff', 'el', 'h', 'html', 'htm', 'java', 'js', 'json', 'less', 'make', 'org', 'php', 'pl', 'properties', 'py', 'rb', 'scala', 'script', 'sh', 'sql', 'txt', 'text', 'tex', 'vi', 'vim', 'xhtml', 'xml'),
    'Image': ('gif', 'jpeg', 'jpg', 'png', 'ico'),
    'Document': ('doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'),
    'SVG': ('svg',),
    'PDF': ('pdf',),
    'Markdown': ('markdown', 'md'),
    'Sf': ('seaf',),
    'Video': ('mp4', 'ogv', 'webm', 'flv'),
    'Audio': ('mp3',),
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
    ctx['error_msg'] = msg or _('permission error')

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
    ctx['error_msg'] = msg or _('Internal error')

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
    Get seafile http server address and port from seaserv.

    """
    try:
        from settings import HTTP_SERVER_ROOT # First load from settings
    except ImportError:
        # If load settings failed, then use default config
        from seaserv import HTTP_SERVER_ROOT
    return HTTP_SERVER_ROOT if HTTP_SERVER_ROOT else ''

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
    
    return uuid.uuid4().hex[:max_length]

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
        repo.latest_modify = get_commits(repo.id, 0, 1)[0].ctime

def check_filename_with_rename(repo_id, parent_dir, filename):
    latest_commit = get_commits(repo_id, 0, 1)[0]
    if not latest_commit:
        return ''
    # TODO: what if parrent_dir does not exist?
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

def get_user_repos(user):
    """
    Get all repos that user can access, including owns, shared, public, and
    repo in groups.
    NOTE: collumn names in shared_repo struct are not same as owned or group
    repos.
    """
    email = user.username
    shared_repos = list_share_repos(email, 'to_email', -1, -1)
    
    if CLOUD_MODE:
        if user.org:
            org_id = user.org['org_id']
            owned_repos = list_org_repos_by_owner(org_id, email)
            groups_repos = []
            for group in get_org_groups_by_user(org_id, email):
                groups_repos += get_org_group_repos(org_id, group.id, email)
            
            public_repos = list_org_inner_pub_repos(org_id, email, -1, -1)
        else:
            owned_repos = list_personal_repos_by_owner(email)
            groups_repos = []
            for group in get_personal_groups_by_user(email):
                groups_repos += get_group_repos(group.id, email)
            public_repos = []
    else:
        owned_repos = list_personal_repos_by_owner(email)
        groups_repos = []
        for group in get_personal_groups_by_user(email):
            groups_repos += get_group_repos(group.id, email)
        public_repos = list_inner_pub_repos(email)

    return (owned_repos, shared_repos, groups_repos, public_repos)
                
def get_accessible_repos(request, repo):
    """Get all repos the current user can access when coping/moving files
    online. If the repo is encrypted, then files can only be copied/moved
    within the same repo. Otherwise, files can be copied/moved between
    owned/shared/group/public repos of the current user.

    """
    def check_has_subdir(repo):
        latest_commit = get_commits(repo.id, 0, 1)[0]
        if not latest_commit:
            return False
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

    owned_repos, shared_repos, groups_repos, public_repos = get_user_repos(request.user)

    def has_repo(repos, repo):
        for r in repos:
            if repo.id == r.id:
                return True
        return False

    accessible_repos = []
    for r in owned_repos:
        if not has_repo(accessible_repos, r) and not r.encrypted:
            r.has_subdir = check_has_subdir(r)
            accessible_repos.append(r)

    for r in shared_repos + public_repos:
        # For compatibility with diffrent fields names in Repo and
        # SharedRepo objects.
        r.id = r.repo_id
        r.name = r.repo_name
        r.desc = r.repo_desc

        if not has_repo(accessible_repos, r) and not r.encrypted:
            if check_permission(r.id, request.user.username) == 'rw':
                r.has_subdir = check_has_subdir(r)
                accessible_repos.append(r)

    for r in groups_repos:
        if not has_repo(accessible_repos, r) and not r.encrypted :
            if check_permission(r.id, request.user.username) == 'rw':
                r.has_subdir = check_has_subdir(r)
                accessible_repos.append(r)

    return accessible_repos

def valid_previewed_file(filename):
    """
    Check whether file can preview on web
    
    """
    fileExt = os.path.splitext(filename)[1][1:].lower()
    filetype = FILEEXT_TYPE_MAP.get(fileExt)
    if filetype:
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
    except SearpcError, e:
        return [], 0, ''

    if not commits:
        return [], 0, ''

    # Commits are already sorted by date, so the user list is also sorted.
    users = [ commit.creator_name for commit in commits if commit.creator_name ]

    # Remove duplicate elements in a list
    email_list = []
    for user in users:
        if user not in email_list:
            email_list.append(user)

    return email_list, commits[0].ctime, commits[0].id

def get_file_contributors(repo_id, file_path, file_path_hash, file_id):
    """Get file contributors list and last modified time from database cache.
    If not found in cache, try to get it from seaf-server.

    """
    contributors = []
    last_modified = 0
    last_commit_id = ''
    try:
        # HACK: Fixed the unique key bug in 1.1
        # Should be removed in future
        fc = FileContributors.objects.filter(repo_id=repo_id,
                                file_path_hash=file_path_hash)
        if not fc:
            raise FileContributors.DoesNotExist
        else:
            if len(fc) > 1:
                for e in fc[1:]:
                    e.delete()
            fc = fc[0]
    except FileContributors.DoesNotExist:
        # has no cache yet
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

    def _get_events(username, start, org_id=None):
        ev_session = SeafEventsSession()
        total = 11
        valid_events = []
        while total == 11 and len(valid_events) < 11:
            total, events = _get_events_inner(ev_session, username, start, org_id)
            start += len(events)
            valid_events.extend(events)

        ev_session.close()

        return valid_events[:11]

    def _get_events_inner(ev_session, username, start, org_id=None):
        '''Read 11 events from seafevents database, and remove events that are
        no longer valid

        '''
        if org_id == None:
            events = seafevents.get_user_events(ev_session, username, start, start + 11)
        else:
            events = seafevents.get_org_user_events(ev_session, \
                                    org_id, username, start, start + 11)
        total = len(events)
        valid_events = []
        for ev in events:
            if ev.etype == 'repo-update':
                repo = get_repo(ev.repo_id)
                if not repo:
                    # delete the update event for repo which has been deleted
                    seafevents.delete_event(ev_session, ev.uuid)
                    continue
                if repo.encrypted:
                    repo.password_set = seafserv_rpc.is_passwd_set(repo.id, username)
                ev.repo = repo
                ev.commit = seafserv_threaded_rpc.get_commit(ev.commit_id)

            valid_events.append(ev)

        return total, valid_events

    def get_user_events(username, start):
        return _get_events(username, start)
        
    def get_org_user_events(org_id, username, start):
        return _get_events(username, start, org_id=org_id)
        

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

    def __init__(self, org_id, repo, path, is_dir, last_modified, size):
        # always 0 for non-org repo
        self.org_id = org_id
        self.repo = repo
        self.path = path
        self.formatted_path = self.format_path()
        self.is_dir = is_dir
        # always 0 for dir
        self.last_modified = last_modified
        self.size = size
        if not is_dir:
            self.name = path.split('/')[-1]


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
        size = -1
        if sfile.path != "/":
            try:
                file_id = seafserv_threaded_rpc.get_file_id_by_path(sfile.repo_id, sfile.path)
                size = seafserv_threaded_rpc.get_file_size(file_id)
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

        f = StarredFile(sfile.org_id, repo, sfile.path, sfile.is_dir, last_modified, size)

        ret.append(f)
    ret.sort(lambda x, y: cmp(y.last_modified, x.last_modified))

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

def get_dir_starred_files(email, repo_id, parent_dir, org_id=-1): 
    '''Get starred files under parent_dir.

    '''
    starred_files = UserStarredFiles.objects.filter(email=email,
                                         repo_id=repo_id,
                                         path__startswith=parent_dir,
                                         org_id=org_id)
    return [ f.path for f in starred_files ]

def calc_dir_files_last_modified(repo_id, parent_dir, parent_dir_hash, dir_id):
    try:
        ret_list = seafserv_threaded_rpc.calc_files_last_modified(repo_id, parent_dir.encode('utf-8'), 0)
    except:
        return {}

    # ret_list is like:
    # [
    #    {'file_name': 'xxx', 'last_modified': t1}
    #    {'file_name': 'yyy', 'last_modified': t2}
    # ]
    # and we transform it to:
    # {'xxx': t1, 'yyy': t2}
    last_modified_info = {}
    for entry in ret_list:
        key = entry.file_name
        value = entry.last_modified
        last_modified_info[key] = value
        
    info = DirFilesLastModifiedInfo(repo_id=repo_id,
                                    parent_dir=parent_dir,
                                    parent_dir_hash=parent_dir_hash,
                                    dir_id=dir_id,
                                    last_modified_info=json.dumps(last_modified_info))

    try:
        info.save()
    except IntegrityError, e:
        # If this record is already saved, skip this step.
        logger.warn(e)
        
    return last_modified_info

def get_dir_files_last_modified(repo_id, parent_dir):
    '''Calc the last modified time of all the files under the directory
    <parent_dir> of the repo <repo_id>. Return a dict whose keys are the file
    names and values are their corresponding last modified timestamps.

    '''
    dir_id = seafserv_threaded_rpc.get_dir_id_by_path(repo_id, parent_dir)
    parent_dir_hash = calc_file_path_hash(parent_dir)
    if not dir_id:
        return {}
        
    try:
        info = DirFilesLastModifiedInfo.objects.get(repo_id=repo_id,
                                                    parent_dir_hash=parent_dir_hash)
    except DirFilesLastModifiedInfo.DoesNotExist:
        # no cache yet
        return calc_dir_files_last_modified(repo_id, parent_dir, parent_dir_hash, dir_id)
    else:
        # cache exist
        if info.dir_id != dir_id:
            # cache is outdated
            info.delete()
            return calc_dir_files_last_modified(repo_id, parent_dir, parent_dir_hash, dir_id)
        else:
            # cache is valid
            return json.loads(info.last_modified_info)

def calc_file_path_hash(path, bits=12):
    if isinstance(path, unicode):
        path = path.encode('UTF-8')

    path_hash = md5_constructor(urllib2.quote(path)).hexdigest()[:bits]
    
    return path_hash

def gen_shared_link(request, token, s_type):
    http_or_https = request.is_secure() and 'https' or 'http'
    domain = RequestSite(request).domain

    if s_type == 'f':
        return '%s://%s%sf/%s/' % (http_or_https, domain, settings.SITE_ROOT, token)
    else:
        return '%s://%s%sd/%s/' % (http_or_https, domain, settings.SITE_ROOT, token)

def show_delete_days(request):
    if request.method == 'GET':
        days_str = request.GET.get('days', '')
    elif request.method == 'POST':
        days_str = request.POST.get('days', '')
    else:
        days_str = ''

    try:
        days = int(days_str)
    except ValueError:
        days = 7

    return days

