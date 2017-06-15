# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import patterns, url, include

from views import thumbnail_create, thumbnail_get, share_link_thumbnail_get, \
    share_link_thumbnail_create, psd_thumbnail_get

urlpatterns = patterns('',
    url(r'^(?P<repo_id>[-0-9a-f]{36})/create/$', thumbnail_create, name='thumbnail_create'),
    url(r'^(?P<repo_id>[-0-9a-f]{36})/(?P<size>[0-9]+)/(?P<path>.*)$', thumbnail_get, name='thumbnail_get'),
    url(r'^(?P<repo_id>[-0-9a-f]{36})/gen_psd_file/(?P<path>.*)$', psd_thumbnail_get, name='psd_thumbnail_get'),
    url(r'^(?P<token>[a-f0-9]+)/create/$', share_link_thumbnail_create, name='share_link_thumbnail_create'),
    url(r'^(?P<token>[a-f0-9]+)/(?P<size>[0-9]+)/(?P<path>.*)$', share_link_thumbnail_get, name='share_link_thumbnail_get'),
)
