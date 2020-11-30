# -*- coding: utf-8 -*-

import uuid
import json
import time
import hmac
import base64
import urllib
import logging
import requests
from hashlib import sha256

from django.http import HttpResponseRedirect
from django.core.urlresolvers import reverse
from django.utils.translation import ugettext as _

from seahub.api2.utils import get_api_token
from seahub import auth
from seahub.profile.models import Profile
from seahub.utils import render_error, get_site_scheme_and_netloc
from seahub.utils.auth import gen_user_virtual_id
from seahub.base.accounts import User
from seahub.auth.models import SocialAuthUser
from seahub.auth.decorators import login_required
from seahub.dingtalk.utils import dingtalk_get_detailed_user_info

from seahub.dingtalk.settings import ENABLE_DINGTALK, \
        DINGTALK_QR_CONNECT_APP_ID, DINGTALK_QR_CONNECT_APP_SECRET, \
        DINGTALK_QR_CONNECT_AUTHORIZATION_URL, \
        DINGTALK_QR_CONNECT_USER_INFO_URL, DINGTALK_QR_CONNECT_RESPONSE_TYPE, \
        DINGTALK_QR_CONNECT_SCOPE, DINGTALK_QR_CONNECT_LOGIN_REMEMBER_ME

logger = logging.getLogger(__name__)


def dingtalk_login(request):

    if not ENABLE_DINGTALK:
        return render_error(request, _('Error, please contact administrator.'))

    state = str(uuid.uuid4())
    request.session['dingtalk_login_state'] = state
    request.session['dingtalk_login_redirect'] = request.GET.get(auth.REDIRECT_FIELD_NAME, '/')

    data = {
        'appid': DINGTALK_QR_CONNECT_APP_ID,
        'response_type': DINGTALK_QR_CONNECT_RESPONSE_TYPE,
        'scope': DINGTALK_QR_CONNECT_SCOPE,
        'redirect_uri': get_site_scheme_and_netloc() + reverse('dingtalk_callback'),
        'state': state,
    }
    url = DINGTALK_QR_CONNECT_AUTHORIZATION_URL + '?' + urllib.parse.urlencode(data)
    return HttpResponseRedirect(url)


def dingtalk_callback(request):

    if not ENABLE_DINGTALK:
        return render_error(request, _('Error, please contact administrator.'))

    state = request.GET.get('state', '')
    if not state or state != request.session.get('dingtalk_login_state', ''):
        logger.error('invalid state')
        return render_error(request, _('Error, please contact administrator.'))

    timestamp = str(int(time.time()*1000)).encode('utf-8')
    appsecret = DINGTALK_QR_CONNECT_APP_SECRET.encode('utf-8')
    signature = base64.b64encode(hmac.new(appsecret, timestamp, digestmod=sha256).digest())
    parameters = {
        'accessKey': DINGTALK_QR_CONNECT_APP_ID,
        'timestamp': timestamp,
        'signature': signature,
    }

    code = request.GET.get('code')
    data = {"tmp_auth_code": code}

    full_user_info_url = DINGTALK_QR_CONNECT_USER_INFO_URL + '?' + urllib.parse.urlencode(parameters)
    user_info_resp = requests.post(full_user_info_url, data=json.dumps(data))
    user_info = user_info_resp.json()['user_info']

    # seahub authenticate user
    if 'unionid' not in user_info:
        logger.error('Required user info not found.')
        logger.error(user_info)
        return render_error(request, _('Error, please contact administrator.'))

    auth_user = SocialAuthUser.objects.get_by_provider_and_uid('dingtalk', user_info['unionid'])
    if auth_user:
        email = auth_user.username
    else:
        email = gen_user_virtual_id()
        SocialAuthUser.objects.add(email, 'dingtalk', user_info['unionid'])

    try:
        user = auth.authenticate(remote_user=email)
    except User.DoesNotExist:
        user = None

    if not user or not user.is_active:
        return render_error(request, _('User %s not found or inactive.') % email)

    # User is valid.  Set request.user and persist user in the session
    # by logging the user in.
    request.user = user
    request.session['remember_me'] = DINGTALK_QR_CONNECT_LOGIN_REMEMBER_ME
    auth.login(request, user)

    # update user's profile
    name = user_info['nick'] if 'nick' in user_info else ''
    if name:

        profile = Profile.objects.get_profile_by_user(email)
        if not profile:
            profile = Profile(user=email)

        profile.nickname = name.strip()
        profile.save()

    user_detail_info = dingtalk_get_detailed_user_info(user_info['unionid'])
    contact_email = user_detail_info.get('email', '')
    if contact_email:
        profile.contact_email = contact_email
        profile.save()

    # generate auth token for Seafile client
    api_token = get_api_token(request)

    # redirect user to home page
    response = HttpResponseRedirect(request.session.get('dingtalk_login_redirect', '/'))
    response.set_cookie('seahub_auth', email + '@' + api_token.key)
    return response


@login_required
def dingtalk_connect(request):

    if not ENABLE_DINGTALK:
        return render_error(request, _('Error, please contact administrator.'))

    state = str(uuid.uuid4())
    request.session['dingtalk_connect_state'] = state
    request.session['dingtalk_connect_redirect'] = request.GET.get(auth.REDIRECT_FIELD_NAME, '/')

    data = {
        'appid': DINGTALK_QR_CONNECT_APP_ID,
        'response_type': DINGTALK_QR_CONNECT_RESPONSE_TYPE,
        'scope': DINGTALK_QR_CONNECT_SCOPE,
        'redirect_uri': get_site_scheme_and_netloc() + reverse('dingtalk_connect_callback'),
        'state': state,
    }
    url = DINGTALK_QR_CONNECT_AUTHORIZATION_URL + '?' + urllib.parse.urlencode(data)
    return HttpResponseRedirect(url)


@login_required
def dingtalk_connect_callback(request):

    if not ENABLE_DINGTALK:
        return render_error(request, _('Error, please contact administrator.'))

    state = request.GET.get('state', '')
    if not state or state != request.session.get('dingtalk_connect_state', ''):
        logger.error('invalid state')
        return render_error(request, _('Error, please contact administrator.'))

    timestamp = str(int(time.time()*1000)).encode('utf-8')
    appsecret = DINGTALK_QR_CONNECT_APP_SECRET.encode('utf-8')
    signature = base64.b64encode(hmac.new(appsecret, timestamp, digestmod=sha256).digest())
    parameters = {
        'accessKey': DINGTALK_QR_CONNECT_APP_ID,
        'timestamp': timestamp,
        'signature': signature,
    }

    code = request.GET.get('code')
    data = {"tmp_auth_code": code}

    full_user_info_url = DINGTALK_QR_CONNECT_USER_INFO_URL + '?' + urllib.parse.urlencode(parameters)
    user_info_resp = requests.post(full_user_info_url, data=json.dumps(data))
    user_info = user_info_resp.json()['user_info']

    # seahub authenticate user
    if 'unionid' not in user_info:
        logger.error('Required user info not found.')
        logger.error(user_info)
        return render_error(request, _('Error, please contact administrator.'))

    username = request.user.username
    dingtalk_union_id = user_info['unionid']

    auth_user = SocialAuthUser.objects.get_by_provider_and_uid('dingtalk', dingtalk_union_id)
    if auth_user:
        logger.error('dingtalk account already exists %s' % dingtalk_union_id)
        return render_error(request, '出错了，此钉钉账号已被绑定')

    SocialAuthUser.objects.add(username, 'dingtalk', dingtalk_union_id)

    # update user's profile
    name = user_info['nick'] if 'nick' in user_info else ''
    if name:

        profile = Profile.objects.get_profile_by_user(username)
        if not profile:
            profile = Profile(user=username)

        profile.nickname = name.strip()
        profile.save()

    user_detail_info = dingtalk_get_detailed_user_info(user_info['unionid'])
    contact_email = user_detail_info.get('email', '')
    if contact_email:
        profile.contact_email = contact_email
        profile.save()

    response = HttpResponseRedirect(request.session['dingtalk_connect_redirect'])
    return response


@login_required
def dingtalk_disconnect(request):

    if not ENABLE_DINGTALK:
        return render_error(request, _('Error, please contact administrator.'))

    username = request.user.username
    SocialAuthUser.objects.delete_by_username_and_provider(username, 'dingtalk')
    response = HttpResponseRedirect(request.GET.get(auth.REDIRECT_FIELD_NAME, '/'))
    return response
