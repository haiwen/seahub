# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.translation import gettext as _

from seahub.utils import render_permission_error
from seahub.wiki.models import Wiki


def slug(request, slug, file_path="home.md"):
    """Show the deprecated old Wiki page."""
    if not settings.ENABLE_WIKI:
        raise Http404

    wiki = get_object_or_404(Wiki, slug=slug)

    req_user = request.user.username
    if not req_user and not wiki.has_read_perm(request):
        return redirect('auth_login')
    if not wiki.has_read_perm(request):
        return render_permission_error(request, _('Unable to view Wiki'))

    return render(request, "wiki/wiki_deprecated.html", {"wiki": wiki})
