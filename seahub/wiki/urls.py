# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import patterns, url

from .views import *

urlpatterns = patterns(
    '',
    url('^(?P<slug>[^/]+)/$', slug, name='slug'),
    url(r'^(?P<slug>[^/]+)/(?P<page_name>[^/]+)/$', slug, name='slug'),
)
