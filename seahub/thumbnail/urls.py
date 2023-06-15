# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import re_path

from .views import thumbnail_create, thumbnail_get, share_link_thumbnail_get, \
    share_link_thumbnail_create

urlpatterns = [
    re_path(r'^(?P<repo_id>[-0-9a-f]{36})/create/$', thumbnail_create, name='thumbnail_create'),
    re_path(r'^(?P<repo_id>[-0-9a-f]{36})/(?P<size>[0-9]+)/(?P<path>.*)$', thumbnail_get, name='thumbnail_get'),
    re_path(r'^(?P<token>[a-f0-9]+)/create/$', share_link_thumbnail_create, name='share_link_thumbnail_create'),
    re_path(r'^(?P<token>[a-f0-9]+)/(?P<size>[0-9]+)/(?P<path>.*)$', share_link_thumbnail_get, name='share_link_thumbnail_get'),
]
