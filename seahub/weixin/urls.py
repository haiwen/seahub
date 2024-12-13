# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8

from django.urls import path
from seahub.weixin.views import weixin_oauth_login, weixin_oauth_callback, \
        weixin_oauth_disconnect, weixin_oauth_connect, weixin_oauth_connect_callback

urlpatterns = [
    path('oauth-login/', weixin_oauth_login, name='weixin_oauth_login'),
    path('oauth-callback/', weixin_oauth_callback, name='weixin_oauth_callback'),
    path('oauth-connect/', weixin_oauth_connect, name='weixin_oauth_connect'),
    path('oauth-connect-callback/', weixin_oauth_connect_callback, name='weixin_oauth_connect_callback'),
    path('oauth-disconnect/', weixin_oauth_disconnect, name='weixin_oauth_disconnect'),
]
