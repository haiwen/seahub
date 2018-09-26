# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from .views import review, drafts

urlpatterns = [
    url(r'^$', drafts, name='drafts'),
    url(r'^review/(?P<pk>\d+)/(?P<file_name>.*)/$', review, name='review'),
]
