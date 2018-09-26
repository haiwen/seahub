# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from django.conf.urls import url, include
# from django.views.generic.simple import direct_to_template
from django.views.generic import TemplateView

from seahub.views import *
from seahub.views.sysadmin import *
from seahub.views.ajax import *
from seahub.views.sso import *

from seahub.views.file import view_history_file, view_trash_file,\
    view_snapshot_file, file_edit, view_shared_file, view_file_via_shared_dir,\
    text_diff, view_raw_file, download_file, view_lib_file, \
    file_access, view_lib_file_via_smart_link
from seahub.views.repo import repo_history_view, view_shared_dir, \
    view_shared_upload_link, view_lib_as_wiki
from notifications.views import notification_list
from seahub.views.wiki import personal_wiki, personal_wiki_pages, \
    personal_wiki_create, personal_wiki_page_new, personal_wiki_page_edit, \
    personal_wiki_page_delete, personal_wiki_use_lib
from seahub.api2.endpoints.smart_link import SmartLink, SmartLinkToken
from seahub.api2.endpoints.groups import Groups, Group
from seahub.api2.endpoints.all_groups import AllGroups
from seahub.api2.endpoints.shareable_groups import ShareableGroups
from seahub.api2.endpoints.group_libraries import GroupLibraries, GroupLibrary

from seahub.api2.endpoints.group_owned_libraries import GroupOwnedLibraries, \
        GroupOwnedLibrary, GroupOwnedLibraryUserFolderPermission, \
        GroupOwnedLibraryGroupFolderPermission, GroupOwnedLibraryUserShare, \
        GroupOwnedLibraryGroupShare, GroupOwnedLibraryUserShareInLibrary
from seahub.api2.endpoints.address_book.groups import AddressBookGroupsSubGroups
from seahub.api2.endpoints.address_book.members import AddressBookGroupsSearchMember

from seahub.api2.endpoints.group_members import GroupMembers, GroupMembersBulk, GroupMember
from seahub.api2.endpoints.search_group import SearchGroup
from seahub.api2.endpoints.share_links import ShareLinks, ShareLink
from seahub.api2.endpoints.shared_folders import SharedFolders
from seahub.api2.endpoints.shared_repos import SharedRepos, SharedRepo
from seahub.api2.endpoints.upload_links import UploadLinks, UploadLink, \
        UploadLinkUpload
from seahub.api2.endpoints.repos_batch import ReposBatchView, \
        ReposBatchCopyDirView, ReposBatchCreateDirView, \
        ReposBatchCopyItemView, ReposBatchMoveItemView
from seahub.api2.endpoints.repos import RepoView
from seahub.api2.endpoints.file import FileView
from seahub.api2.endpoints.file_history import FileHistoryView, NewFileHistoryView
from seahub.api2.endpoints.dir import DirView, DirDetailView
from seahub.api2.endpoints.file_tag import FileTagView
from seahub.api2.endpoints.file_tag import FileTagsView
from seahub.api2.endpoints.repo_trash import RepoTrash
from seahub.api2.endpoints.deleted_repos import DeletedRepos
from seahub.api2.endpoints.repo_history import RepoHistory
from seahub.api2.endpoints.repo_set_password import RepoSetPassword
from seahub.api2.endpoints.zip_task import ZipTaskView
from seahub.api2.endpoints.share_link_zip_task import ShareLinkZipTaskView
from seahub.api2.endpoints.query_zip_progress import QueryZipProgressView
from seahub.api2.endpoints.cancel_zip_task import CancelZipTaskView
from seahub.api2.endpoints.copy_move_task import CopyMoveTaskView
from seahub.api2.endpoints.query_copy_move_progress import QueryCopyMoveProgressView
from seahub.api2.endpoints.move_folder_merge import MoveFolderMergeView
from seahub.api2.endpoints.invitations import InvitationsView, InvitationsBatchView
from seahub.api2.endpoints.invitation import InvitationView
from seahub.api2.endpoints.notifications import NotificationsView, NotificationView
from seahub.api2.endpoints.user_enabled_modules import UserEnabledModulesView
from seahub.api2.endpoints.repo_file_uploaded_bytes import RepoFileUploadedBytesView
from seahub.api2.endpoints.user_avatar import UserAvatarView
from seahub.api2.endpoints.wikis import WikisView, WikiView
from seahub.api2.endpoints.drafts import DraftsView, DraftView
from seahub.api2.endpoints.draft_reviews import DraftReviewsView
from seahub.api2.endpoints.activities import ActivitiesView
from seahub.api2.endpoints.wiki_pages import WikiPageView, WikiPagesView, WikiPagesDirView, WikiPageContentView
from seahub.api2.endpoints.revision_tag import TaggedItemsView, TagNamesView
from seahub.api2.endpoints.user import User

# Admin
from seahub.api2.endpoints.admin.revision_tag import AdminTaggedItemsView
from seahub.api2.endpoints.admin.login_logs import LoginLogs, AdminLoginLogs
from seahub.api2.endpoints.admin.file_audit import FileAudit
from seahub.api2.endpoints.admin.file_update import FileUpdate
from seahub.api2.endpoints.admin.perm_audit import PermAudit
from seahub.api2.endpoints.admin.sysinfo import SysInfo
from seahub.api2.endpoints.admin.statistics import (
    FileOperationsView, TotalStorageView, ActiveUsersView, SystemTrafficView
)
from seahub.api2.endpoints.admin.devices import AdminDevices
from seahub.api2.endpoints.admin.device_errors import AdminDeviceErrors
from seahub.api2.endpoints.admin.users import AdminUsers, AdminUser
from seahub.api2.endpoints.admin.device_trusted_ip import AdminDeviceTrustedIP
from seahub.api2.endpoints.admin.libraries import AdminLibraries, AdminLibrary
from seahub.api2.endpoints.admin.library_dirents import AdminLibraryDirents, AdminLibraryDirent
from seahub.api2.endpoints.admin.system_library import AdminSystemLibrary, \
        AdminSystemLibraryUploadLink
from seahub.api2.endpoints.admin.default_library import AdminDefaultLibrary
from seahub.api2.endpoints.admin.trash_libraries import AdminTrashLibraries, AdminTrashLibrary
from seahub.api2.endpoints.admin.groups import AdminGroups, AdminGroup
from seahub.api2.endpoints.admin.group_libraries import AdminGroupLibraries, AdminGroupLibrary
from seahub.api2.endpoints.admin.group_members import AdminGroupMembers, AdminGroupMember
from seahub.api2.endpoints.admin.shares import AdminShares
from seahub.api2.endpoints.admin.share_links import AdminShareLink, \
        AdminShareLinkDownload, AdminShareLinkCheckPassword, \
        AdminShareLinkDirents
from seahub.api2.endpoints.admin.upload_links import AdminUploadLink, \
        AdminUploadLinkUpload, AdminUploadLinkCheckPassword
from seahub.api2.endpoints.admin.users_batch import AdminUsersBatch
from seahub.api2.endpoints.admin.operation_logs import AdminOperationLogs
from seahub.api2.endpoints.admin.organizations import AdminOrganization
from seahub.api2.endpoints.admin.org_users import AdminOrgUsers, AdminOrgUser
from seahub.api2.endpoints.admin.org_stats import AdminOrgStatsTraffic
from seahub.api2.endpoints.admin.logo import AdminLogo
from seahub.api2.endpoints.admin.favicon import AdminFavicon
from seahub.api2.endpoints.admin.license import AdminLicense
from seahub.api2.endpoints.admin.invitations import InvitationsView as AdminInvitationsView
from seahub.api2.endpoints.admin.library_history import AdminLibraryHistoryLimit
from seahub.api2.endpoints.admin.login_bg_image import AdminLoginBgImage
from seahub.api2.endpoints.admin.admin_role import AdminAdminRole
from seahub.api2.endpoints.admin.address_book.groups import AdminAddressBookGroups, \
        AdminAddressBookGroup
from seahub.api2.endpoints.admin.group_owned_libraries import AdminGroupOwnedLibraries, \
        AdminGroupOwnedLibrary

urlpatterns = [
    url(r'^accounts/', include('seahub.base.registration_urls')),

    url(r'^sso/$', sso, name='sso'),
    url(r'^shib-login/', shib_login, name="shib_login"),
    url(r'^oauth/', include('seahub.oauth.urls')),

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

    # revert repo
    url(r'^repo/history/revert/(?P<repo_id>[-0-9a-f]{36})/$', repo_revert_history, name='repo_revert_history'),

    url(r'^repo/upload_check/$', validate_filename),
    url(r'^repo/download_dir/(?P<repo_id>[-0-9a-f]{36})/$', repo_download_dir, name='repo_download_dir'),
    url(r'^repo/file_revisions/(?P<repo_id>[-0-9a-f]{36})/$', file_revisions, name='file_revisions'),
    url(r'^repo/file-access/(?P<repo_id>[-0-9a-f]{36})/$', file_access, name='file_access'),
    url(r'^repo/text_diff/(?P<repo_id>[-0-9a-f]{36})/$', text_diff, name='text_diff'),
    url(r'^repo/history/(?P<repo_id>[-0-9a-f]{36})/$', repo_history, name='repo_history'),
    url(r'^repo/history/view/(?P<repo_id>[-0-9a-f]{36})/$', repo_history_view, name='repo_history_view'),
    url(r'^repo/recycle/(?P<repo_id>[-0-9a-f]{36})/$', repo_recycle_view, name='repo_recycle_view'),
    url(r'^dir/recycle/(?P<repo_id>[-0-9a-f]{36})/$', dir_recycle_view, name='dir_recycle_view'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/raw/(?P<file_path>.*)$', view_raw_file, name="view_raw_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/history/files/$', view_history_file, name="view_history_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/trash/files/$', view_trash_file, name="view_trash_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/snapshot/files/$', view_snapshot_file, name="view_snapshot_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/file/edit/$', file_edit, name='file_edit'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/(?P<obj_id>[0-9a-f]{40})/download/$', download_file, name='download_file'),

    ### lib (replace the old `repo` urls) ###
    # url(r'^lib/(?P<repo_id>[-0-9a-f]{36})/dir/(?P<path>.*)$', view_lib_dir, name='view_lib_dir'),
    url(r'^lib/(?P<repo_id>[-0-9a-f]{36})/file(?P<path>.*)$', view_lib_file, name='view_lib_file'),
    url(r'^wiki/lib/(?P<repo_id>[-0-9a-f]{36})/(?P<path>.*)$', view_lib_as_wiki, name='view_lib_as_wiki'),
    url(r'^smart-link/(?P<dirent_uuid>[-0-9a-f]{36})/(?P<dirent_name>.*)$', view_lib_file_via_smart_link, name="view_lib_file_via_smart_link"),
    url(r'^#common/lib/(?P<repo_id>[-0-9a-f]{36})/(?P<path>.*)$', fake_view, name='view_common_lib_dir'),
    url(r'^#group/(?P<group_id>\d+)/$', fake_view, name='group_info'),
    url(r'^#group/(?P<group_id>\d+)/members/$', fake_view, name='group_members'),
    url(r'^#group/(?P<group_id>\d+)/discussions/$', fake_view, name='group_discuss'),
    url(r'^#groups/', fake_view, name='group_list'),
    url(r'^#group/(?P<group_id>\d+)/settings/$', fake_view, name='group_manage'),

    ### share/upload link ###
    url(r'^f/(?P<token>[a-f0-9]+)/$', view_shared_file, name='view_shared_file'),
    url(r'^d/(?P<token>[a-f0-9]+)/$', view_shared_dir, name='view_shared_dir'),
    url(r'^d/(?P<token>[a-f0-9]+)/files/$', view_file_via_shared_dir, name='view_file_via_shared_dir'),
    url(r'^u/d/(?P<token>[a-f0-9]+)/$', view_shared_upload_link, name='view_shared_upload_link'),

    ### Misc ###
    url(r'^image-view/(?P<filename>.*)$', image_view, name='image_view'),
    url(r'^custom-css/$', custom_css_view, name='custom_css'),
    url(r'^i18n/$', i18n, name='i18n'),
    url(r'^convert_cmmt_desc_link/$', convert_cmmt_desc_link, name='convert_cmmt_desc_link'),
    url(r'^modules/toggle/$', toggle_modules, name="toggle_modules"),
    url(r'^download_client_program/$', TemplateView.as_view(template_name="download.html"), name="download_client"),
    url(r'^choose_register/$', choose_register, name="choose_register"),
    url(r'^dashboard/$', TemplateView.as_view(template_name="react_app.html"), name="app"),
    url(r'^drafts/$', TemplateView.as_view(template_name="react_app.html"), name="app"),

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
    url(r'^api2/', include('seahub.api2.urls')),

    ## user
    url(r'^api/v2.1/user/$', User.as_view(), name="api-v2.1-user"),

    ## user::smart-link
    url(r'^api/v2.1/smart-link/$', SmartLink.as_view(), name="api-v2.1-smart-link"),
    url(r'^api/v2.1/smart-links/(?P<token>[-0-9a-f]{36})/$', SmartLinkToken.as_view(), name="api-v2.1-smart-links-token"),

    ## user::groups
    url(r'^api/v2.1/all-groups/$', AllGroups.as_view(), name='api-v2.1-all-groups'),
    url(r'^api/v2.1/shareable-groups/$', ShareableGroups.as_view(), name='api-v2.1-shareable-groups'),
    url(r'^api/v2.1/groups/$', Groups.as_view(), name='api-v2.1-groups'),
    url(r'^api/v2.1/groups/(?P<group_id>\d+)/$', Group.as_view(), name='api-v2.1-group'),
    url(r'^api/v2.1/groups/(?P<group_id>\d+)/libraries/$', GroupLibraries.as_view(), name='api-v2.1-group-libraries'),
    url(r'^api/v2.1/groups/(?P<group_id>\d+)/libraries/(?P<repo_id>[-0-9a-f]{36})/$', GroupLibrary.as_view(), name='api-v2.1-group-library'),
    url(r'^api/v2.1/groups/(?P<group_id>\d+)/group-owned-libraries/$', GroupOwnedLibraries.as_view(), name='api-v2.1-group-owned-libraries'),
    url(r'^api/v2.1/groups/(?P<group_id>\d+)/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/$', GroupOwnedLibrary.as_view(), name='api-v2.1-owned-group-library'),
    url(r'^api/v2.1/groups/(?P<group_id>\d+)/members/$', GroupMembers.as_view(), name='api-v2.1-group-members'),
    url(r'^api/v2.1/groups/(?P<group_id>\d+)/members/bulk/$', GroupMembersBulk.as_view(), name='api-v2.1-group-members-bulk'),
    url(r'^api/v2.1/groups/(?P<group_id>\d+)/members/(?P<email>[^/]+)/$', GroupMember.as_view(), name='api-v2.1-group-member'),
    url(r'^api/v2.1/search-group/$', SearchGroup.as_view(), name='api-v2.1-search-group'),

    ## address book
    url(r'^api/v2.1/address-book/groups/(?P<group_id>\d+)/sub-groups/$', AddressBookGroupsSubGroups.as_view(), name='api-v2.1-address-book-groups-sub-groups'),
    url(r'^api/v2.1/address-book/groups/(?P<group_id>\d+)/search-member/$', AddressBookGroupsSearchMember.as_view(), name='api-v2.1-address-book-search-member'),
    url(r'^api/v2.1/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/user-folder-permission/$', GroupOwnedLibraryUserFolderPermission.as_view(), name='api-v2.1-group-owned-library-user-folder-permission'),
    url(r'^api/v2.1/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/group-folder-permission/$', GroupOwnedLibraryGroupFolderPermission.as_view(), name='api-v2.1-group-owned-library-group-folder-permission'),
    url(r'^api/v2.1/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/user-share/$', GroupOwnedLibraryUserShare.as_view(), name='api-v2.1-group-owned-library-user-share'),
    url(r'^api/v2.1/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/group-share/$', GroupOwnedLibraryGroupShare.as_view(), name='api-v2.1-group-owned-library-group-share'),
    url(r'^api/v2.1/group-owned-libraries/user-share-in-libraries/(?P<repo_id>[-0-9-a-f]{36})/$', GroupOwnedLibraryUserShareInLibrary.as_view(), name='api-v2.1-group-owned-library-user-share-in-library'),

    ## user::shared-folders
    url(r'^api/v2.1/shared-folders/$', SharedFolders.as_view(), name='api-v2.1-shared-folders'),

    ## user::shared-repos
    url(r'^api/v2.1/shared-repos/$', SharedRepos.as_view(), name='api-v2.1-shared-repos'),
    url(r'^api/v2.1/shared-repos/(?P<repo_id>[-0-9a-f]{36})/$', SharedRepo.as_view(), name='api-v2.1-shared-repo'),

    ## user::shared-download-links
    url(r'^api/v2.1/share-links/$', ShareLinks.as_view(), name='api-v2.1-share-links'),
    url(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/$', ShareLink.as_view(), name='api-v2.1-share-link'),

    ## user::shared-upload-links
    url(r'^api/v2.1/upload-links/$', UploadLinks.as_view(), name='api-v2.1-upload-links'),
    url(r'^api/v2.1/upload-links/(?P<token>[a-f0-9]+)/$', UploadLink.as_view(), name='api-v2.1-upload-link'),
    url(r'^api/v2.1/upload-links/(?P<token>[a-f0-9]+)/upload/$', UploadLinkUpload.as_view(), name='api-v2.1-upload-link-upload'),

    ## user::revision-tags
    url(r'^api/v2.1/revision-tags/tagged-items/$', TaggedItemsView.as_view(), name='api-v2.1-revision-tags-tagged-items'),
    url(r'^api/v2.1/revision-tags/tag-names/$', TagNamesView.as_view(), name='api-v2.1-revision-tags-tag-names'),

    ## user::repos-batch-operate
    url(r'^api/v2.1/repos/batch/$', ReposBatchView.as_view(), name='api-v2.1-repos-batch'),
    url(r'^api/v2.1/repos/batch-copy-dir/$', ReposBatchCopyDirView.as_view(), name='api-v2.1-repos-batch-copy-dir'),
    url(r'^api/v2.1/repos/batch-create-dir/$', ReposBatchCreateDirView.as_view(), name='api-v2.1-repos-batch-create-dir'),
    url(r'^api/v2.1/repos/batch-copy-item/$', ReposBatchCopyItemView.as_view(), name='api-v2.1-repos-batch-copy-item'),
    url(r'^api/v2.1/repos/batch-move-item/$', ReposBatchMoveItemView.as_view(), name='api-v2.1-repos-batch-move-item'),

    ## user::deleted repos
    url(r'^api/v2.1/deleted-repos/$', DeletedRepos.as_view(), name='api2-v2.1-deleted-repos'),

    ## user::repos
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/$', RepoView.as_view(), name='api-v2.1-repo-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/tags/$', FileTagsView.as_view(), name="api-v2.1-filetags-view"),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/tags/(?P<name>.*?)/$',FileTagView.as_view(), name="api-v2.1-filetag-view"),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/$', FileView.as_view(), name='api-v2.1-file-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/history/$', FileHistoryView.as_view(), name='api-v2.1-file-history-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/new_history/$', NewFileHistoryView.as_view(), name='api-v2.1-new-file-history-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/dir/$', DirView.as_view(), name='api-v2.1-dir-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/dir/detail/$', DirDetailView.as_view(), name='api-v2.1-dir-detail-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/trash/$', RepoTrash.as_view(), name='api-v2.1-repo-trash'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/history/$', RepoHistory.as_view(), name='api-v2.1-repo-history'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/set-password/$', RepoSetPassword.as_view(), name="api-v2.1-repo-set-password"),

    ## user::download-dir-zip-task
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/zip-task/$', ZipTaskView.as_view(), name='api-v2.1-zip-task'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file-uploaded-bytes/$', RepoFileUploadedBytesView.as_view(), name='api-v2.1-repo-file-uploaded-bytes'),
    url(r'^api/v2.1/share-link-zip-task/$', ShareLinkZipTaskView.as_view(), name='api-v2.1-share-link-zip-task'),
    url(r'^api/v2.1/query-zip-progress/$', QueryZipProgressView.as_view(), name='api-v2.1-query-zip-progress'),
    url(r'^api/v2.1/cancel-zip-task/$', CancelZipTaskView.as_view(), name='api-v2.1-cancel-zip-task'),
    url(r'^api/v2.1/copy-move-task/$', CopyMoveTaskView.as_view(), name='api-v2.1-copy-move-task'),
    url(r'^api/v2.1/query-copy-move-progress/$', QueryCopyMoveProgressView.as_view(), name='api-v2.1-query-copy-move-progress'),

    url(r'^api/v2.1/move-folder-merge/$', MoveFolderMergeView.as_view(), name='api-v2.1-move-folder-merge'),

    url(r'^api/v2.1/notifications/$', NotificationsView.as_view(), name='api-v2.1-notifications'),
    url(r'^api/v2.1/notification/$', NotificationView.as_view(), name='api-v2.1-notification'),
    url(r'^api/v2.1/user-enabled-modules/$', UserEnabledModulesView.as_view(), name='api-v2.1-user-enabled-module'),

    ## user::invitations
    url(r'^api/v2.1/invitations/$', InvitationsView.as_view()),
    url(r'^api/v2.1/invitations/batch/$', InvitationsBatchView.as_view()),
    url(r'^api/v2.1/invitations/(?P<token>[a-f0-9]{32})/$', InvitationView.as_view()),

    ## user::avatar
    url(r'^api/v2.1/user-avatar/$', UserAvatarView.as_view(), name='api-v2.1-user-avatar'),

    ## user::wiki
    url(r'^api/v2.1/wikis/$', WikisView.as_view(), name='api-v2.1-wikis'),
    url(r'^api/v2.1/wikis/(?P<slug>[^/]+)/$', WikiView.as_view(), name='api-v2.1-wiki'),
    url(r'^api/v2.1/wikis/(?P<slug>[^/]+)/pages/$', WikiPagesView.as_view(), name='api-v2.1-wiki-pages'),
    url(r'^api/v2.1/wikis/(?P<slug>[^/]+)/dir/$', WikiPagesDirView.as_view(), name='api-v2.1-wiki-pages-dir'),
    url(r'^api/v2.1/wikis/(?P<slug>[^/]+)/content/$', WikiPageContentView.as_view(), name='api-v2.1-wiki-pages-content'),
    url(r'^api/v2.1/wikis/(?P<slug>[^/]+)/pages/(?P<page_name>[^/]+)/$', WikiPageView.as_view(), name='api-v2.1-wiki-page'),

    ## user::drafts
    url(r'^api/v2.1/drafts/$', DraftsView.as_view(), name='api-v2.1-drafts'),
    url(r'^api/v2.1/drafts/(?P<pk>\d+)/$', DraftView.as_view(), name='api-v2.1-draft'),


    ## user::reviews
    url(r'^api/v2.1/reviews/$', DraftReviewsView.as_view(), name='api-v2.1-draft-reviews'),

    ## user::activities
    url(r'^api/v2.1/activities/$', ActivitiesView.as_view(), name='api-v2.1-acitvity'),

    ## admin::sysinfo
    url(r'^api/v2.1/admin/sysinfo/$', SysInfo.as_view(), name='api-v2.1-sysinfo'),

    ## admin::revision-tags
    url(r'^api/v2.1/admin/revision-tags/tagged-items/$', AdminTaggedItemsView.as_view(), name='api-v2.1-admin-revision-tags-tagged-items'),

    ## admin::statistics
    url(r'^api/v2.1/admin/statistics/file-operations/$', FileOperationsView.as_view(), name='api-v2.1-admin-statistics-file-operations'),
    url(r'^api/v2.1/admin/statistics/total-storage/$', TotalStorageView.as_view(), name='api-v2.1-admin-statistics-total-storage'),
    url(r'^api/v2.1/admin/statistics/active-users/$', ActiveUsersView.as_view(), name='api-v2.1-admin-statistics-active-users'),
    url(r'^api/v2.1/admin/statistics/system-traffic/$', SystemTrafficView.as_view(), name='api-v2.1-admin-statistics-system-traffic'),

    ## admin::users
    url(r'^api/v2.1/admin/users/$', AdminUsers.as_view(), name='api-v2.1-admin-users'),
    # [^...] Matches any single character not in brackets
    # + Matches between one and unlimited times, as many times as possible
    url(r'^api/v2.1/admin/users/(?P<email>[^/]+@[^/]+)/$', AdminUser.as_view(), name='api-v2.1-admin-user'),

    ## admin::devices
    url(r'^api/v2.1/admin/devices/$', AdminDevices.as_view(), name='api-v2.1-admin-devices'),
    url(r'^api/v2.1/admin/device-errors/$', AdminDeviceErrors.as_view(), name='api-v2.1-admin-device-errors'),
    url(r'^api/v2.1/admin/device-trusted-ip/$', AdminDeviceTrustedIP.as_view(), name='api-v2.1-admin-device-trusted-ip'),

    ## admin::libraries
    url(r'^api/v2.1/admin/libraries/$', AdminLibraries.as_view(), name='api-v2.1-admin-libraries'),
    url(r'^api/v2.1/admin/libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminLibrary.as_view(), name='api-v2.1-admin-library'),
    url(r'^api/v2.1/admin/libraries/(?P<repo_id>[-0-9a-f]{36})/history-limit/$', AdminLibraryHistoryLimit.as_view(), name="api-v2.1-admin-library-history-limit"),
    url(r'^api/v2.1/admin/libraries/(?P<repo_id>[-0-9a-f]{36})/dirents/$', AdminLibraryDirents.as_view(), name='api-v2.1-admin-library-dirents'),
    url(r'^api/v2.1/admin/libraries/(?P<repo_id>[-0-9a-f]{36})/dirent/$', AdminLibraryDirent.as_view(), name='api-v2.1-admin-library-dirent'),

    ## admin::system-library
    url(r'^api/v2.1/admin/system-library/$', AdminSystemLibrary.as_view(), name='api-v2.1-admin-system-library'),
    url(r'^api/v2.1/admin/system-library/upload-link/$', AdminSystemLibraryUploadLink.as_view(), name='api-v2.1-admin-system-library-upload-link'),

    ## admin::default-library
    url(r'^api/v2.1/admin/default-library/$', AdminDefaultLibrary.as_view(), name='api-v2.1-admin-default-library'),

    ## admin::trash-libraries
    url(r'^api/v2.1/admin/trash-libraries/$', AdminTrashLibraries.as_view(), name='api-v2.1-admin-trash-libraries'),
    url(r'^api/v2.1/admin/trash-libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminTrashLibrary.as_view(), name='api-v2.1-admin-trash-library'),

    ## admin::groups
    url(r'^api/v2.1/admin/groups/$', AdminGroups.as_view(), name='api-v2.1-admin-groups'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/$', AdminGroup.as_view(), name='api-v2.1-admin-group'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/libraries/$', AdminGroupLibraries.as_view(), name='api-v2.1-admin-group-libraries'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminGroupLibrary.as_view(), name='api-v2.1-admin-group-library'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/members/$', AdminGroupMembers.as_view(), name='api-v2.1-admin-group-members'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/members/(?P<email>[^/]+)/$', AdminGroupMember.as_view(), name='api-v2.1-admin-group-member'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/group-owned-libraries/$', AdminGroupOwnedLibraries.as_view(), name='api-v2.1-admin-group-owned-libraries'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminGroupOwnedLibrary.as_view(), name='api-v2.1-admin-owned-group-library'),

    ## admin::shares
    url(r'^api/v2.1/admin/shares/$', AdminShares.as_view(), name='api-v2.1-admin-shares'),

    ## admin::admin logs
    url(r'^api/v2.1/admin/admin-logs/$', AdminOperationLogs.as_view(), name='api-v2.1-admin-admin-operation-logs'),
    url(r'^api/v2.1/admin/admin-login-logs/$', AdminLoginLogs.as_view(), name='api-v2.1-admin-admin-login-logs'),

    ## admin::share-links
    url(r'^api/v2.1/admin/share-links/(?P<token>[a-f0-9]+)/$', AdminShareLink.as_view(), name='api-v2.1-admin-share-link'),
    url(r'^api/v2.1/admin/share-links/(?P<token>[a-f0-9]+)/download/$',
            AdminShareLinkDownload.as_view(), name='api-v2.1-admin-share-link-download'),
    url(r'^api/v2.1/admin/share-links/(?P<token>[a-f0-9]+)/check-password/$',
            AdminShareLinkCheckPassword.as_view(), name='api-v2.1-admin-share-link-check-password'),
    url(r'^api/v2.1/admin/share-links/(?P<token>[a-f0-9]+)/dirents/$',
            AdminShareLinkDirents.as_view(), name='api-v2.1-admin-share-link-dirents'),

    ## admin::upload-links
    url(r'^api/v2.1/admin/upload-links/(?P<token>[a-f0-9]+)/$', AdminUploadLink.as_view(), name='api-v2.1-admin-upload-link'),
    url(r'^api/v2.1/admin/upload-links/(?P<token>[a-f0-9]+)/upload/$',
            AdminUploadLinkUpload.as_view(), name='api-v2.1-admin-upload-link-upload'),
    url(r'^api/v2.1/admin/upload-links/(?P<token>[a-f0-9]+)/check-password/$',
            AdminUploadLinkCheckPassword.as_view(), name='api-v2.1-admin-upload-link-check-password'),

    ## admin::users
    url(r'^api/v2.1/admin/users/batch/$', AdminUsersBatch.as_view(), name='api-v2.1-admin-users-batch'),

    ## admin::admin-role
    url(r'^api/v2.1/admin/admin-role/$', AdminAdminRole.as_view(), name='api-v2.1-admin-admin-role'),

    ## admin::organizations
    url(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/$', AdminOrganization.as_view(), name='api-v2.1-admin-organization'),
    url(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/users/$', AdminOrgUsers.as_view(), name='api-v2.1-admin-org-users'),
    url(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/users/(?P<email>[^/]+)/$', AdminOrgUser.as_view(), name='api-v2.1-admin-org-user'),
    url(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/statistics/traffic/$', AdminOrgStatsTraffic.as_view(), name='api-v2.1-admin-org-stats-traffic'),

    ## admin::logo
    url(r'^api/v2.1/admin/logo/$', AdminLogo.as_view(), name='api-v2.1-admin-logo'),
    url(r'^api/v2.1/admin/favicon/$', AdminFavicon.as_view(), name='api-v2.1-admin-favicon'),
    url(r'^api/v2.1/admin/license/$', AdminLicense.as_view(), name='api-v2.1-admin-license'),
    url(r'^api/v2.1/admin/login-background-image/$', AdminLoginBgImage.as_view(), name='api-v2.1-admin-login-background-image'),

    ## admin::invitations
    url(r'^api/v2.1/admin/invitations/$', AdminInvitationsView.as_view(), name='api-v2.1-admin-invitations'),

    url(r'^avatar/', include('seahub.avatar.urls')),
    url(r'^notification/', include('seahub.notifications.urls')),
    url(r'^contacts/', include('seahub.contacts.urls')),
    url(r'^group/', include('seahub.group.urls')),
    url(r'^options/', include('seahub.options.urls')),
    url(r'^profile/', include('seahub.profile.urls')),
    url(r'^share/', include('seahub.share.urls')),
    url(r'^help/', include('seahub.help.urls')),
    url(r'^captcha/', include('captcha.urls')),
    url(r'^thumbnail/', include('seahub.thumbnail.urls')),
    url(r'^inst/', include('seahub.institutions.urls', app_name='institutions', namespace='institutions')),
    url(r'^invite/', include('seahub.invitations.urls', app_name='invitations', namespace='invitations')),
    url(r'^terms/', include('termsandconditions.urls')),
    url(r'^wikis/', include('seahub.wiki.urls', app_name='wiki', namespace='wiki')),

    ## admin::address book
    url(r'^api/v2.1/admin/address-book/groups/$', AdminAddressBookGroups.as_view(), name='api-v2.1-admin-address-book-groups'),
    url(r'^api/v2.1/admin/address-book/groups/(?P<group_id>\d+)/$', AdminAddressBookGroup.as_view(), name='api-v2.1-admin-address-book-group'),

    ### system admin ###
    url(r'^sysadmin/$', sysadmin, name='sysadmin'),
    url(r'^sys/settings/$', sys_settings, name='sys_settings'),
    url(r'^sys/statistic/file/$', sys_statistic_file, name='sys_statistic_file'),
    url(r'^sys/statistic/storage/$', sys_statistic_storage, name='sys_statistic_storage'),
    url(r'^sys/statistic/user/$', sys_statistic_user, name='sys_statistic_user'),
    url(r'^sys/statistic/traffic/$', sys_statistic_traffic, name='sys_statistic_traffic'),
    url(r'^sysadmin/#all-libs/$', fake_view, name='sys_repo_admin'),
    url(r'^sysadmin/#libs/(?P<repo_id>[-0-9a-f]{36})/$', fake_view, name='sys_admin_repo'),
    url(r'^sysadmin/#system-lib/$', fake_view, name='sys_list_system'),
    url(r'^sysadmin/#trash-libs/$', fake_view, name='sys_repo_trash'),
    url(r'^sysadmin/#search-libs/$', fake_view, name='sys_repo_search'),
    url(r'^sysadmin/#search-trash-libs/$', fake_view, name='sys_trash_repo_search'),
    url(r'^sysadmin/#search-groups/$', fake_view, name='sys_group_search'),
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
    url(r'^sys/orgadmin/(?P<org_id>\d+)/traffic/$', sys_org_info_traffic, name='sys_org_info_traffic'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/setting/$', sys_org_info_setting, name='sys_org_info_setting'),
    url(r'^sys/instadmin/$', sys_inst_admin, name='sys_inst_admin'),
    url(r'^sys/instadmin/(?P<inst_id>\d+)/remove/$', sys_inst_remove, name='sys_inst_remove'),
    url(r'^sys/instadmin/(?P<inst_id>\d+)/users/$', sys_inst_info_user, name='sys_inst_info_users'),
    url(r'^sys/instadmin/(?P<inst_id>\d+)/users/add/$', sys_inst_add_user, name='sys_inst_add_user'),
    url(r'^sys/instadmin/(?P<inst_id>\d+)/users/search/$', sys_inst_search_user, name='sys_inst_search_user'),
    url(r'^sys/instadmin/(?P<inst_id>\d+)/admins/$', sys_inst_info_admins, name='sys_inst_info_admins'),
    url(r'^sys/instadmin/(?P<inst_id>\d+)/toggleadmin/(?P<email>[^/]+)/$', sys_inst_toggle_admin, name='sys_inst_toggle_admin'),
    url(r'^sys/instadmin/(?P<inst_id>\d+)/set_quota/$', sys_inst_set_quota, name='sys_inst_set_quota'),
    url(r'^sys/publinkadmin/$', sys_publink_admin, name='sys_publink_admin'),
    url(r'^sys/publink/remove/$', sys_publink_remove, name='sys_publink_remove'),
    url(r'^sys/uploadlinkadmin/$', sys_upload_link_admin, name='sys_upload_link_admin'),
    url(r'^sys/uploadlink/remove/$', sys_upload_link_remove, name='sys_upload_link_remove'),
    url(r'^sys/link-search/$', sys_link_search, name="sys_link_search"),
    url(r'^sys/notificationadmin/', notification_list, name='notification_list'),
    url(r'^sys/invitationadmin/$', sys_invitation_admin, name='sys_invitation_admin'),
    url(r'^sys/invitationadmin/remove/$', sys_invitation_remove, name='sys_invitation_remove'),
    url(r'^sys/sudo/', sys_sudo_mode, name='sys_sudo_mode'),
    url(r'^sys/check-license/', sys_check_license, name='sys_check_license'),
    url(r'^useradmin/add/$', user_add, name="user_add"),
    url(r'^useradmin/remove/(?P<email>[^/]+)/$', user_remove, name="user_remove"),
    url(r'^useradmin/removetrial/(?P<user_or_org>[^/]+)/$', remove_trial, name="remove_trial"),
    url(r'^useradmin/search/$', user_search, name="user_search"),
    url(r'^useradmin/removeadmin/(?P<email>[^/]+)/$', user_remove_admin, name='user_remove_admin'),
    url(r'^useradmin/info/(?P<email>[^/]+)/$', user_info, name='user_info'),
    url(r'^useradmin/toggle_status/(?P<email>[^/]+)/$', user_toggle_status, name='user_toggle_status'),
    url(r'^useradmin/toggle_role/(?P<email>[^/]+)/$', user_toggle_role, name='user_toggle_role'),
    url(r'^useradmin/(?P<email>[^/]+)/set_quota/$', user_set_quota, name='user_set_quota'),
    url(r'^sys/termsadmin/$', sys_terms_admin, name='sys_terms_admin'),
    url(r'^sys/termsadmin/delete/(?P<pk>[^/]+)/$', sys_delete_terms, name='sys_delete_terms'),
    url(r'^useradmin/password/reset/(?P<email>[^/]+)/$', user_reset, name='user_reset'),
    url(r'^useradmin/batchmakeadmin/$', batch_user_make_admin, name='batch_user_make_admin'),
    url(r'^useradmin/batchadduser/$', batch_add_user, name='batch_add_user'),
    url(r'^useradmin/batchadduser/example/$', batch_add_user_example, name='batch_add_user_example'),

    url(r'^client-login/$', client_token_login, name='client_token_login'),
]

from seahub.utils import EVENTS_ENABLED
if EVENTS_ENABLED:
    urlpatterns += [
        url(r'^sys/virus_scan_records/$', sys_virus_scan_records, name='sys_virus_scan_records'),
        url(r'^sys/virus_scan_records/delete/(?P<vid>\d+)/$', sys_delete_virus_scan_records, name='sys_delete_virus_scan_records'),
    ]

if settings.SERVE_STATIC:
    from django.views.static import serve as static_view
    media_url = settings.MEDIA_URL.strip('/')
    urlpatterns += [
        url(r'^%s/(?P<path>.*)$' % (media_url), static_view,
            {'document_root': settings.MEDIA_ROOT}),
    ]

urlpatterns += [
    url(r'^demo/', demo),
]

from seahub.utils import HAS_FILE_SEARCH
if HAS_FILE_SEARCH:
    from seahub_extra.search.views import search, pubuser_search
    urlpatterns += [
        url(r'^search/$', search, name='search'),
        url(r'^pubinfo/users/search/$', pubuser_search, name='pubuser_search'),
    ]

if getattr(settings, 'ENABLE_PAYMENT', False):
    urlpatterns += [
        url(r'^pay/', include('seahub_extra.pay.urls')),
    ]


if getattr(settings, 'ENABLE_SYSADMIN_EXTRA', False):
    from seahub_extra.sysadmin_extra.views import sys_login_admin, \
        sys_log_file_audit, sys_log_file_update, sys_log_perm_audit, \
        sys_login_admin_export_excel, sys_log_file_audit_export_excel, \
        sys_log_file_update_export_excel, sys_log_perm_audit_export_excel, \
        sys_log_email_audit
    urlpatterns += [
        url(r'^api/v2.1/admin/logs/login/$', LoginLogs.as_view(), name='api-v2.1-admin-logs-login'),
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
    ]

if getattr(settings, 'MULTI_TENANCY', False):
    urlpatterns += [
        url(r'^api/v2.1/org/', include('seahub_extra.organizations.api_urls')),
        url(r'^org/', include('seahub_extra.organizations.urls')),
    ]

if getattr(settings, 'ENABLE_SHIB_LOGIN', False):
    urlpatterns += [
        url(r'^shib-complete/', TemplateView.as_view(template_name='shibboleth/complete.html'), name="shib_complete"),
        url(r'^shib-success/', TemplateView.as_view(template_name="shibboleth/success.html"), name="shib_success"),
    ]


if getattr(settings, 'ENABLE_KRB5_LOGIN', False):
    urlpatterns += [
        url(r'^krb5-login/', shib_login, name="krb5_login"),
    ]

# serve office converter static files
from seahub.utils import HAS_OFFICE_CONVERTER, CLUSTER_MODE, OFFICE_CONVERTOR_NODE
if HAS_OFFICE_CONVERTER:
    from seahub.views.file import (
        office_convert_query_status, office_convert_get_page, office_convert_add_task
    )
    urlpatterns += [
        url(r'^office-convert/static/(?P<repo_id>[-0-9a-f]{36})/(?P<commit_id>[0-9a-f]{40})/(?P<path>.+)/(?P<filename>[^/].+)$',
            office_convert_get_page,
            name='office_convert_get_page'),
        url(r'^office-convert/status/$', office_convert_query_status, name='office_convert_query_status'),
    ]

    if CLUSTER_MODE and OFFICE_CONVERTOR_NODE:
        urlpatterns += [
            url(r'^office-convert/internal/add-task/$', office_convert_add_task),
            url(r'^office-convert/internal/status/$', office_convert_query_status, {'cluster_internal': True}),
            url(r'^office-convert/internal/static/(?P<repo_id>[-0-9a-f]{36})/(?P<commit_id>[0-9a-f]{40})/(?P<path>.+)/(?P<filename>[^/].+)$',
                office_convert_get_page, {'cluster_internal': True}),
        ]

if TRAFFIC_STATS_ENABLED:
    from seahub.views.sysadmin import sys_traffic_admin
    urlpatterns += [
        url(r'^sys/trafficadmin/$', sys_traffic_admin, name='sys_trafficadmin'),
    ]

if getattr(settings, 'ENABLE_ADFS_LOGIN', False):
    from seahub_extra.adfs_auth.views import assertion_consumer_service, \
        auth_complete
    urlpatterns += [
        url(r'^saml2/acs/$', assertion_consumer_service, name='saml2_acs'),
        url(r'^saml2/complete/$', auth_complete, name='saml2_complete'),
        url(r'^saml2/', include('djangosaml2.urls')),
    ]

if getattr(settings, 'ENABLE_ONLYOFFICE', False):
    from seahub.onlyoffice.views import onlyoffice_editor_callback
    urlpatterns += [
        url(r'^onlyoffice/editor-callback/$', onlyoffice_editor_callback, name='onlyoffice_editor_callback'),
    ]

if getattr(settings, 'ENABLE_CAS', False):
    from seahub_extra.django_cas_ng.views import login as cas_login
    from seahub_extra.django_cas_ng.views import logout as cas_logout
    from seahub_extra.django_cas_ng.views import callback as cas_callback
    urlpatterns += [
        url(r'^accounts/cas-login/$', cas_login, name='cas_ng_login'),
        url(r'^accounts/cas-logout/$', cas_logout, name='cas_ng_logout'),
        url(r'^accounts/cas-callback/$', cas_callback, name='cas_ng_proxy_callback'),
    ]
