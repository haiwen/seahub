from django.conf.urls.defaults import *

from views import group_info, group_members, group_member_operations, group_add_admin, \
    group_manage, msg_reply, msg_reply_new, group_recommend, \
    create_group_repo, group_joinrequest, attention, group_message_remove, \
    group_remove_admin, group_discuss, group_wiki, group_wiki_create, \
    group_wiki_page_new, group_wiki_page_edit, group_wiki_pages, \
    group_wiki_page_delete, group_wiki_use_lib, group_remove, group_dismiss, group_quit, \
    group_make_public, group_revoke_public, group_transfer, group_toggle_modules, \
    group_add_discussion, group_rename, group_add, ajax_add_group_member

urlpatterns = patterns('',
    url(r'^(?P<group_id>\d+)/$', group_info, name='group_info'),
    url(r'^(?P<group_id>\d+)/discuss/$', group_discuss, name='group_discuss'),
    url(r'^(?P<group_id>\d+)/wiki/$', group_wiki, name='group_wiki'),
    url(r'^(?P<group_id>\d+)/wiki/(?P<page_name>[^/]+)/$', group_wiki, name='group_wiki'),
    url(r'^(?P<group_id>\d+)/wiki_pages/$', group_wiki_pages, name='group_wiki_pages'),
    url(r'^(?P<group_id>\d+)/wiki_create/$', group_wiki_create, name='group_wiki_create'),
    url(r'^(?P<group_id>\d+)/wiki_use_lib/$', group_wiki_use_lib, name='group_wiki_use_lib'),
    url(r'^(?P<group_id>\d+)/wiki_page_new/$', group_wiki_page_new, name='group_wiki_page_new'),
    url(r'^(?P<group_id>\d+)/wiki_page_edit/(?P<page_name>[^/]+)$', group_wiki_page_edit, name='group_wiki_page_edit'),
    url(r'^(?P<group_id>\d+)/wiki_page_delete/(?P<page_name>[^/]+)$', group_wiki_page_delete, name='group_wiki_page_delete'),
    url(r'^reply/(?P<msg_id>[\d]+)/$', msg_reply, name='msg_reply'),
    url(r'^reply/new/$', msg_reply_new, name='msg_reply_new'),
    url(r'^(?P<group_id>\d+)/manage/$', group_manage, name='group_manage'),
    url(r'^(?P<group_id>\d+)/remove/$', group_remove, name='group_remove'),
    url(r'^(?P<group_id>\d+)/dismiss/$', group_dismiss, name='group_dismiss'),
    url(r'^(?P<group_id>\d+)/rename/$', group_rename, name='group_rename'),
    url(r'^(?P<group_id>\d+)/transfer/$', group_transfer, name='group_transfer'),
    url(r'^(?P<group_id>\d+)/make_pub/$', group_make_public, name='group_make_pub'),
    url(r'^(?P<group_id>\d+)/revoke_pub/$', group_revoke_public, name='group_revoke_pub'),
    url(r'^(?P<group_id>\d+)/quit/$', group_quit, name='group_quit'),
    url(r'^(?P<group_id>[\d]+)/create-repo/$', create_group_repo, name='create_group_repo'),
    url(r'^(?P<group_id>[\d]+)/members/$', group_members, name='group_members'),
    (r'^(?P<group_id>[\d]+)/member/(?P<user_name>[^/]+)/$', group_member_operations),
    url(r'^(?P<group_id>\d+)/msgdel/(?P<msg_id>\d+)/$', group_message_remove, name='group_message_remove'),
    url(r'^(?P<group_id>\d+)/admin/add/$', group_add_admin, name='group_add_admin'),
    url(r'^(?P<group_id>\d+)/admin/remove/$', group_remove_admin, name='group_remove_admin'),
    url(r'^recommend/$', group_recommend, name='group_recommend'),
    #url(r'^attention/$', attention, name='group_attention'),
    url(r'^joinrequest/(?P<group_id>[\d]+)/$', group_joinrequest, name='group_joinrequest'),
    url(r'^(?P<group_id>\d+)/modules/toggle/$', group_toggle_modules, name='group_toggle_modules'),
    url(r'^(?P<group_id>\d+)/discussion/add/$', group_add_discussion, name='group_add_discussion'),
    url(r'^add/$', group_add, name='group_add'),

    url(r'^ajax/(?P<group_id>\d+)/member/add/$', ajax_add_group_member, name='group_add_member'),
)

import seahub.settings as settings

if settings.ENABLE_PUBFILE:
    from seahub_extra.pubfile.views import group_pubfiles, group_pubfile_add, group_pubfile_delete, group_pubfile_edit, group_pubfile_download

    urlpatterns += patterns('',
        url(r'^(?P<group_id>\d+)/files/$', group_pubfiles, name='group_pubfiles'),
        url(r'^(?P<group_id>\d+)/file/add/$', group_pubfile_add, name='group_pubfile_add'),
        url(r'^(?P<group_id>\d+)/file/(?P<file_id>\d+)/delete/$', group_pubfile_delete, name='group_pubfile_delete'),
        url(r'^(?P<group_id>\d+)/file/(?P<file_id>\d+)/edit/$', group_pubfile_edit, name='group_pubfile_edit'),
        url(r'^(?P<group_id>\d+)/file/d/(?P<file_name>.+)$', group_pubfile_download, name='group_pubfile_download'),
    )

