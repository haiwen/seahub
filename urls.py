from django.conf.urls.defaults import *
from django.conf import settings
from django.views.generic.simple import direct_to_template

from seahub.views import *
from notifications.views import notification_list
from share.views import share_admin
from group.views import group_list, dept_group_list, proj_group_list

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
    url(r'^home/public/$', public_home, name='public_home'),
    url(r'^home/public/reply/(?P<msg_id>[\d]+)/$', innerpub_msg_reply, name='innerpub_msg_reply'),
    url(r'^home/public/reply/new/$', innerpub_msg_reply_new, name='innerpub_msg_reply_new'),
    url(r'^home/owner/(?P<owner_name>[^/]+)/$', ownerhome, name='ownerhome'),

    (r'^share/', include('share.urls')),
    (r'^api/', include('api.urls')),
    url(r'^shareadmin/$', share_admin, name='share_admin'),
    (r'^shareadmin/removeshare/$', repo_remove_share),
    (r'^sharedlink/get/$', get_shared_link),
    (r'^sharedlink/remove/$', remove_shared_link),
    (r'^sharedlink/send/$', send_shared_link),
    url(r'^f/(?P<token>[^/]+)/$', view_shared_file, name='view_shared_file'),
                       
    (r'^file_upload_progress_page/$', file_upload_progress_page),
    (r'^repo/new_dir/$', repo_new_dir),
    (r'^repo/new_file/$', repo_new_file),
    (r'^repo/create/$', repo_create),
    (r'^publicrepo/create/$', public_repo_create),
    (r'^repo/upload_check/$', validate_filename),
    (r'^repo/file_rename/$', repo_rename_file),
    (r'^repo/unsetinnerpub/(?P<repo_id>[^/]+)/$', unset_inner_pub_repo),
    url(r'^repo/revert_file/(?P<repo_id>[^/]+)/$', repo_revert_file, name='repo_revert_file'),
    url(r'^repo/upload_file/(?P<repo_id>[^/]+)/$', repo_upload_file, name='repo_upload_file'),
    url(r'^repo/update_file/(?P<repo_id>[^/]+)/$', repo_update_file, name='repo_update_file'),
    (r'^repo/upload_error/(?P<repo_id>[^/]+)/$', upload_file_error),
    (r'^repo/update_error/(?P<repo_id>[^/]+)/$', update_file_error),
    url(r'^repo/file_revisions/(?P<repo_id>[^/]+)/$', file_revisions, name='file_revisions'),
    url(r'^repo/(?P<repo_id>[^/]+)/$', RepoView.as_view(), name='repo'),
    (r'^repo/history/(?P<repo_id>[^/]+)/$', repo_history),
    (r'^repo/history/revert/(?P<repo_id>[^/]+)/$', repo_history_revert),
    url(r'^repo/history/view/(?P<repo_id>[^/]+)/$', RepoHistoryView.as_view(), name='repo_history_view'),
#    (r'^repo/token/modify/(?P<repo_id>[^/]+)/$', modify_token),
    (r'^repo/history/changes/(?P<repo_id>[^/]+)/$', repo_history_changes),
    (r'^repo/remove/(?P<repo_id>[^/]+)/$', remove_repo),
#    (r'^repo/removefetched/(?P<user_id>[^/]+)/(?P<repo_id>[^/]+)/$', remove_fetched_repo),
#    (r'^repo/setap/(?P<repo_id>[^/]+)/$', repo_set_access_property),
    url(r'^repo/(?P<repo_id>[^/]+)/files/$', repo_view_file, name="repo_view_file"),
    (r'^repo/(?P<repo_id>[^/]+)/file/edit/$', repo_file_edit),
    (r'^pdf_full_view/$', pdf_full_view),
    url(r'^repo/(?P<repo_id>[^/]+)/(?P<obj_id>[^/]+)/$', repo_access_file, name='repo_access_file'),

    (r'^download/repo/$', repo_download),                       
    (r'^file/move/get_subdir/$', get_subdir),                       
    (r'^file/move/$', file_move),
    (r'^seafile_access_check/$', seafile_access_check),                       
    url(r'^org/remove/(?P<org_id>[\d]+)/$', org_remove, name="org_remove"),
    # (r'^org/$', org_info),

    (r'^useradmin/add/$', user_add),
    (r'^useradmin/remove/(?P<user_id>[^/]+)/$', user_remove),
    (r'^useradmin/info/(?P<email>[^/]+)/$', user_info),
    (r'^useradmin/activate/(?P<user_id>[^/]+)/$', activate_user),
    (r'^useradmin/password/reset/(?P<user_id>[^/]+)/$', user_reset),

    ### Apps ###                       
    (r'^avatar/', include('avatar.urls')),
    (r'^notification/', include('notifications.urls')),
    url(r'^sys/notificationadmin/', notification_list, name='notification_list'),
    (r'^contacts/', include('contacts.urls')),                       
    (r'^group/', include('seahub.group.urls')),
    url(r'^groups/', group_list, name='group_list'),
    url(r'^deptgroups/', dept_group_list, name='dept_group_list'),
    url(r'^projgroups/', proj_group_list, name='proj_group_list'),
    (r'^organizations/', include('seahub.organizations.urls')),
    (r'^profile/', include('seahub.profile.urls')),

    ### SeaHub admin ###                       
    (r'^sys/seafadmin/$', sys_seafadmin),
    url(r'^sys/useradmin/$', sys_useradmin, name='sys_useradmin'),
    url(r'^sys/orgadmin/$', sys_org_admin, name='sys_org_admin'),
    url(r'^sys/groupadmin/$', sys_group_admin, name='sys_group_admin'),

)

if settings.DEBUG:
    media_url = settings.MEDIA_URL.strip('/')
    urlpatterns += patterns('',
        (r'^%s/(?P<path>.*)$' % (media_url), 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}),
    )

