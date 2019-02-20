# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect
from django.utils.http import is_safe_url, urlquote

from seahub.auth import REDIRECT_FIELD_NAME

def sso(request):
    # Ensure the user-originating redirection url is safe.
    if REDIRECT_FIELD_NAME in request.GET:
        next_page = request.GET[REDIRECT_FIELD_NAME]
        if not is_safe_url(url=next_page, host=request.get_host()):
            next_page = settings.LOGIN_REDIRECT_URL
    else:
        next_page = reverse('libraries')

    if getattr(settings, 'ENABLE_SHIB_LOGIN', False):
        return HttpResponseRedirect(next_page)

    if getattr(settings, 'ENABLE_KRB5_LOGIN', False):
        return HttpResponseRedirect(next_page)

    # send next page back to other views
    next_param = '?%s=' % REDIRECT_FIELD_NAME + urlquote(next_page)
    if getattr(settings, 'ENABLE_ADFS_LOGIN', False):
        return HttpResponseRedirect(reverse('saml2_login'))

    if getattr(settings, 'ENABLE_OAUTH', False):
        return HttpResponseRedirect(reverse('oauth_login') + next_param)

    if getattr(settings, 'ENABLE_CAS', False):
        return HttpResponseRedirect(reverse('cas_ng_login') + next_param)

    return HttpResponseRedirect(next_page)

def shib_login(request):
    if REDIRECT_FIELD_NAME in request.GET:
        next_page = request.GET[REDIRECT_FIELD_NAME]
        next_param = '?%s=' % REDIRECT_FIELD_NAME + urlquote(next_page)
        return HttpResponseRedirect(reverse('sso') + next_param)
    else:
        return HttpResponseRedirect(reverse('sso'))
