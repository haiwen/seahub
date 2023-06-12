# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path, re_path
from .views import add, render_primary
urlpatterns = [
    path('add/', add, name='avatar_add'),
#    url('^change/$', 'change', name='avatar_change'),
#    url('^delete/$', 'delete', name='avatar_delete'),
    re_path('^render_primary/(?P<user>[^/]+)/(?P<size>[\d]+)/$', render_primary, name='avatar_render_primary'),
]
