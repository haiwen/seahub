# Copyright (c) 2012-2016 Seafile Ltd.

from django.urls import path
from seahub.oauth.views import oauth_login, oauth_callback

urlpatterns = [
    path('login/', oauth_login, name='oauth_login'),
    path('callback/', oauth_callback, name='oauth_callback'),
]
