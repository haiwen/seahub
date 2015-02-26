from django.conf.urls.defaults import *
from django.conf import settings
# from django.views.generic.simple import direct_to_template
from django.views.generic import TemplateView

from seahub.views import *
from seahub.views.file import view_repo_file, view_history_file, view_trash_file,\
    view_snapshot_file, file_edit, view_shared_file, view_file_via_shared_dir,\
    text_diff, view_priv_shared_file, view_raw_file, view_raw_shared_file, \
    download_file, view_lib_file
from seahub.views.repo import repo, repo_history_view, view_shared_dir, \
    view_shared_upload_link
from notifications.views import notification_list
from group.views import group_list
from message.views import user_msg_list, user_msg_remove, user_received_msg_remove
from share.views import user_share_list, gen_private_file_share, \
    rm_private_file_share, save_private_file_share
from seahub.views.wiki import personal_wiki, personal_wiki_pages, \
    personal_wiki_create, personal_wiki_page_new, personal_wiki_page_edit, \
    personal_wiki_page_delete, personal_wiki_use_lib
from seahub.views.sysadmin import *
from seahub.views.ajax import *

# Uncomment the next two lines to enable the admin:
#from django.contrib import admin
#admin.autodiscover()

urlpatterns = patterns('',
    # Example:
    # (r'^seahub/', include('seahub.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs'
    # to INSTALLED_APPS to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    #(r'^admin/', include(admin.site.urls)),

    (r'^accounts/', include('seahub.base.registration_urls')),

    (r'^$', myhome),
    #url(r'^home/$', direct_to_template, { 'template': 'home.html' } ),
    url(r'^robots\.txt$', TemplateView.as_view(template_name='robots.txt', content_type='text/plain')),
    url(r'^home/my/$', myhome, name='myhome'),
    url(r'^home/wiki/$', personal_wiki, name='personal_wiki'),
    url(r'^home/wiki/(?P<page_name>[^/]+)/$', personal_wiki, name='personal_wiki'),
    url(r'^home/wiki_pages/$', personal_wiki_pages, name='personal_wiki_pages'),
    url(r'^home/wiki_create/$', personal_wiki_create, name='personal_wiki_create'),
    url(r'^home/wiki_use_lib/$', personal_wiki_use_lib, name='personal_wiki_use_lib'),
    url(r'^home/wiki_page_new/$', personal_wiki_page_new, name='personal_wiki_page_new'),
    url(r'^home/wiki_page_edit/(?P<page_name>[^/]+)$', personal_wiki_page_edit, name='personal_wiki_page_edit'),
    url(r'^home/wiki_page_delete/(?P<page_name>[^/]+)$', personal_wiki_page_delete, name='personal_wiki_page_delete'),

    url(r'^devices/$', devices, name='devices'),
    url(r'^home/devices/unlink/$', unlink_device, name='unlink_device'),

    # url(r'^home/public/reply/(?P<msg_id>[\d]+)/$', innerpub_msg_reply, name='innerpub_msg_reply'),
    # url(r'^home/owner/(?P<owner_name>[^/]+)/$', ownerhome, name='ownerhome'),

    (r'^repo/upload_check/$', validate_filename),
    url(r'^repo/unsetinnerpub/(?P<repo_id>[-0-9a-f]{36})/$', unsetinnerpub, name='unsetinnerpub'),
    url(r'^repo/set_password/$', repo_set_password, name="repo_set_password"),
    url(r'^repo/revert_file/(?P<repo_id>[-0-9a-f]{36})/$', repo_revert_file, name='repo_revert_file'),
    url(r'^repo/revert_dir/(?P<repo_id>[-0-9a-f]{36})/$', repo_revert_dir, name='repo_revert_dir'),
    url(r'^repo/download_dir/(?P<repo_id>[-0-9a-f]{36})/$', repo_download_dir, name='repo_download_dir'),
    (r'^repo/upload_error/(?P<repo_id>[-0-9a-f]{36})/$', upload_file_error),
    (r'^repo/update_error/(?P<repo_id>[-0-9a-f]{36})/$', update_file_error),
    url(r'^repo/file_revisions/(?P<repo_id>[-0-9a-f]{36})/$', file_revisions, name='file_revisions'),
    url(r'^repo/text_diff/(?P<repo_id>[-0-9a-f]{36})/$', text_diff, name='text_diff'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/$', repo, name='repo'),
    url(r'^repo/history/(?P<repo_id>[-0-9a-f]{36})/$', repo_history, name='repo_history'),
    (r'^repo/history/revert/(?P<repo_id>[-0-9a-f]{36})/$', repo_history_revert),
    url(r'^repo/history/view/(?P<repo_id>[-0-9a-f]{36})/$', repo_history_view, name='repo_history_view'),
    url(r'^repo/recycle/(?P<repo_id>[-0-9a-f]{36})/$', repo_recycle_view, name='repo_recycle_view'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/online_gc/$', repo_online_gc, name='repo_online_gc'),
    url(r'^repo/snapshot/view/(?P<repo_id>[-0-9a-f]{36})/$', repo_view_snapshot, name='repo_view_snapshot'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/files/$', view_repo_file, name="repo_view_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/raw/(?P<file_path>.*)$', view_raw_file, name="view_raw_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/history/files/$', view_history_file, name="view_history_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/trash/files/$', view_trash_file, name="view_trash_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/snapshot/files/$', view_snapshot_file, name="view_snapshot_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/file/edit/$', file_edit, name='file_edit'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/privshare/$', gen_private_file_share, name='gen_private_file_share'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/(?P<obj_id>[0-9a-f]{40})/$', repo_access_file, name='repo_access_file'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/(?P<obj_id>[0-9a-f]{40})/download/$', download_file, name='download_file'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/settings/$', repo_settings, name='repo_settings'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/basic_info/$', repo_change_basic_info, name='repo_change_basic_info'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/owner/$', repo_transfer_owner, name='repo_transfer_owner'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/passwd/$', repo_change_passwd, name='repo_change_passwd'),

    ### lib (replace the old `repo` urls) ###
    # url(r'^lib/(?P<repo_id>[-0-9a-f]{36})/dir/(?P<path>.*)$', view_lib_dir, name='view_lib_dir'),
    url(r'^lib/(?P<repo_id>[-0-9a-f]{36})/file/(?P<path>.*)$', view_lib_file, name='view_lib_file'),
    # url(r'^home/my/lib/(?P<repo_id>[-0-9a-f]{36})/dir/(?P<path>.*)$', myhome_lib, name='myhome_lib'),

    ### share file/dir, upload link ###
    url(r'^s/f/(?P<token>[a-f0-9]{10})/$', view_priv_shared_file, name="view_priv_shared_file"),
    url(r'^s/f/(?P<token>[a-f0-9]{10})/rm/$', rm_private_file_share, name="rm_private_file_share"),
    url(r'^s/f/(?P<token>[a-f0-9]{10})/save/$', save_private_file_share, name='save_private_file_share'),
    url(r'^f/(?P<token>[a-f0-9]{10})/$', view_shared_file, name='view_shared_file'),
    url(r'^f/(?P<token>[a-f0-9]{10})/raw/(?P<obj_id>[0-9a-f]{40})/(?P<file_name>.*)', view_raw_shared_file, name='view_raw_shared_file'),
    url(r'^d/(?P<token>[a-f0-9]{10})/$', view_shared_dir, name='view_shared_dir'),
    url(r'^d/(?P<token>[a-f0-9]{10})/files/$', view_file_via_shared_dir, name='view_file_via_shared_dir'),
    url(r'^u/d/(?P<token>[a-f0-9]{10})/$', view_shared_upload_link, name='view_shared_upload_link'),

    ### Misc ###
    url(r'^image-view/(?P<filename>.*)$', image_view, name='image_view'),
   (r'^file_upload_progress_page/$', file_upload_progress_page),
    url(r'^activities/$', activities, name='activities'),
    url(r'^starred/$', starred, name='starred'),
    (r'^pdf_full_view/$', pdf_full_view),
    url(r'^i18n/$', i18n, name='i18n'),
    url(r'^convert_cmmt_desc_link/$', convert_cmmt_desc_link, name='convert_cmmt_desc_link'),
    url(r'^user/(?P<id_or_email>[^/]+)/msgs/$', user_msg_list, name='user_msg_list'),
    url(r'^user/(?P<msg_id>\d+)/msgdel/$', user_msg_remove, name='user_msg_remove'),
    url(r'^user/(?P<msg_id>\d+)/remsgdel/$', user_received_msg_remove, name='user_received_msg_remove'),
    url(r'^user/(?P<id_or_email>[^/]+)/shares/$', user_share_list, name='user_share_list'),
    url(r'^modules/toggle/$', toggle_modules, name="toggle_modules"),
    url(r'^download_client_program/$', TemplateView.as_view(template_name="download.html"), name="download_client"),
    url(r'^choose_register/$', TemplateView.as_view(template_name="choose_register.html"), name="choose_register"),

    ### Ajax ###
    url(r'^ajax/repo/create/$', repo_create, name="repo_create"),
    (r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/remove/$', repo_remove),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dirents/$', get_dirents, name="get_dirents"),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dirents/delete/$', delete_dirents, name='delete_dirents'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dirents/move/$', mv_dirents, name='mv_dirents'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dirents/copy/$', cp_dirents, name='cp_dirents'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dir/$', list_dir, name='repo_dir_data'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dir/more/$', list_dir_more, name='list_dir_more'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dir/new/$', new_dir, name='new_dir'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dir/rename/$', rename_dirent, name='rename_dir'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dir/delete/$', delete_dirent, name='delete_dir'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dir/mv/$', mv_dir, name='mv_dir'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dir/cp/$', cp_dir, name='cp_dir'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dir/sub_repo/$', sub_repo, name='sub_repo'),
    url(r'^ajax/cp_progress/$', get_cp_progress, name='get_cp_progress'),
    url(r'^ajax/cancel_cp/$', cancel_cp, name='cancel_cp'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/new/$', new_file, name='new_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/rename/$', rename_dirent, name='rename_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/delete/$', delete_dirent, name='delete_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/mv/$', mv_file, name='mv_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/cp/$', cp_file, name='cp_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/star/$', repo_star_file, name='repo_star_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/unstar/$', repo_unstar_file, name='repo_unstar_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/current_commit/$', get_current_commit, name='get_current_commit'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/history/changes/$', repo_history_changes, name='repo_history_changes'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/encrypted_file/(?P<file_id>[0-9a-f]{40})/download/$', download_enc_file, name='download_enc_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file_op_url/$', get_file_op_url, name='get_file_op_url'),
    url(r'^ajax/u/d/(?P<token>[-0-9a-f]{10})/upload/$', get_file_upload_url_ul, name='get_file_upload_url_ul'),
    url(r'^ajax/group/(?P<group_id>\d+)/repos/$', get_unenc_group_repos, name='get_group_repos'),
    url(r'^ajax/my-unenc-repos/$', get_my_unenc_repos, name='get_my_unenc_repos'),
    url(r'^ajax/unenc-rw-repos/$', unenc_rw_repos, name='unenc_rw_repos'),
    url(r'^ajax/contacts/$', get_contacts, name='get_contacts'),
    url(r'^ajax/groups/$', get_groups, name='get_groups'),
    url(r'^ajax/upload-file-done/$', upload_file_done, name='upload_file_done'),
    url(r'^ajax/unseen-notices-count/$', unseen_notices_count, name='unseen_notices_count'),
    url(r'^ajax/get_popup_notices/$', get_popup_notices, name='get_popup_notices'),
    url(r'^ajax/set_notices_seen/$', set_notices_seen, name='set_notices_seen'),
    url(r'^ajax/set_notice_seen_by_id/$', set_notice_seen_by_id, name='set_notice_seen_by_id'),
    url(r'^ajax/space_and_traffic/$', space_and_traffic, name='space_and_traffic'),
    url(r'^ajax/my-shared-and-group-repos/$', my_shared_and_group_repos, name='my_shared_and_group_repos'),
    url(r'^ajax/events/$', events, name="events"),
    url(r'^_templates/(?P<template>.*)$', underscore_template, name="underscore_template"),

    ## ajax lib
    url(r'^ajax/lib/(?P<repo_id>[-0-9a-f]{36})/dir/$', list_lib_dir, name="list_lib_dir"),

    ### Organizaion ###
    url(r'^pubinfo/libraries/$', pubrepo, name='pubrepo'),
    url(r'^ajax/publicrepo/create/$', public_repo_create, name='public_repo_create'),
    url(r'^pubinfo/groups/$', pubgrp, name='pubgrp'),
    url(r'^pubinfo/users/$', pubuser, name='pubuser'),

    ### Apps ###
    (r'^api2/', include('seahub.api2.urls')),
    (r'^avatar/', include('seahub.avatar.urls')),
    (r'^notification/', include('seahub.notifications.urls')),
    (r'^contacts/', include('seahub.contacts.urls')),
    (r'^group/', include('seahub.group.urls')),
    url(r'^groups/', group_list, name='group_list'),
    (r'^message/', include('seahub.message.urls')),
    (r'^options/', include('seahub.options.urls')),
    (r'^profile/', include('seahub.profile.urls')),
    (r'^share/', include('seahub.share.urls')),
    (r'^help/', include('seahub.help.urls')),
    url(r'^captcha/', include('captcha.urls')),
    (r'^thumbnail/', include('seahub.thumbnail.urls')),

    ### system admin ###
    url(r'^sys/seafadmin/$', sys_repo_admin, name='sys_repo_admin'),
    url(r'^sys/seafadmin/orphan/$', sys_list_orphan, name='sys_list_orphan'),
    url(r'^sys/seafadmin/system/$', sys_list_system, name='sys_list_system'),
    url(r'^sys/seafadmin/search/$', sys_repo_search, name='sys_repo_search'),
    url(r'^sys/seafadmin/transfer/$', sys_repo_transfer, name='sys_repo_transfer'),
    url(r'^sys/useradmin/$', sys_user_admin, name='sys_useradmin'),
    url(r'^sys/useradmin/ldap/$', sys_user_admin_ldap, name='sys_useradmin_ldap'),
    url(r'^sys/useradmin/admins/$', sys_user_admin_admins, name='sys_useradmin_admins'),
    url(r'^sys/groupadmin/$', sys_group_admin, name='sys_group_admin'),
    url(r'^sys/orgadmin/$', sys_org_admin, name='sys_org_admin'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/set_quota/$', sys_org_set_quota, name='sys_org_set_quota'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/rename/$', sys_org_rename, name='sys_org_rename'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/set_member_quota/$', sys_org_set_member_quota, name='sys_org_set_member_quota'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/user/$', sys_org_info_user, name='sys_org_info_user'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/group/$', sys_org_info_group, name='sys_org_info_group'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/library/$', sys_org_info_library, name='sys_org_info_library'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/setting/$', sys_org_info_setting, name='sys_org_info_setting'),
    url(r'^sys/publinkadmin/$', sys_publink_admin, name='sys_publink_admin'),
    url(r'^sys/notificationadmin/', notification_list, name='notification_list'),
    url(r'^useradmin/add/$', user_add, name="user_add"),
    url(r'^useradmin/remove/(?P<user_id>[^/]+)/$', user_remove, name="user_remove"),
    url(r'^useradmin/removetrial/(?P<user_or_org>[^/]+)/$', remove_trial, name="remove_trial"),
    url(r'^useradmin/search/$', user_search, name="user_search"),
    url(r'^useradmin/makeadmin/(?P<user_id>[^/]+)/$', user_make_admin, name='user_make_admin'),
    url(r'^useradmin/removeadmin/(?P<user_id>[^/]+)/$', user_remove_admin, name='user_remove_admin'),
    url(r'^useradmin/info/(?P<email>[^/]+)/$', user_info, name='user_info'),
    url(r'^useradmin/activate/(?P<user_id>[^/]+)/$', user_activate, name='user_activate'),
    url(r'^useradmin/deactivate/(?P<user_id>[^/]+)/$', user_deactivate, name='user_deactivate'),
    url(r'^useradmin/toggle_status/(?P<email>[^/]+)/$', user_toggle_status, name='user_toggle_status'),
    url(r'^useradmin/toggle_role/(?P<email>[^/]+)/$', user_toggle_role, name='user_toggle_role'),
    url(r'^useradmin/(?P<email>[^/]+)/set_quota/$', user_set_quota, name='user_set_quota'),

    url(r'^useradmin/password/reset/(?P<user_id>[^/]+)/$', user_reset, name='user_reset'),

    url(r'^useradmin/batchmakeadmin/$', batch_user_make_admin, name='batch_user_make_admin'),
    url(r'^useradmin/batchadduser/$', batch_add_user, name='batch_add_user'),
)

if settings.SERVE_STATIC:
    media_url = settings.MEDIA_URL.strip('/')
    urlpatterns += patterns('',
        (r'^%s/(?P<path>.*)$' % (media_url), 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}),
    )

if getattr(settings, 'CLOUD_MODE', False):
    urlpatterns += patterns('',
        (r'^demo/', demo),
    )

from seahub.utils import HAS_FILE_SEARCH
if HAS_FILE_SEARCH:
    from seahub_extra.search.views import search, pubuser_search, pubgrp_search
    urlpatterns += patterns('',
        url(r'^search/$', search, name='search'),
        url(r'^pubinfo/users/search/$', pubuser_search, name='pubuser_search'),
        url(r'^pubinfo/groups/search/$', pubgrp_search, name='pubgrp_search'),
    )

if getattr(settings, 'ENABLE_PAYMENT', False):
    urlpatterns += patterns('',
        (r'^pay/', include('seahub_extra.pay.urls')),
    )


if getattr(settings, 'ENABLE_SYSADMIN_EXTRA', False):
    from seahub_extra.sysadmin_extra.views import sys_login_admin
    urlpatterns += patterns('',
        url(r'^sys/loginadmin/', sys_login_admin, name='sys_login_admin'),
    )

if getattr(settings, 'MULTI_TENANCY', False):
    urlpatterns += patterns('',
        (r'^org/', include('seahub_extra.organizations.urls')),
    )

# serve office converter static files
from seahub.utils import HAS_OFFICE_CONVERTER, CLUSTER_MODE, OFFICE_CONVERTOR_NODE
if HAS_OFFICE_CONVERTER:
    from seahub.views.file import office_convert_query_status, office_convert_query_page_num, \
        office_convert_add_task, office_convert_get_page
    urlpatterns += patterns('',
        url(r'^office-convert/static/(?P<path>.*)$', office_convert_get_page, name='office_convert_get_page'),
        url(r'^office-convert/status/$', office_convert_query_status, name='office_convert_query_status'),
        url(r'^office-convert/page-num/$', office_convert_query_page_num, name='office_convert_query_page_num'),
    )

    if CLUSTER_MODE and OFFICE_CONVERTOR_NODE:
        urlpatterns += patterns('',
            url(r'^office-convert/internal/add-task/$', office_convert_add_task),
            url(r'^office-convert/internal/status/$', office_convert_query_status, {'internal': True}),
            url(r'^office-convert/internal/page-num/$', office_convert_query_page_num, {'internal': True}),
            url(r'^office-convert/internal/static/(?P<path>.*)$', office_convert_get_page, {'internal': True}),
        )

if TRAFFIC_STATS_ENABLED:
    from seahub.views.sysadmin import sys_traffic_admin
    urlpatterns += patterns('',
        url(r'^sys/trafficadmin/$', sys_traffic_admin, name='sys_trafficadmin'),
    )

js_info_dict = {
    'packages': ('seahub.settings',),
}

urlpatterns += patterns('',
    (r'^jsi18n/$', 'seahub.views.i18n.cached_javascript_catalog', js_info_dict),
)
