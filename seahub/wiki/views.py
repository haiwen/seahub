import os
import logging
import urllib2

import seaserv
from seaserv import seafile_api
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseBadRequest, Http404, \
    HttpResponseRedirect
from django.shortcuts import render, get_object_or_404
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

@login_required
@user_mods_check
def wiki_list(request):

    username = request.user.username

    if request.cloud_mode and request.user.org is not None:
        org_id = request.user.org.org_id
        joined_groups = seaserv.get_org_groups_by_user(org_id, username)
    else:
        joined_groups = seaserv.get_personal_groups_by_user(username)

    if joined_groups:
        joined_groups.sort(lambda x, y: cmp(x.group_name.lower(), y.group_name.lower()))

    return render(request, "wiki/wiki_list.html", {
        "grps": joined_groups,
    })


def slug(request, slug, page_name="home"):
    """Show wiki page.
    """
    # get wiki object or 404
    wiki = get_object_or_404(Wiki, slug=slug)

    # perm check
    if not wiki.has_read_perm(request.user):
        raise Http404

    user_can_write = True if request.user.username == wiki.username else False

    return render(request, "wiki/wiki.html", {
        "wiki": wiki,
        "page_name": page_name,
        "user_can_write": user_can_write,
        "path": '/' + page_name + '.md',
        "repo_id": wiki.repo_id,
        "search_repo_id": wiki.repo_id,
        "search_wiki": True,
    })


@login_required
@user_mods_check
def edit_page(request, slug, page_name="home"):

    # get wiki object or 404
    wiki = get_object_or_404(Wiki, slug=slug)

    if request.user.username != wiki.username:
        raise Http404

    filepath = "/" + page_name + ".md"
    url = "%s?p=%s&from=wikis_wiki_page_edit&wiki_slug=%s" % (
            reverse('file_edit', args=[wiki.repo_id]),
            urllib2.quote(filepath.encode('utf-8')),
            slug)

    return HttpResponseRedirect(url)
