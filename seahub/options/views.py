# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
from django.http import HttpResponse, HttpResponseBadRequest, \
    HttpResponseRedirect, Http404
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.utils.translation import gettext as _

from seahub.auth.decorators import login_required
from seahub.options.models import UserOptions
from seahub.utils import is_pro_version
from seahub.settings import SITE_ROOT

@login_required
@require_POST
def save_options(request):
    """
    """
    username = request.user.username
    repo_enc = request.POST.get('repo-enc', '')
    server_crypto = True if repo_enc.startswith('server') else False

    if server_crypto:
        UserOptions.objects.enable_server_crypto(username)
    else:
        UserOptions.objects.disable_server_crypto(username)

    next_page = request.headers.get('referer', None)
    if next_page is None:
        next_page = SITE_ROOT

    return HttpResponseRedirect(next_page)

@login_required
@require_POST
def sub_lib_enable_set(request):
    """
    """
    if is_pro_version():
        raise Http404

    username = request.user.username
    enable_sub_lib = request.POST.get('enable-sub-lib', '')

    if enable_sub_lib:
        UserOptions.objects.enable_sub_lib(username)
    else:
        UserOptions.objects.disable_sub_lib(username)

    next_page = request.headers.get('referer', None)
    if next_page is None:
        next_page = SITE_ROOT

    return HttpResponseRedirect(next_page)
