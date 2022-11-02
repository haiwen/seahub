# Copyright (c) 2012-2016 Seafile Ltd.
import jwt
import time

from django.conf import settings
from django.urls import reverse
from django.http import HttpResponseRedirect
from django.utils.http import is_safe_url, urlquote

from seahub.base.templatetags.seahub_tags import email2nickname

from seahub.auth import REDIRECT_FIELD_NAME
from seahub.utils import render_error


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


def jwt_sso(request):

    ENABLE_JWT_SSO = getattr(settings, 'ENABLE_JWT_SSO', False)
    JWT_SSO_SECRET_KEY = getattr(settings, 'JWT_SSO_SECRET_KEY', '')
    JWT_SSO_EXPIRATION = getattr(settings, 'JWT_SSO_EXPIRATION', 60 * 60)
    JWT_SSO_ALGORITHM = getattr(settings, 'JWT_SSO_ALGORITHM', 'HS256')

    if not ENABLE_JWT_SSO:
        error_msg = "jwt sso feature is not enabled."
        return render_error(request, error_msg)

    if not JWT_SSO_SECRET_KEY:
        error_msg = "jwt sso secret key is not set."
        return render_error(request, error_msg)

    page_url = request.GET.get('page', '')
    if not page_url:
        error_msg = "page parameter is not passed."
        return render_error(request, error_msg)

    username = request.user.username

    data = {
        'exp': time.time() + JWT_SSO_EXPIRATION,
        'email': username,
        'name': email2nickname(username)
    }

    jwt_token = jwt.encode(data, JWT_SSO_SECRET_KEY, JWT_SSO_ALGORITHM)
    redirect_to = "{}?jwt-token={}".format(page_url, jwt_token)
    return HttpResponseRedirect(redirect_to)


def shib_login(request):
    # client platform args used to create api v2 token
    keys = ('platform', 'device_id', 'device_name', 'client_version', 'platform_version')
    if all(['shib_' + key in request.GET for key in keys]):
        request.session['shib_platform'] = request.GET['shib_platform']
        request.session['shib_device_id'] = request.GET['shib_device_id']
        request.session['shib_device_name'] = request.GET['shib_device_name']
        request.session['shib_client_version'] = request.GET['shib_client_version']
        request.session['shib_platform_version'] = request.GET['shib_platform_version']

    next_page = request.GET.get(REDIRECT_FIELD_NAME, '')
    query_string = request.META.get('QUERY_STRING', '')
    params = '?%s=%s&%s' % (REDIRECT_FIELD_NAME, urlquote(next_page), query_string)
    return HttpResponseRedirect(reverse('sso') + params)
