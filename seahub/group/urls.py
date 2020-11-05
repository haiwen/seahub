# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from .views import group_remove

urlpatterns = [
    url(r'^(?P<group_id>\d+)/remove/$', group_remove, name='group_remove'),
]
