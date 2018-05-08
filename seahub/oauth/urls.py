# Copyright (c) 2012-2016 Seafile Ltd.

from django.conf.urls import url
from seahub.oauth.views import oauth_login, oauth_callback

urlpatterns = [
    url(r'login/$', oauth_login, name='oauth_login'),
    url(r'callback/$', oauth_callback, name='oauth_callback'),
]
