import os
import logging
import urllib2

import seaserv
from seaserv import seafile_api
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseBadRequest, Http404, \
    HttpResponseRedirect
from django.shortcuts import render_to_response, get_object_or_404
from django.template import Context, loader, RequestContext
from django.utils.translation import ugettext as _

import seaserv
from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.auth.decorators import login_required
from seahub.base.decorators import user_mods_check
from seahub.wiki.models import Wiki, WikiDoesNotExist, WikiPageMissing
from seahub.wiki.utils import (clean_page_name, page_name_to_file_name,
                               get_wiki_dirent, get_inner_file_url,
                               get_personal_wiki_page)
from seahub.utils import render_error
from seahub.views import check_folder_permission

# Get an instance of a logger
logger = logging.getLogger(__name__)


def slug(request, slug, page_name="home"):
    """Show wiki page.
    """
    username = request.user.username
    # get or 404
    wiki = get_object_or_404(Wiki, slug=slug)

    # perm check
    if not wiki.has_read_perm(request.user):
        raise Http404

    # show contents
    if request.cloud_mode and request.user.org is not None:
        org_id = request.user.org.org_id
        joined_groups = seaserv.get_org_groups_by_user(org_id, username)
    else:
        joined_groups = seaserv.get_personal_groups_by_user(username)

    if joined_groups:
        joined_groups.sort(lambda x, y: cmp(x.group_name.lower(), y.group_name.lower()))

    wiki_exists = True          # TODO: remove
    # 1. get wiki repo
    repo = seafile_api.get_repo(wiki.repo_id)
    if not repo:
        assert False, "TODO"

    # 2. get wiki repo content, ref: wiki/utils.py:get_personal_wiki_page
    try:
        wiki_dirent = get_wiki_dirent(repo.id, page_name)
    except WikiPageMissing:
        # create missing page...
        filename = page_name_to_file_name(clean_page_name(page_name))
        if not seaserv.post_empty_file(repo.id, "/", filename, username):
            logger.error('Faied to post empty file.')
            return render_error(request, _("Internal Server Error"))
        # ...and redirect
        return HttpResponseRedirect(reverse('wiki:slug', args=[slug, page_name]))

    url = get_inner_file_url(repo, wiki_dirent.obj_id, wiki_dirent.obj_name)
    file_response = urllib2.urlopen(url)
    content = file_response.read()

    # fetch file modified time and modifier
    path = '/' + wiki_dirent.obj_name
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
    except (WikiDoesNotExist, WikiPageMissing):
        wiki_index_exists = False

    return render_to_response(
            "wiki/personal_wiki.html", {
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
            }, context_instance=RequestContext(request))
