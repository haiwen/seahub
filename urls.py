from django.conf.urls.defaults import *
from django.conf import settings
from django.views.generic.simple import direct_to_template

from seahub.views import root, peers, myhome, \
    repo, repo_history, modify_token, remove_repo, sys_seafadmin, sys_useradmin, \
    org_seafadmin, org_useradmin, org_group_admin, org_remove, \
    activate_user, user_add, user_remove, sys_group_admin, sys_org_admin, \
    ownerhome, repo_history_revert, \
    user_info, repo_set_access_property, repo_access_file, \
    repo_remove_share, repo_download, org_info, repo_view_file, \
    seafile_access_check, back_local, repo_history_changes, \
    repo_upload_file, file_upload_progress, file_upload_progress_page, get_subdir, file_move, \
    repo_new_dir, repo_rename_file, validate_filename, \
    repo_create
from seahub.notifications.views import notification_list
from seahub.share.views import share_admin
from seahub.group.views import group_list

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
    url(r'^home/owner/(?P<owner_name>[^/]+)/$', ownerhome, name='ownerhome'),

    (r'^share/', include('share.urls')),
    url(r'^shareadmin/$', share_admin, name='share_admin'),
    (r'^shareadmin/removeshare/$', repo_remove_share),

    (r'^file_upload_progress/$', file_upload_progress),
    (r'^file_upload_progress_page/$', file_upload_progress_page),
    (r'^repo/new_dir/$', repo_new_dir),
    (r'^repo/create/$', repo_create),
    (r'^repo/upload_check/$', validate_filename),
    (r'^repo/file_rename/$', repo_rename_file),
    url(r'^repo/upload_file/(?P<repo_id>[^/]+)/$', repo_upload_file, name='repo_upload_file'),
    url(r'^repo/(?P<repo_id>[^/]+)/$', repo, name='repo'),
    (r'^repo/history/(?P<repo_id>[^/]+)/$', repo_history),
    (r'^repo/history/revert/(?P<repo_id>[^/]+)/$', repo_history_revert),
#    (r'^repo/token/modify/(?P<repo_id>[^/]+)/$', modify_token),
    (r'^repo/history/changes/(?P<repo_id>[^/]+)/$', repo_history_changes),
    (r'^repo/remove/(?P<repo_id>[^/]+)/$', remove_repo),
#    (r'^repo/removefetched/(?P<user_id>[^/]+)/(?P<repo_id>[^/]+)/$', remove_fetched_repo),
#    (r'^repo/setap/(?P<repo_id>[^/]+)/$', repo_set_access_property),
    (r'^repo/(?P<repo_id>[^/]+)/(?P<obj_id>[^/]+)/$', repo_access_file),
    (r'^repo/(?P<repo_id>[^/]+)/view/(?P<obj_id>[^/]+)/$', repo_view_file),
                       
    (r'^download/repo/$', repo_download),                       
    (r'^file/move/get_subdir/$', get_subdir),                       
    (r'^file/move/$', file_move),                       
    (r'^seafile_access_check/$', seafile_access_check),                       
    url(r'^org/remove/(?P<org_id>[\d]+)/$', org_remove, name="org_remove"),
    (r'^org/$', org_info),                       
    (r'^back/local/$', back_local),

    (r'^useradmin/add/$', user_add),
    (r'^useradmin/remove/(?P<user_id>[^/]+)/$', user_remove),
    (r'^useradmin/info/(?P<email>[^/]+)/$', user_info),
    (r'^useradmin/activate/(?P<user_id>[^/]+)/$', activate_user),
                       
    ### Apps ###                       
    (r'^avatar/', include('avatar.urls')),
    (r'^notification/', include('notifications.urls')),
    url(r'^sys/notificationadmin/', notification_list, name='notification_list'),
    (r'^contacts/', include('contacts.urls')),                       
    (r'^group/', include('seahub.group.urls')),
    url(r'^groups/', group_list, name='group_list'),
    (r'^profile/', include('seahub.profile.urls')),

    ### SeaHub admin ###                       
    (r'^sys/seafadmin/$', sys_seafadmin),
    url(r'^sys/useradmin/$', sys_useradmin, name='sys_useradmin'),
    url(r'^sys/orgadmin/$', sys_org_admin, name='sys_org_admin'),
    url(r'^sys/groupadmin/$', sys_group_admin, name='sys_group_admin'),

    ### Org admin ###                       
    (r'^seafadmin/$', org_seafadmin),
    url(r'^useradmin/$', org_useradmin, name='org_useradmin'),
    url(r'^groupadmin/$', org_group_admin, name='org_group_admin'),
)

if settings.DEBUG:
    media_url = settings.MEDIA_URL.strip('/')
    urlpatterns += patterns('',
        (r'^%s/(?P<path>.*)$' % (media_url), 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}),
    )
