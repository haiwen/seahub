# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import urllib.request, urllib.error, urllib.parse
import posixpath

import seaserv
from seaserv import seafile_api
from django.urls import reverse
from django.http import Http404, HttpResponseRedirect
from django.shortcuts import render, get_object_or_404, redirect
from django.utils.translation import ugettext as _

from seahub.auth.decorators import login_required
from seahub.share.models import FileShare
from seahub.wiki.models import Wiki
from seahub.views import check_folder_permission
from seahub.utils import get_service_url, get_file_type_and_ext, render_permission_error
from seahub.utils.file_types import *

# Get an instance of a logger
logger = logging.getLogger(__name__)


def slug(request, slug, file_path="home.md"):
    """Show wiki page.
    """
    # get wiki object or 404
    wiki = get_object_or_404(Wiki, slug=slug)
    file_path = "/" + file_path

    is_dir = None
    file_id = seafile_api.get_file_id_by_path(wiki.repo_id, file_path)
    if file_id:
        is_dir = False

    dir_id = seafile_api.get_dir_id_by_path(wiki.repo_id, file_path)
    if dir_id:
        is_dir = True

    # compatible with old wiki url
    if is_dir is None:
        if len(file_path.split('.')) == 1:
            new_path = file_path[1:] + '.md'
            return HttpResponseRedirect(reverse('wiki:slug', args=[slug, new_path]))

    # perm check
    req_user = request.user.username

    if not req_user and not wiki.has_read_perm(request):
        return redirect('auth_login')
    else:
        if not wiki.has_read_perm(request):
            return render_permission_error(request, _('Unable to view Wiki'))

    file_type, ext = get_file_type_and_ext(posixpath.basename(file_path))
    if file_type == IMAGE:
        file_url = reverse('view_lib_file', args=[wiki.repo_id, file_path])
        return HttpResponseRedirect(file_url + "?raw=1")

    if not req_user:
        user_can_write = False
    elif req_user == wiki.username or check_folder_permission(
            request, wiki.repo_id, '/') == 'rw':
        user_can_write = True
    else:
        user_can_write = False

    is_public_wiki = False
    if wiki.permission == 'public':
        is_public_wiki = True

    has_index = False
    dirs = seafile_api.list_dir_by_path(wiki.repo_id, '/')
    for dir_obj in dirs:
        if dir_obj.obj_name == 'index.md':
            has_index = True
            break

    try:
        fs = FileShare.objects.get(repo_id=wiki.repo_id, path='/')
    except FileShare.DoesNotExist:
        fs = FileShare.objects.create_dir_link(wiki.username, wiki.repo_id, '/',
                                               permission='view_download')
        wiki.permission = 'public'
        wiki.save()
        is_public_wiki = True

    return render(request, "wiki/wiki.html", {
        "wiki": wiki,
        "page_name": file_path,
        "shared_token": fs.token,
        "shared_type": fs.s_type,
        "user_can_write": user_can_write,
        "file_path": file_path,
        "repo_id": wiki.repo_id,
        "search_repo_id": wiki.repo_id,
        "search_wiki": True,
        "is_public_wiki": is_public_wiki,
        "is_dir": is_dir,
        "has_index": has_index,
    })


'''
@login_required
def edit_page(request, slug, page_name="home"):

    # get wiki object or 404
    wiki = get_object_or_404(Wiki, slug=slug)

    if request.user.username != wiki.username:
        raise Http404

    filepath = "/" + page_name + ".md"
    url = "%s?p=%s&from=wikis_wiki_page_edit&wiki_slug=%s" % (
            reverse('file_edit', args=[wiki.repo_id]),
            urllib.parse.quote(filepath.encode('utf-8')),
            slug)

    return HttpResponseRedirect(url)
'''
