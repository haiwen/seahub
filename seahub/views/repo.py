# -*- coding: utf-8 -*-
import logging

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
    gen_file_upload_url, get_httpserver_root, gen_shared_link, \
    EMPTY_SHA1, get_user_repos

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

def is_starred_dir(username, repo_id, path):
    # XXX: no idea what is doing
    return is_file_starred(username, repo_id, path.encode('utf-8'))

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
        dir_shared_link = gen_shared_link(request, fileshare.token, 'd')
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
    is_starred = is_starred_dir(username, repo.id, path)
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
            'is_starred': is_starred,
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
    
############

# from django.core.urlresolvers import reverse
# from django.contrib.sites.models import RequestSite
# from django.http import Http404, HttpResponseRedirect
# from django.shortcuts import render_to_response, redirect
# from django.template import RequestContext
# from django.template.loader import render_to_string
# from django.views.generic.base import TemplateView, TemplateResponseMixin
# from django.views.generic.edit import BaseFormView
# from seaserv import server_repo_size, is_passwd_set, get_commits, get_repo, \
#     get_org_groups_by_repo, get_shared_groups_by_repo, is_group_user, \
#     check_quota, MAX_UPLOAD_FILE_SIZE, web_get_access_token, is_repo_owner, \
#     is_org_repo_owner, get_repo_history_limit, get_commit

# from seahub.base.mixins import LoginRequiredMixin
# from seahub.contacts.models import Contact
# from seahub.share.models import FileShare
# from seahub.forms import RepoPassowrdForm
# from seahub.views import gen_path_link, get_user_permission, get_repo_dirents
# from seahub.utils import get_ccnetapplet_root, get_accessible_repos, \
#     is_file_starred, gen_file_upload_url, get_httpserver_root, gen_shared_link, \
#     EMPTY_SHA1, get_user_repos


# class RepoMixin(object):
#     def get_repo_id(self):
#         return self.kwargs.get('repo_id', '')

#     def get_path(self):
#         path = self.request.GET.get('p', '/')
#         if path[-1] != '/':
#             path = path + '/'
#         return path

#     def get_parent_dir(self):
#         return self.request.GET.get('p', '/')
    
#     def get_user(self):
#         return self.request.user

#     def get_repo(self, repo_id):
#         repo = get_repo(repo_id)
#         if not repo:
#             raise Http404
#         return repo

#     def get_repo_size(self):
#         return server_repo_size(self.repo.id)

#     def is_password_set(self):
#         if self.repo.encrypted:
#             return is_passwd_set(self.repo.id, self.user.username)
#         return False

#     def get_nav_path(self):
#         return gen_path_link(self.path, self.repo.name)

#     def get_applet_root(self):
#         return get_ccnetapplet_root()

#     def get_current_commit(self):
#         # Get newest commit by default, subclasses can override this method.
#         return get_commits(self.repo.id, 0, 1)[0]

#     def get_success_url(self):
#         next = self.request.GET.get('next', '')
#         if next:
#             return next
#         return reverse('repo', args=[self.repo_id])

#     def prepare_property(self):
#         # NOTE: order is important.
#         self.repo_id = self.get_repo_id()
#         self.user = self.get_user()
#         self.path = self.get_path()
#         self.parent_dir = self.get_parent_dir()
#         self.repo = self.get_repo(self.repo_id)
#         self.repo_size = self.get_repo_size()        
#         self.user_perm = get_user_permission(self.request, self.repo_id)
#         self.current_commit = self.get_current_commit()
#         self.password_set = self.is_password_set()
#         if self.repo.encrypt and not self.password_set:
#             # Repo is encrypt and password is not set, then no need to
#             # query following informations.
#             self.file_list, self.dir_list = [], []
#             self.zipped = None
#             self.applet_root = None
#         else:
#             self.file_list, self.dir_list = get_repo_dirents(self.request, self.repo_id, self.current_commit, self.path)
#             self.zipped = self.get_nav_path()
#             self.applet_root = self.get_applet_root()
#             self.protocol = self.request.is_secure() and 'https' or 'http'
#             self.domain = RequestSite(self.request).domain
#             self.contacts = Contact.objects.filter(user_email=self.request.user.username)
        
#     def get(self, request, *args, **kwargs):
#         self.prepare_property()
#         return super(RepoMixin, self).get(request, *args, **kwargs)

#     def post(self, request, *args, **kwargs):
#         self.prepare_property()
#         return super(RepoMixin, self).post(request, *args, **kwargs)
        
# class RepoView(LoginRequiredMixin, RepoMixin, TemplateResponseMixin, 
#                BaseFormView):
#     """
#     View to show repo page and handle post request to decrypt repo.
#     """
#     form_class = RepoPassowrdForm

#     def get_template_names(self):
#         if self.repo.encrypted and not self.password_set:
#             template_name = 'decrypt_repo_form.html'
#         else:
#             template_name = 'repo.html'
#         return template_name

#     def get_accessible_repos(self):
#         if self.user.is_authenticated():
#             accessible_repos = get_accessible_repos(self.request, self.repo)
#         else:
#             accessible_repos = []
#         return accessible_repos
    
#     def get_repo_shared_groups(self):
#         if self.user.org:
#             org_id = self.user.org['org_id']
#             repo_shared_groups = get_org_groups_by_repo(org_id, self.repo_id)
#         else:
#             repo_shared_groups = get_shared_groups_by_repo(self.repo_id)

#         # Filter out groups that user is joined.
#         groups = [ x for x in repo_shared_groups if \
#                        is_group_user(x.id, self.user.username)]
#         return groups

#     def is_starred_dir(self):
#         org_id = -1
#         if self.request.user.org:
#             org_id = self.request.user.org['org_id']
#         args = (self.request.user.username, self.repo.id, self.path.encode('utf-8'), org_id)
#         return is_file_starred(*args)

#     def is_no_quota(self):
#         return True if check_quota(self.repo_id) < 0 else False

#     def get_max_upload_file_size(self):
#         return MAX_UPLOAD_FILE_SIZE

#     def get_upload_url(self):
#         if get_user_permission(self.request, self.repo_id) == 'rw':
#             token = web_get_access_token(self.repo_id,
#                                          'dummy', 'upload',
#                                          self.request.user.username)
#             return gen_file_upload_url(token, 'upload')
#         else:
#             return ''

#     def get_httpserver_root(self):
#         return get_httpserver_root()

#     def get_update_url(self):
#         if get_user_permission(self.request, self.repo_id) == 'rw':
#             token = web_get_access_token(self.repo_id,
#                                          'dummy', 'update',
#                                          self.request.user.username)
#             return gen_file_upload_url(token, 'update')
#         else:
#             return ''

#     def get_fileshare(self, repo_id, user, path):
#         if path == '/':    # no shared link for root dir
#             return None
        
#         l = FileShare.objects.filter(repo_id=repo_id).filter(\
#             username=user).filter(path=path)
#         fileshare = l[0] if len(l) > 0 else None
#         return fileshare

#     def get_shared_link(self, fileshare):
#         # dir shared link
#         if fileshare:
#             dir_shared_link = gen_shared_link(self.request, fileshare.token, 'd')
#         else:
#             dir_shared_link = ''
#         return dir_shared_link

#     def is_repo_owner(self, username, repo_id):
#         if self.request.user.org:
#             return is_org_repo_owner(self.request.user.org['org_id'],
#                                      repo_id, username)
#         else:
#             return is_repo_owner(username, repo_id)
    
#     def get_context_data(self, **kwargs):
#         kwargs['repo'] = self.repo
#         kwargs['user_perm'] = self.user_perm
#         kwargs['is_repo_owner'] = self.is_repo_owner(self.get_user().username, self.repo.id)
#         kwargs['current_commit'] = self.get_current_commit()
#         kwargs['password_set'] = self.password_set
#         kwargs['repo_size'] = self.repo_size
#         kwargs['dir_list'] = self.dir_list
#         kwargs['file_list'] = self.file_list
#         kwargs['path'] = self.path
#         kwargs['parent_dir'] = self.parent_dir
#         kwargs['zipped'] = self.zipped
#         kwargs['accessible_repos'] = self.get_accessible_repos()
#         kwargs['applet_root'] = self.applet_root
#         kwargs['groups'] = self.get_repo_shared_groups()
#         kwargs['is_starred'] = self.is_starred_dir()
#         kwargs['next'] = self.get_success_url()
#         if len(kwargs['groups']) > 1:
#             ctx = {}
#             ctx['groups'] = kwargs['groups']
#             repogrp_str = render_to_string("snippets/repo_group_list.html", ctx)
#             kwargs['repo_group_str'] = repogrp_str
#         else:
#             kwargs['repo_group_str'] = ''
#         kwargs['no_quota'] = self.is_no_quota()
#         kwargs['max_upload_file_size'] = self.get_max_upload_file_size()
#         kwargs['upload_url'] = self.get_upload_url()
#         kwargs['update_url'] = self.get_update_url()
#         kwargs['httpserver_root'] = self.get_httpserver_root()
#         kwargs['head_id'] = self.repo.head_cmmt_id
#         kwargs['protocol'] = self.protocol
#         kwargs['domain'] = self.domain
#         kwargs['contacts'] = self.contacts
#         kwargs['fileshare'] = self.get_fileshare(\
#             self.repo_id, self.request.user.username, self.path)
#         kwargs['dir_shared_link'] = self.get_shared_link(kwargs['fileshare'])
#         kwargs['history_limit'] = get_repo_history_limit(self.repo.id)
#         if not self.repo.encrypted:
#             kwargs['search_repo_id'] = self.repo.id

#         return kwargs

# class RepoHistoryView(LoginRequiredMixin, RepoMixin, TemplateView):
#     """
#     View to show repo page in history.
#     """
#     def get_template_names(self):
#         if self.repo.encrypted and not self.password_set:
#             template_name = 'decrypt_repo_form.html'
#         else:
#             template_name = 'repo_history_view.html'            
#         return template_name
    
#     def get_current_commit(self):
#         commit_id = self.request.GET.get('commit_id', '')
#         if not commit_id:
#             return HttpResponseRedirect(reverse('repo', args=[self.repo.id]))
#         current_commit = get_commit(commit_id)
#         if not current_commit:
#             current_commit = get_commits(self.repo.id, 0, 1)[0]
#         return current_commit

#     def get_context_data(self, **kwargs):
#         kwargs['repo'] = self.repo
#         kwargs['user_perm'] = self.user_perm
#         kwargs['current_commit'] = self.get_current_commit()
#         kwargs['password_set'] = self.password_set
#         kwargs['repo_size'] = self.repo_size
#         kwargs['dir_list'] = self.dir_list
#         kwargs['file_list'] = self.file_list
#         kwargs['path'] = self.path
#         kwargs['zipped'] = self.zipped
#         if not self.repo.encrypted:
#             kwargs['search_repo_id'] = self.repo.id
#         return kwargs
 
