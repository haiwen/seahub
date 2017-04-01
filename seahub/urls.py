# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from django.conf.urls import patterns, url, include
# from django.views.generic.simple import direct_to_template
from django.views.generic import TemplateView

from seahub.views import *
from seahub.views.file import view_repo_file, view_history_file, view_trash_file,\
    view_snapshot_file, file_edit, view_shared_file, view_file_via_shared_dir,\
    text_diff, view_raw_file, view_raw_shared_file, \
    download_file, view_lib_file, file_access
from seahub.views.repo import repo_history_view, view_shared_dir, \
    view_shared_upload_link
from notifications.views import notification_list
from seahub.views.wiki import personal_wiki, personal_wiki_pages, \
    personal_wiki_create, personal_wiki_page_new, personal_wiki_page_edit, \
    personal_wiki_page_delete, personal_wiki_use_lib
from seahub.views.sysadmin import *
from seahub.views.ajax import *
from seahub.views.sso import *
from seahub.api2.endpoints.groups import Groups, Group
from seahub.api2.endpoints.group_members import GroupMembers, GroupMembersBulk, GroupMember
from seahub.api2.endpoints.search_group import SearchGroup
from seahub.api2.endpoints.share_links import ShareLinks, ShareLink
from seahub.api2.endpoints.shared_folders import SharedFolders
from seahub.api2.endpoints.shared_repos import SharedRepos, SharedRepo
from seahub.api2.endpoints.upload_links import UploadLinks, UploadLink
from seahub.api2.endpoints.file import FileView
from seahub.api2.endpoints.dir import DirView
from seahub.api2.endpoints.repo_set_password import RepoSetPassword
from seahub.api2.endpoints.zip_task import ZipTaskView
from seahub.api2.endpoints.share_link_zip_task import ShareLinkZipTaskView
from seahub.api2.endpoints.query_zip_progress import QueryZipProgressView
from seahub.api2.endpoints.copy_move_task import CopyMoveTaskView
from seahub.api2.endpoints.query_copy_move_progress import QueryCopyMoveProgressView
from seahub.api2.endpoints.invitations import InvitationsView
from seahub.api2.endpoints.invitation import InvitationView
from seahub.api2.endpoints.notifications import NotificationsView, NotificationView
from seahub.api2.endpoints.user_enabled_modules import UserEnabledModulesView
from seahub.api2.endpoints.repo_file_uploaded_bytes import RepoFileUploadedBytesView

from seahub.api2.endpoints.starred_items import StarredItems

from seahub.api2.endpoints.admin.login import Login
from seahub.api2.endpoints.admin.file_audit import FileAudit
from seahub.api2.endpoints.admin.file_update import FileUpdate
from seahub.api2.endpoints.admin.perm_audit import PermAudit
from seahub.api2.endpoints.admin.sysinfo import SysInfo
from seahub.api2.endpoints.admin.devices import AdminDevices
from seahub.api2.endpoints.admin.device_errors import AdminDeviceErrors
from seahub.api2.endpoints.admin.libraries import AdminLibraries, AdminLibrary
from seahub.api2.endpoints.admin.library_dirents import AdminLibraryDirents, AdminLibraryDirent
from seahub.api2.endpoints.admin.system_library import AdminSystemLibrary
from seahub.api2.endpoints.admin.default_library import AdminDefaultLibrary
from seahub.api2.endpoints.admin.trash_libraries import AdminTrashLibraries, AdminTrashLibrary
from seahub.api2.endpoints.admin.groups import AdminGroups, AdminGroup
from seahub.api2.endpoints.admin.group_libraries import AdminGroupLibraries, AdminGroupLibrary
from seahub.api2.endpoints.admin.group_members import AdminGroupMembers, AdminGroupMember
from seahub.api2.endpoints.admin.shares import AdminShares
from seahub.api2.endpoints.admin.users_batch import AdminUsersBatch
from seahub.api2.endpoints.admin.logs import AdminLogs
from seahub.api2.endpoints.admin.org_users import AdminOrgUsers, AdminOrgUser

# Uncomment the next two lines to enable the admin:
#from django.contrib import admin
#admin.autodiscover()

urlpatterns = patterns(
    '',
    # Example:
    # (r'^seahub/', include('seahub.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs'
    # to INSTALLED_APPS to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    #(r'^admin/', include(admin.site.urls)),

    (r'^accounts/', include('seahub.base.registration_urls')),
    (r'^sso/$', sso),
    url(r'^shib-login/', shib_login, name="shib_login"),

    url(r'^$', libraries, name='libraries'),
    #url(r'^home/$', direct_to_template, { 'template': 'home.html' } ),
    url(r'^robots\.txt$', TemplateView.as_view(template_name='robots.txt', content_type='text/plain')),
    url(r'^home/wiki/$', personal_wiki, name='personal_wiki'),
    url(r'^home/wiki/(?P<page_name>[^/]+)$', personal_wiki, name='personal_wiki'),
    url(r'^home/wiki_pages/$', personal_wiki_pages, name='personal_wiki_pages'),
    url(r'^home/wiki_create/$', personal_wiki_create, name='personal_wiki_create'),
    url(r'^home/wiki_use_lib/$', personal_wiki_use_lib, name='personal_wiki_use_lib'),
    url(r'^home/wiki_page_new/$', personal_wiki_page_new, name='personal_wiki_page_new'),
    url(r'^home/wiki_page_edit/(?P<page_name>[^/]+)$', personal_wiki_page_edit, name='personal_wiki_page_edit'),
    url(r'^home/wiki_page_delete/(?P<page_name>[^/]+)$', personal_wiki_page_delete, name='personal_wiki_page_delete'),

    # url(r'^home/public/reply/(?P<msg_id>[\d]+)/$', innerpub_msg_reply, name='innerpub_msg_reply'),
    # url(r'^home/owner/(?P<owner_name>[^/]+)/$', ownerhome, name='ownerhome'),

    # revert repo
    url(r'^repo/history/revert/(?P<repo_id>[-0-9a-f]{36})/$', repo_revert_history, name='repo_revert_history'),

    (r'^repo/upload_check/$', validate_filename),
    url(r'^repo/download_dir/(?P<repo_id>[-0-9a-f]{36})/$', repo_download_dir, name='repo_download_dir'),
    url(r'^repo/file_revisions/(?P<repo_id>[-0-9a-f]{36})/$', file_revisions, name='file_revisions'),
    url(r'^repo/file-access/(?P<repo_id>[-0-9a-f]{36})/$', file_access, name='file_access'),
    url(r'^repo/text_diff/(?P<repo_id>[-0-9a-f]{36})/$', text_diff, name='text_diff'),
    url(r'^repo/history/(?P<repo_id>[-0-9a-f]{36})/$', repo_history, name='repo_history'),
    url(r'^repo/history/view/(?P<repo_id>[-0-9a-f]{36})/$', repo_history_view, name='repo_history_view'),
    url(r'^repo/recycle/(?P<repo_id>[-0-9a-f]{36})/$', repo_recycle_view, name='repo_recycle_view'),
    url(r'^dir/recycle/(?P<repo_id>[-0-9a-f]{36})/$', dir_recycle_view, name='dir_recycle_view'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/online_gc/$', repo_online_gc, name='repo_online_gc'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/files/$', view_repo_file, name="repo_view_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/raw/(?P<file_path>.*)$', view_raw_file, name="view_raw_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/history/files/$', view_history_file, name="view_history_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/trash/files/$', view_trash_file, name="view_trash_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/snapshot/files/$', view_snapshot_file, name="view_snapshot_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/file/edit/$', file_edit, name='file_edit'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/(?P<obj_id>[0-9a-f]{40})/download/$', download_file, name='download_file'),

    ### lib (replace the old `repo` urls) ###
    # url(r'^lib/(?P<repo_id>[-0-9a-f]{36})/dir/(?P<path>.*)$', view_lib_dir, name='view_lib_dir'),
    url(r'^lib/(?P<repo_id>[-0-9a-f]{36})/file(?P<path>.*)$', view_lib_file, name='view_lib_file'),
    url(r'^#common/lib/(?P<repo_id>[-0-9a-f]{36})/(?P<path>.*)$', fake_view, name='view_common_lib_dir'),
    url(r'^#group/(?P<group_id>\d+)/$', fake_view, name='group_info'),
    url(r'^#group/(?P<group_id>\d+)/members/$', fake_view, name='group_members'),
    url(r'^#group/(?P<group_id>\d+)/discussions/$', fake_view, name='group_discuss'),
    url(r'^#groups/', fake_view, name='group_list'),
    url(r'^#group/(?P<group_id>\d+)/settings/$', fake_view, name='group_manage'),

    ### share/upload link ###
    url(r'^f/(?P<token>[a-f0-9]+)/$', view_shared_file, name='view_shared_file'),
    url(r'^f/(?P<token>[a-f0-9]+)/raw/(?P<obj_id>[0-9a-f]{40})/(?P<file_name>.*)', view_raw_shared_file, name='view_raw_shared_file'),
    url(r'^d/(?P<token>[a-f0-9]+)/$', view_shared_dir, name='view_shared_dir'),
    url(r'^d/(?P<token>[a-f0-9]+)/files/$', view_file_via_shared_dir, name='view_file_via_shared_dir'),
    url(r'^u/d/(?P<token>[a-f0-9]+)/$', view_shared_upload_link, name='view_shared_upload_link'),

    ### Misc ###
    url(r'^image-view/(?P<filename>.*)$', image_view, name='image_view'),
    (r'^file_upload_progress_page/$', file_upload_progress_page),
    url(r'^i18n/$', i18n, name='i18n'),
    url(r'^convert_cmmt_desc_link/$', convert_cmmt_desc_link, name='convert_cmmt_desc_link'),
    url(r'^modules/toggle/$', toggle_modules, name="toggle_modules"),
    url(r'^download_client_program/$', TemplateView.as_view(template_name="download.html"), name="download_client"),
    url(r'^choose_register/$', TemplateView.as_view(template_name="choose_register.html"), name="choose_register"),

    ### Ajax ###
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dirents/$', get_dirents, name="get_dirents"),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dirents/delete/$', delete_dirents, name='delete_dirents'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dirents/move/$', mv_dirents, name='mv_dirents'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dirents/copy/$', cp_dirents, name='cp_dirents'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dir/rename/$', rename_dirent, name='rename_dir'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/dir/delete/$', delete_dirent, name='delete_dir'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/rename/$', rename_dirent, name='rename_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/file/delete/$', delete_dirent, name='delete_file'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/current_commit/$', get_current_commit, name='get_current_commit'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/history/changes/$', repo_history_changes, name='repo_history_changes'),
    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/encrypted_file/(?P<file_id>[0-9a-f]{40})/download/$', download_enc_file, name='download_enc_file'),
    url(r'^ajax/u/d/(?P<token>[-0-9a-f]+)/upload/$', get_file_upload_url_ul, name='get_file_upload_url_ul'),
    url(r'^ajax/group/(?P<group_id>\d+)/repos/$', get_unenc_group_repos, name='get_group_repos'),
    url(r'^ajax/group/(?P<group_id>\d+)/members/import/$', ajax_group_members_import, name='ajax_group_members_import'),
    url(r'^ajax/unenc-rw-repos/$', unenc_rw_repos, name='unenc_rw_repos'),
    url(r'^ajax/upload-file-done/$', upload_file_done, name='upload_file_done'),
    url(r'^ajax/get_popup_notices/$', get_popup_notices, name='get_popup_notices'),
    url(r'^ajax/space_and_traffic/$', space_and_traffic, name='space_and_traffic'),

    url(r'^ajax/(?P<repo_id>[-0-9a-f]{36})/repo-dir/recycle/more/$', ajax_repo_dir_recycle_more, name='ajax_repo_dir_recycle_more'),

    url(r'^_templates/(?P<template>.*)$', underscore_template, name="underscore_template"),

    ## ajax lib
    url(r'^ajax/lib/(?P<repo_id>[-0-9a-f]{36})/dir/$', list_lib_dir, name="list_lib_dir"),


    ### Apps ###
    (r'^api2/', include('seahub.api2.urls')),
    url(r'^api/v2.1/groups/$', Groups.as_view(), name='api-v2.1-groups'),
    url(r'^api/v2.1/groups/(?P<group_id>\d+)/$', Group.as_view(), name='api-v2.1-group'),
    url(r'^api/v2.1/groups/(?P<group_id>\d+)/members/$', GroupMembers.as_view(), name='api-v2.1-group-members'),
    url(r'^api/v2.1/groups/(?P<group_id>\d+)/members/bulk/$', GroupMembersBulk.as_view(), name='api-v2.1-group-members-bulk'),
    url(r'^api/v2.1/groups/(?P<group_id>\d+)/members/(?P<email>[^/]+)/$', GroupMember.as_view(), name='api-v2.1-group-member'),
    url(r'^api/v2.1/search-group/$', SearchGroup.as_view(), name='api-v2.1-search-group'),
    url(r'^api/v2.1/shared-folders/$', SharedFolders.as_view(), name='api-v2.1-shared-folders'),
    url(r'^api/v2.1/shared-repos/$', SharedRepos.as_view(), name='api-v2.1-shared-repos'),
    url(r'^api/v2.1/shared-repos/(?P<repo_id>[-0-9a-f]{36})/$', SharedRepo.as_view(), name='api-v2.1-shared-repo'),
    url(r'^api/v2.1/share-links/$', ShareLinks.as_view(), name='api-v2.1-share-links'),
    url(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/$', ShareLink.as_view(), name='api-v2.1-share-link'),
    url(r'^api/v2.1/upload-links/$', UploadLinks.as_view(), name='api-v2.1-upload-links'),
    url(r'^api/v2.1/upload-links/(?P<token>[a-f0-9]+)/$', UploadLink.as_view(), name='api-v2.1-upload-link'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/$', FileView.as_view(), name='api-v2.1-file-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/zip-task/$', ZipTaskView.as_view(), name='api-v2.1-zip-task'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file-uploaded-bytes/$', RepoFileUploadedBytesView.as_view(), name='api-v2.1-repo-file-uploaded-bytes'),
    url(r'^api/v2.1/share-link-zip-task/$', ShareLinkZipTaskView.as_view(), name='api-v2.1-share-link-zip-task'),
    url(r'^api/v2.1/query-zip-progress/$', QueryZipProgressView.as_view(), name='api-v2.1-query-zip-progress'),
    url(r'^api/v2.1/copy-move-task/$', CopyMoveTaskView.as_view(), name='api-v2.1-copy-move-task'),
    url(r'^api/v2.1/query-copy-move-progress/$', QueryCopyMoveProgressView.as_view(), name='api-v2.1-query-copy-move-progress'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/dir/$', DirView.as_view(), name='api-v2.1-dir-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/set-password/$', RepoSetPassword.as_view(), name="api-v2.1-repo-set-password"),
    url(r'^api/v2.1/invitations/$', InvitationsView.as_view()),
    url(r'^api/v2.1/invitations/(?P<token>[a-f0-9]{32})/$', InvitationView.as_view()),
    url(r'^api/v2.1/notifications/$', NotificationsView.as_view(), name='api-v2.1-notifications'),
    url(r'^api/v2.1/notification/$', NotificationView.as_view(), name='api-v2.1-notification'),
    url(r'^api/v2.1/user-enabled-modules/$', UserEnabledModulesView.as_view(), name='api-v2.1-user-enabled-module'),
    url(r'^api/v2.1/starred-items/$', StarredItems.as_view(), name='api-v2.1-starred-items'),

    url(r'^api/v2.1/admin/sysinfo/$', SysInfo.as_view(), name='api-v2.1-sysinfo'),
    url(r'^api/v2.1/admin/devices/$', AdminDevices.as_view(), name='api-v2.1-admin-devices'),
    url(r'^api/v2.1/admin/device-errors/$', AdminDeviceErrors.as_view(), name='api-v2.1-admin-device-errors'),
    url(r'^api/v2.1/admin/libraries/$', AdminLibraries.as_view(), name='api-v2.1-admin-libraries'),
    url(r'^api/v2.1/admin/libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminLibrary.as_view(), name='api-v2.1-admin-library'),
    url(r'^api/v2.1/admin/libraries/(?P<repo_id>[-0-9a-f]{36})/dirents/$', AdminLibraryDirents.as_view(), name='api-v2.1-admin-library-dirents'),
    url(r'^api/v2.1/admin/groups/$', AdminGroups.as_view(), name='api-v2.1-admin-groups'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/$', AdminGroup.as_view(), name='api-v2.1-admin-group'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/libraries/$', AdminGroupLibraries.as_view(), name='api-v2.1-admin-group-libraries'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminGroupLibrary.as_view(), name='api-v2.1-admin-group-library'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/members/$', AdminGroupMembers.as_view(), name='api-v2.1-admin-group-members'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/members/(?P<email>[^/]+)/$', AdminGroupMember.as_view(), name='api-v2.1-admin-group-member'),
    url(r'^api/v2.1/admin/libraries/(?P<repo_id>[-0-9a-f]{36})/dirent/$', AdminLibraryDirent.as_view(), name='api-v2.1-admin-library-dirent'),
    url(r'^api/v2.1/admin/system-library/$', AdminSystemLibrary.as_view(), name='api-v2.1-admin-system-library'),
    url(r'^api/v2.1/admin/default-library/$', AdminDefaultLibrary.as_view(), name='api-v2.1-admin-default-library'),
    url(r'^api/v2.1/admin/trash-libraries/$', AdminTrashLibraries.as_view(), name='api-v2.1-admin-trash-libraries'),
    url(r'^api/v2.1/admin/trash-libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminTrashLibrary.as_view(), name='api-v2.1-admin-trash-library'),
    url(r'^api/v2.1/admin/shares/$', AdminShares.as_view(), name='api-v2.1-admin-shares'),
    url(r'^api/v2.1/admin/admin-logs/$', AdminLogs.as_view(), name='api-v2.1-admin-admin-logs'),
    url(r'^api/v2.1/admin/users/batch/$', AdminUsersBatch.as_view(), name='api-v2.1-admin-users-batch'),

    url(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/users/$', AdminOrgUsers.as_view(), name='api-v2.1-admin-org-users'),
    url(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/users/(?P<email>[^/]+)/$', AdminOrgUser.as_view(), name='api-v2.1-admin-org-user'),

    (r'^avatar/', include('seahub.avatar.urls')),
    (r'^notification/', include('seahub.notifications.urls')),
    (r'^contacts/', include('seahub.contacts.urls')),
    (r'^group/', include('seahub.group.urls')),
    (r'^options/', include('seahub.options.urls')),
    (r'^profile/', include('seahub.profile.urls')),
    (r'^share/', include('seahub.share.urls')),
    (r'^help/', include('seahub.help.urls')),
    url(r'^captcha/', include('captcha.urls')),
    (r'^thumbnail/', include('seahub.thumbnail.urls')),
    url(r'^inst/', include('seahub.institutions.urls', app_name='institutions', namespace='institutions')),
    url(r'^invite/', include('seahub.invitations.urls', app_name='invitations', namespace='invitations')),
    url(r'^terms/', include('termsandconditions.urls')),

    ### system admin ###
    url(r'^sysadmin/$', sysadmin, name='sysadmin'),
    url(r'^sys/settings/$', sys_settings, name='sys_settings'),
    url(r'^sysadmin/#all-libs/$', fake_view, name='sys_repo_admin'),
    url(r'^sysadmin/#libs/(?P<repo_id>[-0-9a-f]{36})/$', fake_view, name='sys_admin_repo'),
    url(r'^sysadmin/#system-lib/$', fake_view, name='sys_list_system'),
    url(r'^sysadmin/#trash-libs/$', fake_view, name='sys_repo_trash'),
    url(r'^sysadmin/#search-libs/$', fake_view, name='sys_repo_search'),
    url(r'^sysadmin/#search-trash-libs/$', fake_view, name='sys_trash_repo_search'),
    url(r'^sysadmin/#search-groups/$', fake_view, name='sys_group_search'),
    url(r'^sys/seafadmin/transfer/$', sys_repo_transfer, name='sys_repo_transfer'),
    url(r'^sys/seafadmin/delete/(?P<repo_id>[-0-9a-f]{36})/$', sys_repo_delete, name='sys_repo_delete'),
    url(r'^sys/useradmin/$', sys_user_admin, name='sys_useradmin'),
    url(r'^sys/useradmin/export-excel/$', sys_useradmin_export_excel, name='sys_useradmin_export_excel'),
    url(r'^sys/useradmin/ldap/$', sys_user_admin_ldap, name='sys_useradmin_ldap'),
    url(r'^sys/useradmin/ldap/imported$', sys_user_admin_ldap_imported, name='sys_useradmin_ldap_imported'),
    url(r'^sys/useradmin/admins/$', sys_user_admin_admins, name='sys_useradmin_admins'),
    url(r'^sys/groupadmin/export-excel/$', sys_group_admin_export_excel, name='sys_group_admin_export_excel'),
    url(r'^sys/orgadmin/$', sys_org_admin, name='sys_org_admin'),
    url(r'^sys/orgadmin/search/$', sys_org_search, name='sys_org_search'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/set_quota/$', sys_org_set_quota, name='sys_org_set_quota'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/rename/$', sys_org_rename, name='sys_org_rename'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/remove/$', sys_org_remove, name='sys_org_remove'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/set_member_quota/$', sys_org_set_member_quota, name='sys_org_set_member_quota'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/user/$', sys_org_info_user, name='sys_org_info_user'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/group/$', sys_org_info_group, name='sys_org_info_group'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/library/$', sys_org_info_library, name='sys_org_info_library'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/setting/$', sys_org_info_setting, name='sys_org_info_setting'),
    url(r'^sys/instadmin/$', sys_inst_admin, name='sys_inst_admin'),
    url(r'^sys/instadmin/(?P<inst_id>\d+)/remove/$', sys_inst_remove, name='sys_inst_remove'),
    url(r'^sys/instadmin/(?P<inst_id>\d+)/users/$', sys_inst_info_user, name='sys_inst_info_users'),
    url(r'^sys/instadmin/(?P<inst_id>\d+)/users/search/$', sys_inst_search_user, name='sys_inst_search_user'),
    url(r'^sys/instadmin/(?P<inst_id>\d+)/admins/$', sys_inst_info_admins, name='sys_inst_info_admins'),
    url(r'^sys/instadmin/(?P<inst_id>\d+)/toggleadmin/(?P<email>[^/]+)/$', sys_inst_toggle_admin, name='sys_inst_toggle_admin'),
    url(r'^sys/publinkadmin/$', sys_publink_admin, name='sys_publink_admin'),
    url(r'^sys/publink/remove/$', sys_publink_remove, name='sys_publink_remove'),
    url(r'^sys/uploadlink/remove/$', sys_upload_link_remove, name='sys_upload_link_remove'),
    url(r'^sys/notificationadmin/', notification_list, name='notification_list'),
    url(r'^sys/invitationadmin/$', sys_invitation_admin, name='sys_invitation_admin'),
    url(r'^sys/sudo/', sys_sudo_mode, name='sys_sudo_mode'),
    url(r'^sys/check-license/', sys_check_license, name='sys_check_license'),
    url(r'^useradmin/add/$', user_add, name="user_add"),
    url(r'^useradmin/remove/(?P<email>[^/]+)/$', user_remove, name="user_remove"),
    url(r'^useradmin/removetrial/(?P<user_or_org>[^/]+)/$', remove_trial, name="remove_trial"),
    url(r'^useradmin/search/$', user_search, name="user_search"),
#    url(r'^useradmin/makeadmin/(?P<user_id>[^/]+)/$', user_make_admin, name='user_make_admin'),
    url(r'^useradmin/removeadmin/(?P<email>[^/]+)/$', user_remove_admin, name='user_remove_admin'),
    url(r'^useradmin/info/(?P<email>[^/]+)/$', user_info, name='user_info'),
#    url(r'^useradmin/activate/(?P<user_id>[^/]+)/$', user_activate, name='user_activate'),
#    url(r'^useradmin/deactivate/(?P<user_id>[^/]+)/$', user_deactivate, name='user_deactivate'),
    url(r'^useradmin/toggle_status/(?P<email>[^/]+)/$', user_toggle_status, name='user_toggle_status'),
    url(r'^useradmin/toggle_role/(?P<email>[^/]+)/$', user_toggle_role, name='user_toggle_role'),
    url(r'^useradmin/(?P<email>[^/]+)/set_quota/$', user_set_quota, name='user_set_quota'),
    url(r'^sys/termsadmin/$', sys_terms_admin, name='sys_terms_admin'),
    url(r'^sys/termsadmin/delete/(?P<pk>[^/]+)/$', sys_delete_terms, name='sys_delete_terms'),
    url(r'^useradmin/password/reset/(?P<email>[^/]+)/$', user_reset, name='user_reset'),
    url(r'^useradmin/batchmakeadmin/$', batch_user_make_admin, name='batch_user_make_admin'),
    url(r'^useradmin/batchadduser/$', batch_add_user, name='batch_add_user'),

    url(r'^client-login/$', client_token_login, name='client_token_login'),
)

from seahub.utils import EVENTS_ENABLED
if EVENTS_ENABLED:
    urlpatterns += patterns(
        '',
        url(r'^sys/virus_scan_records/$', sys_virus_scan_records, name='sys_virus_scan_records'),
        url(r'^sys/virus_scan_records/delete/(?P<vid>\d+)/$', sys_delete_virus_scan_records, name='sys_delete_virus_scan_records'),
    )

if settings.SERVE_STATIC:
    media_url = settings.MEDIA_URL.strip('/')
    urlpatterns += patterns('',
        (r'^%s/(?P<path>.*)$' % (media_url), 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}),
    )

urlpatterns += patterns(
    '', (r'^demo/', demo),
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


if getattr(settings, 'ENABLE_SYSADMIN_EXTRA', False):
    from seahub_extra.sysadmin_extra.views import sys_login_admin, \
        sys_log_file_audit, sys_log_file_update, sys_log_perm_audit, \
        sys_login_admin_export_excel, sys_log_file_audit_export_excel, \
        sys_log_file_update_export_excel, sys_log_perm_audit_export_excel, \
        sys_log_email_audit
    urlpatterns += patterns('',
        url(r'^api/v2.1/admin/logs/login/$', Login.as_view(), name='api-v2.1-admin-logs-login'),
        url(r'^sys/loginadmin/$', sys_login_admin, name='sys_login_admin'),
        url(r'^sys/loginadmin/export-excel/$', sys_login_admin_export_excel, name='sys_login_admin_export_excel'),

        url(r'^api/v2.1/admin/logs/file-audit/$', FileAudit.as_view(), name='api-v2.1-admin-logs-file-audit'),
        url(r'^sys/log/fileaudit/$', sys_log_file_audit, name='sys_log_file_audit'),
        url(r'^sys/log/emailaudit/$', sys_log_email_audit, name='sys_log_email_audit'),
        url(r'^sys/log/fileaudit/export-excel/$', sys_log_file_audit_export_excel, name='sys_log_file_audit_export_excel'),

        url(r'^api/v2.1/admin/logs/file-update/$', FileUpdate.as_view(), name='api-v2.1-admin-logs-file-update'),
        url(r'^sys/log/fileupdate/$', sys_log_file_update, name='sys_log_file_update'),
        url(r'^sys/log/fileupdate/export-excel/$', sys_log_file_update_export_excel, name='sys_log_file_update_export_excel'),

        url(r'^api/v2.1/admin/logs/perm-audit/$', PermAudit.as_view(), name='api-v2.1-admin-logs-perm-audit'),
        url(r'^sys/log/permaudit/$', sys_log_perm_audit, name='sys_log_perm_audit'),
        url(r'^sys/log/permaudit/export-excel/$', sys_log_perm_audit_export_excel, name='sys_log_perm_audit_export_excel'),
    )

if getattr(settings, 'MULTI_TENANCY', False):
    urlpatterns += patterns('',
        (r'^org/', include('seahub_extra.organizations.urls')),
    )

if getattr(settings, 'ENABLE_SHIB_LOGIN', False):
    urlpatterns += patterns(
        '',
        url(r'^shib-complete/', TemplateView.as_view(template_name='shibboleth/complete.html'), name="shib_complete"),
        url(r'^shib-success/', TemplateView.as_view(template_name="shibboleth/success.html"), name="shib_success"),
    )


if getattr(settings, 'ENABLE_KRB5_LOGIN', False):
    urlpatterns += patterns(
        '', url(r'^krb5-login/', shib_login, name="krb5_login"),
    )

# serve office converter static files
from seahub.utils import HAS_OFFICE_CONVERTER, CLUSTER_MODE, OFFICE_CONVERTOR_NODE
if HAS_OFFICE_CONVERTER:
    from seahub.views.file import (
        office_convert_query_status, office_convert_get_page, office_convert_add_task
    )
    urlpatterns += patterns('',
        url(r'^office-convert/static/(?P<repo_id>[-0-9a-f]{36})/(?P<commit_id>[0-9a-f]{40})/(?P<path>.+)/(?P<filename>[^/].+)$',
            office_convert_get_page,
            name='office_convert_get_page'),
        url(r'^office-convert/status/$', office_convert_query_status, name='office_convert_query_status'),
    )

    if CLUSTER_MODE and OFFICE_CONVERTOR_NODE:
        urlpatterns += patterns('',
            url(r'^office-convert/internal/add-task/$', office_convert_add_task),
            url(r'^office-convert/internal/status/$', office_convert_query_status, {'cluster_internal': True}),
            url(r'^office-convert/internal/static/(?P<repo_id>[-0-9a-f]{36})/(?P<commit_id>[0-9a-f]{40})/(?P<path>.+)/(?P<filename>[^/].+)$',
                office_convert_get_page, {'cluster_internal': True}),
        )

if TRAFFIC_STATS_ENABLED:
    from seahub.views.sysadmin import sys_traffic_admin
    urlpatterns += patterns('',
        url(r'^sys/trafficadmin/$', sys_traffic_admin, name='sys_trafficadmin'),
    )

if getattr(settings, 'ENABLE_ADFS_LOGIN', False):
    from seahub_extra.adfs_auth.views import assertion_consumer_service, \
        auth_complete
    urlpatterns += patterns(
        '',
        url(r'^saml2/acs/$', assertion_consumer_service, name='saml2_acs'),
        url(r'^saml2/complete/$', auth_complete, name='saml2_complete'),
        (r'^saml2/', include('djangosaml2.urls')),
    )
