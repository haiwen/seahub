from django.conf.urls import patterns, url

from .views import info, useradmin, user_info, user_remove, useradmin_search

urlpatterns = patterns(
    '',
    url('^info/$', info, name="info"),
    url('^useradmin/$', useradmin, name="useradmin"),
    url(r'^useradmin/info/(?P<email>[^/]+)/$', user_info, name='user_info'),
    url(r'^useradmin/remove/(?P<email>[^/]+)/$', user_remove, name='user_remove'),
    url('^useradmin/search/$', useradmin_search, name="useradmin_search"),
)
