# -*- coding: utf-8 -*-
import time
import json
import hashlib
import logging
import requests
from urllib import parse

from constance import config
from django.conf import settings as dj_settings
from django.shortcuts import render
from django.core.cache import cache
from django.http import HttpResponseRedirect, HttpResponse

from seaserv import ccnet_api

from seahub import auth
from seahub.base.accounts import User
from seahub.profile.models import Profile
from seahub.auth import REDIRECT_FIELD_NAME
from seahub.utils import normalize_cache_key
from seahub.utils.auth import get_login_bg_image_path
import seahub.settings as settings


logger = logging.getLogger(__name__)

# for oauth access token
# client_id：P_ifbss-mobfile
# client_secret： 测试 cp488XdS  生产 m9R7SAD5
# grant_type：client_credentials
PINGAN_PACAS_GET_ACCESS_TOKEN_URL = getattr(settings, 'PINGAN_PACAS_GET_ACCESS_TOKEN_URL', 'http://esg-oauth-super.paic.com.cn/oauth/oauth2/access_token')
PINGAN_PACAS_CLIENT_ID = getattr(settings, 'PINGAN_PACAS_CLIENT_ID', 'P_ifbss-mobfile')
PINGAN_PACAS_CLIENT_SECRET = getattr(settings, 'PINGAN_PACAS_CLIENT_SECRET', 'm9R7SAD5')
PINGAN_PACAS_GRANT_TYPE = getattr(settings, 'PINGAN_PACAS_GRANT_TYPE', 'client_credentials')

# for pacas api
# companyCode：PA011
# unitCode：IFBSS_MOBFILE
PINGAN_PACAS_GET_REQUEST_ID_URL = getattr(settings, 'PINGAN_PACAS_GET_REQUEST_ID_URL', 'http://esg-open.paic.com.cn/open/appsvr/public/casapi/v2/PA011/IFBSS_MOBFILE/getRequestId.do')
PINGAN_PACAS_APP_ID = getattr(settings, 'PINGAN_PACAS_APP_ID', '9e90f8486f901e4e016fa37050ee0018')
PINGAN_PACAS_V_USERNAME = getattr(settings, 'PINGAN_PACAS_V_USERNAME', 'V_PA011_IFBSS_MOBFILE')

# get valid code
PINGAN_PACAS_GET_VALID_CODE_URL = getattr(settings, 'PINGAN_PACAS_GET_VALID_CODE_URL', 'http://esg-open.paic.com.cn/open/appsvr/public/casapi/v2/PA011/IFBSS_MOBFILE/getValidCode.do')

# auth by username and password
PINGAN_PACAS_AUTHENTICATE_URL = getattr(settings, 'PINGAN_PACAS_AUTHENTICATE_URL', 'http://esg-open.paic.com.cn/open/appsvr/public/casapi/v2/PA011/IFBSS_MOBFILE/authenticate.do')

# auth by cookie
PINGAN_PACAS_AUTHENTICATE_BY_SSO_URL = getattr(settings, 'PINGAN_PACAS_AUTHENTICATE_BY_SSO_URL', 'http://esg-open.paic.com.cn/open/appsvr/public/casapi/v2/PA011/IFBSS_MOBFILE/authenticateBySSO2.do')

PINGAN_PACAS_CLIENT_AUTH = getattr(settings, 'PINGAN_PACAS_CLIENT_AUTH', False)
PINGAN_PACAS_XHEX = getattr(settings, 'PINGAN_PACAS_XHEX', 'CE334A29C0FDF7810D4BBB1C9917E54719E53394F947AC8B525CCDEFDDA44810')
PINGAN_PACAS_YHEX = getattr(settings, 'PINGAN_PACAS_YHEX', '649E2A9651401CC3251BCEDAD42CE1506841A7A31D3EE3DEADDE65D769BA4458')


def send_post_request(url, payload):
    headers = {"Content-Type": "application/json"}
    return requests.post(url, headers=headers, data=json.dumps(payload)).json()


def get_access_token():

    payload = {
        "client_id": PINGAN_PACAS_CLIENT_ID,
        "client_secret": PINGAN_PACAS_CLIENT_SECRET,
        "grant_type": PINGAN_PACAS_GRANT_TYPE
    }
    resp_json = send_post_request(PINGAN_PACAS_GET_ACCESS_TOKEN_URL, payload)

    # resp_json example:
    #
    # success:
    # {u'data': {u'access_token': u'485DF6BF304F46E2909A38FF988106BA',
    #            u'expires_in': u'43183',
    #            u'openid': u'P_ifbss-mobfile00'},
    #  u'msg': u'',
    #  u'ret': u'0'}
    #
    # error:
    # {u'msg': u'\u975e\u6cd5\u7684\u53c2\u6570', u'data': None, u'ret': u'12312'}
    if not resp_json.get('data', '') or \
            not resp_json['data'].get('access_token', ''):
        logger.error('failed to get access_token')
        logger.error(PINGAN_PACAS_GET_ACCESS_TOKEN_URL)
        logger.error(payload)
        logger.error(resp_json)

    return resp_json


def get_request_id(oauth_access_token):

    # prepare url parameters
    parameter_data = {
        'appId': PINGAN_PACAS_APP_ID,
        "access_token": oauth_access_token,
        "request_id": str(int(time.time())),  # 只要每个请求传的值不一样就可以，建议传时间戳毫秒数
    }

    # prepare http post body parameters
    signature = hashlib.md5((PINGAN_PACAS_APP_ID + PINGAN_PACAS_V_USERNAME).encode('utf8')).hexdigest()
    payload = {
        "appId": PINGAN_PACAS_APP_ID,
        "vUserName": PINGAN_PACAS_V_USERNAME,
        "signature": signature,
    }

    url = PINGAN_PACAS_GET_REQUEST_ID_URL + '?' + parse.urlencode(parameter_data)
    resp_json = send_post_request(url, payload)

    # resp_json example:
    #
    # success:
    # {u'content': {u'requestId': u'17697F9BCD12406CBFBBC2A7A5CBA171'},
    #  u'tId': u'<T=ad3f8d969ba2446bbf572401149560fb>',
    #  u'message': u'\u64cd\u4f5c\u6210\u529f',
    #  u'code': u'SUCCESS',
    #  u'sign': u'34EEA2966647670B8FCDFB2678D2E0FA'}
    #
    # error:
    # {u'msg': u'access_token\u4e3a\u7a7a', u'data': u'', u'ret': u'13005'}
    if resp_json['code'] != 'SUCCESS' or \
            not resp_json.get('content', '') or \
            not resp_json['content'].get('requestId', ''):
        logger.error('failed to get request id')
        logger.error(PINGAN_PACAS_GET_REQUEST_ID_URL)
        logger.error(payload)
        logger.error(resp_json)

    return resp_json


def get_valid_code(access_token, request_id):

    # prepare url parameters
    parameter_data = {
        'appId': PINGAN_PACAS_APP_ID,
        "access_token": access_token,
        "request_id": str(int(time.time())),  # 只要每个请求传的值不一样就可以，建议传时间戳毫秒数
    }

    # prepare http post body parameters
    signature = hashlib.md5((request_id + PINGAN_PACAS_APP_ID).encode('utf8')).hexdigest()
    payload = {
        "appId": PINGAN_PACAS_APP_ID,
        "requestId": request_id,
        "signature": signature,
    }

    url = PINGAN_PACAS_GET_VALID_CODE_URL + '?' + parse.urlencode(parameter_data)
    resp_json = send_post_request(url, payload)

    # {
    #     "message": "操作成功",
    #     "code": "SUCCESS",
    #     "content": {
    #         "requestId": "请求ID",
    #         "data": "data:image/jpg;base64,R0lGODlh...",
    #     },
    #     "sign": "签名",
    #     "tId": "服务器处理线程ID"
    # }

    if resp_json['code'] != 'SUCCESS' or \
            not resp_json.get('content', '') or \
            not resp_json['content'].get('data', ''):
        logger.error('failed to get valid code')
        logger.error(PINGAN_PACAS_AUTHENTICATE_URL)
        logger.error(payload)
        logger.error(resp_json)

    return resp_json


def pingan_pacas_authenticate(request, username, password, access_token, request_id, valid_code=''):

    # prepare url parameters
    parameter_data = {
        'appId': PINGAN_PACAS_APP_ID,
        "access_token": access_token,
        "request_id": str(int(time.time())),  # 只要每个请求传的值不一样就可以，建议传时间戳毫秒数
    }

    # prepare http post body parameters
    source_ip = request.META.get('HTTP_X_FORWARDED_FOR') or request.META.get('REMOTE_ADDR')

    payload = {
        "appId": PINGAN_PACAS_APP_ID,
        "requestId": request_id,
        "userId": username,
        "password": password,
        "sourceIP": source_ip,
    }

    if valid_code:
        signature = hashlib.md5((request_id + PINGAN_PACAS_APP_ID + username +
                                password + valid_code + source_ip).encode('utf8')).hexdigest()
        payload["signature"] = signature
        payload["validCode"] = valid_code
    else:
        signature = hashlib.md5((request_id + PINGAN_PACAS_APP_ID + username +
                                password + source_ip).encode('utf8')).hexdigest()
        payload["signature"] = signature

    url = PINGAN_PACAS_AUTHENTICATE_URL + '?' + parse.urlencode(parameter_data)
    resp_json = send_post_request(url, payload)

    # {u'content': {u'username': u'HECHANG364',
    #               u'needPromtModPwd': False,
    #               u'pwdRemainWorkingDay': 0,
    #               u'lastestPwdModifyTime': u'2020-02-10 10:26:38',
    #               u'companyCode': u'PA011',
    #               u'loginIp': u'10.11.108.30',
    #               u'userType': u'staff',
    #               u'userSign': u'0B764DE58A3FF898CFB1CE88D589F66AAA3AF58D9F5',
    #               u'virtualUser': u'V_PA011_IFBSS_MOBFILE',
    #               u'paSession': u'VrGcn4i9zSltpuUeOTzckv==',
    #               u'lastSuccessLoginTime': u'2020-02-26 16:10:27',
    #               u'lastFailedTimes': 0,
    #               u'unitCode': u'IFBSS_MOBFILE',
    #               u'loginTime': u'2020-02-26 16:10:27',
    #               u'casSsoCookie': u'9e84d8e16ecff765016f4183e64900e9-4b19ef3c15de4c7bb019b2350ff43b1b'},
    # u'tId': u'<T=a2851031a021428fae810b7bd9d4cc92>',
    # u'message': u'\u64cd\u4f5c\u6210\u529f',
    # u'code': u'SUCCESS',
    # u'sign': u'F80DF2B0F5A5DDFFF9C00C2459E60FD1'}

    # {u'content': None, u'tId': u'<T=0e6c27e2eb0c4d6888c1ec9e3d35c1af>',
    # u'message': u'登录认证错误，连续输错5次将锁定帐户，请谨慎操作。',
    # u'code': u'WRONG_PASSWORD_OR_USERNAME', u'sign': None}
    if resp_json['code'] != 'SUCCESS':
        logger.error('failed to authenticate')
        logger.error(PINGAN_PACAS_AUTHENTICATE_URL)
        logger.error(payload)
        logger.error(resp_json)

    return resp_json


def pingan_pacas_authenticate_by_sso(request, sso_cookie, sso_type, access_token, request_id):

    # prepare url parameters
    parameter_data = {
        'appId': PINGAN_PACAS_APP_ID,
        "access_token": access_token,
        "request_id": str(int(time.time())),  # 只要每个请求传的值不一样就可以，建议传时间戳毫秒数
    }

    # prepare http post body parameters
    source_ip = request.META.get('HTTP_X_FORWARDED_FOR') or request.META.get('REMOTE_ADDR')
    signature = hashlib.md5((request_id + PINGAN_PACAS_APP_ID + sso_type +
                            sso_cookie + source_ip).encode('utf8')).hexdigest()
    payload = {
        "appId": PINGAN_PACAS_APP_ID,
        "requestId": request_id,
        "ssoType": sso_type,  # CAS_SSO_COOKIE, PASESSION 二选一，区分大小写
        "token": sso_cookie,
        "sourceIP": source_ip,
        "signature": signature,
    }

    url = PINGAN_PACAS_AUTHENTICATE_BY_SSO_URL + '?' + parse.urlencode(parameter_data)
    resp_json = requests.post(url, data=json.dumps(payload)).json()

    # {u'content': {u'username': u'HECHANG364',
    #               u'needPromtModPwd': False,
    #               u'pwdRemainWorkingDay': 0,
    #               u'lastestPwdModifyTime': u'2020-02-10 10:26:38',
    #               u'companyCode': u'PA011',
    #               u'loginIp': u'10.11.108.30',
    #               u'userType': u'staff',
    #               u'userSign': u'0B764DE58A3FF898CFB1CE88D589F66AAA3AF58D9',
    #               u'virtualUser': u'V_PA011_IFBSS_MOBFILE',
    #               u'paSession': u'VrGcn4i9zSltpuUeOTzcktYuentSEzI1YGjOV4b==',
    #               u'lastSuccessLoginTime': u'2020-02-26 16:27:21',
    #               u'lastFailedTimes': 0,
    #               u'unitCode': u'IFBSS_MOBFILE',
    #               u'loginTime': u'2020-02-26 16:28:03',
    #               u'casSsoCookie': u'9e84d8e16ecff765016f4183e64900e9-4b19ef3c15de4c7bb019b2350ff43b1b'},
    # u'tId': u'<T=6b83b90700f245ceab5fa1bdd2959ba0>',
    # u'message': u'\u64cd\u4f5c\u6210\u529f',
    # u'code': u'SUCCESS',
    # u'sign': u'F5D4D3B8E2CB7CAD655353AC6AE3492E'}
    if resp_json['code'] != 'SUCCESS' or \
            not resp_json.get('content', '') or \
            not resp_json['content'].get('username', ''):
        logger.error('failed to authenticate by sso')
        logger.error(PINGAN_PACAS_AUTHENTICATE_BY_SSO_URL)
        logger.error(payload)
        logger.error(resp_json)

    return resp_json


def api_pingan_pacas_refresh_valid_code(request):

    result = {}
    content_type = 'application/json; charset=utf-8'

    # get access token
    cache_key = normalize_cache_key('PACAS_ACCESS_TOKEN')
    access_token = cache.get(cache_key, None)
    if not access_token:
        resp_json_for_access_token = get_access_token()
        if not resp_json_for_access_token.get('data', '') or \
                not resp_json_for_access_token['data'].get('access_token', ''):
            result['error_msg'] = resp_json_for_access_token.get('msg', '获取验证码失败，请联系管理员解决')
            return HttpResponse(json.dumps(result), content_type=content_type)

        access_token = resp_json_for_access_token['data']['access_token']
        expires_in = resp_json_for_access_token['data'].get('expires_in', 60*60*24)
        cache.set(cache_key, access_token, int(expires_in))

    # get request id for valid code
    resp_json_for_new_request_id = get_request_id(access_token)
    if resp_json_for_new_request_id['code'] != 'SUCCESS' or \
            not resp_json_for_new_request_id.get('content', '') or \
            not resp_json_for_new_request_id['content'].get('requestId', ''):
        logger.error(resp_json_for_new_request_id)
        result['error_msg'] = resp_json_for_new_request_id.get('msg', '获取验证码失败，请联系管理员解决')
        return HttpResponse(json.dumps(result), content_type=content_type)

    request_id_for_valid_code = resp_json_for_new_request_id['content']['requestId']
    resp_json_for_valid_code = get_valid_code(access_token, request_id_for_valid_code)
    if resp_json_for_valid_code['code'] != 'SUCCESS' or \
            not resp_json_for_valid_code.get('content', '') or \
            not resp_json_for_valid_code['content'].get('data', ''):
        logger.error(resp_json_for_valid_code)
        result['error_msg'] = resp_json_for_valid_code.get('msg', '获取验证码失败，请联系管理员解决')
        return HttpResponse(json.dumps(result), content_type=content_type)

    valid_code = resp_json_for_valid_code['content']['data']

    result['valid_code'] = valid_code
    result['request_id_for_valid_code'] = request_id_for_valid_code
    return HttpResponse(json.dumps(result), content_type=content_type)


def pacas_login(request):

    redirect_to = request.GET.get(REDIRECT_FIELD_NAME, '/')
    if request.user.is_authenticated:
        return HttpResponseRedirect(redirect_to)

    template_name = 'registration/login.html'
    login_bg_image_path = get_login_bg_image_path()
    render_data = {
        'login_bg_image_path': login_bg_image_path,
        'remember_days': config.LOGIN_REMEMBER_DAYS,
        'xHex': PINGAN_PACAS_XHEX,
        'yHex': PINGAN_PACAS_YHEX,
    }

    # get access token
    cache_key = normalize_cache_key('PACAS_ACCESS_TOKEN')
    access_token = cache.get(cache_key, None)
    if not access_token:
        resp_json_for_access_token = get_access_token()
        if not resp_json_for_access_token.get('data', '') or \
                not resp_json_for_access_token['data'].get('access_token', ''):
            render_data['error_msg'] = resp_json_for_access_token.get('msg', '身份验证失败，请联系管理员解决')
            return render(request, template_name, render_data)

        access_token = resp_json_for_access_token['data']['access_token']
        expires_in = resp_json_for_access_token['data'].get('expires_in', 60*60*24)
        cache.set(cache_key, access_token, int(expires_in))

    # get request id
    resp_json_for_request_id = get_request_id(access_token)
    if resp_json_for_request_id['code'] != 'SUCCESS' or \
            not resp_json_for_request_id.get('content', '') or \
            not resp_json_for_request_id['content'].get('requestId', ''):
        render_data['error_msg'] = resp_json_for_request_id.get('msg', '身份验证失败，请联系管理员解决')
        return render(request, template_name, render_data)
    request_id = resp_json_for_request_id['content'].get('requestId', '')

    username = ''
    pingan_user = ''
    cas_sso_cookie = ''
    pasession = ''

    # for login page
    if request.method == "POST":

        pingan_user = request.POST.get('login', '')
        password = request.POST.get('password', '')

        if '@' in pingan_user:
            if ccnet_api.validate_emailuser(pingan_user, password) != 0:
                logger.error('ccnet auth failed')
                logger.error('username: %s, password: %s' % (pingan_user, password))
                render_data['error_msg'] = '用户或密码错误'
                return render(request, template_name, render_data)
            username = pingan_user
            cas_sso_cookie = ''
            pasession = ''
        else:
            valid_code = request.POST.get('valid_code', '')
            request_id_for_valid_code = request.POST.get('request_id_for_valid_code', '')
            if valid_code and request_id_for_valid_code:
                resp_json_for_authenticate = pingan_pacas_authenticate(
                    request, pingan_user, password, access_token, request_id_for_valid_code, valid_code)
            else:
                resp_json_for_authenticate = pingan_pacas_authenticate(
                    request, pingan_user, password, access_token, request_id)

            if resp_json_for_authenticate['code'] == 'NEED_RAND_CODE':

                # get request id for valid code
                resp_json_for_new_request_id = get_request_id(access_token)
                if resp_json_for_new_request_id['code'] != 'SUCCESS' or \
                        not resp_json_for_new_request_id.get('content', '') or \
                        not resp_json_for_new_request_id['content'].get('requestId', ''):
                    render_data['error_msg'] = resp_json_for_new_request_id.get('msg', '身份验证失败，请联系管理员解决')
                    return render(request, template_name, render_data)

                request_id_for_valid_code = resp_json_for_new_request_id['content']['requestId']
                resp_json_for_valid_code = get_valid_code(access_token, request_id_for_valid_code)
                if resp_json_for_valid_code['code'] != 'SUCCESS' or \
                        not resp_json_for_valid_code.get('content', '') or \
                        not resp_json_for_valid_code['content'].get('data', ''):
                    render_data['error_msg'] = resp_json_for_valid_code.get('msg', '身份验证失败，请联系管理员解决')
                    return render(request, template_name, render_data)

                valid_code = resp_json_for_valid_code['content']['data']

                render_data['error_msg'] = '请输入验证码'
                render_data['valid_code'] = valid_code
                render_data['request_id_for_valid_code'] = request_id_for_valid_code
                return render(request, template_name, render_data)

            if resp_json_for_authenticate['code'] != 'SUCCESS':
                render_data['error_msg'] = resp_json_for_authenticate.get('message', '身份验证失败，请联系管理员解决')
                return render(request, template_name, render_data)

            username = Profile.objects.get_username_by_login_id(pingan_user)
            cas_sso_cookie = resp_json_for_authenticate['content'].get('casSsoCookie', '')
            pasession = resp_json_for_authenticate['content'].get('paSession', '')

    # for login via pacas sso cookie
    if request.method == "GET":

        if request.COOKIES.get('CAS_SSO_COOKIE'):
            sso_cookie = request.COOKIES.get('CAS_SSO_COOKIE')
            sso_type = 'CAS_SSO_COOKIE'
        elif request.COOKIES.get('PASESSION'):
            sso_cookie = request.COOKIES.get('PASESSION')
            sso_type = 'PASESSION'
        else:
            return HttpResponseRedirect(dj_settings.REDIRECT_LOGIN_URL)

        resp_json_for_authenticate_by_sso = pingan_pacas_authenticate_by_sso(
            request, sso_cookie, sso_type, access_token, request_id)
        if resp_json_for_authenticate_by_sso['code'] != 'SUCCESS' or \
                not resp_json_for_authenticate_by_sso.get('content', '') or \
                not resp_json_for_authenticate_by_sso['content'].get('username', ''):
            return HttpResponseRedirect(dj_settings.REDIRECT_LOGIN_URL)

        pingan_user = resp_json_for_authenticate_by_sso['content']['username']
        username = Profile.objects.get_username_by_login_id(pingan_user)
        cas_sso_cookie = resp_json_for_authenticate_by_sso['content'].get('casSsoCookie', '')
        pasession = resp_json_for_authenticate_by_sso['content'].get('paSession', '')

    if not username:
        logger.error('failed to get info for %s in seahub profile' % pingan_user)
        render_data['error_msg'] = '未找到用户'
        return render(request, template_name, render_data)

    try:
        user = User.objects.get(email=username)
    except User.DoesNotExist:
        logger.error('failed to get info for %s in ccnet' % pingan_user)
        render_data['error_msg'] = '未找到用户'
        return render(request, template_name, render_data)

    if not user.is_active:
        render_data['error_msg'] = '用户未激活'
        return render(request, template_name, render_data)

    # TODO not used
    user.backend = 'seahub.base.accounts.AuthBackend'

    request.user = user
    auth.login(request, user)

    redirect_to = request.GET.get(auth.REDIRECT_FIELD_NAME, '/')
    response = HttpResponseRedirect(redirect_to)

    if cas_sso_cookie:
        response.set_cookie('CAS_SSO_COOKIE', cas_sso_cookie, domain='.paic.com.cn')
    if pasession:
        response['Set-Cookie'] = 'PASESSION=%s; Path=/; domain=.paic.com.cn' % pasession

    return response
