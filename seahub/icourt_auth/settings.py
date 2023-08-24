# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings

# JS url to fetch login QR-code
ALPHALAWYER_WX_LOGIN_INFO_URL = getattr(
    settings, 'ALPHALAWYER_WX_LOGIN_INFO_URL',
    "https://box.alphalawyer.cn/alpha/user/api/v1/login/wechat/info"
)


# "redirect_uri" used in JS code in `weidin_login.html`
ALPHALAWYER_WX_LOGIN_REDIRECT_URI = getattr(
    settings, 'ALPHALAWYER_WX_LOGIN_REDIRECT_URI',
    "https://alphalawyer.cn/wechatlogin/alphalawyer.cn/ie_box_login/index.html?from=box"
)


# Seafie send `code` and `state` to this url to get user info(userId, pic, etc).
ALPHALAWYER_WX_LOGIN_CALLBACK_URL = getattr(
    settings, 'ALPHALAWYER_WX_LOGIN_CALLBACK_URL',
    'https://alphalawyer.cn/user/api/v1/login/wechat'
)


_default_headers = {
    'deviceType': 'box',
}
ALPHALAWYER_WX_LOGIN_CALLBACK_URL_HEADERS = getattr(
    settings, 'ALPHALAWYER_WX_LOGIN_CALLBACK_URL_HEADERS', _default_headers)

ALPHALAWYER_WX_LOGIN_VERIFY_URL = getattr(
    settings, 'ALPHALAWYER_WX_LOGIN_VERIFY_URL',
    'https://alphalawyer.cn/ilaw/api/box/token/verification'
)
