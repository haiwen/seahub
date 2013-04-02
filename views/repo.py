# -*- coding: utf-8 -*-
from django.core.urlresolvers import reverse
from django.contrib.sites.models import RequestSite
from django.http import Http404, HttpResponseRedirect
from django.template.loader import render_to_string
from django.views.generic.base import TemplateView, TemplateResponseMixin
from django.views.generic.edit import BaseFormView
from seaserv import server_repo_size, is_passwd_set, get_commits, get_repo, \
    get_org_groups_by_repo, get_shared_groups_by_repo, is_group_user, \
    check_quota, MAX_UPLOAD_FILE_SIZE, web_get_access_token, is_repo_owner, \
    is_org_repo_owner, get_repo_history_limit, get_commit

from base.mixins import LoginRequiredMixin
from contacts.models import Contact
from share.models import FileShare
from seahub.forms import RepoPassowrdForm
from seahub.views import gen_path_link, get_user_permission, get_repo_dirents
from seahub.utils import get_ccnetapplet_root, get_accessible_repos, \
    is_file_starred, gen_file_upload_url, get_httpserver_root, gen_shared_link

class RepoMixin(object):
    def get_repo_id(self):
        return self.kwargs.get('repo_id', '')

    def get_path(self):
        path = self.request.GET.get('p', '/')
        if path[-1] != '/':
            path = path + '/'
        return path

    def get_parent_dir(self):
        return self.request.GET.get('p', '/')
    
    def get_user(self):
        return self.request.user

    def get_repo(self, repo_id):
        repo = get_repo(repo_id)
        if not repo:
            raise Http404
        return repo

    def get_repo_size(self):
        return server_repo_size(self.repo.id)

    def is_password_set(self):
        if self.repo.encrypted:
            return is_passwd_set(self.repo.id, self.user.username)
        return False

    def get_nav_path(self):
        return gen_path_link(self.path, self.repo.name)

    def get_applet_root(self):
        return get_ccnetapplet_root()

    def get_current_commit(self):
        # Get newest commit by default, subclasses can override this method.
        return get_commits(self.repo.id, 0, 1)[0]

    def get_success_url(self):
        next = self.request.GET.get('next', '')
        if next:
            return next
        return reverse('repo', args=[self.repo_id])

    def prepare_property(self):
        # NOTE: order is important.
        self.repo_id = self.get_repo_id()
        self.user = self.get_user()
        self.path = self.get_path()
        self.parent_dir = self.get_parent_dir()
        self.repo = self.get_repo(self.repo_id)
        self.repo_size = self.get_repo_size()        
        self.user_perm = get_user_permission(self.request, self.repo_id)
        self.current_commit = self.get_current_commit()
        self.password_set = self.is_password_set()
        if self.repo.encrypt and not self.password_set:
            # Repo is encrypt and password is not set, then no need to
            # query following informations.
            self.file_list, self.dir_list = [], []
            self.zipped = None
            self.applet_root = None
        else:
            self.file_list, self.dir_list = get_repo_dirents(self.request, self.repo_id, self.current_commit, self.path)
            self.zipped = self.get_nav_path()
            self.applet_root = self.get_applet_root()
            self.protocol = self.request.is_secure() and 'https' or 'http'
            self.domain = RequestSite(self.request).domain
            self.contacts = Contact.objects.filter(user_email=self.request.user.username)
        
    def get(self, request, *args, **kwargs):
        self.prepare_property()
        return super(RepoMixin, self).get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        self.prepare_property()
        return super(RepoMixin, self).post(request, *args, **kwargs)
        
class RepoView(LoginRequiredMixin, RepoMixin, TemplateResponseMixin, 
               BaseFormView):
    """
    View to show repo page and handle post request to decrypt repo.
    """
    form_class = RepoPassowrdForm

    def get_template_names(self):
        if self.repo.encrypted and not self.password_set:
            template_name = 'decrypt_repo_form.html'
        else:
            template_name = 'repo.html'
        return template_name

    def get_accessible_repos(self):
        if self.user.is_authenticated():
            accessible_repos = get_accessible_repos(self.request, self.repo)
        else:
            accessible_repos = []
        return accessible_repos
    
    def get_repo_shared_groups(self):
        if self.user.org:
            org_id = self.user.org['org_id']
            repo_shared_groups = get_org_groups_by_repo(org_id, self.repo_id)
        else:
            repo_shared_groups = get_shared_groups_by_repo(self.repo_id)

        # Filter out groups that user is joined.
        groups = [ x for x in repo_shared_groups if \
                       is_group_user(x.id, self.user.username)]
        return groups

    def is_starred_dir(self):
        org_id = -1
        if self.request.user.org:
            org_id = self.request.user.org['org_id']
        args = (self.request.user.username, self.repo.id, self.path.encode('utf-8'), org_id)
        return is_file_starred(*args)

    def is_no_quota(self):
        return True if check_quota(self.repo_id) < 0 else False

    def get_max_upload_file_size(self):
        return MAX_UPLOAD_FILE_SIZE

    def get_upload_url(self):
        if get_user_permission(self.request, self.repo_id) == 'rw':
            token = web_get_access_token(self.repo_id,
                                         'dummy', 'upload',
                                         self.request.user.username)
            return gen_file_upload_url(token, 'upload')
        else:
            return ''

    def get_httpserver_root(self):
        return get_httpserver_root()

    def get_update_url(self):
        if get_user_permission(self.request, self.repo_id) == 'rw':
            token = web_get_access_token(self.repo_id,
                                         'dummy', 'update',
                                         self.request.user.username)
            return gen_file_upload_url(token, 'update')
        else:
            return ''

    def get_fileshare(self, repo_id, user, path):
        if path == '/':    # no shared link for root dir
            return None
        
        l = FileShare.objects.filter(repo_id=repo_id).filter(\
            username=user).filter(path=path)
        fileshare = l[0] if len(l) > 0 else None
        return fileshare

    def get_shared_link(self, fileshare):
        # dir shared link
        if fileshare:
            dir_shared_link = gen_shared_link(self.request, fileshare.token, 'd')
        else:
            dir_shared_link = ''
        return dir_shared_link

    def is_repo_owner(self, username, repo_id):
        if self.request.user.org:
            return is_org_repo_owner(self.request.user.org['org_id'],
                                     repo_id, username)
        else:
            return is_repo_owner(username, repo_id)
    
    def get_context_data(self, **kwargs):
        kwargs['repo'] = self.repo
        kwargs['user_perm'] = self.user_perm
        kwargs['is_repo_owner'] = self.is_repo_owner(self.get_user().username, self.repo.id)
        kwargs['current_commit'] = self.get_current_commit()
        kwargs['password_set'] = self.password_set
        kwargs['repo_size'] = self.repo_size
        kwargs['dir_list'] = self.dir_list
        kwargs['file_list'] = self.file_list
        kwargs['path'] = self.path
        kwargs['parent_dir'] = self.parent_dir
        kwargs['zipped'] = self.zipped
        kwargs['accessible_repos'] = self.get_accessible_repos()
        kwargs['applet_root'] = self.applet_root
        kwargs['groups'] = self.get_repo_shared_groups()
        kwargs['is_starred'] = self.is_starred_dir()
        kwargs['next'] = self.get_success_url()
        if len(kwargs['groups']) > 1:
            ctx = {}
            ctx['groups'] = kwargs['groups']
            repogrp_str = render_to_string("snippets/repo_group_list.html", ctx)
            kwargs['repo_group_str'] = repogrp_str
        else:
            kwargs['repo_group_str'] = ''
        kwargs['no_quota'] = self.is_no_quota()
        kwargs['max_upload_file_size'] = self.get_max_upload_file_size()
        kwargs['upload_url'] = self.get_upload_url()
        kwargs['update_url'] = self.get_update_url()
        kwargs['httpserver_root'] = self.get_httpserver_root()
        kwargs['head_id'] = self.repo.head_cmmt_id
        kwargs['protocol'] = self.protocol
        kwargs['domain'] = self.domain
        kwargs['contacts'] = self.contacts
        kwargs['fileshare'] = self.get_fileshare(\
            self.repo_id, self.request.user.username, self.path)
        kwargs['dir_shared_link'] = self.get_shared_link(kwargs['fileshare'])
        kwargs['history_limit'] = get_repo_history_limit(self.repo.id)

        return kwargs

class RepoHistoryView(LoginRequiredMixin, RepoMixin, TemplateView):
    """
    View to show repo page in history.
    """
    def get_template_names(self):
        if self.repo.encrypted and not self.password_set:
            template_name = 'decrypt_repo_form.html'
        else:
            template_name = 'repo_history_view.html'            
        return template_name
    
    def get_current_commit(self):
        commit_id = self.request.GET.get('commit_id', '')
        if not commit_id:
            return HttpResponseRedirect(reverse('repo', args=[self.repo.id]))
        current_commit = get_commit(commit_id)
        if not current_commit:
            current_commit = get_commits(self.repo.id, 0, 1)[0]
        return current_commit

    def get_context_data(self, **kwargs):
        kwargs['repo'] = self.repo
        kwargs['user_perm'] = self.user_perm
        kwargs['current_commit'] = self.get_current_commit()
        kwargs['password_set'] = self.password_set
        kwargs['repo_size'] = self.repo_size
        kwargs['dir_list'] = self.dir_list
        kwargs['file_list'] = self.file_list
        kwargs['path'] = self.path
        kwargs['zipped'] = self.zipped
        return kwargs
