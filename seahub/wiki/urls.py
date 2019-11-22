# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from .views import slug
from ..views import react_fake_view

urlpatterns = [
    url(r'^$', react_fake_view, name='list'),
    url(r'^(?P<slug>[^/]+)/$', slug, name='slug'),
    url(r'^(?P<slug>[^/]+)/(?P<file_path>.+)$', slug, name='slug'),
]
