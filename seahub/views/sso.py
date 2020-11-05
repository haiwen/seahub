# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from django.urls import reverse
from django.http import HttpResponseRedirect
from django.utils.http import is_safe_url, urlquote

from seahub.auth import REDIRECT_FIELD_NAME

def sso(request):
    # Ensure the user-originating redirection url is safe.
    if REDIRECT_FIELD_NAME in request.GET:
        next_page = request.GET[REDIRECT_FIELD_NAME]
        if not is_safe_url(url=next_page, allowed_hosts=request.get_host()):
            next_page = settings.LOGIN_REDIRECT_URL
    else:
        next_page = reverse('libraries')

    if getattr(settings, 'ENABLE_REMOTE_USER_AUTHENTICATION', False):
        return HttpResponseRedirect(next_page)

    if getattr(settings, 'ENABLE_SHIB_LOGIN', False):
        return HttpResponseRedirect(next_page)

    if getattr(settings, 'ENABLE_KRB5_LOGIN', False):
        return HttpResponseRedirect(next_page)

    # send next page back to other views
    next_param = '?%s=' % REDIRECT_FIELD_NAME + urlquote(next_page)
    if getattr(settings, 'ENABLE_ADFS_LOGIN', False):
        return HttpResponseRedirect(reverse('saml2_login') + next_param)

    if getattr(settings, 'ENABLE_OAUTH', False):
        return HttpResponseRedirect(reverse('oauth_login') + next_param)

    if getattr(settings, 'ENABLE_DINGTALK', False):
        return HttpResponseRedirect(reverse('dingtalk_login') + next_param)

    if getattr(settings, 'ENABLE_CAS', False):
        return HttpResponseRedirect(reverse('cas_ng_login') + next_param)

    if getattr(settings, 'ENABLE_WORK_WEIXIN', False):
        return HttpResponseRedirect(reverse('work_weixin_oauth_login') + next_param)

    return HttpResponseRedirect(next_page)

def shib_login(request):
    # client platform args used to create api v2 token
    next_page = request.GET.get(REDIRECT_FIELD_NAME, '')
    query_string = request.META.get('QUERY_STRING', '')
    params = '?%s=%s&%s' % (REDIRECT_FIELD_NAME, urlquote(next_page), query_string)
    return HttpResponseRedirect(reverse('sso') + params)
