# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8

from django.conf.urls import url
from seahub.work_weixin.views import work_weixin_oauth_login, work_weixin_oauth_callback, \
    work_weixin_oauth_connect, work_weixin_oauth_connect_callback, work_weixin_oauth_disconnect

urlpatterns = [
    url(r'oauth-login/$', work_weixin_oauth_login, name='work_weixin_oauth_login'),
    url(r'oauth-callback/$', work_weixin_oauth_callback, name='work_weixin_oauth_callback'),
    url(r'oauth-connect/$', work_weixin_oauth_connect, name='work_weixin_oauth_connect'),
    url(r'oauth-connect-callback/$', work_weixin_oauth_connect_callback, name='work_weixin_oauth_connect_callback'),
    url(r'oauth-disconnect/$', work_weixin_oauth_disconnect, name='work_weixin_oauth_disconnect'),
]
