from django.conf.urls.defaults import *

from views import *


urlpatterns = patterns('',
    url(r'^/$', list_repo),
    url(r'^repo/list/$', list_repo),
    url(r'^repo/(?P<repo_id>[^/]+)/$', get_repo_info),
    url(r'^dir/(?P<repo_id>[^/]+)/root/$', get_repo_dir_path),
    url(r'^dir/(?P<repo_id>[^/]+)/$', get_repo_dir_path),
    url(r'^dir/(?P<repo_id>[^/]+)/(?P<dir_id>[^/]+)/$', get_repo_dir_id),
    url(r'^file/(?P<repo_id>[^/]+)/(?P<file_id>[^/]+)/$', get_repo_file_id),
)

