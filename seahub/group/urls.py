# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from views import group_wiki, group_wiki_create, \
    group_wiki_page_new, group_wiki_page_edit, group_wiki_pages, \
    group_wiki_page_delete, group_wiki_use_lib, group_remove

urlpatterns = [
    url(r'^(?P<group_id>\d+)/wiki/$', group_wiki, name='group_wiki'),
    url(r'^(?P<group_id>\d+)/wiki/(?P<page_name>[^/]+)$', group_wiki, name='group_wiki'),
    url(r'^(?P<group_id>\d+)/wiki_pages/$', group_wiki_pages, name='group_wiki_pages'),
    url(r'^(?P<group_id>\d+)/wiki_create/$', group_wiki_create, name='group_wiki_create'),
    url(r'^(?P<group_id>\d+)/wiki_use_lib/$', group_wiki_use_lib, name='group_wiki_use_lib'),
    url(r'^(?P<group_id>\d+)/wiki_page_new/$', group_wiki_page_new, name='group_wiki_page_new'),
    url(r'^(?P<group_id>\d+)/wiki_page_edit/(?P<page_name>[^/]+)$', group_wiki_page_edit, name='group_wiki_page_edit'),
    url(r'^(?P<group_id>\d+)/wiki_page_delete/(?P<page_name>[^/]+)$', group_wiki_page_delete, name='group_wiki_page_delete'),
    url(r'^(?P<group_id>\d+)/remove/$', group_remove, name='group_remove'),
]
