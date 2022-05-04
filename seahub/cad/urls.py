# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from .views import CadApiFileContentView

urlpatterns = [
    # RESTful API
    url(r'^api/file-content/$', CadApiFileContentView.as_view(), name='CadApiFileContentView'),
]
