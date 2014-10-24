from django.conf.urls.defaults import *

from views import thumbnail_create, thumbnail_get

urlpatterns = patterns('',
    url(r'^(?P<repo_id>[-0-9a-f]{36})/create/$', thumbnail_create, name='thumbnail_create'),
    url(r'^(?P<repo_id>[-0-9a-f]{36})/(?P<obj_id>[0-9a-f]{40})/(?P<size>[0-9]+)/$', thumbnail_get, name='thumbnail_get'),
)
