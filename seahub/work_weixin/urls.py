# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8

from django.urls import path
from seahub.work_weixin.views import work_weixin_oauth_login, work_weixin_oauth_callback, \
    work_weixin_oauth_connect, work_weixin_oauth_connect_callback, work_weixin_oauth_disconnect

urlpatterns = [
    path('oauth-login/', work_weixin_oauth_login, name='work_weixin_oauth_login'),
    path('oauth-callback/', work_weixin_oauth_callback, name='work_weixin_oauth_callback'),
    path('oauth-connect/', work_weixin_oauth_connect, name='work_weixin_oauth_connect'),
    path('oauth-connect-callback/', work_weixin_oauth_connect_callback, name='work_weixin_oauth_connect_callback'),
    path('oauth-disconnect/', work_weixin_oauth_disconnect, name='work_weixin_oauth_disconnect'),
]
