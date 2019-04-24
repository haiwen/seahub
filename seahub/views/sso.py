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

    if getattr(settings, 'ENABLE_CAS', False):
        return HttpResponseRedirect(reverse('cas_ng_login') + next_param)

    if getattr(settings, 'ENABLE_WORK_WEIXIN', False):
        return HttpResponseRedirect(reverse('work_weixin_oauth_login') + next_param)

    next_param = '?%s=' % REDIRECT_FIELD_NAME + urlquote(reverse('social_post_login'))
    return HttpResponseRedirect(reverse('social:begin', args=['weixin']) + next_param)

def shib_login(request):
    if REDIRECT_FIELD_NAME in request.GET:
        next_page = request.GET[REDIRECT_FIELD_NAME]
        next_param = '?%s=' % REDIRECT_FIELD_NAME + urlquote(next_page)
        return HttpResponseRedirect(reverse('sso') + next_param)
    else:
        return HttpResponseRedirect(reverse('sso'))

# Set cookie after WeChat login for client SSO
from seahub.api2.utils import get_token_v1, get_token_v2
from seahub.auth.decorators import login_required

@login_required
def social_post_login(request):
    username = request.user.username
    keys = (
        'platform',
        'device_id',
        'device_name',
        'client_version',
        'platform_version',
    )

    if all([key in request.GET for key in keys]):
        platform = request.GET['platform']
        device_id = request.GET['device_id']
        device_name = request.GET['device_name']
        client_version = request.GET['client_version']
        platform_version = request.GET['platform_version']
        token = get_token_v2(
            request, request.user.username, platform, device_id,
            device_name, client_version, platform_version)
    else:
        token = get_token_v1(request.user.username)

    # redirect user to home page
    response = HttpResponseRedirect(reverse('libraries'))
    response.set_cookie('seahub_auth', username + '@' + token.key)
    return response
