# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from .views import ThirdpartyEditorFileInfoView, ThirdpartyEditorFileContentView

urlpatterns = [
    # RESTful API
    path('file-info/', ThirdpartyEditorFileInfoView.as_view(), name='ThirdpartyEditorFileInfoView'),
    path('file-content/', ThirdpartyEditorFileContentView.as_view(), name='ThirdpartyEditorFileContentView'),
]
