# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from .views import review, drafts, reviews

urlpatterns = [
    url(r'^$', drafts, name='drafts'),
    url(r'^reviews/$', reviews, name='reviews'),
    url(r'^review/(?P<pk>\d+)/$', review, name='review'),
]
