from django.conf.urls import patterns, url, include

from views import query_table, query_data, getcolumns

urlpatterns = patterns('',
    url(r'^(?P<repo_id>[-0-9a-f]{36})/query_table/(?P<path>.*)$', query_table, name='query_table'),
    url(r'^(?P<repo_id>[-0-9a-f]{36})/query_data/(?P<table>.*?)/(?P<path>.*)$', query_data, name='query_data'),
    url(r'^(?P<repo_id>[-0-9a-f]{36})/columns/(?P<table>.*?)/(?P<path>.*)$', getcolumns, name='getcolumns'),
)