# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from .views import slug

urlpatterns = [
    url(r'^(?P<slug>[^/]+)/$', slug, name='slug'),
    url(r'^(?P<slug>[^/]+)/(?P<page_name>[^/]+)/$', slug, name='slug'),
]
