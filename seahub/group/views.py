# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import logging
import os
import json
import urllib2

from django.conf import settings
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.http import HttpResponse, HttpResponseRedirect, Http404, \
    HttpResponseBadRequest
from django.shortcuts import render

from django.utils.http import urlquote
from django.utils.translation import ugettext as _

from seahub.auth.decorators import login_required, login_required_ajax
import seaserv
from seaserv import ccnet_threaded_rpc, seafile_api, \
    get_group_repos, get_group, \
    remove_repo, get_file_id_by_path, post_empty_file, del_file
from pysearpc import SearpcError

from models import PublicGroup
from forms import MessageForm, WikiCreateForm
from seahub.auth import REDIRECT_FIELD_NAME
from seahub.base.decorators import sys_staff_required, require_POST
from seahub.group.utils import validate_group_name, BadGroupNameError, \
    ConflictGroupNameError, is_group_member
from seahub.wiki.models import WikiDoesNotExist, WikiPageMissing, GroupWiki
from seahub.wiki.utils import (clean_page_name, page_name_to_file_name,
                               get_wiki_pages, get_group_wiki_repo,
                               get_group_wiki_page)
from seahub.settings import SITE_ROOT
from seahub.utils import render_error, send_html_email, is_org_context, \
    get_site_name
from seahub.views import is_registered_user, check_folder_permission
from seahub.views.modules import get_enabled_mods_by_group, \
    get_available_mods_by_group
from seahub.share.models import ExtraGroupsSharePermission
from seahub.constants import HASH_URLS

from seahub.forms import SharedRepoCreateForm

# Get an instance of a logger
logger = logging.getLogger(__name__)

########## ccnet rpc wrapper
def create_group(group_name, username):
    return seaserv.ccnet_threaded_rpc.create_group(group_name, username)

def create_org_group(org_id, group_name, username):
    return seaserv.ccnet_threaded_rpc.create_org_group(org_id, group_name,
                                                       username)

def get_all_groups(start, limit):
    return seaserv.ccnet_threaded_rpc.get_all_groups(start, limit)

def org_user_exists(org_id, username):
    return seaserv.ccnet_threaded_rpc.org_user_exists(org_id, username)

########## helper functions
def is_group_staff(group, user):
    if user.is_anonymous():
        return False
    return seaserv.check_group_staff(group.id, user.username)

def remove_group_common(group_id, username, org_id=None):
    """Common function to remove a group, and it's repos,
    If ``org_id`` is provided, also remove org group.

    Arguments:
    - `group_id`:
    """
    seaserv.ccnet_threaded_rpc.remove_group(group_id, username)
    seaserv.seafserv_threaded_rpc.remove_repo_group(group_id)
    if org_id is not None and org_id > 0:
        seaserv.ccnet_threaded_rpc.remove_org_group(org_id, group_id)
    # remove record of share to group when group deleted
    ExtraGroupsSharePermission.objects.filter(group_id=group_id).delete()

def group_check(func):
    """
    Decorator for initial group permission check tasks

    un-login user & group not pub --> login page
    un-login user & group pub --> view_perm = "pub"
    login user & non group member & group not pub --> public info page
    login user & non group member & group pub --> view_perm = "pub"
    group member --> view_perm = "joined"
    sys admin --> view_perm = "sys_admin"
    """
    def _decorated(request, group_id, *args, **kwargs):
        group_id_int = int(group_id) # Checked by URL Conf
        group = get_group(group_id_int)
        if not group:
            return HttpResponseRedirect(HASH_URLS['GROUP_LIST'])
        group.is_staff = False
        if PublicGroup.objects.filter(group_id=group.id):
            group.is_pub = True
        else:
            group.is_pub = False

        if not request.user.is_authenticated():
            if not group.is_pub:
                login_url = settings.LOGIN_URL
                path = urlquote(request.get_full_path())
                tup = login_url, REDIRECT_FIELD_NAME, path
                return HttpResponseRedirect('%s?%s=%s' % tup)
            else:
                group.view_perm = "pub"
                return func(request, group, *args, **kwargs)

        joined = is_group_member(group_id_int, request.user.username)
        if joined:
            group.view_perm = "joined"
            group.is_staff = is_group_staff(group, request.user)
            return func(request, group, *args, **kwargs)

        if group.is_pub:
            group.view_perm = "pub"
            return func(request, group, *args, **kwargs)

        return render(request, 'error.html', {
                'error_msg': _('Permission denied'),
                })

    return _decorated

########## views
@login_required
@sys_staff_required
@require_POST
def group_remove(request, group_id):
    """
    Remove group from groupadmin page. Only system admin can perform this
    operation.
    """
    # Request header may missing HTTP_REFERER, we need to handle that case.
    next = request.META.get('HTTP_REFERER', SITE_ROOT)

    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(next)

    remove_group_common(group_id_int, request.user.username)

    return HttpResponseRedirect(next)

def rename_group_with_new_name(request, group_id, new_group_name):
    """Rename a group with new name.

    Arguments:
    - `request`:
    - `group_id`:
    - `new_group_name`:

    Raises:
        BadGroupNameError: New group name format is not valid.
        ConflictGroupNameError: New group name confilicts with existing name.
    """
    if not validate_group_name(new_group_name):
        raise BadGroupNameError

    # Check whether group name is duplicated.
    username = request.user.username
    org_id = -1
    if is_org_context(request):
        org_id = request.user.org.org_id
        checked_groups = seaserv.get_org_groups_by_user(org_id, username)
    else:
        if request.cloud_mode:
            checked_groups = seaserv.get_personal_groups_by_user(username)
        else:
            checked_groups = get_all_groups(-1, -1)

    for g in checked_groups:
        if g.group_name == new_group_name:
            raise ConflictGroupNameError

    ccnet_threaded_rpc.set_group_name(group_id, new_group_name)

def send_group_member_add_mail(request, group, from_user, to_user):
    c = {
        'email': from_user,
        'to_email': to_user,
        'group': group,
        }

    subject = _(u'You are invited to join a group on %s') % get_site_name()
    send_html_email(subject, 'group/add_member_email.html', c, None, [to_user])

@login_required_ajax
def create_group_repo(request, group_id):
    """Create a repo and share it to current group"""

    content_type = 'application/json; charset=utf-8'

    def json_error(err_msg):
        result = {'error': err_msg}
        return HttpResponseBadRequest(json.dumps(result),
                                      content_type=content_type)
    group_id = int(group_id)
    group = get_group(group_id)
    if not group:
        return json_error(_(u'Failed to create: the group does not exist.'))

    # Check whether user belongs to the group.
    username = request.user.username
    if not is_group_member(group_id, username):
        return json_error(_(u'Failed to create: you are not in the group.'))

    form = SharedRepoCreateForm(request.POST)
    if not form.is_valid():
        return json_error(str(form.errors.values()[0]))

    # Form is valid, create group repo
    repo_name = form.cleaned_data['repo_name']
    repo_desc = form.cleaned_data['repo_desc']
    permission = form.cleaned_data['permission']
    encryption = int(form.cleaned_data['encryption'])

    uuid = form.cleaned_data['uuid']
    magic_str = form.cleaned_data['magic_str']
    encrypted_file_key = form.cleaned_data['encrypted_file_key']

    if is_org_context(request):
        org_id = request.user.org.org_id
        try:
            if encryption:
                repo_id = seafile_api.create_org_enc_repo(
                    uuid, repo_name, repo_desc, username, magic_str,
                    encrypted_file_key, enc_version=2, org_id=org_id)
            else:
                repo_id = seafile_api.create_org_repo(repo_name, repo_desc,
                                                      username, None, org_id)
        except SearpcError, e:
            logger.error(e)
            return json_error(_(u'Failed to create'))

        try:
            seafile_api.add_org_group_repo(repo_id, org_id, group.id,
                                           username, permission)
        except SearpcError, e:
            logger.error(e)
            return json_error(_(u'Failed to create: internal error.'))
        else:
            return HttpResponse(json.dumps({'success': True}),
                                content_type=content_type)
    else:
        try:
            if encryption:
                repo_id = seafile_api.create_enc_repo(
                    uuid, repo_name, repo_desc, username, magic_str,
                    encrypted_file_key, enc_version=2)
            else:
                repo_id = seafile_api.create_repo(repo_name, repo_desc,
                                                  username, None)
        except SearpcError, e:
            logger.error(e)
            return json_error(_(u'Failed to create'))

        try:
            seafile_api.set_group_repo(repo_id, group.id, username, permission)
        except SearpcError, e:
            logger.error(e)
            return json_error(_(u'Failed to create: internal error.'))
        else:
            return HttpResponse(json.dumps({'success': True}),
                                content_type=content_type)

########## wiki
@group_check
def group_wiki(request, group, page_name="home"):
    username = request.user.username

    # get available modules(wiki, etc)
    mods_available = get_available_mods_by_group(group.id)
    mods_enabled = get_enabled_mods_by_group(group.id)

    wiki_exists = True
    try:
        content, repo, dirent = get_group_wiki_page(username, group, page_name)
    except WikiDoesNotExist:
        wiki_exists = False
        group_repos = get_group_repos(group.id, username)
        group_repos = [r for r in group_repos if not r.encrypted]
        return render(request, "group/group_wiki.html", {
                "group" : group,
                "is_staff": group.is_staff,
                "wiki_exists": wiki_exists,
                "mods_enabled": mods_enabled,
                "mods_available": mods_available,
                "group_repos": group_repos,
                })
    except WikiPageMissing:
        '''create that page for user if he/she is a group member'''
        if not is_group_member(group.id, username):
            raise Http404

        repo = get_group_wiki_repo(group, username)
        # No need to check whether repo is none, since repo is already created

        filename = page_name_to_file_name(clean_page_name(page_name))
        if not post_empty_file(repo.id, "/", filename, username):
            return render_error(request, _("Failed to create wiki page. Please retry later."))
        return HttpResponseRedirect(reverse('group_wiki', args=[group.id, page_name]))
    else:
        # fetch file modified time and modifier
        path = '/' + dirent.obj_name
        try:
            dirent = seafile_api.get_dirent_by_path(repo.id, path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
            else:
                latest_contributor, last_modified = None, 0
        except SearpcError as e:
            logger.error(e)
            latest_contributor, last_modified = None, 0

        if is_registered_user(username):
            repo_perm = seafile_api.check_permission_by_path(repo.id, '/', username)
        else:
            # when anonymous user visit public group wiki, set permission as 'r'
            repo_perm = 'r'

        wiki_index_exists = True
        index_pagename = 'index'
        index_content = None
        try:
            index_content, index_repo, index_dirent = get_group_wiki_page(username, group, index_pagename)
        except (WikiDoesNotExist, WikiPageMissing) as e:
            wiki_index_exists = False

        return render(request, "group/group_wiki.html", {
            "group" : group,
            "is_staff": group.is_staff,
            "wiki_exists": wiki_exists,
            "content": content,
            "page": os.path.splitext(dirent.obj_name)[0],
            "last_modified": last_modified,
            "latest_contributor": latest_contributor or _("Unknown"),
            "path": path,
            "repo_id": repo.id,
            "search_repo_id": repo.id,
            "search_wiki": True,
            "mods_enabled": mods_enabled,
            "mods_available": mods_available,
            "repo_perm": repo_perm,
            "wiki_index_exists": wiki_index_exists,
            "index_content": index_content,
            })

@group_check
def group_wiki_pages(request, group):
    """
    List wiki pages in group.
    """
    username = request.user.username
    try:
        repo = get_group_wiki_repo(group, username)
        pages = get_wiki_pages(repo)
    except SearpcError:
        return render_error(request, _('Internal Server Error'))
    except WikiDoesNotExist:
        return render_error(request, _('Wiki does not exists.'))

    if is_registered_user(username):
        repo_perm = seafile_api.check_permission_by_path(repo.id, '/', username)
    else:
        # when anonymous user visit public group wiki, set permission as 'r'
        repo_perm = 'r'

    mods_available = get_available_mods_by_group(group.id)
    mods_enabled = get_enabled_mods_by_group(group.id)

    return render(request, "group/group_wiki_pages.html", {
            "group": group,
            "pages": pages,
            "is_staff": group.is_staff,
            "repo_id": repo.id,
            "search_repo_id": repo.id,
            "search_wiki": True,
            "repo_perm": repo_perm,
            "mods_enabled": mods_enabled,
            "mods_available": mods_available,
            })

@login_required_ajax
@group_check
def group_wiki_create(request, group):
    if group.view_perm == "pub":
        raise Http404

    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    def json_error(err_msg, status=400):
        result = {'error': err_msg}
        return HttpResponse(json.dumps(result), status=status,
                            content_type=content_type)

    form = WikiCreateForm(request.POST)
    if not form.is_valid():
        return json_error(str(form.errors.values()[0]))

    # create group repo in user context
    repo_name = form.cleaned_data['repo_name']
    repo_desc = form.cleaned_data['repo_desc']
    user = request.user.username
    passwd = None
    permission = "rw"

    repo_id = seafile_api.create_repo(repo_name, repo_desc, user, passwd)
    if not repo_id:
        return json_error(_(u'Failed to create'), 500)

    try:
        seafile_api.set_group_repo(repo_id, group.id, user, permission)
    except SearpcError as e:
        remove_repo(repo_id)
        return json_error(_(u'Failed to create: internal error.'), 500)

    GroupWiki.objects.save_group_wiki(group_id=group.id, repo_id=repo_id)

    # create home page
    page_name = "home.md"
    if not post_empty_file(repo_id, "/", page_name, user):
        return json_error(_(u'Failed to create home page. Please retry later'), 500)

    next = reverse('group_wiki', args=[group.id])
    return HttpResponse(json.dumps({'href': next}), content_type=content_type)

@group_check
def group_wiki_use_lib(request, group):
    if group.view_perm == "pub":
        raise Http404
    if request.method != 'POST':
        raise Http404
    repo_id = request.POST.get('dst_repo', '')
    username = request.user.username
    next = reverse('group_wiki', args=[group.id])
    repo = seafile_api.get_repo(repo_id)
    if repo is None:
        messages.error(request, _('Failed to set wiki library.'))
        return HttpResponseRedirect(next)

    if check_folder_permission(request, repo_id, '/') != 'rw':
        messages.error(request, _('Permission denied.'))
        return HttpResponseRedirect(next)

    GroupWiki.objects.save_group_wiki(group_id=group.id, repo_id=repo_id)

    # create home page if not exist
    page_name = "home.md"
    if not seaserv.get_file_id_by_path(repo_id, "/" + page_name):
        if not seaserv.post_empty_file(repo_id, "/", page_name, username):
            messages.error(request, _('Failed to create home page. Please retry later'))

    return HttpResponseRedirect(next)

@group_check
def group_wiki_page_new(request, group, page_name="home"):
    if group.view_perm == "pub":
        raise Http404

    if request.method == 'POST':
        form = MessageForm(request.POST)

        page_name = request.POST.get('page_name', '')
        if not page_name:
            return HttpResponseRedirect(request.META.get('HTTP_REFERER'))
        page_name = clean_page_name(page_name)

        try:
            repo = get_group_wiki_repo(group, request.user.username)
        except WikiDoesNotExist:
            return render_error(request, _('Wiki is not found.'))

        filename = page_name + ".md"
        filepath = "/" + page_name + ".md"

        # check whether file exists
        if get_file_id_by_path(repo.id, filepath):
            return render_error(request, _('Page "%s" already exists.') % filename)

        if not post_empty_file(repo.id, "/", filename, request.user.username):
            return render_error(request, _('Failed to create wiki page. Please retry later.'))

        url = "%s?p=%s&from=wiki_page_new&gid=%s" % (
            reverse('file_edit', args=[repo.id]),
            urllib2.quote(filepath.encode('utf-8')), group.id)
        return HttpResponseRedirect(url)


@group_check
def group_wiki_page_edit(request, group, page_name="home"):
    if group.view_perm == "pub":
        raise Http404

    try:
        repo = get_group_wiki_repo(group, request.user.username)
    except WikiDoesNotExist:
        return render_error(request, _('Wiki is not found.'))

    filepath = "/" + page_name + ".md"
    url = "%s?p=%s&from=wiki_page_edit&gid=%s" % (
            reverse('file_edit', args=[repo.id]),
            urllib2.quote(filepath.encode('utf-8')), group.id)

    return HttpResponseRedirect(url)


@group_check
def group_wiki_page_delete(request, group, page_name):
    if group.view_perm == "pub":
        raise Http404

    try:
        repo = get_group_wiki_repo(group, request.user.username)
    except WikiDoesNotExist:
        return render_error(request, _('Wiki is not found.'))

    file_name = page_name + '.md'
    user = request.user.username
    if del_file(repo.id, '/', file_name, user):
        messages.success(request, _('Successfully deleted "%s".') % page_name)
    else:
        messages.error(request, _('Failed to delete "%s". Please retry later.') % page_name)

    return HttpResponseRedirect(reverse('group_wiki', args=[group.id]))
