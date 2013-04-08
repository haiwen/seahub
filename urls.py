from django.conf.urls.defaults import *
from django.conf import settings
from django.views.generic.simple import direct_to_template

from seahub.views import *
from seahub.views.file import view_file, view_history_file, view_trash_file,\
    view_snapshot_file, file_edit
from seahub.views.repo import RepoView, RepoHistoryView
from seahub.views.search import search
from notifications.views import notification_list
from group.views import group_list
from seahub.views.wiki import personal_wiki, personal_wiki_pages, \
    personal_wiki_create, personal_wiki_page_new, personal_wiki_page_edit, \
    personal_wiki_page_delete

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

    (r'^accounts/', include('base.registration_urls')),

    (r'^$', root),
    #url(r'^home/$', direct_to_template, { 'template': 'home.html' } ),
    url(r'^home/my/$', myhome, name='myhome'),
    url(r'^home/wiki/$', personal_wiki, name='personal_wiki'),
    url(r'^home/wiki/(?P<page_name>[^/]+)/$', personal_wiki, name='personal_wiki'),
    url(r'^home/wiki_pages/$', personal_wiki_pages, name='personal_wiki_pages'),
    url(r'^home/wiki_create/$', personal_wiki_create, name='personal_wiki_create'),
    url(r'^home/wiki_page_new/$', personal_wiki_page_new, name='personal_wiki_page_new'),
    url(r'^home/wiki_page_edit/(?P<page_name>[^/]+)$', personal_wiki_page_edit, name='personal_wiki_page_edit'),
    url(r'^home/wiki_page_delete/(?P<page_name>[^/]+)$', personal_wiki_page_delete, name='personal_wiki_page_delete'),

    url(r'^home/public/reply/(?P<msg_id>[\d]+)/$', innerpub_msg_reply, name='innerpub_msg_reply'),
    url(r'^home/owner/(?P<owner_name>[^/]+)/$', ownerhome, name='ownerhome'),

    (r'^repo/new_dir/$', repo_new_dir),
    (r'^repo/new_file/$', repo_new_file),
    (r'^repo/create/$', repo_create),
    (r'^repo/upload_check/$', validate_filename),
    (r'^repo/file_rename/$', repo_rename_file),
    url(r'^repo/unsetinnerpub/(?P<repo_id>[-0-9a-f]{36})/$', unsetinnerpub, name='unsetinnerpub'),
    url(r'^repo/set_password/$', repo_set_password, name="repo_set_password"),
    url(r'^repo/revert_file/(?P<repo_id>[-0-9a-f]{36})/$', repo_revert_file, name='repo_revert_file'),
    url(r'^repo/revert_dir/(?P<repo_id>[-0-9a-f]{36})/$', repo_revert_dir, name='repo_revert_dir'),
    url(r'^repo/star_file/(?P<repo_id>[-0-9a-f]{36})/$', repo_star_file, name='repo_star_file'),
    url(r'^repo/download_dir/(?P<repo_id>[-0-9a-f]{36})/$', repo_download_dir, name='repo_download_dir'),
    (r'^repo/upload_error/(?P<repo_id>[-0-9a-f]{36})/$', upload_file_error),
    (r'^repo/update_error/(?P<repo_id>[-0-9a-f]{36})/$', update_file_error),
    url(r'^repo/file_revisions/(?P<repo_id>[-0-9a-f]{36})/$', file_revisions, name='file_revisions'),
    url(r'^repo/text_diff/(?P<repo_id>[-0-9a-f]{36})/$', text_diff, name='text_diff'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/$', RepoView.as_view(), name='repo'),
    url(r'^repo/history/(?P<repo_id>[-0-9a-f]{36})/$', repo_history, name='repo_history'),
    (r'^repo/history/revert/(?P<repo_id>[-0-9a-f]{36})/$', repo_history_revert),
    url(r'^repo/history/view/(?P<repo_id>[-0-9a-f]{36})/$', RepoHistoryView.as_view(), name='repo_history_view'),
    url(r'^repo/recycle/(?P<repo_id>[-0-9a-f]{36})/$', repo_recycle_view, name='repo_recycle_view'),
    url(r'^repo/snapshot/view/(?P<repo_id>[-0-9a-f]{36})/$', repo_view_snapshot, name='repo_view_snapshot'),
    url(r'^repo/history/changes/(?P<repo_id>[-0-9a-f]{36})/$', repo_history_changes, name='repo_history_changes'),
    (r'^repo/remove/(?P<repo_id>[-0-9a-f]{36})/$', repo_remove),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/files/$', view_file, name="repo_view_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/history/files/$', view_history_file, name="view_history_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/trash/files/$', view_trash_file, name="view_trash_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/snapshot/files/$', view_snapshot_file, name="view_snapshot_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/file/edit/$', file_edit, name='file_edit'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/(?P<obj_id>[^/]+)/$', repo_access_file, name='repo_access_file'),
    (r'^repo/save_settings$', repo_save_settings),

    url(r'^f/(?P<token>[a-f0-9]{10})/$', view_shared_file, name='view_shared_file'),
    url(r'^d/(?P<token>[a-f0-9]{10})/$', view_shared_dir, name='view_shared_dir'),
    url(r'^d/(?P<token>[a-f0-9]{10})/files/$', view_file_via_shared_dir, name='view_file_via_shared_dir'),
    (r'^file_upload_progress_page/$', file_upload_progress_page),
    (r'^events/$', events),
    (r'^pdf_full_view/$', pdf_full_view),
    url(r'^i18n/$', i18n, name='i18n'),
    (r'^download/repo/$', repo_download),                       
    (r'^file/move/get_subdir/$', get_subdir),                       
    (r'^file/move/$', file_move),
    (r'^seafile_access_check/$', seafile_access_check),                       
    url(r'^org/remove/(?P<org_id>[\d]+)/$', org_remove, name="org_remove"),

    (r'^useradmin/add/$', user_add),
    (r'^useradmin/remove/(?P<user_id>[^/]+)/$', user_remove),
    url(r'^useradmin/makeadmin/(?P<user_id>[^/]+)/$', user_make_admin, name='user_make_admin'),
    url(r'^useradmin/removeadmin/(?P<user_id>[^/]+)/$', user_remove_admin, name='user_remove_admin'),
    (r'^useradmin/info/(?P<email>[^/]+)/$', user_info),
    (r'^useradmin/activate/(?P<user_id>[^/]+)/$', activate_user),
    url(r'^useradmin/password/reset/(?P<user_id>[^/]+)/$', user_reset, name='user_reset'),

    ### Apps ###
    (r'^api2/', include('api2.urls')),
    (r'^avatar/', include('avatar.urls')),
    (r'^notification/', include('notifications.urls')),
    url(r'^sys/notificationadmin/', notification_list, name='notification_list'),
    (r'^contacts/', include('contacts.urls')),                       
    (r'^group/', include('seahub.group.urls')),
    url(r'^groups/', group_list, name='group_list'),
    (r'^profile/', include('seahub.profile.urls')),
    (r'^share/', include('share.urls')),

    ### system admin ###                       
    (r'^sys/seafadmin/$', sys_seafadmin),
    url(r'^sys/useradmin/$', sys_useradmin, name='sys_useradmin'),
    url(r'^sys/orgadmin/$', sys_org_admin, name='sys_org_admin'),
    url(r'^sys/groupadmin/$', sys_group_admin, name='sys_group_admin'),

)

if settings.SERVE_STATIC:
    media_url = settings.MEDIA_URL.strip('/')
    urlpatterns += patterns('',
        (r'^%s/(?P<path>.*)$' % (media_url), 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}),
    )

try:
    from settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False
if CLOUD_MODE:
    urlpatterns += patterns('',
        # (r'^organizations/', include('seahub.organizations.urls')),
        (r'^demo/', demo),
    )
else:
    urlpatterns += patterns('',
        url(r'^pubinfo/libraries/$', pubrepo, name='pubrepo'),
        (r'^publicrepo/create/$', public_repo_create),
        url(r'^pubinfo/groups/$', pubgrp, name='pubgrp'),
        url(r'^pubinfo/users/$', pubuser, name='pubuser'),
    )

if getattr(settings, 'ENABLE_FILE_SEARCH', False):
    urlpatterns += patterns('',
        url(r'^search/$', search, name='search'),
    )
