# -*- coding: utf-8 -*-

import uuid
import urllib
import logging
import requests

from django.http import HttpResponseRedirect
from django.urls import reverse
from django.core.files.base import ContentFile
from django.utils.translation import gettext as _

from seahub.api2.utils import get_api_token

from seahub import auth
from seahub.base.accounts import User
from seahub.avatar.models import Avatar
from seahub.profile.models import Profile
from seahub.utils import render_error, get_site_scheme_and_netloc
from seahub.auth.models import SocialAuthUser

from seahub.weixin.settings import ENABLE_WEIXIN, \
        WEIXIN_OAUTH_APP_ID, WEIXIN_OAUTH_APP_SECRET, \
        WEIXIN_OAUTH_SCOPE, WEIXIN_OAUTH_RESPONSE_TYPE, WEIXIN_OAUTH_QR_CONNECT_URL, \
        WEIXIN_OAUTH_GRANT_TYPE, WEIXIN_OAUTH_ACCESS_TOKEN_URL, \
        WEIXIN_OAUTH_USER_INFO_URL

logger = logging.getLogger(__name__)

# https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html

def weixin_oauth_login(request):

    if not ENABLE_WEIXIN:
        return render_error(request, _('Error, please contact administrator.'))

    state = str(uuid.uuid4())
    request.session['weixin_oauth_login_state'] = state
    request.session['weixin_oauth_login_redirect'] = request.GET.get(auth.REDIRECT_FIELD_NAME, '/')

    data = {
        'appid': WEIXIN_OAUTH_APP_ID,
        'redirect_uri': get_site_scheme_and_netloc() + reverse('weixin_oauth_callback'),
        'response_type': WEIXIN_OAUTH_RESPONSE_TYPE,
        'scope': WEIXIN_OAUTH_SCOPE,
        'state': state,
    }
    url = WEIXIN_OAUTH_QR_CONNECT_URL + '?' + urllib.parse.urlencode(data)
    return HttpResponseRedirect(url)

def weixin_oauth_callback(request):

    if not ENABLE_WEIXIN:
        return render_error(request, _('Error, please contact administrator.'))

    state = request.GET.get('state', '')
    if not state or state != request.session.get('weixin_oauth_login_state', ''):
        logger.error('invalid state')
        return render_error(request, _('Error, please contact administrator.'))

    # get access_token and user openid
    parameters = {
        'appid': WEIXIN_OAUTH_APP_ID,
        'secret': WEIXIN_OAUTH_APP_SECRET,
        'code': request.GET.get('code'),
        'grant_type': WEIXIN_OAUTH_GRANT_TYPE,
    }

    access_token_url = WEIXIN_OAUTH_ACCESS_TOKEN_URL + '?' + urllib.parse.urlencode(parameters)
    access_token_json = requests.get(access_token_url).json()

    openid = access_token_json.get('openid', '')
    access_token = access_token_json.get('access_token', '')
    if not access_token or not openid:
        logger.error('invalid access_token or openid')
        logger.error(access_token_url)
        logger.error(access_token_json)
        return render_error(request, _('Error, please contact administrator.'))

    # login user in
    auth_user = SocialAuthUser.objects.get_by_provider_and_uid('weixin', openid)
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

    if is_new_user:
        SocialAuthUser.objects.add(email, 'weixin', openid)

    request.user = user
    auth.login(request, user)

    # get user profile info
    parameters = {
        'access_token': access_token,
        'openid': openid,
    }
    user_info_url = WEIXIN_OAUTH_USER_INFO_URL + '?' + urllib.parse.urlencode(parameters)
    user_info_resp = requests.get(user_info_url).json()

    name = user_info_resp['nickname'] if 'nickname' in user_info_resp else ''
    name = name.encode('raw_unicode_escape').decode('utf-8')
    if name:

        profile = Profile.objects.get_profile_by_user(email)
        if not profile:
            profile = Profile(user=email)

        profile.nickname = name.strip()
        profile.save()

    avatar_url = user_info_resp['headimgurl'] if 'headimgurl' in user_info_resp else ''
    try:
        image_name = 'dingtalk_avatar'
        image_file = requests.get(avatar_url).content
        avatar = Avatar.objects.filter(emailuser=email, primary=True).first()
        avatar = avatar or Avatar(emailuser=email, primary=True)
        avatar_file = ContentFile(image_file)
        avatar_file.name = image_name
        avatar.avatar = avatar_file
        avatar.save()
    except Exception as e:
        logger.error(e)

    # generate auth token for Seafile client
    api_token = get_api_token(request)

    # redirect user to home page
    response = HttpResponseRedirect(request.session['weixin_oauth_login_redirect'])
    response.set_cookie('seahub_auth', email + '@' + api_token.key)
    return response
