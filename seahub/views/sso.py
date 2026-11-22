# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import jwt
import time
import logging

from django.conf import settings
from django.urls import reverse
from django.http import HttpResponseRedirect
from urllib.parse import quote
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils import timezone
from django.utils.translation import gettext as _
from django.shortcuts import get_object_or_404, render
from django.views.decorators.csrf import csrf_protect

from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.auth import REDIRECT_FIELD_NAME
from seahub.auth.decorators import login_required
from seahub.utils import render_permission_error, render_error
from seahub.api2.utils import get_token_v1, get_token_v2
from seahub.settings import CLIENT_SSO_VIA_LOCAL_BROWSER, CLIENT_SSO_TOKEN_EXPIRATION, LOGIN_URL
from seahub.base.models import ClientSSOToken
from seahub.work_weixin.settings import ENABLE_WORK_WEIXIN
from seahub.dingtalk.settings import ENABLE_DINGTALK

# Get an instance of a logger
logger = logging.getLogger(__name__)


def sso(request):

    request.session['is_sso_user'] = True
    logger.info("[Session_check][sso] %s" % request.session.get('shib_device_id'))
    # Ensure the user-originating redirection url is safe.
    if REDIRECT_FIELD_NAME in request.GET:
        next_page = request.GET[REDIRECT_FIELD_NAME]
        if not url_has_allowed_host_and_scheme(url=next_page, allowed_hosts=request.get_host()):
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
    next_param = f'?{REDIRECT_FIELD_NAME}={quote(next_page)}'
    if getattr(settings, 'ENABLE_ADFS_LOGIN', False):
        return HttpResponseRedirect(reverse('saml2_login') + next_param)

    if getattr(settings, 'ENABLE_OAUTH', False):
        return HttpResponseRedirect(reverse('oauth_login') + next_param)

    if getattr(settings, 'ENABLE_CUSTOM_OAUTH', False):
        return HttpResponseRedirect(reverse('oauth_login') + next_param)

    if getattr(settings, 'ENABLE_CAS', False):
        return HttpResponseRedirect(reverse('cas_ng_login') + next_param)

    return HttpResponseRedirect(next_page)


def work_weixin_sso(request):

    if not ENABLE_WORK_WEIXIN:
        error_msg = '企业微信单点登录功能未开启'
        return render_error(request, error_msg)

    request.session['is_sso_user'] = True

    # Ensure the user-originating redirection url is safe.
    if REDIRECT_FIELD_NAME in request.GET:
        next_page = request.GET[REDIRECT_FIELD_NAME]
        if not url_has_allowed_host_and_scheme(url=next_page, allowed_hosts=request.get_host()):
            next_page = settings.LOGIN_REDIRECT_URL
    else:
        next_page = reverse('libraries')

    next_param = f'?{REDIRECT_FIELD_NAME}={quote(next_page)}'
    return HttpResponseRedirect(reverse('work_weixin_oauth_login') + next_param)


def dingtalk_sso(request):

    if not ENABLE_DINGTALK:
        error_msg = '钉钉单点登录功能未开启'
        return render_error(request, error_msg)

    request.session['is_sso_user'] = True

    # Ensure the user-originating redirection url is safe.
    if REDIRECT_FIELD_NAME in request.GET:
        next_page = request.GET[REDIRECT_FIELD_NAME]
        if not url_has_allowed_host_and_scheme(url=next_page, allowed_hosts=request.get_host()):
            next_page = settings.LOGIN_REDIRECT_URL
    else:
        next_page = reverse('libraries')

    next_param = f'?{REDIRECT_FIELD_NAME}={quote(next_page)}'
    return HttpResponseRedirect(reverse('dingtalk_login') + next_param)


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
        
    
    logger.info("[Session_check][shib_login] %s" % request.session.get('shib_device_id'))

    next_page = request.GET.get(REDIRECT_FIELD_NAME, '')
    query_string = request.META.get('QUERY_STRING', '')
    params = '?%s=%s&%s' % (REDIRECT_FIELD_NAME, quote(next_page), query_string)

    if getattr(settings, 'ENABLE_MULTI_ADFS', False):
        return HttpResponseRedirect(reverse('multi_adfs_sso') + params)

    return HttpResponseRedirect(reverse('sso') + params)


def client_sso(request, token):
    if not CLIENT_SSO_VIA_LOCAL_BROWSER:
        return render_error(request, 'Feature is not enabled.')

    t = get_object_or_404(ClientSSOToken, token=token)
    if not t.accessed_at:
        t.accessed()
    else:
        error_msg = _('This link has already been visited, please click the login button on the client again')
        return render_error(request, error_msg)

    next_page = reverse('client_sso_complete', args=[token, ])

    # client platform args used to create api v2 token
    req_qs = request.META['QUERY_STRING']
    if req_qs:
        next_page = next_page + '?' + req_qs

    # light security check
    if not url_has_allowed_host_and_scheme(url=next_page, allowed_hosts=request.get_host()):
        logger.error('%s is not safe url.' % next_page)
        next_page = reverse('client_sso_complete', args=[token, ])

    redirect_url = LOGIN_URL + '?next=' + quote(next_page)
    return HttpResponseRedirect(redirect_url)


@csrf_protect
@login_required
def client_sso_complete(request, token):

    t = get_object_or_404(ClientSSOToken, token=token)
    if not t.accessed_at:
        error_msg = _('Invalid link, please click the login button on the client again')
        return render_error(request, error_msg)

    interval = (timezone.now() - t.accessed_at).total_seconds()
    if int(interval) >= CLIENT_SSO_TOKEN_EXPIRATION:
        error_msg = _('Login timeout, please click the login button on the client again')
        return render_error(request, error_msg)

    if request.method == "GET":

        template_name = 'client_login_confirm.html'
        return render(request, template_name, {})

    elif request.method == "POST":

        username = request.user.username

        if t.is_waiting():
            # generate tokenv2 using information in request params
            keys = (
                'platform',
                'device_id',
                'device_name',
                'client_version',
                'platform_version',
            )
            if all(['shib_' + key in request.GET for key in keys]):
                platform = request.GET['shib_platform']
                device_id = request.GET['shib_device_id']
                device_name = request.GET['shib_device_name']
                client_version = request.GET['shib_client_version']
                platform_version = request.GET['shib_platform_version']
                api_token = get_token_v2(
                    request, username, platform, device_id,
                    device_name, client_version, platform_version)
            elif all(['shib_' + key not in request.GET for key in keys]):
                api_token = get_token_v1(username)

            t.completed(username=username, api_key=api_token.key)
            logger.info('Client SSO success, token: %s, user: %s' % (token, username))
        else:
            logger.warning('Client SSO token is not waiting, skip.')

        template_name = 'client_login_complete.html'
        return render(request, template_name, {})
    else:
        return render_permission_error(request, _('Permission denied.'))
