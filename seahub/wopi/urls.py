# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import re_path

from .views import WOPIFilesView, WOPIFilesContentsView

urlpatterns = [
    # RESTful API
    re_path(r'^files/(?P<file_id>[-0-9-a-f]{40})$', WOPIFilesView.as_view(), name='WOPIFilesView'),
    re_path(r'^files/(?P<file_id>[-0-9-a-f]{40})/contents$', WOPIFilesContentsView.as_view(), name='WOPIFilesContentsView'),
]
