from django.conf.urls import patterns, url

from .views import info, useradmin, user_info, user_remove

urlpatterns = patterns(
    '',
    url('^info/$', info, name="info"),
    url('^useradmin/$', useradmin, name="useradmin"),
    url(r'^useradmin/info/(?P<email>[^/]+)/$', user_info, name='user_info'),
    url(r'^useradmin/remove/(?P<email>[^/]+)/$', user_remove, name='user_remove'),
)
