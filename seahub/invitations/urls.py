# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import re_path

from .views import token_view

urlpatterns = [
    re_path(r'^token/(?P<token>[a-f0-9]{32})/$', token_view, name='token_view')
]
