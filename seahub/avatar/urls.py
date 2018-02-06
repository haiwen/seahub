# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url
from .views import add, render_primary
urlpatterns = [
    url('^add/$', add, name='avatar_add'),
#    url('^change/$', 'change', name='avatar_change'),
#    url('^delete/$', 'delete', name='avatar_delete'),
    url('^render_primary/(?P<user>[^/]+)/(?P<size>[\d]+)/$', render_primary, name='avatar_render_primary'),
]
