# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
"""
File related views, including view_file, edit_file, view_history_file,
view_trash_file, view_snapshot_file
"""

import os
import hashlib
import logging
import json
import stat
import tempfile
import urllib
import urllib2
import chardet

from django.core.urlresolvers import reverse
from django.contrib import messages
from django.http import HttpResponse, HttpResponseBadRequest, Http404, \
    HttpResponseRedirect
from django.shortcuts import render, redirect
from django.template import Context, loader, RequestContext
from django.utils.http import urlquote
from django.utils.translation import ugettext as _

import seaserv
from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.auth.decorators import login_required
from seahub.base.decorators import user_mods_check
from seahub.wiki.models import PersonalWiki, WikiDoesNotExist, WikiPageMissing
from seahub.wiki.utils import (get_personal_wiki_page,
                               get_personal_wiki_repo, get_wiki_pages,
                               clean_page_name, page_name_to_file_name)
from seahub.wiki.forms import WikiCreateForm, WikiNewPageForm
from seahub.utils import render_error
from seahub.views import check_folder_permission

# Get an instance of a logger
logger = logging.getLogger(__name__)

@login_required
@user_mods_check
def personal_wiki(request, page_name="home"):
    username = request.user.username

    if request.cloud_mode and request.user.org is not None:
        org_id = request.user.org.org_id
        joined_groups = seaserv.get_org_groups_by_user(org_id, username)
    else:
        joined_groups = seaserv.get_personal_groups_by_user(username)

    if joined_groups:
        joined_groups.sort(lambda x, y: cmp(x.group_name.lower(), y.group_name.lower()))

    wiki_exists = True
    try:
        content, repo, dirent = get_personal_wiki_page(username, page_name)
    except WikiDoesNotExist:
        wiki_exists = False
        owned_repos = seafile_api.get_owned_repo_list(username)
        owned_repos = [r for r in owned_repos if not r.encrypted]
        return render(request, "wiki/personal_wiki.html", {
                "wiki_exists": wiki_exists,
                "owned_repos": owned_repos,
                "grps": joined_groups,
                })
    except WikiPageMissing:
        repo = get_personal_wiki_repo(username)
        filename = page_name_to_file_name(clean_page_name(page_name))
        if not seaserv.post_empty_file(repo.id, "/", filename, username):
            return render_error(request, _("Failed to create wiki page. Please retry later."))
        return HttpResponseRedirect(reverse('personal_wiki', args=[page_name]))
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

        wiki_index_exists = True
        index_pagename = 'index'
        index_content = None
        try:
            index_content, index_repo, index_dirent = get_personal_wiki_page(username, index_pagename)
        except (WikiDoesNotExist, WikiPageMissing) as e:
            wiki_index_exists = False

        return render(request, "wiki/personal_wiki.html", { 
            "wiki_exists": wiki_exists,
            "content": content,
            "page": os.path.splitext(dirent.obj_name)[0],
            "last_modified": last_modified,
            "latest_contributor": latest_contributor or _("Unknown"),
            "path": path,
            "repo_id": repo.id,
            "search_repo_id": repo.id,
            "search_wiki": True,
            "wiki_index_exists": wiki_index_exists,
            "index_content": index_content,
            "grps": joined_groups,
            })

@login_required
@user_mods_check
def personal_wiki_pages(request):
    """
    List personal wiki pages.
    """

    username = request.user.username

    if request.cloud_mode and request.user.org is not None:
        org_id = request.user.org.org_id
        joined_groups = seaserv.get_org_groups_by_user(org_id, username)
    else:
        joined_groups = seaserv.get_personal_groups_by_user(username)

    if joined_groups:
        joined_groups.sort(lambda x, y: cmp(x.group_name.lower(), y.group_name.lower()))

    try:
        repo = get_personal_wiki_repo(username)
        pages = get_wiki_pages(repo)
    except SearpcError:
        return render_error(request, _('Internal Server Error'))
    except WikiDoesNotExist:
        return render_error(request, _('Wiki does not exists.'))

    return render(request, "wiki/personal_wiki_pages.html", {
            "pages": pages,
            "repo_id": repo.id,
            "search_repo_id": repo.id,
            "search_wiki": True,
            "grps": joined_groups,
            })


@login_required
def personal_wiki_create(request):
    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    def json_error(err_msg, status=400):
        result = {'error': err_msg}
        return HttpResponse(json.dumps(result), status=status,
                            content_type=content_type)

    if not request.user.permissions.can_add_repo():
        return json_error(_('You do not have permission to create wiki'), 403)

    form = WikiCreateForm(request.POST)
    if not form.is_valid():
        return json_error(str(form.errors.values()[0]))

    # create group repo in user context
    repo_name = form.cleaned_data['repo_name']
    repo_desc = form.cleaned_data['repo_desc']
    username = request.user.username
    passwd = None
    permission = "rw"

    repo_id = seafile_api.create_repo(repo_name, repo_desc, username, passwd)
    if not repo_id:
        return json_error(_(u'Failed to create'), 500)

    PersonalWiki.objects.save_personal_wiki(username=username, repo_id=repo_id)

    # create home page
    page_name = "home.md"
    if not seaserv.post_empty_file(repo_id, "/", page_name, username):
        return json_error(_(u'Failed to create home page. Please retry later'), 500)

    next = reverse('personal_wiki', args=[])
    return HttpResponse(json.dumps({'href': next}), content_type=content_type)

@login_required
def personal_wiki_use_lib(request):
    if request.method != 'POST':
        raise Http404

    repo_id = request.POST.get('dst_repo', '')
    username = request.user.username
    next = reverse('personal_wiki', args=[])
    repo = seafile_api.get_repo(repo_id)
    if repo is None:
        messages.error(request, _('Failed to set wiki library.'))
        return HttpResponseRedirect(next)

    if check_folder_permission(request, repo_id, '/') != 'rw':
        messages.error(request, _('Permission denied.'))
        return HttpResponseRedirect(next)

    PersonalWiki.objects.save_personal_wiki(username=username, repo_id=repo_id)

    # create home page if not exist
    page_name = "home.md"
    if not seaserv.get_file_id_by_path(repo_id, "/" + page_name):
        if not seaserv.post_empty_file(repo_id, "/", page_name, username):
            messages.error(request, _('Failed to create home page. Please retry later'))

    return HttpResponseRedirect(next)

@login_required
def personal_wiki_page_new(request, page_name="home"):

    if request.method == 'POST':
        page_name = request.POST.get('page_name', '')
        if not page_name:
            return HttpResponseRedirect(request.META.get('HTTP_REFERER'))
        page_name = clean_page_name(page_name)

        try:
            repo = get_personal_wiki_repo(request.user.username)
        except WikiDoesNotExist:
            return render_error(request, _('Wiki is not found.'))

        filename = page_name + ".md"
        filepath = "/" + page_name + ".md"

        # check whether file exists
        if seaserv.get_file_id_by_path(repo.id, filepath):
            return render_error(request, _('Page "%s" already exists.') % filename)

        if not seaserv.post_empty_file(repo.id, "/", filename, request.user.username):
            return render_error(request, _('Failed to create wiki page. Please retry later.'))

        url = "%s?p=%s&from=personal_wiki_page_new" % (
            reverse('file_edit', args=[repo.id]),
            urlquote(filepath.encode('utf-8')))
        return HttpResponseRedirect(url)


@login_required
def personal_wiki_page_edit(request, page_name="home"):
    try:
        repo = get_personal_wiki_repo(request.user.username)
    except WikiDoesNotExist:
        return render_error(request, _('Wiki is not found.'))

    filepath = "/" + page_name + ".md"
    url = "%s?p=%s&from=personal_wiki_page_edit" % (
            reverse('file_edit', args=[repo.id]),
            urllib2.quote(filepath.encode('utf-8')))

    return HttpResponseRedirect(url)


@login_required
def personal_wiki_page_delete(request, page_name):
    try:
        repo = get_personal_wiki_repo(request.user.username)
    except WikiDoesNotExist:
        return render_error(request, _('Wiki is not found.'))
    
    file_name = page_name + '.md'
    username = request.user.username
    if seaserv.del_file(repo.id, '/', file_name, username):
        messages.success(request, 'Successfully deleted "%s".' % page_name)
    else:
        messages.error(request, 'Failed to delete "%s". Please retry later.' % page_name)

    return HttpResponseRedirect(reverse('personal_wiki', args=[]))
