# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from .views import (info, useradmin, user_info, user_remove, useradmin_search,
                    user_toggle_status, user_set_quota)

urlpatterns = [
    url('^info/$', info, name="info"),
    url('^useradmin/$', useradmin, name="useradmin"),
    url(r'^useradmin/info/(?P<email>[^/]+)/$', user_info, name='user_info'),
    url(r'^useradmin/remove/(?P<email>[^/]+)/$', user_remove, name='user_remove'),
    url('^useradmin/search/$', useradmin_search, name="useradmin_search"),
    url(r'^useradmin/set_quota/(?P<email>[^/]+)/$', user_set_quota, name='user_set_quota'),
    url(r'^useradmin/toggle_status/(?P<email>[^/]+)/$', user_toggle_status, name='user_toggle_status'),
]
