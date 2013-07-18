# -*- coding: utf-8 -*-
import logging
import stat

from django.core.urlresolvers import reverse
from django.contrib.sites.models import RequestSite
from django.http import Http404, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.template.loader import render_to_string

import seaserv
from seaserv import seafile_api, MAX_UPLOAD_FILE_SIZE

from seahub.auth.decorators import login_required
from seahub.contacts.models import Contact
from seahub.forms import RepoPassowrdForm
from seahub.share.models import FileShare
from seahub.views import gen_path_link, get_user_permission, get_repo_dirents
from seahub.utils import get_ccnetapplet_root, is_file_starred, \
    gen_file_upload_url, get_httpserver_root, gen_dir_share_link, \
    EMPTY_SHA1, get_user_repos
from seahub.settings import ENABLE_SUB_LIBRARY

# Get an instance of a logger
logger = logging.getLogger(__name__)

def get_repo(repo_id):
    return seafile_api.get_repo(repo_id)

def get_commit(commit_id):
    return seaserv.get_commit(commit_id)

def get_repo_size(repo_id):
    return seafile_api.get_repo_size(repo_id)

def list_dir_by_commit_and_path(commit, path):
    return seafile_api.list_dir_by_commit_and_path(commit.id, path)

def is_password_set(repo_id, username):
    return seafile_api.is_password_set(repo_id, username)

def check_repo_access_permission(repo_id, username):
    return seafile_api.check_repo_access_permission(repo_id, username)

def get_path_from_request(request):
    path = request.GET.get('p', '/')
    if path[-1] != '/':
        path = path + '/'
    return path

def get_next_url_from_request(request):
    return request.GET.get('next', None)

def get_nav_path(path, repo_name):
    return gen_path_link(path, repo_name)

def get_unencry_rw_repos_by_user(username):
    """Get all unencrypted repos the user can read and write.
    """
    def check_has_subdir(repo):
        latest_commit = seaserv.get_commits(repo.id, 0, 1)[0]
        if not latest_commit:
            return False
        if latest_commit.root_id == EMPTY_SHA1:
            return False

        try:
            dirs = seafile_api.list_dir_by_commit_and_path(latest_commit.id, '/')
        except Exception, e:
            logger.error(e)
            return False
        else:
            for dirent in dirs:
                if stat.S_ISDIR(dirent.props.mode):
                    return True
            return False

    def has_repo(repos, repo):
        for r in repos:
            if repo.id == r.id:
                return True
        return False
    
    owned_repos, shared_repos, groups_repos, public_repos = get_user_repos(username)

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
            if seafile_api.check_repo_access_permission(r.id, username) == 'rw':
                r.has_subdir = check_has_subdir(r)
                accessible_repos.append(r)

    for r in groups_repos:
        if not has_repo(accessible_repos, r) and not r.encrypted :
            if seafile_api.check_repo_access_permission(r.id, username) == 'rw':            
                r.has_subdir = check_has_subdir(r)
                accessible_repos.append(r)

    return accessible_repos

def get_shared_groups_by_repo_and_user(repo_id, username):
    """Get all groups which this repo is shared.
    """
    repo_shared_groups = seaserv.get_shared_groups_by_repo(repo_id)

    # Filter out groups that user is joined.
    groups = [ x for x in repo_shared_groups if \
                   seaserv.is_group_user(x.id, username)]
    return groups

def is_no_quota(repo_id):
    return True if seaserv.check_quota(repo_id) < 0 else False

def get_upload_url(request, repo_id):
    username = request.user.username
    if get_user_permission(request, repo_id) == 'rw':
        token = seafile_api.get_httpserver_access_token(repo_id, 'dummy',
                                                        'upload', username)
        return gen_file_upload_url(token, 'upload')
    else:
        return ''

def get_update_url(request, repo_id):
    username = request.user.username
    if get_user_permission(request, repo_id) == 'rw':
        token = seafile_api.get_httpserver_access_token(repo_id, 'dummy',
                                                        'update', username)
        return gen_file_upload_url(token, 'update')
    else:
        return ''
    
def get_fileshare(repo_id, username, path):
    if path == '/':    # no shared link for root dir
        return None
        
    l = FileShare.objects.filter(repo_id=repo_id).filter(
        username=username).filter(path=path)
    return l[0] if len(l) > 0 else None

def get_shared_link(request, fileshare):
    # dir shared link
    if fileshare:
        dir_shared_link = gen_dir_share_link(fileshare.token)
    else:
        dir_shared_link = ''
    return dir_shared_link

def render_repo(request, repo):
    """Steps to show repo page:
    If user has permission to view repo
      If repo is encrypt and password is not set on server
        return decrypt repo page
      If repo is not encrypt or password is set on server
        Show repo direntries based on requested path
    If user does not have permission to view repo
      return permission deny page
    """
    username = request.user.username
    user_perm = check_repo_access_permission(repo.id, username)
    if user_perm is None:
        return render_to_response('repo_access_deny.html', {
                'repo': repo,
                }, context_instance=RequestContext(request))

    if repo.encrypted and not is_password_set(repo.id, username):
        return render_to_response('decrypt_repo_form.html', {
                'repo': repo,
                'next': get_next_url_from_request(request) or \
                    reverse('repo', args=[repo.id])
                }, context_instance=RequestContext(request))

    # query context args
    applet_root = get_ccnetapplet_root()
    httpserver_root = get_httpserver_root()
    max_upload_file_size = MAX_UPLOAD_FILE_SIZE
    
    protocol = request.is_secure() and 'https' or 'http'
    domain = RequestSite(request).domain
    path = get_path_from_request(request)

    contacts = Contact.objects.get_contacts_by_user(username)
    accessible_repos = [repo] if repo.encrypted else get_unencry_rw_repos_by_user(username)

    head_commit = get_commit(repo.head_cmmt_id)
    if not head_commit:
        raise Http404
    repo_size = get_repo_size(repo.id)
    no_quota = is_no_quota(repo.id)
    history_limit = seaserv.get_repo_history_limit(repo.id)
    search_repo_id = None if repo.encrypted else repo.id
    
    is_repo_owner = seafile_api.is_repo_owner(username, repo.id)
    file_list, dir_list = get_repo_dirents(request, repo.id, head_commit, path)
    zipped = get_nav_path(path, repo.name)
    repo_groups = get_shared_groups_by_repo_and_user(repo.id, username)
    if len(repo_groups) > 1:
        repo_group_str = render_to_string("snippets/repo_group_list.html",
                                          {'groups': repo_groups})
    else:
        repo_group_str = ''
    upload_url = get_upload_url(request, repo.id)
    update_url = get_update_url(request, repo.id)
    fileshare = get_fileshare(repo.id, username, path)
    dir_shared_link = get_shared_link(request, fileshare)

    return render_to_response('repo.html', {
            'repo': repo,
            'user_perm': user_perm,
            'is_repo_owner': is_repo_owner,
            'current_commit': head_commit,
            'password_set': True,
            'repo_size': repo_size,
            'dir_list': dir_list,
            'file_list': file_list,
            'path': path,
            'zipped': zipped,
            'accessible_repos': accessible_repos,
            'applet_root': applet_root,
            'groups': repo_groups,
            'repo_group_str': repo_group_str,
            'no_quota': no_quota,
            'max_upload_file_size': max_upload_file_size,
            'upload_url': upload_url,
            'update_url': update_url,
            'httpserver_root': httpserver_root,
            'protocol': protocol,
            'domain': domain,
            'contacts': contacts,
            'fileshare': fileshare,
            'dir_shared_link': dir_shared_link,
            'history_limit': history_limit,
            'search_repo_id': search_repo_id,
            'ENABLE_SUB_LIBRARY': ENABLE_SUB_LIBRARY,
            }, context_instance=RequestContext(request))
    
@login_required    
def repo(request, repo_id):
    """Show repo page and handle POST request to decrypt repo.
    """
    repo = get_repo(repo_id)
    if not repo:
        raise Http404
    
    if request.method == 'GET':
        return render_repo(request, repo)
    elif request.method == 'POST':
        form = RepoPassowrdForm(request.POST)
        next = get_next_url_from_request(request) or reverse('repo',
                                                             args=[repo_id])
        if form.is_valid():
            return HttpResponseRedirect(next)
        else:
            return render_to_response('decrypt_repo_form.html', {
                    'repo': repo,
                    'form': form,
                    'next': next,
                    }, context_instance=RequestContext(request))
    
@login_required
def repo_history_view(request, repo_id):
    """View repo in history.
    """
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    username = request.user.username
    user_perm = check_repo_access_permission(repo.id, username)
    if user_perm is None:
        return render_to_response('repo_access_deny.html', {
                'repo': repo,
                }, context_instance=RequestContext(request))

    if repo.encrypted and not is_password_set(repo.id, username):
        return render_to_response('decrypt_repo_form.html', {
                'repo': repo,
                'next': get_next_url_from_request(request) or \
                    reverse('repo', args=[repo.id])
                }, context_instance=RequestContext(request))
    
    commit_id = request.GET.get('commit_id', None)
    if commit_id is None:
            return HttpResponseRedirect(reverse('repo', args=[repo.id]))
    current_commit = get_commit(commit_id)
    if not current_commit:
        current_commit = get_commit(repo.head_cmmt_id)

    path = get_path_from_request(request)
    file_list, dir_list = get_repo_dirents(request, repo.id, current_commit, path)
    zipped = get_nav_path(path, repo.name)
    search_repo_id = None if repo.encrypted else repo.id

    return render_to_response('repo_history_view.html', {
            'repo': repo,
            'user_perm': user_perm,
            'current_commit': current_commit,
            'dir_list': dir_list,
            'file_list': file_list,
            'path': path,
            'zipped': zipped,
            'search_repo_id': search_repo_id,
            }, context_instance=RequestContext(request))
    
