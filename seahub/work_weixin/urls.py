# Copyright (c) 2012-2019 Seafile Ltd.

from django.conf.urls import url
from seahub.work_weixin.views import work_weixin_oauth_login, work_weixin_oauth_callback

urlpatterns = [
    url(r'oauth-login/$', work_weixin_oauth_login, name='work_weixin_oauth_login'),
    url(r'oauth-callback/$', work_weixin_oauth_callback, name='work_weixin_oauth_callback'),
]
