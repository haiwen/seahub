# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import json
import urllib
import logging
import requests

from django.conf import settings
from django.shortcuts import render
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.http import HttpResponseRedirect

from rest_framework import status
from rest_framework import parsers
from rest_framework import renderers
from rest_framework.response import Response

from seahub import auth
from seahub.auth import get_backends
from seahub.avatar.models import Avatar
from seahub.avatar.signals import avatar_updated
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.profile.models import Profile
from seahub.utils import render_error

from seahub.api2.base import APIView
from seahub.api2.throttling import AnonRateThrottle

from seahub.organizations.views import (
    create_org, get_org_by_url_prefix, set_org_user)

from seahub.settings import LOGO_PATH
from .settings import (
    ALPHALAWYER_WX_LOGIN_INFO_URL,
    ALPHALAWYER_WX_LOGIN_REDIRECT_URI, ALPHALAWYER_WX_LOGIN_CALLBACK_URL,
    ALPHALAWYER_WX_LOGIN_CALLBACK_URL_HEADERS, ALPHALAWYER_WX_LOGIN_VERIFY_URL)

from .serializers import AuthTokenSerializer

# Get an instance of a logger
logger = logging.getLogger(__name__)


def weixin_login(request):

    shib_client_version = request.GET.get('shib_client_version', '')
    if 'seadrive' in shib_client_version:
        ICOURT_LOGO_PATH = 'img/alpha-drive-logo.png'
    else:
        ICOURT_LOGO_PATH = LOGO_PATH

    return render(request, 'icourt_auth/weixin_login.html', {
        'info_url': ALPHALAWYER_WX_LOGIN_INFO_URL,
        'redirect_uri': ALPHALAWYER_WX_LOGIN_REDIRECT_URI,
        'logo_path': ICOURT_LOGO_PATH,
    })

def weixin_login_callback(request):
    code = request.GET.get('code', '')
    state = request.GET.get('state', '')
    if not code or not state:
        assert False, 'TODO'

    values = {
        "code": code,
        "state": state,
    }
    the_page = requests.post(ALPHALAWYER_WX_LOGIN_CALLBACK_URL, data=json.dumps(values),
                             headers=ALPHALAWYER_WX_LOGIN_CALLBACK_URL_HEADERS).text

    # fields of response
    # {
    #   "data": {
    #     "verified": true,
    #     "unionId": "xxxxxxxx",
    #     "officeName": "iCourt",
    #     "sessionKey": "xxxxxxxx",
    #     "jwtTokenDTO": {
    #       "expireTime": 1508231610134,
    #       "startTime": 1508145210134,
    #       "token": "...",
    #       "refreshTokenStartTime:" 1508145210134,
    #       "refreshTokenExpireTime": 1508231610134,
    #       "refreshToken": "..."
    #     },
    #     "userDTO": {
    #       "avatar": "https://wx.qlogo.cn/mmopen/vi_32/../0",
    #       "email": "chenli@icourt.cc",
    #       "id": "BE8AEB0AA02011E69A3800163E0020D1",
    #       "name": "name",
    #       "officeId": "4d792e316a0511e6aa7600163e162add",
    #       "phone": "13466661048",
    #       "pinyin": "AHAHA",
    #       "status": 1,
    #       "title": null
    #     }
    #   },
    #   "isSuccess": true,
    #   "resultMsg": "success"
    # }

    return weixin_login_common(request, the_page)

def weixin_login_newuser(request):
    """新用户在icourt注册激活后，会重定向到这里。
    """
    token = request.GET.get('token')
    if not token:
        return render_error(request, u'登录失败，请稍后尝试。错误：0001')

    r = requests.get(ALPHALAWYER_WX_LOGIN_VERIFY_URL + '?token=' + token)
    if r.status_code  == 401:
        err_msg = r.headers['errMsg']
        logger.error(err_msg)
        return render_error(request, u'登录失败，请稍后尝试。错误：0002')

    the_page = r.text

    # {
    #   "data": {
    #     "userDTO": {
    #       "id": "0B7AD078B86A11E78F1000163E0691A5",
    #       "avatar": null,
    #       "email": "qiaoshijia@icourt.cc",
    #       "name": "\u4e54\u4e16\u4f7388"
    #     }
    #   },
    #   "isSuccess": true,
    #   "resultMsg": "\u6267\u884c\u6210\u529f\uff01"
    # }

    return weixin_login_common(request, the_page)

def weixin_login_common(request, the_page):
    try:
        json_res = json.loads(the_page)
    except Exception as e:
        logger.error(e)
        return render_error(request, u'登录失败，请稍后尝试。错误：0003')

    succeed = json_res['isSuccess']
    if succeed is True:
        result = json_res['data']
        verified = result.get('verified', True)
        if not verified:
            return render_error(request, u'请先去alpha激活帐号 https://www.alphalawyer.cn')
        else:
            auth_resp_dto = result['userDTO']
            #res_code = auth_resp_dto.get('resultCode')
            pic = auth_resp_dto.get('avatar')
            mail = auth_resp_dto.get('email')
            name = auth_resp_dto.get('name', '')
            user_id = auth_resp_dto.get('id')  # unique
            office_id = auth_resp_dto.get('officeId', None)
            office_name = result.get('officeName', None)

            # create new account if possible
            logger.info('user id: %s' % user_id)
            if user_id is None:
                logger.error('userId is empty!')
                return render_error(request, u'登录失败，请稍后尝试。错误：0004')

            username = user_id + '@ifile.com'
            username = username.lower()
            try:
                user = User.objects.get(email=username)
            except User.DoesNotExist:
                user = None

            if user is None:
                user = User.objects.create_user(email=username, is_active=True)
                user.set_unusable_password()

            u_p = Profile.objects.add_or_update(username, name)

            if mail:
                u_p.contact_email = mail

            u_p.save()

            # create org if possible
            if office_id is not None:
                org_url_prefix = 'org_' + office_id[:10]
                org = get_org_by_url_prefix(org_url_prefix)
                if org is None:
                    create_org(office_name, org_url_prefix, 'org_admin@icourt.com')
                    org = get_org_by_url_prefix(org_url_prefix)

                set_org_user(org.org_id, user.username)

            # update user avatar
            try:
                _update_user_avatar(user, pic)
            except Exception as e:
                logger.error(e)

            # login user
            for backend in get_backends():
                user.backend = "%s.%s" % (backend.__module__, backend.__class__.__name__)

            auth.login(request, user)

            resp = HttpResponseRedirect(settings.SITE_ROOT)
            _set_auth_cookie(request, resp)
            return resp

    else:
        # login failed
        return render_error(request, '登录失败，请稍后尝试。错误：0005')

def _update_user_avatar(user, pic):
    if not pic:
        return

    cache_key = 'ICOURT_WX_LOGIN_%s' % user.username[:10]
    if cache.get(cache_key) == pic:
        return
    else:
        cache.set(cache_key, pic, None)

    logger.info("retrieve pic from %s" % pic)

    try:
        image_name = 'image.jpg'
        image_file = requests.get(pic).content
        avatar = Avatar(emailuser=user.username, primary=True)
        avatar_file = ContentFile(image_file)
        avatar_file.name = image_name
        avatar.avatar = avatar_file
        avatar.save()
    except Exception as e:
        logger.warning(e)

    avatar_updated.send(sender=Avatar, user=user, avatar=avatar)

def _set_auth_cookie(request, response):
    from seahub.api2.utils import get_token_v1, get_token_v2
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
        token = get_token_v2(
            request, request.user.username, platform, device_id,
            device_name, client_version, platform_version)
    elif all(['shib_' + key not in request.GET for key in keys]):
        token = get_token_v1(request.user.username)
    else:
        return
    response.set_cookie('seahub_auth', request.user.username + '@' + token.key, max_age=60)



class API2WeixinLogin(APIView):
    """
    Returns auth token if username and password are valid.
    For example:
        curl -d "state=xxx&code=yyy&platform=ios&device_id=xxx&device_name=foo's iPhone" https://dev.seafile.com/seahub/api2/weixin-login/
    """
    throttle_classes = (AnonRateThrottle, )
    permission_classes = ()
    parser_classes = (parsers.FormParser, parsers.MultiPartParser, parsers.JSONParser,)
    renderer_classes = (renderers.JSONRenderer,)

    def post(self, request):
        context = {'request': request}
        serializer = AuthTokenSerializer(data=request.data, context=context)
        if serializer.is_valid():
            key, username = serializer.validated_data
            return Response({'token': key,
                             'username': username,
                             'name': email2nickname(username),
                         })
        headers = {}

        return Response(serializer.errors,
                        status=status.HTTP_400_BAD_REQUEST,
                        headers=headers)
