# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from .views import CadApiFileContentView

urlpatterns = [
    # RESTful API
    path('api/file-content/', CadApiFileContentView.as_view(), name='CadApiFileContentView'),
]
