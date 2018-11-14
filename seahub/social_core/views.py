import logging

import requests
from django.conf import settings
from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.utils.http import urlquote

from seahub.social_core.utils.WXBizMsgCrypt import WXBizMsgCrypt
from seahub.utils.urls import abs_reverse

# Get an instance of a logger
logger = logging.getLogger(__name__)

@csrf_exempt
def weixin_work_cb(request):
    """Callback for weixin work provider API.

    Used in callback config at app details page.
    e.g. https://open.work.weixin.qq.com/wwopen/developer#/sass/apps/detail/ww24c53566499d354f

    ref: https://work.weixin.qq.com/api/doc#90001/90143/91116
    """

    token = settings.SOCIAL_AUTH_WEIXIN_WORK_TOKEN
    EncodingAESKey = settings.SOCIAL_AUTH_WEIXIN_WORK_AES_KEY

    msg_signature = request.GET.get('msg_signature', None)
    timestamp = request.GET.get('timestamp', None)
    nonce = request.GET.get('nonce', None)
    if not (msg_signature and timestamp and nonce):
        assert False, 'Request Error'

    if request.method == 'GET':
        wxcpt = WXBizMsgCrypt(token, EncodingAESKey,
                              settings.SOCIAL_AUTH_WEIXIN_WORK_KEY)

        echostr = request.GET.get('echostr', '')
        ret, decoded_echostr = wxcpt.VerifyURL(msg_signature, timestamp, nonce, echostr)
        if ret != 0:
            assert False, 'Verify Error'

        return HttpResponse(decoded_echostr)

    elif request.method == 'POST':
        wxcpt = WXBizMsgCrypt(token, EncodingAESKey,
                              settings.SOCIAL_AUTH_WEIXIN_WORK_SUITID)

        ret, xml_msg = wxcpt.DecryptMsg(request.body, msg_signature, timestamp, nonce)
        if ret != 0:
            assert False, 'Decrypt Error'

        import xml.etree.cElementTree as ET
        xml_tree = ET.fromstring(xml_msg)
        suite_ticket = xml_tree.find("SuiteTicket").text
        logger.info('suite ticket: %s' % suite_ticket)

        # TODO: use persistent store
        cache.set('wx_work_suite_ticket', suite_ticket, 3600)

        return HttpResponse('success')

def _get_suite_access_token():
    suite_access_token = cache.get('wx_work_suite_access_token', None)
    if suite_access_token:
        return suite_access_token

    suite_ticket = cache.get('wx_work_suite_ticket', None)
    if not suite_ticket:
        assert False, 'suite ticket is None!'

    get_suite_token_url = 'https://qyapi.weixin.qq.com/cgi-bin/service/get_suite_token'
    resp = requests.request(
        'POST', get_suite_token_url,
        json={
            "suite_id": settings.SOCIAL_AUTH_WEIXIN_WORK_SUITID,
            "suite_secret": settings.SOCIAL_AUTH_WEIXIN_WORK_SUIT_SECRET,
            "suite_ticket": suite_ticket,
        },
        headers={'Content-Type': 'application/json',
                 'Accept': 'application/json'},
    )

    suite_access_token = resp.json().get('suite_access_token', None)
    if not suite_access_token:
        logger.error('Failed to get suite_access_token!')
        logger.error(resp.content)
        assert False, 'suite_access_token is None!'
    else:
        cache.set('wx_work_suite_access_token', suite_access_token, 3600)
        return suite_access_token

def weixin_work_3rd_app_install(request):
    """Redirect user to weixin work 3rd app install page.
    """
    # 0. get suite access token
    suite_access_token = _get_suite_access_token()
    print('suite access token', suite_access_token)

    # 1. get pre_auth_code
    get_pre_auth_code_url = 'https://qyapi.weixin.qq.com/cgi-bin/service/get_pre_auth_code?suite_access_token=' + suite_access_token
    resp = requests.request('GET', get_pre_auth_code_url)

    pre_auth_code = resp.json().get('pre_auth_code', None)
    if not pre_auth_code:
        logger.error('Failed to get pre_auth_code')
        logger.error(resp.content)
        assert False, 'pre_auth_code is None'

    # 2. set session info
    # ref: https://work.weixin.qq.com/api/doc#90001/90143/90602
    url = 'https://qyapi.weixin.qq.com/cgi-bin/service/set_session_info?suite_access_token=' + suite_access_token
    resp = requests.request(
        'POST', url,
        json={
            "pre_auth_code": pre_auth_code,
            "session_info":
            {
                "appid": [],
                "auth_type": 1  # TODO: 0: production; 1: testing.
            }
        },
        headers={'Content-Type': 'application/json',
                 'Accept': 'application/json'},

    )

    # TODO: use random state
    url = 'https://open.work.weixin.qq.com/3rdapp/install?suite_id=%s&pre_auth_code=%s&redirect_uri=%s&state=STATE123' % (
        settings.SOCIAL_AUTH_WEIXIN_WORK_SUITID,
        pre_auth_code,
        abs_reverse('weixin_work_3rd_app_install_cb'),
    )
    return HttpResponseRedirect(url)

@csrf_exempt
def weixin_work_3rd_app_install_cb(request):
    """Callback for weixin work 3rd app install API.

    https://work.weixin.qq.com/api/doc#90001/90143/90597
    """
    # TODO: check state
    pass
