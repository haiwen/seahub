# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from .views import ThirdpartyEditorFileInfoView, ThirdpartyEditorFileContentView

urlpatterns = [
    # RESTful API
    url(r'^file-info/$', ThirdpartyEditorFileInfoView.as_view(), name='ThirdpartyEditorFileInfoView'),
    url(r'^file-content/$', ThirdpartyEditorFileContentView.as_view(), name='ThirdpartyEditorFileContentView'),
]
