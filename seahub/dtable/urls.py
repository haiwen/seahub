# -*- coding: utf-8 -*-
from django.conf.urls import url

from .views import dtable_file_view, dtable_asset_access


urlpatterns = [
    url(r'^(?P<workspace_id>\d+)/dtable/(?P<name>.*)/$', dtable_file_view, name='dtable_file_view'),
    url(r'^(?P<workspace_id>\d+)/asset/(?P<dtable_id>[-0-9a-f]{36})/(?P<path>.*)$', dtable_asset_access, name='dtable_asset_access'),
]
