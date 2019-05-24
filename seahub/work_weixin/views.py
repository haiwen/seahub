# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import uuid
import json
import logging
import requests
from oauthlib.common import add_params_to_uri
from django.http import HttpResponseRedirect
from django.utils.translation import ugettext as _

from seahub.api2.utils import get_api_token
from seahub import auth
from seahub.utils import render_error
from seahub.base.accounts import User
# from social_django.models import UserSocialAuth
from seahub.work_weixin.settings import WORK_WEIXIN_AUTHORIZATION_URL, WORK_WEIXIN_CORP_ID, \
    WORK_WEIXIN_AGENT_ID, WORK_WEIXIN_REDIRECT_URI, WORK_WEIXIN_PROVIDER, \
    WORK_WEIXIN_GET_USER_INFO_URL, WORK_WEIXIN_GET_USER_PROFILE_URL, WORK_WEIXIN_UID_PREFIX
from seahub.work_weixin.utils import work_weixin_oauth_check, get_work_weixin_access_token, \
    handler_work_weixin_api_response, update_work_weixin_user_info
from seahub.utils.auth import gen_user_virtual_id
from seahub.utils import get_service_url
from seahub.auth.models import SocialAuthUser

logger = logging.getLogger(__name__)


# # uid = corpid + '_' + userid


def work_weixin_oauth_login(request):
    if not work_weixin_oauth_check():
        return render_error(request, _('Error, please contact administrator.'))

    state = str(uuid.uuid4())
    request.session['oauth_state'] = state
    request.session['oauth_redirect'] = request.GET.get(auth.REDIRECT_FIELD_NAME, '/')

    work_weixin_redirect_uri = get_service_url().rstrip('/') + WORK_WEIXIN_REDIRECT_URI
    params = [(('appid', WORK_WEIXIN_CORP_ID)),
              (('agentid', WORK_WEIXIN_AGENT_ID)),
              (('redirect_uri', work_weixin_redirect_uri)),
              (('state', state))]
    authorization_url = add_params_to_uri(WORK_WEIXIN_AUTHORIZATION_URL, params=params)

    return HttpResponseRedirect(authorization_url)


def work_weixin_oauth_callback(request):
    if not work_weixin_oauth_check():
        return render_error(request, _('Error, please contact administrator.'))

    code = request.GET.get('code', None)
    state = request.GET.get('state', None)
    if state != request.session.get('oauth_state', None) or not code:
        return render_error(request, '取消授权')

    access_token = get_work_weixin_access_token()
    if not access_token:
        return render_error(request, _('Error, please contact administrator.'))

    data = {
        'access_token': access_token,
        'code': code,
    }
    api_response = requests.get(WORK_WEIXIN_GET_USER_INFO_URL, params=data)
    api_response_dic = handler_work_weixin_api_response(api_response)
    if not api_response_dic:
        return render_error(request, _('Error, please contact administrator.'))

    if not api_response_dic.get('UserId', None):
        logger.error(json.dumps(api_response_dic))
        return render_error(request, _('Error, please contact administrator.'))

    user_id = api_response_dic.get('UserId')
    uid = WORK_WEIXIN_UID_PREFIX + user_id

    work_weixin_user = SocialAuthUser.objects.get_by_uid(WORK_WEIXIN_PROVIDER, uid)
    if work_weixin_user:
        email = work_weixin_user.username
    else:
        email = gen_user_virtual_id()
        work_weixin_user = SocialAuthUser.objects.add_by_uid(email, WORK_WEIXIN_PROVIDER, uid)

    try:
        user = auth.authenticate(remote_user=email)
    except User.DoesNotExist:
        user = None

    if not user:
        return render_error(request, _('创建账户失败，请联系管理员'))

    if not user.is_active:
        return render_error(request, _('账户未激活，请联系管理员'))

    # update user info
    user_info_data = {
        'access_token': access_token,
        'userid': user_id,
    }
    user_info_api_response = requests.get(WORK_WEIXIN_GET_USER_PROFILE_URL, params=user_info_data)
    user_info_api_response_dic = handler_work_weixin_api_response(user_info_api_response)
    if user_info_api_response_dic:
        api_user = user_info_api_response_dic
        api_user['username'] = email
        update_work_weixin_user_info(api_user)

    # User is valid.  Set request.user and persist user in the session
    # by logging the user in.
    request.user = user
    auth.login(request, user)

    # generate auth token for Seafile client
    api_token = get_api_token(request)

    # redirect user to page
    service_url = request.session.get('oauth_redirect', '/')
    response = HttpResponseRedirect(service_url)
    response.set_cookie('seahub_auth', user.username + '@' + api_token.key)
    return response
