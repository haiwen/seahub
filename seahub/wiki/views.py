# Copyright (c) 2012-2016 Seafile Ltd.
from seaserv import seafile_api

from django.conf import settings
from django.http import Http404, HttpResponseRedirect
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.translation import gettext as _

from seahub.utils import render_permission_error
from seahub.wiki.models import Wiki


def slug(request, slug, file_path="home.md"):
    """Show the deprecated old Wiki page."""
    if not settings.ENABLE_WIKI:
        raise Http404

    wiki = get_object_or_404(Wiki, slug=slug)

    # Keep the old URL pattern working for links without the .md suffix.
    file_path = "/" + file_path
    is_dir = None
    if seafile_api.get_file_id_by_path(wiki.repo_id, file_path):
        is_dir = False
    if seafile_api.get_dir_id_by_path(wiki.repo_id, file_path):
        is_dir = True
    if is_dir is None and len(file_path.split('.')) == 1:
        new_path = file_path[1:] + '.md'
        return HttpResponseRedirect(reverse('wiki:slug', args=[slug, new_path]))

    req_user = request.user.username
    if not req_user and not wiki.has_read_perm(request):
        return redirect('auth_login')
    if not wiki.has_read_perm(request):
        return render_permission_error(request, _('Unable to view Wiki'))

    return render(request, "wiki/wiki_deprecated.html", {"wiki": wiki})


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
