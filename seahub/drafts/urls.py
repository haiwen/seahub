# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from .views import draft, drafts

urlpatterns = [
    url(r'^$', drafts, name='drafts'),
    url(r'^(?P<pk>\d+)/$', draft, name='draft'),
]
