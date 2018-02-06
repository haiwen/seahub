# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from .views import token_view

urlpatterns = [
    url(r'^token/(?P<token>[a-f0-9]{32})/$', token_view, name='token_view')
]
