# -*- coding: utf-8 -*-
from django.http import HttpResponse, HttpResponseBadRequest, \
    HttpResponseRedirect , Http404
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.utils.translation import ugettext as _

from seahub.auth.decorators import login_required
from seahub.options.models import UserOptions
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
        messages.success(request, _(u'Server crypto enabled, password will be kept in server for 1 hour.'))
    else:
        UserOptions.objects.disable_server_crypto(username)
        messages.success(request, _(u'Client crypto enabled, password will be kept in browser for 1 hour.'))

    next = request.META.get('HTTP_REFERER', None)
    if next is None:
        next = SITE_ROOT

    return HttpResponseRedirect(next)

    
