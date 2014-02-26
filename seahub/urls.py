from django.conf.urls.defaults import *
from django.conf import settings
# from django.views.generic.simple import direct_to_template
from django.views.generic import TemplateView

from seahub.views import *
from seahub.views.file import view_file, view_history_file, view_trash_file,\
    view_snapshot_file, file_edit, view_shared_file, view_file_via_shared_dir,\
    text_diff, view_priv_shared_file
from seahub.views.repo import repo, repo_history_view
from notifications.views import notification_list
from group.views import group_list
from message.views import user_msg_list
from share.views import user_share_list, gen_private_file_share, \
    rm_private_file_share, save_private_file_share
from seahub.views.wiki import personal_wiki, personal_wiki_pages, \
    personal_wiki_create, personal_wiki_page_new, personal_wiki_page_edit, \
    personal_wiki_page_delete, personal_wiki_use_lib
from seahub.views.sysadmin import sys_repo_admin, sys_user_admin, user_search,\
    sys_group_admin, user_info, user_add, user_remove, user_make_admin, \
    user_remove_admin, user_reset, user_activate, sys_publink_admin, \
    sys_repo_search, sys_repo_transfer, sys_list_orphan, user_deactivate, \
    user_toggle_status, user_set_quota, sys_ldap_user_admin, sys_list_system
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

    (r'^$', root),
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

    url(r'^home/clients/$', client_mgmt, name='client_mgmt'),
    url(r'^home/clients/unsync/$', client_unsync, name='client_unsync'),

    # url(r'^home/public/reply/(?P<msg_id>[\d]+)/$', innerpub_msg_reply, name='innerpub_msg_reply'),
    # url(r'^home/owner/(?P<owner_name>[^/]+)/$', ownerhome, name='ownerhome'),

    (r'^repo/create/$', repo_create),
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
    url(r'^repo/snapshot/view/(?P<repo_id>[-0-9a-f]{36})/$', repo_view_snapshot, name='repo_view_snapshot'),
    url(r'^repo/history/changes/(?P<repo_id>[-0-9a-f]{36})/$', repo_history_changes, name='repo_history_changes'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/files/$', view_file, name="repo_view_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/history/files/$', view_history_file, name="view_history_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/trash/files/$', view_trash_file, name="view_trash_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/snapshot/files/$', view_snapshot_file, name="view_snapshot_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/file/edit/$', file_edit, name='file_edit'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/privshare/$', gen_private_file_share, name='gen_private_file_share'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/(?P<obj_id>[0-9a-f]{40})/$', repo_access_file, name='repo_access_file'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/settings/$', repo_settings, name='repo_settings'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/owner/$', repo_owner, name='repo_owner'),

    ### share file/dir, upload link ###
    url(r'^s/f/(?P<token>[a-f0-9]{10})/$', view_priv_shared_file, name="view_priv_shared_file"),
    url(r'^s/f/(?P<token>[a-f0-9]{10})/rm/$', rm_private_file_share, name="rm_private_file_share"),
    url(r'^s/f/(?P<token>[a-f0-9]{10})/save/$', save_private_file_share, name='save_private_file_share'),
    url(r'^f/(?P<token>[a-f0-9]{10})/$', view_shared_file, name='view_shared_file'),
    url(r'^d/(?P<token>[a-f0-9]{10})/$', view_shared_dir, name='view_shared_dir'),
    url(r'^d/(?P<token>[a-f0-9]{10})/files/$', view_file_via_shared_dir, name='view_file_via_shared_dir'),
    url(r'^u/d/(?P<token>[a-f0-9]{10})/$', view_shared_upload_link, name='view_shared_upload_link'),

    ### Misc ###
    url(r'^image-view/(?P<filename>.*)$', image_view, name='image_view'),
   (r'^file_upload_progress_page/$', file_upload_progress_page),
    url(r'^activities/$', activities, name='activities'),
    url(r'^starred/$', starred, name='starred'),
    (r'^events/$', events), # ajax
    (r'^pdf_full_view/$', pdf_full_view),
    url(r'^i18n/$', i18n, name='i18n'),
    (r'^download/repo/$', repo_download),                       
    (r'^seafile_access_check/$', seafile_access_check),
    url(r'^convert_cmmt_desc_link/$', convert_cmmt_desc_link, name='convert_cmmt_desc_link'),
    url(r'^user/(?P<id_or_email>[^/]+)/msgs/$', user_msg_list, name='user_msg_list'),
    url(r'^user/(?P<id_or_email>[^/]+)/shares/$', user_share_list, name='user_share_list'),
    url(r'^modules/toggle/$', toggle_modules, name="toggle_modules"),
    url(r'^download_client_program/$', TemplateView.as_view(template_name="download.html"), name="download_client"),

    ### Ajax ###
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

    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/new/$', new_file, name='new_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/rename/$', rename_dirent, name='rename_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/delete/$', delete_dirent, name='delete_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/mv/$', mv_file, name='mv_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/cp/$', cp_file, name='cp_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/star/$', repo_star_file, name='repo_star_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/unstar/$', repo_unstar_file, name='repo_unstar_file'),

    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/current_commit/$', get_current_commit, name='get_current_commit'),

    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/encrypted_file/(?P<file_id>[0-9a-f]{40})/download/$', download_enc_file, name='download_enc_file'),
    url(r'^ajax/group/(?P<group_id>\d+)/repos/$', get_group_repos, name='get_group_repos'),
    url(r'^ajax/my-unenc-repos/$', get_my_unenc_repos, name='get_my_unenc_repos'),
    url(r'^ajax/unenc-rw-repos/$', unenc_rw_repos, name='unenc_rw_repos'),
                       
    url(r'^ajax/contacts/$', get_contacts, name='get_contacts'),
    url(r'^ajax/upload-file-done/$', upload_file_done, name='upload_file_done'),
    url(r'^ajax/unseen-notices-count/$', unseen_notices_count, name='unseen_notices_count'),
    url(r'^ajax/space_and_traffic/$', space_and_traffic, name='space_and_traffic'),

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

    ### system admin ###                       
    url(r'^sys/seafadmin/$', sys_repo_admin, name='sys_repo_admin'),
    url(r'^sys/seafadmin/orphan/$', sys_list_orphan, name='sys_list_orphan'),
    url(r'^sys/seafadmin/system/$', sys_list_system, name='sys_list_system'),
    url(r'^sys/seafadmin/search/$', sys_repo_search, name='sys_repo_search'),
    url(r'^sys/seafadmin/transfer/$', sys_repo_transfer, name='sys_repo_transfer'),
    url(r'^sys/useradmin/$', sys_user_admin, name='sys_useradmin'),
    url(r'^sys/ldapuseradmin/$', sys_ldap_user_admin, name='sys_ldap_useradmin'),
    url(r'^sys/groupadmin/$', sys_group_admin, name='sys_group_admin'),
    url(r'^sys/publinkadmin/$', sys_publink_admin, name='sys_publink_admin'),
    url(r'^sys/notificationadmin/', notification_list, name='notification_list'),
    url(r'^useradmin/add/$', user_add, name="user_add"),
    (r'^useradmin/remove/(?P<user_id>[^/]+)/$', user_remove),
    url(r'^useradmin/search/$', user_search, name="user_search"),
    url(r'^useradmin/makeadmin/(?P<user_id>[^/]+)/$', user_make_admin, name='user_make_admin'),
    url(r'^useradmin/removeadmin/(?P<user_id>[^/]+)/$', user_remove_admin, name='user_remove_admin'),
    url(r'^useradmin/info/(?P<email>[^/]+)/$', user_info, name='user_info'),
    url(r'^useradmin/activate/(?P<user_id>[^/]+)/$', user_activate, name='user_activate'),
    url(r'^useradmin/deactivate/(?P<user_id>[^/]+)/$', user_deactivate, name='user_deactivate'),
    url(r'^useradmin/toggle_status/(?P<user_id>[^/]+)/$', user_toggle_status, name='user_toggle_status'),
    url(r'^useradmin/(?P<email>[^/]+)/set_quota/$', user_set_quota, name='user_set_quota'),
                       
    url(r'^useradmin/password/reset/(?P<user_id>[^/]+)/$', user_reset, name='user_reset'),
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
else:
    urlpatterns += patterns('',
        url(r'^pubinfo/libraries/$', pubrepo, name='pubrepo'),
        (r'^publicrepo/create/$', public_repo_create),
        url(r'^pubinfo/groups/$', pubgrp, name='pubgrp'),
        url(r'^pubinfo/users/$', pubuser, name='pubuser'),
    )

from seahub.utils import HAS_FILE_SEARCH
if HAS_FILE_SEARCH:
    from seahub_extra.search.views import search, pubuser_search
    urlpatterns += patterns('',
        url(r'^search/$', search, name='search'),
        url(r'^pubinfo/users/search/$', pubuser_search, name='pubuser_search'),
    )

if getattr(settings, 'ENABLE_PAYMENT', False):
    urlpatterns += patterns('',
        (r'^pay/', include('seahub_extra.pay.urls')),
    )

# serve office converter static files
from seahub.utils import HAS_OFFICE_CONVERTER
if HAS_OFFICE_CONVERTER:
    from seahub.utils import OFFICE_HTML_DIR
    from seahub.views.file import office_convert_query_status, office_convert_query_page_num
    media_url = settings.MEDIA_URL.strip('/')
    # my.seafile.com/media/office-html/<file_id>/<css, outline, page>
    urlpatterns += patterns('',
        url(r'^office-convert/static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': OFFICE_HTML_DIR}, name='office_convert_static'),
    )
    urlpatterns += patterns('',
        url(r'^office-convert/status/$', office_convert_query_status, name='office_convert_query_status'),
        url(r'^office-convert/page-num/$', office_convert_query_page_num, name='office_convert_query_page_num'),
    )

if TRAFFIC_STATS_ENABLED:
    from seahub.views.sysadmin import sys_traffic_admin
    urlpatterns += patterns('',
        url(r'^sys/trafficadmin/$', sys_traffic_admin, name='sys_trafficadmin'),
    )