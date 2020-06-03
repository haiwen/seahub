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
    view_snapshot_file, view_shared_file, view_file_via_shared_dir,\
    text_diff, view_raw_file, download_file, view_lib_file, \
    file_access, view_lib_file_via_smart_link, view_media_file_via_share_link, \
    view_media_file_via_public_wiki
from seahub.views.repo import repo_history_view, repo_snapshot, view_shared_dir, \
    view_shared_upload_link, view_lib_as_wiki

from seahub.dingtalk.views import dingtalk_login, dingtalk_callback, \
        dingtalk_connect, dingtalk_connect_callback, dingtalk_disconnect

from seahub.api2.endpoints.smart_link import SmartLink, SmartLinkToken
from seahub.api2.endpoints.groups import Groups, Group
from seahub.api2.endpoints.all_groups import AllGroups
from seahub.api2.endpoints.departments import Departments
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
from seahub.api2.endpoints.share_links import ShareLinks, ShareLink, \
        ShareLinkOnlineOfficeLock, ShareLinkDirents
from seahub.api2.endpoints.shared_folders import SharedFolders
from seahub.api2.endpoints.shared_repos import SharedRepos, SharedRepo
from seahub.api2.endpoints.upload_links import UploadLinks, UploadLink, \
        UploadLinkUpload
from seahub.api2.endpoints.repos_batch import ReposBatchView, \
        ReposBatchCopyDirView, ReposBatchCreateDirView, \
        ReposBatchCopyItemView, ReposBatchMoveItemView, \
        ReposAsyncBatchCopyItemView, ReposAsyncBatchMoveItemView, \
        ReposSyncBatchCopyItemView, ReposSyncBatchMoveItemView, \
        ReposBatchDeleteItemView
from seahub.api2.endpoints.repos import RepoView, ReposView
from seahub.api2.endpoints.file import FileView
from seahub.api2.endpoints.file_history import FileHistoryView, NewFileHistoryView
from seahub.api2.endpoints.dir import DirView, DirDetailView
from seahub.api2.endpoints.file_tag import FileTagView
from seahub.api2.endpoints.file_tag import FileTagsView
from seahub.api2.endpoints.repo_trash import RepoTrash
from seahub.api2.endpoints.repo_commit import RepoCommitView
from seahub.api2.endpoints.repo_commit_dir import RepoCommitDirView
from seahub.api2.endpoints.repo_commit_revert import RepoCommitRevertView
from seahub.api2.endpoints.deleted_repos import DeletedRepos
from seahub.api2.endpoints.repo_history import RepoHistory
from seahub.api2.endpoints.repo_set_password import RepoSetPassword
from seahub.api2.endpoints.repo_send_new_password import RepoSendNewPassword
from seahub.api2.endpoints.zip_task import ZipTaskView
from seahub.api2.endpoints.share_link_zip_task import ShareLinkZipTaskView
from seahub.api2.endpoints.query_zip_progress import QueryZipProgressView
from seahub.api2.endpoints.cancel_zip_task import CancelZipTaskView
from seahub.api2.endpoints.copy_move_task import CopyMoveTaskView
from seahub.api2.endpoints.query_copy_move_progress import QueryCopyMoveProgressView
from seahub.api2.endpoints.move_folder_merge import MoveFolderMergeView
from seahub.api2.endpoints.invitations import InvitationsView, InvitationsBatchView
from seahub.api2.endpoints.invitation import InvitationView, InvitationRevokeView
from seahub.api2.endpoints.repo_share_invitations import RepoShareInvitationsView, RepoShareInvitationsBatchView
from seahub.api2.endpoints.repo_share_invitation import RepoShareInvitationView
from seahub.api2.endpoints.notifications import NotificationsView, NotificationView
from seahub.api2.endpoints.repo_file_uploaded_bytes import RepoFileUploadedBytesView
from seahub.api2.endpoints.user_avatar import UserAvatarView
from seahub.api2.endpoints.wikis import WikisView, WikiView
from seahub.api2.endpoints.drafts import DraftsView, DraftView
from seahub.api2.endpoints.draft_reviewer import DraftReviewerView
from seahub.api2.endpoints.repo_draft_info import RepoDraftInfo, RepoDraftCounts
from seahub.api2.endpoints.activities import ActivitiesView
from seahub.api2.endpoints.wiki_pages import WikiPagesDirView, WikiPageContentView
from seahub.api2.endpoints.revision_tag import TaggedItemsView, TagNamesView
from seahub.api2.endpoints.user import User
from seahub.api2.endpoints.repo_tags import RepoTagsView, RepoTagView
from seahub.api2.endpoints.file_tag import RepoFileTagsView, RepoFileTagView
from seahub.api2.endpoints.tag_filter_file import TaggedFilesView
from seahub.api2.endpoints.related_files import RelatedFilesView, RelatedFileView
from seahub.api2.endpoints.webdav_secret import WebdavSecretView
from seahub.api2.endpoints.starred_items import StarredItems
from seahub.api2.endpoints.markdown_lint import MarkdownLintView
from seahub.api2.endpoints.public_repos_search import PublishedRepoSearchView
from seahub.api2.endpoints.recent_added_files import RecentAddedFilesView
from seahub.api2.endpoints.repo_api_tokens import RepoAPITokensView, RepoAPITokenView
from seahub.api2.endpoints.via_repo_token import ViaRepoDirView, ViaRepoUploadLinkView, RepoInfoView, \
    ViaRepoDownloadLinkView
from seahub.api2.endpoints.abuse_reports import AbuseReportsView

from seahub.api2.endpoints.repo_share_links import RepoShareLinks, RepoShareLink
from seahub.api2.endpoints.repo_upload_links import RepoUploadLinks, RepoUploadLink

# Admin
from seahub.api2.endpoints.admin.abuse_reports import AdminAbuseReportsView, AdminAbuseReportView
from seahub.api2.endpoints.admin.revision_tag import AdminTaggedItemsView
from seahub.api2.endpoints.admin.login_logs import LoginLogs, AdminLoginLogs
from seahub.api2.endpoints.admin.file_audit import FileAudit
from seahub.api2.endpoints.admin.file_update import FileUpdate
from seahub.api2.endpoints.admin.perm_audit import PermAudit
from seahub.api2.endpoints.admin.sysinfo import SysInfo
from seahub.api2.endpoints.admin.web_settings import AdminWebSettings
from seahub.api2.endpoints.admin.statistics import (
    FileOperationsView, TotalStorageView, ActiveUsersView, SystemTrafficView, \
    SystemUserTrafficExcelView, SystemUserStorageExcelView, SystemUserTrafficView, \
    SystemOrgTrafficView
)
from seahub.api2.endpoints.admin.devices import AdminDevices
from seahub.api2.endpoints.admin.device_errors import AdminDeviceErrors
from seahub.api2.endpoints.admin.users import AdminUsers, AdminUser, AdminUserResetPassword, AdminAdminUsers, \
    AdminUserGroups, AdminUserShareLinks, AdminUserUploadLinks, AdminUserBeSharedRepos, \
    AdminLDAPUsers, AdminSearchUser
from seahub.api2.endpoints.admin.device_trusted_ip import AdminDeviceTrustedIP
from seahub.api2.endpoints.admin.libraries import AdminLibraries, AdminLibrary, \
        AdminSearchLibrary
from seahub.api2.endpoints.admin.library_dirents import AdminLibraryDirents, AdminLibraryDirent
from seahub.api2.endpoints.admin.system_library import AdminSystemLibrary, \
        AdminSystemLibraryUploadLink
from seahub.api2.endpoints.admin.default_library import AdminDefaultLibrary
from seahub.api2.endpoints.admin.trash_libraries import AdminTrashLibraries, AdminTrashLibrary
from seahub.api2.endpoints.admin.groups import AdminGroups, AdminGroup, AdminSearchGroup
from seahub.api2.endpoints.admin.group_libraries import AdminGroupLibraries, AdminGroupLibrary
from seahub.api2.endpoints.admin.group_members import AdminGroupMembers, AdminGroupMember
from seahub.api2.endpoints.admin.shares import AdminShares
from seahub.api2.endpoints.admin.share_links import AdminShareLinks, AdminShareLink, \
        AdminShareLinkDownload, AdminShareLinkCheckPassword, \
        AdminShareLinkDirents
from seahub.api2.endpoints.admin.upload_links import AdminUploadLinks, AdminUploadLink, \
        AdminUploadLinkUpload, AdminUploadLinkCheckPassword
from seahub.api2.endpoints.admin.users_batch import AdminUsersBatch, AdminAdminUsersBatch, \
        AdminImportUsers
from seahub.api2.endpoints.admin.operation_logs import AdminOperationLogs
from seahub.api2.endpoints.admin.organizations import AdminOrganizations, \
        AdminOrganization, AdminSearchOrganization
from seahub.api2.endpoints.admin.institutions import AdminInstitutions, AdminInstitution
from seahub.api2.endpoints.admin.institution_users import AdminInstitutionUsers, AdminInstitutionUser
from seahub.api2.endpoints.admin.org_users import AdminOrgUsers, AdminOrgUser
from seahub.api2.endpoints.admin.org_groups import AdminOrgGroups
from seahub.api2.endpoints.admin.org_repos import AdminOrgRepos
from seahub.api2.endpoints.admin.org_stats import AdminOrgStatsTraffic
from seahub.api2.endpoints.admin.logo import AdminLogo
from seahub.api2.endpoints.admin.favicon import AdminFavicon
from seahub.api2.endpoints.admin.license import AdminLicense
from seahub.api2.endpoints.admin.invitations import AdminInvitations, AdminInvitation
from seahub.api2.endpoints.admin.library_history import AdminLibraryHistoryLimit
from seahub.api2.endpoints.admin.login_bg_image import AdminLoginBgImage
from seahub.api2.endpoints.admin.admin_role import AdminAdminRole
from seahub.api2.endpoints.admin.address_book.groups import AdminAddressBookGroups, \
        AdminAddressBookGroup
from seahub.api2.endpoints.admin.group_owned_libraries import AdminGroupOwnedLibraries, \
        AdminGroupOwnedLibrary
from seahub.api2.endpoints.admin.user_activities import UserActivitiesView
from seahub.api2.endpoints.admin.file_scan_records import AdminFileScanRecords
from seahub.api2.endpoints.admin.notifications import AdminNotificationsView
from seahub.api2.endpoints.admin.sys_notifications import AdminSysNotificationsView, AdminSysNotificationView
from seahub.api2.endpoints.admin.logs import AdminLogsLoginLogs, AdminLogsFileAccessLogs, AdminLogsFileUpdateLogs, \
    AdminLogsSharePermissionLogs
from seahub.api2.endpoints.admin.terms_and_conditions import AdminTermsAndConditions, AdminTermAndCondition
from seahub.api2.endpoints.admin.work_weixin import AdminWorkWeixinDepartments, \
    AdminWorkWeixinDepartmentMembers, AdminWorkWeixinUsersBatch, AdminWorkWeixinDepartmentsImport
from seahub.api2.endpoints.admin.dingtalk import AdminDingtalkDepartments, \
        AdminDingtalkDepartmentMembers, AdminDingtalkUsersBatch, \
        AdminDingtalkDepartmentsImport
from seahub.api2.endpoints.admin.virus_scan_records import AdminVirusFilesView, AdminVirusFileView, \
    AdminVirusFilesBatchView
from seahub.api2.endpoints.file_participants import FileParticipantsView, FileParticipantView
from seahub.api2.endpoints.repo_related_users import RepoRelatedUsersView

urlpatterns = [
    url(r'^accounts/', include('seahub.base.registration_urls')),

    url(r'^sso/$', sso, name='sso'),
    url(r'^shib-login/', shib_login, name="shib_login"),
    url(r'^oauth/', include('seahub.oauth.urls')),

    url(r'^$', react_fake_view, name='libraries'),
    #url(r'^home/$', direct_to_template, { 'template': 'home.html' } ),
    url(r'^robots\.txt$', TemplateView.as_view(template_name='robots.txt', content_type='text/plain')),

    # revert repo
    url(r'^repo/history/revert/(?P<repo_id>[-0-9a-f]{36})/$', repo_revert_history, name='repo_revert_history'),

    url(r'^repo/upload_check/$', validate_filename),
    url(r'^repo/download_dir/(?P<repo_id>[-0-9a-f]{36})/$', repo_download_dir, name='repo_download_dir'),
    url(r'^repo/file_revisions/(?P<repo_id>[-0-9a-f]{36})/$', file_revisions, name='file_revisions'),
    url(r'^repo/file-access/(?P<repo_id>[-0-9a-f]{36})/$', file_access, name='file_access'),
    url(r'^repo/text_diff/(?P<repo_id>[-0-9a-f]{36})/$', text_diff, name='text_diff'),
    url(r'^repo/history/(?P<repo_id>[-0-9a-f]{36})/$', repo_history, name='repo_history'),
    url(r'^repo/history/view/(?P<repo_id>[-0-9a-f]{36})/$', repo_history_view, name='repo_history_view'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/snapshot/$', repo_snapshot, name="repo_snapshot"),
    url(r'^repo/recycle/(?P<repo_id>[-0-9a-f]{36})/$', repo_recycle_view, name='repo_recycle_view'),
    url(r'^dir/recycle/(?P<repo_id>[-0-9a-f]{36})/$', dir_recycle_view, name='dir_recycle_view'),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/trash/$', repo_folder_trash, name="repo_folder_trash"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/raw/(?P<file_path>.*)$', view_raw_file, name="view_raw_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/history/files/$', view_history_file, name="view_history_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/trash/files/$', view_trash_file, name="view_trash_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/snapshot/files/$', view_snapshot_file, name="view_snapshot_file"),
    url(r'^repo/(?P<repo_id>[-0-9a-f]{36})/(?P<obj_id>[0-9a-f]{40})/download/$', download_file, name='download_file'),

    ### lib (replace the old `repo` urls) ###
    # url(r'^lib/(?P<repo_id>[-0-9a-f]{36})/dir/(?P<path>.*)$', view_lib_dir, name='view_lib_dir'),
    url(r'^lib/(?P<repo_id>[-0-9a-f]{36})/file(?P<path>.*)$', view_lib_file, name='view_lib_file'),
    url(r'^wiki/lib/(?P<repo_id>[-0-9a-f]{36})/(?P<path>.*)$', view_lib_as_wiki, name='view_lib_as_wiki'),
    url(r'^smart-link/(?P<dirent_uuid>[-0-9a-f]{36})/(?P<dirent_name>.*)$', view_lib_file_via_smart_link, name="view_lib_file_via_smart_link"),

    ### share/upload link ###
    url(r'^f/(?P<token>[a-f0-9]+)/$', view_shared_file, name='view_shared_file'),
    url(r'^d/(?P<token>[a-f0-9]+)/$', view_shared_dir, name='view_shared_dir'),
    url(r'^d/(?P<token>[a-f0-9]+)/files/$', view_file_via_shared_dir, name='view_file_via_shared_dir'),
    url(r'^u/d/(?P<token>[a-f0-9]+)/$', view_shared_upload_link, name='view_shared_upload_link'),
    url(r'^view-image-via-share-link/$', view_media_file_via_share_link, name='view_media_file_via_share_link'),


    # dingtalk
    url(r'dingtalk/login/$', dingtalk_login, name='dingtalk_login'),
    url(r'dingtalk/callback/$', dingtalk_callback, name='dingtalk_callback'),
    url(r'dingtalk/connect/$', dingtalk_connect, name='dingtalk_connect'),
    url(r'dingtalk/connect-callback/$', dingtalk_connect_callback, name='dingtalk_connect_callback'),
    url(r'dingtalk/disconnect/$', dingtalk_disconnect, name='dingtalk_disconnect'),

    ### Misc ###
    url(r'^image-view/(?P<filename>.*)$', image_view, name='image_view'),
    url(r'^custom-css/$', custom_css_view, name='custom_css'),
    url(r'^i18n/$', i18n, name='i18n'),
    url(r'^convert_cmmt_desc_link/$', convert_cmmt_desc_link, name='convert_cmmt_desc_link'),
    url(r'^download_client_program/$', TemplateView.as_view(template_name="download.html"), name="download_client"),
    url(r'^choose_register/$', choose_register, name="choose_register"),

    ### React ###
    url(r'^dashboard/$', react_fake_view, name="dashboard"),
    url(r'^starred/$', react_fake_view, name="starred"),
    url(r'^linked-devices/$', react_fake_view, name="linked_devices"),
    url(r'^share-admin-libs/$', react_fake_view, name="share_admin_libs"),
    url(r'^share-admin-folders/$', react_fake_view, name="share_admin_folders"),
    url(r'^share-admin-share-links/$', react_fake_view, name="share_admin_share_links"),
    url(r'^share-admin-upload-links/$', react_fake_view, name="share_admin_upload_links"),
    url(r'^shared-libs/$', react_fake_view, name="shared_libs"),
    url(r'^my-libs/$', react_fake_view, name="my_libs"),
    url(r'^groups/$', react_fake_view, name="groups"),
    url(r'^group/(?P<group_id>\d+)/$', react_fake_view, name="group"),
    url(r'^library/(?P<repo_id>[-0-9a-f]{36})/$', react_fake_view, name="library_view"),
    url(r'^library/(?P<repo_id>[-0-9a-f]{36})/(?P<repo_name>[^/]+)/(?P<path>.*)$', react_fake_view, name="lib_view"),
    url(r'^my-libs/deleted/$', react_fake_view, name="my_libs_deleted"),
    url(r'^org/$', react_fake_view, name="org"),
    url(r'^invitations/$', react_fake_view, name="invitations"),

    url(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/history/changes/$', repo_history_changes, name='repo_history_changes'),
    url(r'^ajax/u/d/(?P<token>[-0-9a-f]+)/upload/$', get_file_upload_url_ul, name='get_file_upload_url_ul'),
    url(r'^ajax/upload-file-done/$', upload_file_done, name='upload_file_done'),

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

    # departments
    url(r'api/v2.1/departments/$', Departments.as_view(), name='api-v2.1-all-departments'),

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
    url(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/dirents/$', ShareLinkDirents.as_view(), name='api-v2.1-share-link-dirents'),
    url(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/online-office-lock/$',
            ShareLinkOnlineOfficeLock.as_view(), name='api-v2.1-share-link-online-office-lock'),

    ## user::shared-upload-links
    url(r'^api/v2.1/upload-links/$', UploadLinks.as_view(), name='api-v2.1-upload-links'),
    url(r'^api/v2.1/upload-links/(?P<token>[a-f0-9]+)/$', UploadLink.as_view(), name='api-v2.1-upload-link'),
    url(r'^api/v2.1/upload-links/(?P<token>[a-f0-9]+)/upload/$', UploadLinkUpload.as_view(), name='api-v2.1-upload-link-upload'),

    ## user::revision-tags
    url(r'^api/v2.1/revision-tags/tagged-items/$', TaggedItemsView.as_view(), name='api-v2.1-revision-tags-tagged-items'),
    url(r'^api/v2.1/revision-tags/tag-names/$', TagNamesView.as_view(), name='api-v2.1-revision-tags-tag-names'),

    ## user::repos-batch-operate
    # for icourt
    url(r'^api/v2.1/repos/batch/$', ReposBatchView.as_view(), name='api-v2.1-repos-batch'),
    url(r'^api/v2.1/repos/batch-copy-dir/$', ReposBatchCopyDirView.as_view(), name='api-v2.1-repos-batch-copy-dir'),
    url(r'^api/v2.1/repos/batch-create-dir/$', ReposBatchCreateDirView.as_view(), name='api-v2.1-repos-batch-create-dir'),
    url(r'^api/v2.1/repos/batch-copy-item/$', ReposBatchCopyItemView.as_view(), name='api-v2.1-repos-batch-copy-item'),
    url(r'^api/v2.1/repos/batch-move-item/$', ReposBatchMoveItemView.as_view(), name='api-v2.1-repos-batch-move-item'),

    url(r'^api/v2.1/repos/batch-delete-item/$', ReposBatchDeleteItemView.as_view(), name='api-v2.1-repos-batch-delete-item'),
    url(r'^api/v2.1/repos/async-batch-copy-item/$', ReposAsyncBatchCopyItemView.as_view(), name='api-v2.1-repos-async-batch-copy-item'),
    url(r'^api/v2.1/repos/async-batch-move-item/$', ReposAsyncBatchMoveItemView.as_view(), name='api-v2.1-repos-async-batch-move-item'),
    url(r'^api/v2.1/repos/sync-batch-copy-item/$', ReposSyncBatchCopyItemView.as_view(), name='api-v2.1-repos-sync-batch-copy-item'),
    url(r'^api/v2.1/repos/sync-batch-move-item/$', ReposSyncBatchMoveItemView.as_view(), name='api-v2.1-repos-sync-batch-move-item'),

    ## user::deleted repos
    url(r'^api/v2.1/deleted-repos/$', DeletedRepos.as_view(), name='api2-v2.1-deleted-repos'),

    ## user::repos
    url(r'^api/v2.1/repos/$', ReposView.as_view(), name='api-v2.1-repos-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/$', RepoView.as_view(), name='api-v2.1-repo-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/$', FileView.as_view(), name='api-v2.1-file-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/history/$', FileHistoryView.as_view(), name='api-v2.1-file-history-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/new_history/$', NewFileHistoryView.as_view(), name='api-v2.1-new-file-history-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/dir/$', DirView.as_view(), name='api-v2.1-dir-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/commits/(?P<commit_id>[0-9a-f]{40})/$', RepoCommitView.as_view(), name='api-v2.1-repo-commit'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/commits/(?P<commit_id>[0-9a-f]{40})/dir/$', RepoCommitDirView.as_view(), name='api-v2.1-repo-commit-dir'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/commits/(?P<commit_id>[0-9a-f]{40})/revert/$', RepoCommitRevertView.as_view(), name='api-v2.1-repo-commit-revert'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/dir/detail/$', DirDetailView.as_view(), name='api-v2.1-dir-detail-view'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/trash/$', RepoTrash.as_view(), name='api-v2.1-repo-trash'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/history/$', RepoHistory.as_view(), name='api-v2.1-repo-history'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/set-password/$', RepoSetPassword.as_view(), name="api-v2.1-repo-set-password"),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/send-new-password/$', RepoSendNewPassword.as_view(), name="api-v2.1-repo-send-new-password"),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/repo-tags/$', RepoTagsView.as_view(), name='api-v2.1-repo-tags'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/repo-tags/(?P<repo_tag_id>\d+)/$', RepoTagView.as_view(), name='api-v2.1-repo-tag'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file-tags/$', RepoFileTagsView.as_view(), name='api-v2.1-file-tags'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file-tags/(?P<file_tag_id>\d+)/$', RepoFileTagView.as_view(), name='api-v2.1-file-tag'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/tagged-files/(?P<repo_tag_id>\d+)/$', TaggedFilesView.as_view(), name='api-v2.1-tagged-files'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/participants/$', FileParticipantsView.as_view(), name='api-v2.1-file-participants'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/participant/$', FileParticipantView.as_view(), name='api-v2.1-file-participant'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/related-users/$', RepoRelatedUsersView.as_view(), name='api-v2.1-related-user'),

    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/share-links/$', RepoShareLinks.as_view(), name='api-v2.1-repo-share-links'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/share-links/(?P<token>[a-f0-9]+)/$', RepoShareLink.as_view(), name='api-v2.1-repo-share-link'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/upload-links/$', RepoUploadLinks.as_view(), name='api-v2.1-repo-upload-links'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/upload-links/(?P<token>[a-f0-9]+)/$', RepoUploadLink.as_view(), name='api-v2.1-repo-upload-link'),

    ## user:: repo-api-tokens
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/repo-api-tokens/$', RepoAPITokensView.as_view(), name='api-v2.1-repo-api-tokens'),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/repo-api-tokens/(?P<app_name>.*)/$', RepoAPITokenView.as_view(), name='api-v2.1-repo-api-token'),

    ## access repo from repo_api_tokens
    url(r'^api/v2.1/via-repo-token/dir/$', ViaRepoDirView.as_view(), name='via-repo-dir'),
    url(r'^api/v2.1/via-repo-token/upload-link/$', ViaRepoUploadLinkView.as_view(), name='via-upload-link'),
    url(r'^api/v2.1/via-repo-token/download-link/$', ViaRepoDownloadLinkView.as_view(), name='via-download-link'),
    url(r'^api/v2.1/via-repo-token/repo-info/$', RepoInfoView.as_view(), name='via-fetch-repo'),

    # user::related-files
    url(r'^api/v2.1/related-files/$', RelatedFilesView.as_view(), name='api-v2.1-related-files'),
    url(r'^api/v2.1/related-files/(?P<related_id>\d+)/$', RelatedFileView.as_view(), name='api-v2.1-related-file'),

    # user: markdown-lint
    url(r'^api/v2.1/markdown-lint/$', MarkdownLintView.as_view(), name='api-v2.1-markdown-lint'),

    # public repos search
    url(r'^api/v2.1/published-repo-search/$', PublishedRepoSearchView.as_view(), name='api-v2.1-published-repo-search'),

    url(r'^api/v2.1/recent-added-files/$', RecentAddedFilesView.as_view(), name='api-v2.1-recent-added-files'),

    # Deprecated
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/tags/$', FileTagsView.as_view(), name="api-v2.1-filetags-view"),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/tags/(?P<name>.*?)/$', FileTagView.as_view(), name="api-v2.1-filetag-view"),

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

    ## user::invitations
    url(r'^api/v2.1/invitations/$', InvitationsView.as_view()),
    url(r'^api/v2.1/invitations/batch/$', InvitationsBatchView.as_view()),
    url(r'^api/v2.1/invitations/(?P<token>[a-f0-9]{32})/$', InvitationView.as_view()),
    url(r'^api/v2.1/invitations/(?P<token>[a-f0-9]{32})/revoke/$', InvitationRevokeView.as_view()),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/shared/invitations/$', RepoShareInvitationsView.as_view(), name="api-v2.1-repo-share-invitations"),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/shared/invitations/batch/$', RepoShareInvitationsBatchView.as_view(), name="api-v2.1-repo-share-invitations-batch"),
    url(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/shared/invitation/$', RepoShareInvitationView.as_view(), name="api-v2.1-repo-share-invitation"),
    ## user::avatar
    url(r'^api/v2.1/user-avatar/$', UserAvatarView.as_view(), name='api-v2.1-user-avatar'),

    ## user:webdav
    url(r'^api/v2.1/webdav-secret/$', WebdavSecretView.as_view(), name='api-v2.1-webdav-secret'),

    ## user::starred-item
    url(r'^api/v2.1/starred-items/$', StarredItems.as_view(), name='api-v2.1-starred-items'),

    ## user::wiki
    url(r'^api/v2.1/wikis/$', WikisView.as_view(), name='api-v2.1-wikis'),
    url(r'^api/v2.1/wikis/(?P<slug>[^/]+)/$', WikiView.as_view(), name='api-v2.1-wiki'),
    url(r'^api/v2.1/wikis/(?P<slug>[^/]+)/dir/$', WikiPagesDirView.as_view(), name='api-v2.1-wiki-pages-dir'),
    url(r'^api/v2.1/wikis/(?P<slug>[^/]+)/content/$', WikiPageContentView.as_view(), name='api-v2.1-wiki-pages-content'),
    url(r'^view-image-via-public-wiki/$', view_media_file_via_public_wiki, name='view_media_file_via_public_wiki'),

    ## user::drafts
    url(r'^api/v2.1/drafts/$', DraftsView.as_view(), name='api-v2.1-drafts'),
    url(r'^api/v2.1/drafts/(?P<pk>\d+)/$', DraftView.as_view(), name='api-v2.1-draft'),

    url(r'^api/v2.1/drafts/(?P<pk>\d+)/reviewer/$', DraftReviewerView.as_view(), name='api-v2.1-draft-reviewer'),
    url(r'^api/v2.1/repo/(?P<repo_id>[-0-9a-f]{36})/drafts/$', RepoDraftInfo.as_view(), name='api-v2.1-repo-drafts'),
    url(r'^api/v2.1/repo/(?P<repo_id>[-0-9a-f]{36})/draft-counts/$', RepoDraftCounts.as_view(), name='api-v2.1-repo-draft-counts'),

    ## user::activities
    url(r'^api/v2.1/activities/$', ActivitiesView.as_view(), name='api-v2.1-acitvity'),

    # admin: activities
    url(r'^api/v2.1/admin/user-activities/$', UserActivitiesView.as_view(), name='api-v2.1-admin-user-activity'),

    ## user::abuse-report
    # user report an abuse file
    url(r'^api/v2.1/abuse-reports/$', AbuseReportsView.as_view(), name='api-v2.1-abuse-reports'),

    ## admin::abuse-reports
    # admin get all abuse reports
    url(r'^api/v2.1/admin/abuse-reports/$', AdminAbuseReportsView.as_view(), name='api-v2.1-admin-abuse-reports'),
    url(r'^api/v2.1/admin/abuse-reports/(?P<pk>\d+)/$', AdminAbuseReportView.as_view(), name='api-v2.1-admin-abuse-report'),


    ## admin::sysinfo
    url(r'^api/v2.1/admin/sysinfo/$', SysInfo.as_view(), name='api-v2.1-sysinfo'),

    ## admin:web settings
    url(r'^api/v2.1/admin/web-settings/$', AdminWebSettings.as_view(), name='api-v2.1-web-settings'),

    ## admin::revision-tags
    url(r'^api/v2.1/admin/revision-tags/tagged-items/$', AdminTaggedItemsView.as_view(), name='api-v2.1-admin-revision-tags-tagged-items'),

    ## admin::statistics
    url(r'^api/v2.1/admin/statistics/file-operations/$', FileOperationsView.as_view(), name='api-v2.1-admin-statistics-file-operations'),
    url(r'^api/v2.1/admin/statistics/total-storage/$', TotalStorageView.as_view(), name='api-v2.1-admin-statistics-total-storage'),
    url(r'^api/v2.1/admin/statistics/active-users/$', ActiveUsersView.as_view(), name='api-v2.1-admin-statistics-active-users'),
    url(r'^api/v2.1/admin/statistics/system-traffic/$', SystemTrafficView.as_view(), name='api-v2.1-admin-statistics-system-traffic'),
    url(r'^api/v2.1/admin/statistics/system-user-traffic/$', SystemUserTrafficView.as_view(), name='api-v2.1-admin-statistics-system-user-traffic'),
    url(r'^api/v2.1/admin/statistics/system-org-traffic/$', SystemOrgTrafficView.as_view(), name='api-v2.1-admin-statistics-system-org-traffic'),
    url(r'^api/v2.1/admin/statistics/system-user-traffic/excel/$', SystemUserTrafficExcelView.as_view(), name='api-v2.1-admin-statistics-system-user-traffic-excel'),
    url(r'^api/v2.1/admin/statistics/system-user-storage/excel/$', SystemUserStorageExcelView.as_view(), name='api-v2.1-admin-statistics-system-user-storage-excel'),
    ## admin::users
    url(r'^api/v2.1/admin/users/$', AdminUsers.as_view(), name='api-v2.1-admin-users'),
    url(r'^api/v2.1/admin/ldap-users/$', AdminLDAPUsers.as_view(), name='api-v2.1-admin-ldap-users'),
    url(r'^api/v2.1/admin/search-user/$', AdminSearchUser.as_view(), name='api-v2.1-admin-search-user'),
    # [^...] Matches any single character not in brackets
    # + Matches between one and unlimited times, as many times as possible
    url(r'^api/v2.1/admin/users/(?P<email>[^/]+@[^/]+)/$', AdminUser.as_view(), name='api-v2.1-admin-user'),
    url(r'^api/v2.1/admin/users/(?P<email>[^/]+@[^/]+)/reset-password/$', AdminUserResetPassword.as_view(), name='api-v2.1-admin-user-reset-password'),
    url(r'^api/v2.1/admin/users/(?P<email>[^/]+@[^/]+)/groups/$', AdminUserGroups.as_view(), name='api-v2.1-admin-user-groups'),
    url(r'^api/v2.1/admin/users/(?P<email>[^/]+@[^/]+)/share-links/$', AdminUserShareLinks.as_view(), name='api-v2.1-admin-user-share-links'),
    url(r'^api/v2.1/admin/users/(?P<email>[^/]+@[^/]+)/upload-links/$', AdminUserUploadLinks.as_view(), name='api-v2.1-admin-user-upload-links'),
    url(r'^api/v2.1/admin/users/(?P<email>[^/]+@[^/]+)/beshared-repos/$', AdminUserBeSharedRepos.as_view(), name='api-v2.1-admin-user-beshared-repos'),

    url(r'^api/v2.1/admin/admin-users/$', AdminAdminUsers.as_view(), name='api-v2.1-admin-admin-users'),

    ## admin::users-batch
    url(r'^api/v2.1/admin/admin-users/batch/$', AdminAdminUsersBatch.as_view(), name='api-v2.1-admin-users-batch'),
    url(r'^api/v2.1/admin/users/batch/$', AdminUsersBatch.as_view(), name='api-v2.1-admin-users-batch'),
    url(r'^api/v2.1/admin/import-users/$', AdminImportUsers.as_view(), name='api-v2.1-admin-import-users'),

    ## admin::devices
    url(r'^api/v2.1/admin/devices/$', AdminDevices.as_view(), name='api-v2.1-admin-devices'),
    url(r'^api/v2.1/admin/device-errors/$', AdminDeviceErrors.as_view(), name='api-v2.1-admin-device-errors'),
    url(r'^api/v2.1/admin/device-trusted-ip/$', AdminDeviceTrustedIP.as_view(), name='api-v2.1-admin-device-trusted-ip'),

    ## admin::libraries
    url(r'^api/v2.1/admin/libraries/$', AdminLibraries.as_view(), name='api-v2.1-admin-libraries'),
    url(r'^api/v2.1/admin/search-library/$', AdminSearchLibrary.as_view(), name='api-v2.1-admin-search-library'),
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
    url(r'^api/v2.1/admin/search-group/$', AdminSearchGroup.as_view(), name='api-v2.1-admin-search-group'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/$', AdminGroup.as_view(), name='api-v2.1-admin-group'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/libraries/$', AdminGroupLibraries.as_view(), name='api-v2.1-admin-group-libraries'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminGroupLibrary.as_view(), name='api-v2.1-admin-group-library'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/members/$', AdminGroupMembers.as_view(), name='api-v2.1-admin-group-members'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/members/(?P<email>[^/]+)/$', AdminGroupMember.as_view(), name='api-v2.1-admin-group-member'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/group-owned-libraries/$', AdminGroupOwnedLibraries.as_view(), name='api-v2.1-admin-group-owned-libraries'),
    url(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminGroupOwnedLibrary.as_view(), name='api-v2.1-admin-owned-group-library'),

    ## admin::shares
    url(r'^api/v2.1/admin/shares/$', AdminShares.as_view(), name='api-v2.1-admin-shares'),

    ## admin::logs
    url(r'^api/v2.1/admin/logs/login-logs/$', AdminLogsLoginLogs.as_view(), name='api-v2.1-admin-logs-login-logs'),
    url(r'^api/v2.1/admin/logs/file-access-logs/$', AdminLogsFileAccessLogs.as_view(), name='api-v2.1-admin-logs-file-access-logs'),
    url(r'^api/v2.1/admin/logs/file-update-logs/$', AdminLogsFileUpdateLogs.as_view(), name='api-v2.1-admin-logs-file-update-logs'),
    url(r'^api/v2.1/admin/logs/share-permission-logs/$', AdminLogsSharePermissionLogs.as_view(), name='api-v2.1-admin-logs-share-permission-logs'),

    ## admin::admin logs
    url(r'^api/v2.1/admin/admin-logs/$', AdminOperationLogs.as_view(), name='api-v2.1-admin-admin-operation-logs'),
    url(r'^api/v2.1/admin/admin-login-logs/$', AdminLoginLogs.as_view(), name='api-v2.1-admin-admin-login-logs'),

    ## admin::share-links
    url(r'^api/v2.1/admin/share-links/$', AdminShareLinks.as_view(), name='api-v2.1-admin-share-links'),
    url(r'^api/v2.1/admin/share-links/(?P<token>[a-f0-9]+)/$', AdminShareLink.as_view(), name='api-v2.1-admin-share-link'),
    url(r'^api/v2.1/admin/share-links/(?P<token>[a-f0-9]+)/download/$',
            AdminShareLinkDownload.as_view(), name='api-v2.1-admin-share-link-download'),
    url(r'^api/v2.1/admin/share-links/(?P<token>[a-f0-9]+)/check-password/$',
            AdminShareLinkCheckPassword.as_view(), name='api-v2.1-admin-share-link-check-password'),
    url(r'^api/v2.1/admin/share-links/(?P<token>[a-f0-9]+)/dirents/$',
            AdminShareLinkDirents.as_view(), name='api-v2.1-admin-share-link-dirents'),

    ## admin::upload-links
    url(r'^api/v2.1/admin/upload-links/$', AdminUploadLinks.as_view(), name='api-v2.1-admin-upload-links'),
    url(r'^api/v2.1/admin/upload-links/(?P<token>[a-f0-9]+)/$', AdminUploadLink.as_view(), name='api-v2.1-admin-upload-link'),
    url(r'^api/v2.1/admin/upload-links/(?P<token>[a-f0-9]+)/upload/$',
            AdminUploadLinkUpload.as_view(), name='api-v2.1-admin-upload-link-upload'),
    url(r'^api/v2.1/admin/upload-links/(?P<token>[a-f0-9]+)/check-password/$',
            AdminUploadLinkCheckPassword.as_view(), name='api-v2.1-admin-upload-link-check-password'),

    ## admin::admin-role
    url(r'^api/v2.1/admin/admin-role/$', AdminAdminRole.as_view(), name='api-v2.1-admin-admin-role'),

    ## admin::organizations
    url(r'^api/v2.1/admin/organizations/$', AdminOrganizations.as_view(), name='api-v2.1-admin-organizations'),
    url(r'^api/v2.1/admin/search-organization/$', AdminSearchOrganization.as_view(), name='api-v2.1-admin-Search-organization'),
    url(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/$', AdminOrganization.as_view(), name='api-v2.1-admin-organization'),
    url(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/users/$', AdminOrgUsers.as_view(), name='api-v2.1-admin-org-users'),
    url(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/users/(?P<email>[^/]+)/$', AdminOrgUser.as_view(), name='api-v2.1-admin-org-user'),
    url(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/groups/$', AdminOrgGroups.as_view(),name='api-v2.1-admin-org-groups'),
    url(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/repos/$', AdminOrgRepos.as_view(),name='api-v2.1-admin-org-repos'),
    url(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/statistics/traffic/$', AdminOrgStatsTraffic.as_view(), name='api-v2.1-admin-org-stats-traffic'),

    ## admin::institutions
    url(r'^api/v2.1/admin/institutions/$', AdminInstitutions.as_view(), name='api-v2.1-admin-institutions'),
    url(r'^api/v2.1/admin/institutions/(?P<institution_id>\d+)/$', AdminInstitution.as_view(), name='api-v2.1-admin-institution'),
    url(r'^api/v2.1/admin/institutions/(?P<institution_id>\d+)/users/$', AdminInstitutionUsers.as_view(), name='api-v2.1-admin-institution-users'),
    url(r'^api/v2.1/admin/institutions/(?P<institution_id>\d+)/users/(?P<email>[^/]+)/$', AdminInstitutionUser.as_view(), name='api-v2.1-admin-institution-user'),

    ## admin::logo
    url(r'^api/v2.1/admin/logo/$', AdminLogo.as_view(), name='api-v2.1-admin-logo'),
    url(r'^api/v2.1/admin/favicon/$', AdminFavicon.as_view(), name='api-v2.1-admin-favicon'),
    url(r'^api/v2.1/admin/license/$', AdminLicense.as_view(), name='api-v2.1-admin-license'),
    url(r'^api/v2.1/admin/login-background-image/$', AdminLoginBgImage.as_view(), name='api-v2.1-admin-login-background-image'),

    ## admin::invitations
    url(r'^api/v2.1/admin/invitations/$', AdminInvitations.as_view(), name='api-v2.1-admin-invitations'),
    url(r'^api/v2.1/admin/invitations/(?P<token>[a-f0-9]{32})/$', AdminInvitation.as_view(), name='api-v2.1-admin-invitation'),

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
    url(r'^published/', include('seahub.wiki.urls', app_name='wiki', namespace='wiki')),
    url(r'^work-weixin/', include('seahub.work_weixin.urls')),
    url(r'^weixin/', include('seahub.weixin.urls')),
    # Must specify a namespace if specifying app_name.
    url(r'^drafts/', include('seahub.drafts.urls', app_name='drafts', namespace='drafts')),

    ## admin::address book
    url(r'^api/v2.1/admin/address-book/groups/$', AdminAddressBookGroups.as_view(), name='api-v2.1-admin-address-book-groups'),
    url(r'^api/v2.1/admin/address-book/groups/(?P<group_id>\d+)/$', AdminAddressBookGroup.as_view(), name='api-v2.1-admin-address-book-group'),

    ## admin::file-scan-records
    url(r'^api/v2.1/admin/file-scan-records/$', AdminFileScanRecords.as_view(), name='api-v2.1-admin-file-scan-records'),

    # admin::virus-files
    url(r'^api/v2.1/admin/virus-files/$', AdminVirusFilesView.as_view(), name='api-v2.1-admin-virus-files'),
    url(r'^api/v2.1/admin/virus-files/(?P<virus_id>\d+)/$', AdminVirusFileView.as_view(), name='api-v2.1-admin-virus-file'),
    url(r'^api/v2.1/admin/virus-files/batch/$', AdminVirusFilesBatchView.as_view(), name='api-v2.1-admin-virus-files-batch'),

    ## admin::notifications
    url(r'^api/v2.1/admin/notifications/$', AdminNotificationsView.as_view(), name='api-2.1-admin-notifications'),
    url(r'^api/v2.1/admin/sys-notifications/$', AdminSysNotificationsView.as_view(), name='api-2.1-admin-sys-notifications'),
    url(r'^api/v2.1/admin/sys-notifications/(?P<nid>\d+)/$', AdminSysNotificationView.as_view(),name='api-2.1-admin-sys-notification'),

    ## admin::terms and conditions
    url(r'^api/v2.1/admin/terms-and-conditions/$', AdminTermsAndConditions.as_view(), name='api-v2.1-admin-terms-and-conditions'),
    url(r'^api/v2.1/admin/terms-and-conditions/(?P<term_id>\d+)/$', AdminTermAndCondition.as_view(), name='api-v2.1-admin-term-and-condition'),

    ## admin::work weixin departments
    url(r'^api/v2.1/admin/work-weixin/departments/$', AdminWorkWeixinDepartments.as_view(), name='api-v2.1-admin-work-weixin-departments'),
    url(r'^api/v2.1/admin/work-weixin/departments/(?P<department_id>\d+)/members/$', AdminWorkWeixinDepartmentMembers.as_view(), name='api-v2.1-admin-work-weixin-department-members'),
    url(r'^api/v2.1/admin/work-weixin/users/batch/$', AdminWorkWeixinUsersBatch.as_view(), name='api-v2.1-admin-work-weixin-users'),
    url(r'^api/v2.1/admin/work-weixin/departments/import/$', AdminWorkWeixinDepartmentsImport.as_view(), name='api-v2.1-admin-work-weixin-department-import'),

    ## admin:dingtalk departments
    url(r'^api/v2.1/admin/dingtalk/departments/$', AdminDingtalkDepartments.as_view(), name='api-v2.1-admin-dingtalk-departments'),
    url(r'^api/v2.1/admin/dingtalk/departments/(?P<department_id>\d+)/members/$', AdminDingtalkDepartmentMembers.as_view(), name='api-v2.1-admin-dingtalk-department-members'),
    url(r'^api/v2.1/admin/dingtalk/users/batch/$', AdminDingtalkUsersBatch.as_view(), name='api-v2.1-admin-dingtalk-users-batch'),
    url(r'^api/v2.1/admin/dingtalk/departments/import/$', AdminDingtalkDepartmentsImport.as_view(), name='api-v2.1-admin-dingtalk-department-import'),

    ### system admin ###
    url(r'^sys/seafadmin/delete/(?P<repo_id>[-0-9a-f]{36})/$', sys_repo_delete, name='sys_repo_delete'),
    url(r'^sys/useradmin/export-excel/$', sys_useradmin_export_excel, name='sys_useradmin_export_excel'),
    url(r'^sys/groupadmin/export-excel/$', sys_group_admin_export_excel, name='sys_group_admin_export_excel'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/set_quota/$', sys_org_set_quota, name='sys_org_set_quota'),
    url(r'^sys/orgadmin/(?P<org_id>\d+)/set_member_quota/$', sys_org_set_member_quota, name='sys_org_set_member_quota'),
    url(r'^sys/sudo/', sys_sudo_mode, name='sys_sudo_mode'),
    url(r'^sys/check-license/', sys_check_license, name='sys_check_license'),
    url(r'^useradmin/add/$', user_add, name="user_add"),
    url(r'^useradmin/remove/(?P<email>[^/]+)/$', user_remove, name="user_remove"),
    url(r'^useradmin/removetrial/(?P<user_or_org>[^/]+)/$', remove_trial, name="remove_trial"),
    url(r'^useradmin/removeadmin/(?P<email>[^/]+)/$', user_remove_admin, name='user_remove_admin'),
    url(r'^useradmin/toggle_role/(?P<email>[^/]+)/$', user_toggle_role, name='user_toggle_role'),
    url(r'^useradmin/(?P<email>[^/]+)/set_quota/$', user_set_quota, name='user_set_quota'),
    url(r'^useradmin/password/reset/(?P<email>[^/]+)/$', user_reset, name='user_reset'),
    url(r'^useradmin/batchmakeadmin/$', batch_user_make_admin, name='batch_user_make_admin'),
    url(r'^useradmin/batchadduser/example/$', batch_add_user_example, name='batch_add_user_example'),

    url(r'^sys/info/$', sysadmin_react_fake_view, name="sys_info"),
    url(r'^sys/statistics/file/$', sysadmin_react_fake_view, name="sys_statistics_file"),
    url(r'^sys/statistics/storage/$', sysadmin_react_fake_view, name="sys_statistics_storage"),
    url(r'^sys/statistics/user/$', sysadmin_react_fake_view, name="sys_statistics_user"),
    url(r'^sys/statistics/traffic/$', sysadmin_react_fake_view, name="sys_statistics_traffic"),
    url(r'^sys/statistics/reports/$', sysadmin_react_fake_view, name="sys_statistics_reports"),
    url(r'^sys/desktop-devices/$', sysadmin_react_fake_view, name="sys_desktop_devices"),
    url(r'^sys/mobile-devices/$', sysadmin_react_fake_view, name="sys_mobile_devices"),
    url(r'^sys/device-errors/$', sysadmin_react_fake_view, name="sys_device_errors"),
    url(r'^sys/notifications/$', sysadmin_react_fake_view, name="sys_notifications"),
    url(r'^sys/web-settings/$', sysadmin_react_fake_view, name="sys_web_settings"),
    url(r'^sys/all-libraries/$', sysadmin_react_fake_view, name="sys_all_libraries"),
    url(r'^sys/search-libraries/$', sysadmin_react_fake_view, name="sys_search_libraries"),
    url(r'^sys/system-library/$', sysadmin_react_fake_view, name="sys_system_library"),
    url(r'^sys/trash-libraries/$', sysadmin_react_fake_view, name="sys_trash_libraries"),
    url(r'^sys/libraries/(?P<repo_id>[-0-9a-f]{36})/$', sysadmin_react_fake_view, name="sys_libraries_template"),
    url(r'^sys/libraries/(?P<repo_id>[-0-9a-f]{36})/(?P<repo_name>[^/]+)/(?P<path>.*)$', sysadmin_react_fake_view, name="sys_libraries_template_dirent"),
    url(r'^sys/groups/$', sysadmin_react_fake_view, name="sys_groups"),
    url(r'^sys/search-groups/$', sysadmin_react_fake_view, name="sys_search_groups"),
    url(r'^sys/groups/(?P<group_id>\d+)/libraries/$', sysadmin_react_fake_view, name="sys_group_libraries"),
    url(r'^sys/groups/(?P<group_id>\d+)/members/$', sysadmin_react_fake_view, name="sys_group_members"),
    url(r'^sys/departments/$', sysadmin_react_fake_view, name="sys_departments"),
    url(r'^sys/departments/(?P<group_id>\d+)/$', sysadmin_react_fake_view, name="sys_department"),
    url(r'^sys/users/$', sysadmin_react_fake_view, name="sys_users"),
    url(r'^sys/search-users/$', sysadmin_react_fake_view, name="sys_search_users"),
    url(r'^sys/users/admins/$', sysadmin_react_fake_view, name="sys_users_admin"),
    url(r'^sys/users/ldap/$', sysadmin_react_fake_view, name="sys_users_ldap"),
    url(r'^sys/users/ldap-imported/$', sysadmin_react_fake_view, name="sys_users_ldap_imported"),
    url(r'^sys/users/(?P<email>[^/]+)/$', sysadmin_react_fake_view, name="sys_user"),
    url(r'^sys/users/(?P<email>[^/]+)/owned-libraries/$', sysadmin_react_fake_view, name="sys_user_repos"),
    url(r'^sys/users/(?P<email>[^/]+)/shared-libraries/$', sysadmin_react_fake_view, name="sys_user_shared_repos"),
    url(r'^sys/users/(?P<email>[^/]+)/shared-links/$', sysadmin_react_fake_view, name="sys_user_shared_links"),
    url(r'^sys/users/(?P<email>[^/]+)/groups/$', sysadmin_react_fake_view, name="sys_user_groups"),
    url(r'^sys/logs/login/$', sysadmin_react_fake_view, name="sys_logs_login"),
    url(r'^sys/logs/file-access/$', sysadmin_react_fake_view, name="sys_logs_file_access"),
    url(r'^sys/logs/file-update/$', sysadmin_react_fake_view, name="sys_logs_file_update"),
    url(r'^sys/logs/share-permission/$', sysadmin_react_fake_view, name="sys_logs_share_permission"),
    url(r'^sys/admin-logs/operation/$', sysadmin_react_fake_view, name="sys_admin_logs_operation"),
    url(r'^sys/admin-logs/login/$', sysadmin_react_fake_view, name="sys_admin_logs_login"),
    url(r'^sys/organizations/$', sysadmin_react_fake_view, name="sys_organizations"),
    url(r'^sys/search-organizations/$', sysadmin_react_fake_view, name="sys_search_organizations"),
    url(r'^sys/organizations/(?P<org_id>\d+)/info/$', sysadmin_react_fake_view, name="sys_organization_info"),
    url(r'^sys/organizations/(?P<org_id>\d+)/users/$', sysadmin_react_fake_view, name="sys_organization_users"),
    url(r'^sys/organizations/(?P<org_id>\d+)/groups/$', sysadmin_react_fake_view, name="sys_organization_groups"),
    url(r'^sys/organizations/(?P<org_id>\d+)/libraries/$', sysadmin_react_fake_view, name="sys_organization_repos"),
    url(r'^sys/institutions/$', sysadmin_react_fake_view, name="sys_institutions"),
    url(r'^sys/institutions/(?P<inst_id>\d+)/info/$', sysadmin_react_fake_view, name="sys_institution_info"),
    url(r'^sys/institutions/(?P<inst_id>\d+)/members/$', sysadmin_react_fake_view, name="sys_institution_members"),
    url(r'^sys/institutions/(?P<inst_id>\d+)/admins/$', sysadmin_react_fake_view, name="sys_institution_admins"),
    url(r'^sys/terms-and-conditions/$', sysadmin_react_fake_view, name="terms_and_conditions"),
    url(r'^sys/share-links/$', sysadmin_react_fake_view, name="sys_share_links"),
    url(r'^sys/upload-links/$', sysadmin_react_fake_view, name="sys_upload_links"),
    url(r'^sys/work-weixin/$', sysadmin_react_fake_view, name="sys_work_weixin"),
    url(r'^sys/work-weixin/departments/$', sysadmin_react_fake_view, name="sys_work_weixin_departments"),
    url(r'^sys/dingtalk/$', sysadmin_react_fake_view, name="sys_dingtalk"),
    url(r'^sys/dingtalk/departments/$', sysadmin_react_fake_view, name="sys_dingtalk_departments"),
    url(r'^sys/invitations/$', sysadmin_react_fake_view, name="sys_invitations"),
    url(r'^sys/abuse-reports/$', sysadmin_react_fake_view, name="sys_abuse_reports"),

    url(r'^client-login/$', client_token_login, name='client_token_login'),
]

try:
    from seahub.settings import ENABLE_FILE_SCAN
except ImportError:
    ENABLE_FILE_SCAN = False
if ENABLE_FILE_SCAN:
    urlpatterns += [
        url(r'^sys/file-scan-records/$', sysadmin_react_fake_view, name="sys_file_scan_records"),
    ]

from seahub.utils import EVENTS_ENABLED
if EVENTS_ENABLED:
    urlpatterns += [
        url(r'^sys/virus-scan-records/$', sysadmin_react_fake_view, name='sys_virus_scan_records'),
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

if getattr(settings, 'ENABLE_SYSADMIN_EXTRA', False):
    from seahub_extra.sysadmin_extra.views import \
        sys_login_admin_export_excel, sys_log_file_audit_export_excel, \
        sys_log_file_update_export_excel, sys_log_perm_audit_export_excel
    urlpatterns += [
        url(r'^api/v2.1/admin/logs/login/$', LoginLogs.as_view(), name='api-v2.1-admin-logs-login'),
        url(r'^sys/loginadmin/export-excel/$', sys_login_admin_export_excel, name='sys_login_admin_export_excel'),

        url(r'^api/v2.1/admin/logs/file-audit/$', FileAudit.as_view(), name='api-v2.1-admin-logs-file-audit'),
        url(r'^sys/log/fileaudit/export-excel/$', sys_log_file_audit_export_excel, name='sys_log_file_audit_export_excel'),

        url(r'^api/v2.1/admin/logs/file-update/$', FileUpdate.as_view(), name='api-v2.1-admin-logs-file-update'),
        url(r'^sys/log/fileupdate/export-excel/$', sys_log_file_update_export_excel, name='sys_log_file_update_export_excel'),

        url(r'^api/v2.1/admin/logs/perm-audit/$', PermAudit.as_view(), name='api-v2.1-admin-logs-perm-audit'),
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
from seahub.utils import HAS_OFFICE_CONVERTER
if HAS_OFFICE_CONVERTER:
    from seahub.views.file import (
        office_convert_query_status, office_convert_get_page
    )
    urlpatterns += [
        url(r'^office-convert/static/(?P<repo_id>[-0-9a-f]{36})/(?P<commit_id>[0-9a-f]{40})/(?P<path>.+)/(?P<filename>[^/].+)$',
            office_convert_get_page, name='office_convert_get_page'),
        url(r'^office-convert/status/$', office_convert_query_status, name='office_convert_query_status'),
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

if getattr(settings, 'ENABLE_BISHENG_OFFICE', False):
    from seahub.bisheng_office.views import BishengOfficeView
    urlpatterns += [
        url(r'^api/v2.1/bisheng-office/$', BishengOfficeView.as_view(), name='api-v2.1-bisheng-office'),
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
