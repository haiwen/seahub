from django.conf.urls.defaults import *

from views import *


urlpatterns = patterns('',
    url(r'^ping/$', Ping.as_view()),
    url(r'login/$', api_login),
    url(r'^$', ReposView.as_view()),
    url(r'^repo/list/$', ReposView.as_view(), name='repos'),
    url(r'^repo/(?P<repo_id>[^/]+)/$', RepoView.as_view(), name='repo'),

    url(r'^dir/(?P<repo_id>[^/]+)/root/$', RepoDirPathView.as_view()),
    url(r'^dir/(?P<repo_id>[^/]+)/$', RepoDirPathView.as_view(), name='repo-dir-path'),
    url(r'^dir/(?P<repo_id>[^/]+)/(?P<dir_id>[^/]+)/$', RepoDirIdView.as_view(), name='repo-dir-id'),
    url(r'^file/(?P<repo_id>[^/]+)/(?P<file_id>[^/]+)/$', RepoFileView.as_view(), name='repo-file'),
)

