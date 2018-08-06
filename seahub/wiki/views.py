# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import urllib2

import seaserv
from django.core.urlresolvers import reverse
from django.http import Http404, HttpResponseRedirect
from django.shortcuts import render, get_object_or_404

from seahub.auth.decorators import login_required
from seahub.base.decorators import user_mods_check
from seahub.wiki.models import Wiki
from seahub.views import check_folder_permission
from seahub.utils import get_service_url

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

    req_user = request.user.username
    if not req_user:
        user_can_write = False
    elif req_user == wiki.username or check_folder_permission(
            request, wiki.repo_id, '/') == 'rw':
        user_can_write = True
    else:
        user_can_write = False

    return render(request, "wiki/wiki.html", {
        "wiki": wiki,
        "page_name": page_name,
        "user_can_write": user_can_write,
        "path": '/' + page_name + '.md',
        "repo_id": wiki.repo_id,
        "search_repo_id": wiki.repo_id,
        "search_wiki": True,
        "service_url": get_service_url().rstrip('/')
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
