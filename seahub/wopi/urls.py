# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import patterns, url

from views import WOPIFilesView, WOPIFilesContentsView

urlpatterns = patterns('',
    # RESTful API
    url(r'^files/(?P<file_id>[-0-9-a-f]{40})$', WOPIFilesView.as_view(), name='WOPIFilesView'),
    url(r'^files/(?P<file_id>[-0-9-a-f]{40})/contents$', WOPIFilesContentsView.as_view(), name='WOPIFilesContentsView'),
)
