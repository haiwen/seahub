# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8
from django.conf import settings

ENABLE_WEIXIN = getattr(settings, 'ENABLE_WEIXIN', False)
WEIXIN_OAUTH_APP_ID = getattr(settings, 'WEIXIN_OAUTH_APP_ID', '')
WEIXIN_OAUTH_APP_SECRET = getattr(settings, 'WEIXIN_OAUTH_APP_SECRET', '')

WEIXIN_OAUTH_SCOPE = getattr(settings, 'WEIXIN_OAUTH_SCOPE', 'snsapi_login')
WEIXIN_OAUTH_RESPONSE_TYPE = getattr(settings, 'WEIXIN_OAUTH_RESPONSE_TYPE', 'code')
WEIXIN_OAUTH_QR_CONNECT_URL = getattr(settings, 'WEIXIN_OAUTH_QR_CONNECT_URL', 'https://open.weixin.qq.com/connect/qrconnect')

WEIXIN_OAUTH_GRANT_TYPE = getattr(settings, 'WEIXIN_OAUTH_GRANT_TYPE', 'authorization_code')
WEIXIN_OAUTH_ACCESS_TOKEN_URL = getattr(settings, 'WEIXIN_OAUTH_ACCESS_TOKEN_URL', 'https://api.weixin.qq.com/sns/oauth2/access_token')

WEIXIN_OAUTH_USER_INFO_URL = getattr(settings, 'WEIXIN_OAUTH_USER_INFO_URL', 'https://api.weixin.qq.com/sns/userinfo')

WEIXIN_OAUTH_CREATE_UNKNOWN_USER = getattr(settings, 'WEIXIN_OAUTH_CREATE_UNKNOWN_USER', True)
WEIXIN_OAUTH_ACTIVATE_USER_AFTER_CREATION = getattr(settings, 'WEIXIN_OAUTH_ACTIVATE_USER_AFTER_CREATION', True)
