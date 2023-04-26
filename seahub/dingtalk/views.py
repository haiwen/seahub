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
from django.urls import reverse
from django.utils.translation import gettext as _

from seahub.api2.utils import get_api_token
from seahub import auth
from seahub.profile.models import Profile
from seahub.utils import render_error, get_site_scheme_and_netloc
from seahub.utils.auth import VIRTUAL_ID_EMAIL_DOMAIN
from seahub.base.accounts import User
from seahub.auth.models import SocialAuthUser
from seahub.auth.decorators import login_required
from seahub.dingtalk.utils import dingtalk_get_detailed_user_info, \
        dingtalk_get_userid_by_unionid_new, \
        dingtalk_get_detailed_user_info_new

from seahub.dingtalk.settings import ENABLE_DINGTALK

# for 10.0 or later
from seahub.dingtalk.settings import DINGTALK_APP_KEY, DINGTALK_APP_SECRET, \
        DINGTALK_OAUTH_RESPONSE_TYPE, DINGTALK_OAUTH_SCOPE, \
        DINGTALK_OAUTH_PROMPT, DINGTALK_OAUTH_AUTH_URL, \
        DINGTALK_OAUTH_GRANT_TYPE, DINGTALK_OAUTH_USER_ACCESS_TOKEN_URL, \
        DINGTALK_GET_USER_INFO_URL

# for 9.0 or before
from seahub.dingtalk.settings import DINGTALK_QR_CONNECT_APP_ID, \
        DINGTALK_QR_CONNECT_APP_SECRET, DINGTALK_QR_CONNECT_AUTHORIZATION_URL, \
        DINGTALK_QR_CONNECT_USER_INFO_URL, DINGTALK_QR_CONNECT_RESPONSE_TYPE, \
        DINGTALK_QR_CONNECT_SCOPE, DINGTALK_QR_CONNECT_LOGIN_REMEMBER_ME

logger = logging.getLogger(__name__)


def dingtalk_login(request):

    if not ENABLE_DINGTALK:
        return render_error(request, _('Error, please contact administrator.'))

    # for 10.0 or later
    if DINGTALK_APP_KEY and DINGTALK_APP_SECRET:
        return dingtalk_login_new(request)

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

    # for 10.0 or later
    if DINGTALK_APP_KEY and DINGTALK_APP_SECRET:
        return dingtalk_callback_new(request)

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
        is_new_user = False
    else:
        email = None
        is_new_user = True

    try:
        user = auth.authenticate(remote_user=email)
        email = user.username
    except User.DoesNotExist:
        user = None
    except Exception as e:
        logger.error(e)
        return render_error(request, _('Error, please contact administrator.'))

    if not user or not user.is_active:
        return render_error(request, _('User %s not found or inactive.') % email)

    # bind
    if is_new_user:
        SocialAuthUser.objects.add(user.username, 'dingtalk', user_info['unionid'])

    # User is valid.  Set request.user and persist user in the session
    # by logging the user in.
    request.user = user
    request.session['remember_me'] = DINGTALK_QR_CONNECT_LOGIN_REMEMBER_ME
    auth.login(request, user)

    # update user's profile
    name = user_info['nick'] if 'nick' in user_info else ''
    user_detail_info = dingtalk_get_detailed_user_info(user_info['unionid'])
    contact_email = user_detail_info.get('email', '')
    if name or contact_email:
        profile = Profile.objects.get_profile_by_user(email)
        if not profile:
            profile = Profile(user=email)
        profile.nickname = name.strip()
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

    # for 10.0 or later
    if DINGTALK_APP_KEY and DINGTALK_APP_SECRET:
        return dingtalk_connect_new(request)

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

    # for 10.0 or later
    if DINGTALK_APP_KEY and DINGTALK_APP_SECRET:
        return dingtalk_connect_callback_new(request)

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

    return HttpResponseRedirect(request.session['dingtalk_connect_redirect'])


@login_required
def dingtalk_disconnect(request):

    if not ENABLE_DINGTALK:
        return render_error(request, _('Error, please contact administrator.'))

    username = request.user.username
    if username.endswith(VIRTUAL_ID_EMAIL_DOMAIN):
        Profile.objects.filter(user=username).delete()

    SocialAuthUser.objects.delete_by_username_and_provider(username, 'dingtalk')

    return HttpResponseRedirect(request.GET.get(auth.REDIRECT_FIELD_NAME, '/'))


# for 10.0 or later
def dingtalk_login_new(request):
    """
    https://open.dingtalk.com/document/orgapp/sso-overview
    """

    state = str(uuid.uuid4())
    request.session['dingtalk_login_state'] = state
    request.session['dingtalk_login_redirect'] = request.GET.get(auth.REDIRECT_FIELD_NAME, '/')

    data = {
        'redirect_uri': get_site_scheme_and_netloc() + reverse('dingtalk_callback'),
        'response_type': DINGTALK_OAUTH_RESPONSE_TYPE,
        'client_id': DINGTALK_APP_KEY,
        'scope': DINGTALK_OAUTH_SCOPE,
        'state': state,
        'prompt': DINGTALK_OAUTH_PROMPT,
    }

    url = DINGTALK_OAUTH_AUTH_URL + '?' + urllib.parse.urlencode(data)

    return HttpResponseRedirect(url)


def dingtalk_callback_new(request):

    state = request.GET.get('state', '')
    if not state or state != request.session.get('dingtalk_login_state', ''):
        logger.error('invalid state')
        return render_error(request, _('Error, please contact administrator.'))

    def get_oauth_access_token(code):
        """
        https://open.dingtalk.com/document/orgapp/sso-overview
        """
        data = {
            "clientId": DINGTALK_APP_KEY,
            "code": code,
            "clientSecret": DINGTALK_APP_SECRET,
            "grantType": DINGTALK_OAUTH_GRANT_TYPE,
        }
        headers = {'Content-Type': 'application/json'}

        access_token_resp = requests.post(DINGTALK_OAUTH_USER_ACCESS_TOKEN_URL,
                                          headers=headers,
                                          data=json.dumps(data))

        return access_token_resp.json().get('accessToken')

    code = request.GET.get('authCode')
    oauth_access_token = get_oauth_access_token(code)

    def get_user_info(oauth_access_token, union_id='me'):
        """
        https://open.dingtalk.com/document/orgapp/dingtalk-retrieve-user-information#
        """

        user_info_url = urllib.parse.urljoin(DINGTALK_GET_USER_INFO_URL, union_id)
        user_info_resp = requests.get(user_info_url,
                                      headers={'x-acs-dingtalk-access-token': oauth_access_token})
        # {
        #     'avatarUrl': 'https://static-legacy.dingtalk.com/media/lADPDgQ9rt4yNOLNAjDNAjA_560_560.jpg',
        #     'mobile': '15313912424',
        #     'nick': 'lian',
        #     'openId': 'h1Nar64KnUuY40iiajR3cXAiEiE',
        #     'stateCode': '86',
        #     'unionId': '3os80f94Zf4oeiPOpiSiSgiigQiEiE'
        # }
        return user_info_resp.json()

    user_info = get_user_info(oauth_access_token)

    # seahub authenticate user
    if 'unionId' not in user_info:
        logger.error('Required user info not found.')
        logger.error(user_info)
        return render_error(request, _('Error, please contact administrator.'))

    union_id = user_info['unionId']
    auth_user = SocialAuthUser.objects.get_by_provider_and_uid('dingtalk', union_id)
    if auth_user:
        email = auth_user.username
        is_new_user = False
    else:
        email = None
        is_new_user = True

    try:
        user = auth.authenticate(remote_user=email)
        email = user.username
    except User.DoesNotExist:
        user = None
    except Exception as e:
        logger.error(e)
        return render_error(request, _('Error, please contact administrator.'))

    if not user or not user.is_active:
        return render_error(request, _('User %s not found or inactive.') % email)

    # bind
    if is_new_user:
        SocialAuthUser.objects.add(user.username, 'dingtalk', union_id)

    # User is valid.  Set request.user and persist user in the session
    # by logging the user in.
    request.user = user
    request.session['remember_me'] = True
    auth.login(request, user)

    # update user's profile
    profile = Profile.objects.get_profile_by_user(email)
    if not profile:
        profile = Profile(user=email)

    name = user_info['nick'] if 'nick' in user_info else ''
    if name:
        profile.nickname = name.strip()
        profile.save()

    try:
        user_id = dingtalk_get_userid_by_unionid_new(union_id)
        detailed_user_info = dingtalk_get_detailed_user_info_new(user_id)
        contact_email = detailed_user_info.get('result', {}).get('email', '')
        if contact_email:
            profile.contact_email = contact_email
            profile.save()
    except Exception as e:
        logger.error(e)

    # generate auth token for Seafile client
    api_token = get_api_token(request)

    # redirect user to home page
    response = HttpResponseRedirect(request.session.get('dingtalk_login_redirect', '/'))
    response.set_cookie('seahub_auth', email + '@' + api_token.key)
    return response


def dingtalk_connect_new(request):
    """
    https://open.dingtalk.com/document/orgapp/sso-overview
    """

    state = str(uuid.uuid4())
    request.session['dingtalk_connect_state'] = state
    request.session['dingtalk_connect_redirect'] = request.GET.get(auth.REDIRECT_FIELD_NAME, '/')

    data = {
        'redirect_uri': get_site_scheme_and_netloc() + reverse('dingtalk_connect_callback'),
        'response_type': DINGTALK_OAUTH_RESPONSE_TYPE,
        'client_id': DINGTALK_APP_KEY,
        'scope': DINGTALK_OAUTH_SCOPE,
        'state': state,
        'prompt': DINGTALK_OAUTH_PROMPT,
    }

    url = DINGTALK_OAUTH_AUTH_URL + '?' + urllib.parse.urlencode(data)

    return HttpResponseRedirect(url)


@login_required
def dingtalk_connect_callback_new(request):

    state = request.GET.get('state', '')
    if not state or state != request.session.get('dingtalk_connect_state', ''):
        logger.error('invalid state')
        return render_error(request, _('Error, please contact administrator.'))

    def get_oauth_access_token(code):
        """
        https://open.dingtalk.com/document/orgapp/sso-overview
        """
        data = {
            "clientId": DINGTALK_APP_KEY,
            "code": code,
            "clientSecret": DINGTALK_APP_SECRET,
            "grantType": DINGTALK_OAUTH_GRANT_TYPE,
        }
        headers = {'Content-Type': 'application/json'}

        access_token_resp = requests.post(DINGTALK_OAUTH_USER_ACCESS_TOKEN_URL,
                                          headers=headers,
                                          data=json.dumps(data))

        return access_token_resp.json().get('accessToken')

    code = request.GET.get('authCode')
    oauth_access_token = get_oauth_access_token(code)

    def get_user_info(oauth_access_token, union_id='me'):
        """
        https://open.dingtalk.com/document/orgapp/dingtalk-retrieve-user-information#
        """

        user_info_url = urllib.parse.urljoin(DINGTALK_GET_USER_INFO_URL, union_id)
        user_info_resp = requests.get(user_info_url,
                                      headers={'x-acs-dingtalk-access-token': oauth_access_token})
        # {
        #     'avatarUrl': 'https://static-legacy.dingtalk.com/media/lADPDgQ9rt4yNOLNAjDNAjA_560_560.jpg',
        #     'mobile': '15313912424',
        #     'nick': 'lian',
        #     'openId': 'h1Nar64KnUuY40iiajR3cXAiEiE',
        #     'stateCode': '86',
        #     'unionId': '3os80f94Zf4oeiPOpiSiSgiigQiEiE'
        # }
        return user_info_resp.json()

    user_info = get_user_info(oauth_access_token)

    # seahub authenticate user
    if 'unionId' not in user_info:
        logger.error('Required user info not found.')
        logger.error(user_info)
        return render_error(request, _('Error, please contact administrator.'))

    union_id = user_info['unionId']
    username = request.user.username
    auth_user = SocialAuthUser.objects.get_by_provider_and_uid('dingtalk', union_id)
    if auth_user:
        logger.error('dingtalk account already exists %s' % union_id)
        return render_error(request, '出错了，此钉钉账号已被绑定')

    SocialAuthUser.objects.add(username, 'dingtalk', union_id)

    # update user's profile
    profile = Profile.objects.get_profile_by_user(username)
    if not profile:
        profile = Profile(user=username)

    name = user_info['nick'] if 'nick' in user_info else ''
    if name:
        profile.nickname = name.strip()
        profile.save()

    try:
        user_id = dingtalk_get_userid_by_unionid_new(union_id)
        detailed_user_info = dingtalk_get_detailed_user_info_new(user_id)
        contact_email = detailed_user_info.get('result', {}).get('email', '')
        if contact_email:
            profile.contact_email = contact_email
            profile.save()
    except Exception as e:
        logger.error(e)

    response = HttpResponseRedirect(request.session.get('dingtalk_connect_redirect', '/'))
    return response
