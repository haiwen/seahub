# Copyright (c) 2012-2016 Seafile Ltd.

from django.urls import path
from seahub.oauth.views import oauth_login, oauth_callback, \
    custom_oauth_login_view, custom_oauth_callback_view

import seahub.settings as settings
ENABLE_CUSTOM_OAUTH = getattr(settings, 'ENABLE_CUSTOM_OAUTH', False)


urlpatterns = [
    path('login/', oauth_login, name='oauth_login'),
    path('callback/', oauth_callback, name='oauth_callback'),
]

if ENABLE_CUSTOM_OAUTH:
    urlpatterns = [
        path('login/', custom_oauth_login_view, name='oauth_login'),
        path('callback/', custom_oauth_callback_view, name='oauth_callback'),
   ]
