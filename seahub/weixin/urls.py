# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8

from django.urls import path
from seahub.weixin.views import weixin_oauth_login, weixin_oauth_callback

urlpatterns = [
    path('oauth-login/', weixin_oauth_login, name='weixin_oauth_login'),
    path('oauth-callback/', weixin_oauth_callback, name='weixin_oauth_callback'),
]
