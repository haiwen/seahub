# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import include, path, re_path
from django.views.generic import TemplateView

from seahub.ai.apis import ImageCaption, GenerateSummary, GenerateFileTags, OCR, Translate, WritingAssistant, \
    ExtractText
from seahub.api2.endpoints.file_comments import FileCommentsView, FileCommentView, FileCommentRepliesView, \
    FileCommentReplyView
from seahub.api2.endpoints.share_link_auth import ShareLinkUserAuthView, ShareLinkEmailAuthView
from seahub.api2.endpoints.internal_api import InternalUserListView, InternalCheckShareLinkAccess, \
    InternalCheckFileOperationAccess, CheckThumbnailAccess, CheckShareLinkThumbnailAccess
from seahub.auth.views import multi_adfs_sso, login_simple_check
from seahub.views import *
from seahub.views.mobile import mobile_login
from seahub.views.sysadmin import *
from seahub.views.ajax import *
from seahub.views.sso import *
from seahub.views.sso_to_thirdpart import sso_to_thirdpart

from seahub.views.file import view_history_file, view_trash_file,\
    view_snapshot_file, view_shared_file, view_file_via_shared_dir,\
    text_diff, view_raw_file, download_file, view_lib_file, \
    view_lib_file_via_smart_link, view_media_file_via_share_link, \
    view_media_file_via_public_wiki, view_sdoc_revision
from seahub.views.repo import repo_history_view, repo_snapshot, view_shared_dir, \
    view_shared_upload_link, view_lib_as_wiki

from seahub.dingtalk.views import dingtalk_login, dingtalk_callback, \
        dingtalk_connect, dingtalk_connect_callback, dingtalk_disconnect

from seahub.api2.endpoints.search_file import SearchFile

from seahub.api2.endpoints.smart_link import SmartLink, SmartLinkToken
from seahub.api2.endpoints.groups import Groups, Group
from seahub.api2.endpoints.all_groups import AllGroups
from seahub.api2.endpoints.departments import Departments
from seahub.api2.endpoints.address_book.departments import AddressBookDepartments, \
        AddressBookDepartmentMembers
from seahub.api2.endpoints.shareable_groups import ShareableGroups
from seahub.api2.endpoints.group_libraries import GroupLibraries, GroupLibrary

from seahub.api2.endpoints.group_owned_libraries import GroupOwnedLibraries, \
        GroupOwnedLibrary, GroupOwnedLibraryUserFolderPermission, \
        GroupOwnedLibraryGroupFolderPermission, GroupOwnedLibraryUserShare, \
        GroupOwnedLibraryGroupShare, GroupOwnedLibraryUserShareInLibrary, \
        GroupOwnedLibraryTransferView
from seahub.api2.endpoints.address_book.groups import AddressBookGroupsSubGroups
from seahub.api2.endpoints.address_book.members import AddressBookGroupsSearchMember

from seahub.api2.endpoints.group_members import GroupMembers, GroupSearchMember, GroupMember, \
        GroupMembersBulk, GroupMembersImport, GroupMembersImportExample, GroupInviteLinks, GroupInviteLink, \
        group_invite
from seahub.api2.endpoints.search_group import SearchGroup
from seahub.api2.endpoints.share_links import ShareLinks, ShareLink, \
        ShareLinkOnlineOfficeLock, ShareLinkDirents, ShareLinkSaveFileToRepo, \
        ShareLinkUpload, ShareLinkUploadDone, ShareLinkSaveItemsToRepo, \
        ShareLinkRepoTags, ShareLinkRepoTagsTaggedFiles, \
        ShareLinksCleanInvalid
from seahub.api2.endpoints.multi_share_links import MultiShareLinks, \
        MultiShareLinksBatch
from seahub.api2.endpoints.repo_folder_share_info import RepoFolderShareInfo
from seahub.api2.endpoints.shared_folders import SharedFolders
from seahub.api2.endpoints.shared_repos import SharedRepos, SharedRepo
from seahub.api2.endpoints.upload_links import UploadLinks, UploadLink, \
        UploadLinkUpload, UploadLinksCleanInvalid
from seahub.api2.endpoints.repos_batch import ReposBatchView, \
        ReposBatchCopyDirView, ReposBatchCreateDirView, \
        ReposBatchCopyItemView, ReposBatchMoveItemView, \
        ReposAsyncBatchCopyItemView, ReposAsyncBatchMoveItemView, \
        ReposSyncBatchCopyItemView, ReposSyncBatchMoveItemView, \
        ReposBatchDeleteItemView, RepoFoldersItemBatchDelete
from seahub.api2.endpoints.repos import RepoView, ReposView, RepoShareInfoView, RepoImageRotateView
from seahub.api2.endpoints.file import FileView
from seahub.api2.endpoints.file_access_log import FileAccessLogView
from seahub.api2.endpoints.file_history import FileHistoryView, NewFileHistoryView
from seahub.api2.endpoints.dir import DirView, DirDetailView
from seahub.api2.endpoints.file_tag import FileTagView
from seahub.api2.endpoints.file_tag import FileTagsView
from seahub.api2.endpoints.repo_trash import RepoTrash, RepoTrashRevertDirents, RepoTrash2
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
from seahub.api2.endpoints.notifications import NotificationsView, NotificationView, SdocNotificationView, SdocNotificationsView, \
    SysUserNotificationSeenView, AllNotificationsView, SysUserNotificationUnseenView
from seahub.api2.endpoints.repo_file_uploaded_bytes import RepoFileUploadedBytesView
from seahub.api2.endpoints.user_avatar import UserAvatarView
from seahub.api2.endpoints.wikis import WikisView, WikiView
from seahub.api2.endpoints.activities import ActivitiesView
from seahub.api2.endpoints.wiki_pages import WikiPagesDirView, WikiPageContentView
from seahub.api2.endpoints.revision_tag import TaggedItemsView, TagNamesView
from seahub.api2.endpoints.user import User, UserConvertToTeamView, ResetPasswordView
from seahub.api2.endpoints.auth_token_by_session import AuthTokenBySession
from seahub.api2.endpoints.repo_tags import RepoTagsView, RepoTagView
from seahub.api2.endpoints.file_tag import RepoFileTagsView, RepoFileTagView
from seahub.api2.endpoints.tag_filter_file import TaggedFilesView
from seahub.api2.endpoints.related_files import RelatedFilesView, RelatedFileView
from seahub.api2.endpoints.webdav_secret import WebdavSecretView
from seahub.api2.endpoints.starred_items import StarredItems
from seahub.api2.endpoints.monitored_repos import MonitoredRepos, MonitoredRepo
from seahub.api2.endpoints.markdown_lint import MarkdownLintView
from seahub.api2.endpoints.public_repos_search import PublishedRepoSearchView
from seahub.api2.endpoints.recent_added_files import RecentAddedFilesView
from seahub.api2.endpoints.repo_api_tokens import RepoAPITokensView, RepoAPITokenView, RepoNotificationJwtTokenView
from seahub.api2.endpoints.via_repo_token import ViaRepoDirView, ViaRepoUploadLinkView, RepoInfoView, \
    ViaRepoDownloadLinkView, ViaRepoBatchMove, ViaRepoBatchCopy, ViaRepoBatchDelete, ViaRepoTokenFile, \
    ViaRepoMoveDir, ViaRepoShareLink
from seahub.api2.endpoints.abuse_reports import AbuseReportsView
from seahub.api2.endpoints.ocm import OCMProtocolView, OCMSharesView, OCMNotificationsView, \
    OCMSharesPrepareView, OCMSharePrepareView, OCMSharesReceivedView, OCMShareReceivedView
from seahub.api2.endpoints.ocm_repos import OCMReposDirView, OCMReposDownloadLinkView, \
    OCMReposUploadLinkView
from seahub.api2.endpoints.custom_share_permissions import CustomSharePermissionsView, CustomSharePermissionView

from seahub.ocm_via_webdav.ocm_api import OCMProviderView

from seahub.api2.endpoints.repo_share_links import RepoShareLinks, RepoShareLink
from seahub.api2.endpoints.repo_upload_links import RepoUploadLinks, RepoUploadLink

# Admin
from seahub.api2.endpoints.admin.logs_export import SysLogsExport, sys_log_export_excel
from seahub.api2.endpoints.admin.abuse_reports import AdminAbuseReportsView, AdminAbuseReportView
from seahub.api2.endpoints.admin.revision_tag import AdminTaggedItemsView
from seahub.api2.endpoints.admin.login_logs import LoginLogs, AdminLoginLogs
from seahub.api2.endpoints.admin.file_audit import FileAudit
from seahub.api2.endpoints.admin.file_update import FileUpdate
from seahub.api2.endpoints.admin.perm_audit import PermAudit
from seahub.api2.endpoints.admin.sysinfo import SysInfo
from seahub.api2.endpoints.admin.generate_user_auth_token import AdminGenerateUserAuthToken
from seahub.api2.endpoints.admin.web_settings import AdminWebSettings
from seahub.api2.endpoints.admin.statistics import (
    FileOperationsView, TotalStorageView, ActiveUsersView, SystemTrafficView, \
    SystemUserTrafficExcelView, SystemUserStorageExcelView, SystemUserTrafficView, \
    SystemOrgTrafficView, SystemMetricsView
)
from seahub.api2.endpoints.admin.devices import AdminDevices
from seahub.api2.endpoints.admin.device_errors import AdminDeviceErrors
from seahub.api2.endpoints.admin.users import AdminUsers, AdminUser, AdminUserResetPassword, AdminAdminUsers, \
    AdminUserGroups, AdminUserShareLinks, AdminUserUploadLinks, AdminUserBeSharedRepos, \
    AdminLDAPUsers, AdminSearchUser, AdminUpdateUserCcnetEmail, AdminUserList, AdminUserConvertToTeamView
from seahub.api2.endpoints.admin.device_trusted_ip import AdminDeviceTrustedIP
from seahub.api2.endpoints.admin.libraries import AdminLibraries, AdminLibrary, \
        AdminSearchLibrary
from seahub.api2.endpoints.admin.wikis import AdminWikis
from seahub.api2.endpoints.admin.library_dirents import AdminLibraryDirents, AdminLibraryDirent
from seahub.api2.endpoints.admin.system_library import AdminSystemLibrary, \
        AdminSystemLibraryUploadLink
from seahub.api2.endpoints.admin.default_library import AdminDefaultLibrary
from seahub.api2.endpoints.admin.trash_libraries import AdminTrashLibraries, AdminTrashLibrary
from seahub.api2.endpoints.admin.groups import AdminGroups, AdminGroup, AdminSearchGroup, \
        AdminDepartments, AdminGroupToDeptView
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
        AdminOrganization, AdminSearchOrganization, AdminOrganizationsBaseInfo
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
from seahub.api2.endpoints.admin.sys_notifications import AdminSysNotificationsView, AdminSysNotificationView, \
    AdminSysUserNotificationView, AdminSysUserNotificationsView
from seahub.api2.endpoints.admin.logs import AdminLogsLoginLogs, AdminLogsFileAccessLogs, AdminLogsFileUpdateLogs, \
    AdminLogsSharePermissionLogs, AdminLogsFileTransferLogs, AdminLogGroupMemberAuditLogs
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
from seahub.api2.endpoints.repo_auto_delete import RepoAutoDeleteView
from seahub.seadoc.views import sdoc_revision, sdoc_revisions, sdoc_to_docx
from seahub.ocm.settings import OCM_ENDPOINT
from seahub.wiki2.views import wiki_view, wiki_publish_view, wiki_history_view
from seahub.api2.endpoints.wiki2 import Wikis2View, Wiki2View, Wiki2ConfigView, Wiki2PagesView, Wiki2PageView, \
    Wiki2DuplicatePageView, WikiPageTrashView, Wiki2PublishView, Wiki2PublishConfigView, Wiki2PublishPageView, \
    WikiSearch, WikiConvertView, WikiPageExport
from seahub.api2.endpoints.subscription import SubscriptionView, SubscriptionPlansView, SubscriptionLogsView
from seahub.api2.endpoints.user_list import UserListView
from seahub.api2.endpoints.seahub_io import SeahubIOStatus
from seahub.api2.endpoints.repo_office_suite import OfficeSuiteConfig


urlpatterns = [
    path('accounts/', include('seahub.base.registration_urls')),
    path('mobile-login/', mobile_login, name="mobile_login"),

    path('sso/', sso, name='sso'),
    path('work-weixin-sso/', work_weixin_sso, name='work_weixin_sso'),
    path('dingtalk-sso/', dingtalk_sso, name='dingtalk_sso'),
    path('jwt-sso/', jwt_sso, name='jwt_sso'),
    re_path(r'^shib-login/', shib_login, name="shib_login"),
    path('oauth/', include('seahub.oauth.urls')),
    path('thirdparty-editor/', include('seahub.thirdparty_editor.urls')),
    path('ocm-via-webdav/', include('seahub.ocm_via_webdav.urls')),
    path('cad/', include('seahub.cad.urls')),

    path('sso-to-thirdpart/', sso_to_thirdpart, name='sso-to-thirdpart'),

    path('', react_fake_view, name='libraries'),
    re_path(r'^robots\.txt$', TemplateView.as_view(template_name='robots.txt', content_type='text/plain')),
    path('metrics/', get_metrics, name='metrics'),

    # revert repo
    re_path(r'^repo/history/revert/(?P<repo_id>[-0-9a-f]{36})/$', repo_revert_history, name='repo_revert_history'),

    path('repo/upload_check/', validate_filename),
    re_path(r'^repo/download_dir/(?P<repo_id>[-0-9a-f]{36})/$', repo_download_dir, name='repo_download_dir'),
    re_path(r'^repo/file_revisions/(?P<repo_id>[-0-9a-f]{36})/$', file_revisions, name='file_revisions'),
    re_path(r'^repo/sdoc_revision/(?P<repo_id>[-0-9a-f]{36})/$', sdoc_revision, name='sdoc_revision'),
    re_path(r'^repo/sdoc_revisions/(?P<repo_id>[-0-9a-f]{36})/$', sdoc_revisions, name='sdoc_revisions'),
    re_path(r'^repo/sdoc_export_to_docx/(?P<repo_id>[-0-9a-f]{36})/$', sdoc_to_docx, name='sdoc_export_to_docx'),
    re_path(r'^repo/text_diff/(?P<repo_id>[-0-9a-f]{36})/$', text_diff, name='text_diff'),
    re_path(r'^repo/history/(?P<repo_id>[-0-9a-f]{36})/$', repo_history, name='repo_history'),
    re_path(r'^repo/history/view/(?P<repo_id>[-0-9a-f]{36})/$', repo_history_view, name='repo_history_view'),
    re_path(r'^repo/(?P<repo_id>[-0-9a-f]{36})/snapshot/$', repo_snapshot, name="repo_snapshot"),
    re_path(r'^repo/(?P<repo_id>[-0-9a-f]{36})/trash/$', repo_folder_trash, name="repo_folder_trash"),
    re_path(r'^repo/(?P<repo_id>[-0-9a-f]{36})/raw/(?P<file_path>.*)$', view_raw_file, name="view_raw_file"),
    re_path(r'^repo/(?P<repo_id>[-0-9a-f]{36})/history/files/$', view_history_file, name="view_history_file"),
    re_path(r'^repo/(?P<repo_id>[-0-9a-f]{36})/trash/files/$', view_trash_file, name="view_trash_file"),
    re_path(r'^repo/(?P<repo_id>[-0-9a-f]{36})/snapshot/files/$', view_snapshot_file, name="view_snapshot_file"),
    re_path(r'^repo/(?P<repo_id>[-0-9a-f]{36})/(?P<obj_id>[0-9a-f]{40})/download/$', download_file, name='download_file'),

    ### lib (replace the old `repo` urls) ###
    # url(r'^lib/(?P<repo_id>[-0-9a-f]{36})/dir/(?P<path>.*)$', view_lib_dir, name='view_lib_dir'),
    re_path(r'^lib/(?P<repo_id>[-0-9a-f]{36})/file(?P<path>.*)$', view_lib_file, name='view_lib_file'),
    re_path(r'^lib/(?P<repo_id>[-0-9a-f]{36})/revisions/(?P<revision_id>\d+)/$', view_sdoc_revision, name='view_sdoc_revision'),
    re_path(r'^wiki/lib/(?P<repo_id>[-0-9a-f]{36})/(?P<path>.*)$', view_lib_as_wiki, name='view_lib_as_wiki'),
    re_path(r'^smart-link/(?P<dirent_uuid>[-0-9a-f]{36})/(?P<dirent_name>.*)$', view_lib_file_via_smart_link, name="view_lib_file_via_smart_link"),

    ### share/upload link ###
    re_path(r'^f/(?P<token>[a-f0-9]+)/$', view_shared_file, name='view_shared_file'),
    re_path(r'^d/(?P<token>[a-f0-9]+)/$', view_shared_dir, name='view_shared_dir'),
    re_path(r'^d/(?P<token>[a-f0-9]+)/files/$', view_file_via_shared_dir, name='view_file_via_shared_dir'),
    re_path(r'^u/d/(?P<token>[a-f0-9]+)/$', view_shared_upload_link, name='view_shared_upload_link'),
    path('view-image-via-share-link/', view_media_file_via_share_link, name='view_media_file_via_share_link'),


    # dingtalk
    path('dingtalk/login/', dingtalk_login, name='dingtalk_login'),
    path('dingtalk/callback/', dingtalk_callback, name='dingtalk_callback'),
    path('dingtalk/connect/', dingtalk_connect, name='dingtalk_connect'),
    path('dingtalk/connect-callback/', dingtalk_connect_callback, name='dingtalk_connect_callback'),
    path('dingtalk/disconnect/', dingtalk_disconnect, name='dingtalk_disconnect'),

    ### Misc ###
    re_path(r'^image-view/(?P<filename>.*)$', image_view, name='image_view'),
    path('custom-css/', custom_css_view, name='custom_css'),
    path('i18n/', i18n, name='i18n'),
    path('convert_cmmt_desc_link/', convert_cmmt_desc_link, name='convert_cmmt_desc_link'),
    path('download_client_program/', TemplateView.as_view(template_name="download.html"), name="download_client"),
    path('choose_register/', choose_register, name="choose_register"),

    ### React ###
    path('dashboard/', react_fake_view, name="dashboard"),
    path('my-activities/', react_fake_view, name="my_activities"),
    path('starred/', react_fake_view, name="starred"),
    path('linked-devices/', react_fake_view, name="linked_devices"),
    path('share-admin-libs/', react_fake_view, name="share_admin_libs"),
    path('share-admin-folders/', react_fake_view, name="share_admin_folders"),
    path('share-admin-share-links/', react_fake_view, name="share_admin_share_links"),
    path('share-admin-upload-links/', react_fake_view, name="share_admin_upload_links"),
    path('shared-libs/', react_fake_view, name="shared_libs"),
    path('shared-with-ocm/', react_fake_view, name="shared_with_ocm"),
    path('libraries/', react_fake_view, name="libs"),
    path('my-libs/', react_fake_view, name="my_libs"),
    path('groups/', react_fake_view, name="groups"),
    path('group/<int:group_id>/', react_fake_view, name="group"),
    re_path(r'^group-invite/(?P<token>[-0-9a-f]{8})/$', group_invite, name='group_invite'),
    re_path(r'^library/(?P<repo_id>[-0-9a-f]{36})/$', react_fake_view, name="library_view"),
    re_path(r'^library/(?P<repo_id>[-0-9a-f]{36})/(?P<repo_name>[^/]+)/(?P<path>.*)$', react_fake_view, name="lib_view"),
    re_path(r'^remote-library/(?P<provider_id>[-0-9a-f]{36})/(?P<repo_id>[-0-9a-f]{36})/(?P<repo_name>[^/]+)/(?P<path>.*)$', react_fake_view, name="remote_lib_view"),
    path('my-libs/deleted/', react_fake_view, name="my_libs_deleted"),
    path('org/', react_fake_view, name="org"),
    path('invitations/', react_fake_view, name="invitations"),

    re_path(r'^ajax/repo/(?P<repo_id>[-0-9a-f]{36})/history/changes/$', repo_history_changes, name='repo_history_changes'),
    re_path(r'^ajax/u/d/(?P<token>[-0-9a-f]+)/upload/$', get_file_upload_url_ul, name='get_file_upload_url_ul'),
    path('ajax/upload-file-done/', upload_file_done, name='upload_file_done'),

    re_path(r'^_templates/(?P<template>.*)$', underscore_template, name="underscore_template"),

    ## ajax lib
    re_path(r'^ajax/lib/(?P<repo_id>[-0-9a-f]{36})/dir/$', list_lib_dir, name="list_lib_dir"),

    ### Apps ###
    path('api2/', include('seahub.api2.urls')),

    ## user
    re_path(r'^api/v2.1/user/$', User.as_view(), name="api-v2.1-user"),

    # user:convert to team account
    re_path(r'^api/v2.1/user/convert-to-team/$', UserConvertToTeamView.as_view(), name="api-v2.1-user-convert-to-team"),

    # user list
    re_path(r'^api/v2.1/user-list/$', UserListView.as_view(), name='api-v2.1-user-list'),

    re_path(r'^api/v2.1/user/reset-password/$', ResetPasswordView.as_view(), name="api-v2.1-user-reset-password"),

    ## obtain auth token by login session
    re_path(r'^api/v2.1/auth-token-by-session/$', AuthTokenBySession.as_view(), name="api-v2.1-auth-token-by-session"),

    ## user::smart-link
    re_path(r'^api/v2.1/smart-link/$', SmartLink.as_view(), name="api-v2.1-smart-link"),
    re_path(r'^api/v2.1/smart-links/(?P<token>[-0-9a-f]{36})/$', SmartLinkToken.as_view(), name="api-v2.1-smart-links-token"),

    # search file by name
    re_path(r'^api/v2.1/search-file/$', SearchFile.as_view(), name='api-v2.1-search-file'),

    # departments
    re_path(r'^api/v2.1/departments/$', Departments.as_view(), name='api-v2.1-all-departments'),
    re_path(r'^api/v2.1/address-book/departments/$',
            AddressBookDepartments.as_view(),
            name='api-v2.1-address-book-groups-departments'),
    re_path(r'^api/v2.1/address-book/departments/(?P<department_id>\d+)/members/$',
            AddressBookDepartmentMembers.as_view(),
            name='api-v2.1-address-book-groups-department-members'),

    ## user::groups
    re_path(r'^api/v2.1/all-groups/$', AllGroups.as_view(), name='api-v2.1-all-groups'),
    re_path(r'^api/v2.1/shareable-groups/$', ShareableGroups.as_view(), name='api-v2.1-shareable-groups'),
    re_path(r'^api/v2.1/groups/$', Groups.as_view(), name='api-v2.1-groups'),
    re_path(r'^api/v2.1/groups/(?P<group_id>\d+)/$', Group.as_view(), name='api-v2.1-group'),
    re_path(r'^api/v2.1/groups/(?P<group_id>\d+)/libraries/$', GroupLibraries.as_view(), name='api-v2.1-group-libraries'),
    re_path(r'^api/v2.1/groups/(?P<group_id>\d+)/libraries/(?P<repo_id>[-0-9a-f]{36})/$', GroupLibrary.as_view(), name='api-v2.1-group-library'),
    re_path(r'^api/v2.1/groups/(?P<group_id>\d+)/group-owned-libraries/$', GroupOwnedLibraries.as_view(), name='api-v2.1-group-owned-libraries'),
    re_path(r'^api/v2.1/groups/(?P<group_id>\d+)/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/$', GroupOwnedLibrary.as_view(), name='api-v2.1-owned-group-library'),
    re_path(r'^api/v2.1/groups/(?P<group_id>\d+)/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/transfer/$', GroupOwnedLibraryTransferView.as_view(), name='api-v2.1-group-owned-group-library-transfer'),
    re_path(r'^api/v2.1/groups/(?P<group_id>\d+)/members/$', GroupMembers.as_view(), name='api-v2.1-group-members'),
    re_path(r'^api/v2.1/groups/(?P<group_id>\d+)/search-member/$', GroupSearchMember.as_view(), name='api-v2.1-group-search-member'),
    re_path(r'^api/v2.1/groups/(?P<group_id>\d+)/members/bulk/$', GroupMembersBulk.as_view(), name='api-v2.1-group-members-bulk'),
    re_path(r'^api/v2.1/groups/(?P<group_id>\d+)/members/import/$', GroupMembersImport.as_view(), name='api-v2.1-group-members-import'),
    re_path(r'^api/v2.1/group-members-import-example/$', GroupMembersImportExample.as_view(), name='api-v2.1-group-members-import-example'),
    re_path(r'^api/v2.1/groups/(?P<group_id>\d+)/members/(?P<email>[^/]+)/$', GroupMember.as_view(), name='api-v2.1-group-member'),
    re_path(r'^api/v2.1/search-group/$', SearchGroup.as_view(), name='api-v2.1-search-group'),
    re_path(r'^api/v2.1/groups/(?P<group_id>\d+)/invite-links/$', GroupInviteLinks.as_view(),name='api-v2.1-group-invite-links'),
    re_path(r'^api/v2.1/groups/(?P<group_id>\d+)/invite-links/(?P<token>[-0-9a-f]{8})/$', GroupInviteLink.as_view(), name='api-v2.1-group-invite-link'),
    ## address book
    re_path(r'^api/v2.1/address-book/groups/(?P<group_id>\d+)/sub-groups/$', AddressBookGroupsSubGroups.as_view(), name='api-v2.1-address-book-groups-sub-groups'),
    re_path(r'^api/v2.1/address-book/groups/(?P<group_id>\d+)/search-member/$', AddressBookGroupsSearchMember.as_view(), name='api-v2.1-address-book-search-member'),
    re_path(r'^api/v2.1/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/user-folder-permission/$', GroupOwnedLibraryUserFolderPermission.as_view(), name='api-v2.1-group-owned-library-user-folder-permission'),
    re_path(r'^api/v2.1/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/group-folder-permission/$', GroupOwnedLibraryGroupFolderPermission.as_view(), name='api-v2.1-group-owned-library-group-folder-permission'),
    re_path(r'^api/v2.1/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/user-share/$', GroupOwnedLibraryUserShare.as_view(), name='api-v2.1-group-owned-library-user-share'),
    re_path(r'^api/v2.1/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/group-share/$', GroupOwnedLibraryGroupShare.as_view(), name='api-v2.1-group-owned-library-group-share'),
    re_path(r'^api/v2.1/group-owned-libraries/user-share-in-libraries/(?P<repo_id>[-0-9-a-f]{36})/$', GroupOwnedLibraryUserShareInLibrary.as_view(), name='api-v2.1-group-owned-library-user-share-in-library'),

    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/custom-share-permissions/$', CustomSharePermissionsView.as_view(), name='api-v2.1-custom-share-permissions'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/custom-share-permissions/(?P<permission_id>\d+)/$', CustomSharePermissionView.as_view(), name='api-v2.1-custom-share-permission'),

    ## user::shared-repos-folders
    re_path(r'^api/v2.1/repo-folder-share-info/$', RepoFolderShareInfo.as_view(), name='api-v2.1-repo-folder-share-info'),

    ## user::shared-folders
    re_path(r'^api/v2.1/shared-folders/$', SharedFolders.as_view(), name='api-v2.1-shared-folders'),

    ## user::shared-repos
    re_path(r'^api/v2.1/shared-repos/$', SharedRepos.as_view(), name='api-v2.1-shared-repos'),
    re_path(r'^api/v2.1/shared-repos/(?P<repo_id>[-0-9a-f]{36})/$', SharedRepo.as_view(), name='api-v2.1-shared-repo'),

    ## user::shared-download-links
    re_path(r'^api/v2.1/share-links/$', ShareLinks.as_view(), name='api-v2.1-share-links'),
    re_path(r'^api/v2.1/multi-share-links/$', MultiShareLinks.as_view(), name='api-v2.1-multi-share-links'),
    re_path(r'^api/v2.1/multi-share-links/batch/$', MultiShareLinksBatch.as_view(), name='api-v2.1-multi-share-links-batch'),
    re_path(r'^api/v2.1/share-links/clean-invalid/$', ShareLinksCleanInvalid.as_view(), name='api-v2.1-share-links-clean-invalid'),
    re_path(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/$', ShareLink.as_view(), name='api-v2.1-share-link'),
    re_path(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/save-file-to-repo/$', ShareLinkSaveFileToRepo.as_view(), name='api-v2.1-share-link-save-file-to-repo'),
    re_path(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/save-items-to-repo/$', ShareLinkSaveItemsToRepo.as_view(), name='api-v2.1-share-link-save-items-to-repo'),
    re_path(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/dirents/$', ShareLinkDirents.as_view(), name='api-v2.1-share-link-dirents'),
    re_path(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/online-office-lock/$',
            ShareLinkOnlineOfficeLock.as_view(), name='api-v2.1-share-link-online-office-lock'),
    re_path(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/upload/$', ShareLinkUpload.as_view(), name='api-v2.1-share-link-upload'),
    re_path(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/upload/done/$', ShareLinkUploadDone.as_view(), name='api-v2.1-share-link-upload-done'),

    re_path(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/repo-tags/$', ShareLinkRepoTags.as_view(), name='api-v2.1-share-link-repo-tags'),
    re_path(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/tagged-files/(?P<tag_id>\d+)/$', ShareLinkRepoTagsTaggedFiles.as_view(), name='api-v2.1-share-link-repo-tags-tagged-files'),
    re_path(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/user-auth/$', ShareLinkUserAuthView.as_view(), name='api-v2.1-share-link-user-auth'),
    re_path(r'^api/v2.1/share-links/(?P<token>[a-f0-9]+)/email-auth/$', ShareLinkEmailAuthView.as_view(), name='api-v2.1-share-link-user-auth'),

    ## user::shared-upload-links
    re_path(r'^api/v2.1/upload-links/$', UploadLinks.as_view(), name='api-v2.1-upload-links'),
    re_path(r'^api/v2.1/upload-links/clean-invalid/$', UploadLinksCleanInvalid.as_view(), name='api-v2.1-upload-links-clean-invalid'),
    re_path(r'^api/v2.1/upload-links/(?P<token>[a-f0-9]+)/$', UploadLink.as_view(), name='api-v2.1-upload-link'),
    re_path(r'^api/v2.1/upload-links/(?P<token>[a-f0-9]+)/upload/$', UploadLinkUpload.as_view(), name='api-v2.1-upload-link-upload'),

    ## user::revision-tags
    re_path(r'^api/v2.1/revision-tags/tagged-items/$', TaggedItemsView.as_view(), name='api-v2.1-revision-tags-tagged-items'),
    re_path(r'^api/v2.1/revision-tags/tag-names/$', TagNamesView.as_view(), name='api-v2.1-revision-tags-tag-names'),

    ## user::repos-batch-operate
    # for icourt
    re_path(r'^api/v2.1/repos/batch/$', ReposBatchView.as_view(), name='api-v2.1-repos-batch'),
    re_path(r'^api/v2.1/repos/batch-copy-dir/$', ReposBatchCopyDirView.as_view(), name='api-v2.1-repos-batch-copy-dir'),
    re_path(r'^api/v2.1/repos/batch-create-dir/$', ReposBatchCreateDirView.as_view(), name='api-v2.1-repos-batch-create-dir'),
    re_path(r'^api/v2.1/repos/batch-copy-item/$', ReposBatchCopyItemView.as_view(), name='api-v2.1-repos-batch-copy-item'),
    re_path(r'^api/v2.1/repos/batch-move-item/$', ReposBatchMoveItemView.as_view(), name='api-v2.1-repos-batch-move-item'),

    re_path(r'^api/v2.1/repos/batch-delete-folders-item/$', RepoFoldersItemBatchDelete.as_view(), name='api-v2.1-repos-folders-batch-delete'),
    re_path(r'^api/v2.1/repos/batch-delete-item/$', ReposBatchDeleteItemView.as_view(), name='api-v2.1-repos-batch-delete-item'),
    re_path(r'^api/v2.1/repos/async-batch-copy-item/$', ReposAsyncBatchCopyItemView.as_view(), name='api-v2.1-repos-async-batch-copy-item'),
    re_path(r'^api/v2.1/repos/async-batch-move-item/$', ReposAsyncBatchMoveItemView.as_view(), name='api-v2.1-repos-async-batch-move-item'),
    re_path(r'^api/v2.1/repos/sync-batch-copy-item/$', ReposSyncBatchCopyItemView.as_view(), name='api-v2.1-repos-sync-batch-copy-item'),
    re_path(r'^api/v2.1/repos/sync-batch-move-item/$', ReposSyncBatchMoveItemView.as_view(), name='api-v2.1-repos-sync-batch-move-item'),

    ## user::deleted repos
    re_path(r'^api/v2.1/deleted-repos/$', DeletedRepos.as_view(), name='api2-v2.1-deleted-repos'),

    ## user::repos
    re_path(r'^api/v2.1/repos/$', ReposView.as_view(), name='api-v2.1-repos-view'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/$', RepoView.as_view(), name='api-v2.1-repo-view'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/$', FileView.as_view(), name='api-v2.1-file-view'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/access-log/$', FileAccessLogView.as_view(), name='api-v2.1-file-access-log-view'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/history/$', FileHistoryView.as_view(), name='api-v2.1-file-history-view'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/new_history/$', NewFileHistoryView.as_view(), name='api-v2.1-new-file-history-view'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/dir/$', DirView.as_view(), name='api-v2.1-dir-view'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/commits/(?P<commit_id>[0-9a-f]{40})/$', RepoCommitView.as_view(), name='api-v2.1-repo-commit'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/commits/(?P<commit_id>[0-9a-f]{40})/dir/$', RepoCommitDirView.as_view(), name='api-v2.1-repo-commit-dir'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/commits/(?P<commit_id>[0-9a-f]{40})/revert/$', RepoCommitRevertView.as_view(), name='api-v2.1-repo-commit-revert'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/dir/detail/$', DirDetailView.as_view(), name='api-v2.1-dir-detail-view'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/trash/$', RepoTrash.as_view(), name='api-v2.1-repo-trash'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/trash2/$', RepoTrash2.as_view(), name='api-v2.1-repo-trash2'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/trash/revert-dirents/$', RepoTrashRevertDirents.as_view(), name='api-v2.1-repo-trash-revert-dirents'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/history/$', RepoHistory.as_view(), name='api-v2.1-repo-history'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/set-password/$', RepoSetPassword.as_view(), name="api-v2.1-repo-set-password"),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/send-new-password/$', RepoSendNewPassword.as_view(), name="api-v2.1-repo-send-new-password"),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/repo-tags/$', RepoTagsView.as_view(), name='api-v2.1-repo-tags'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/repo-tags/(?P<repo_tag_id>\d+)/$', RepoTagView.as_view(), name='api-v2.1-repo-tag'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file-tags/$', RepoFileTagsView.as_view(), name='api-v2.1-file-tags'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file-tags/(?P<file_tag_id>\d+)/$', RepoFileTagView.as_view(), name='api-v2.1-file-tag'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/tagged-files/(?P<repo_tag_id>\d+)/$', TaggedFilesView.as_view(), name='api-v2.1-tagged-files'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/participants/$', FileParticipantsView.as_view(), name='api-v2.1-file-participants'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/participant/$', FileParticipantView.as_view(), name='api-v2.1-file-participant'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/related-users/$', RepoRelatedUsersView.as_view(), name='api-v2.1-related-user'),

    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/auto-delete/$', RepoAutoDeleteView.as_view(), name='api-v2.1-repo-auto-delete'),

    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/share-links/$', RepoShareLinks.as_view(), name='api-v2.1-repo-share-links'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/share-links/(?P<token>[a-f0-9]+)/$', RepoShareLink.as_view(), name='api-v2.1-repo-share-link'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/upload-links/$', RepoUploadLinks.as_view(), name='api-v2.1-repo-upload-links'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/upload-links/(?P<token>[a-f0-9]+)/$', RepoUploadLink.as_view(), name='api-v2.1-repo-upload-link'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/share-info/$', RepoShareInfoView.as_view(), name='api-v2.1-repo-share-info-view'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/image-rotate/$', RepoImageRotateView.as_view(), name='api-v2.1-repo-image-rotate-view'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/office-suite/$', OfficeSuiteConfig.as_view(), name='api-v2.1-repo-office-suite'),


    ## user: repo file comments
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/(?P<file_uuid>[-0-9a-f]{36})/comments/$', FileCommentsView.as_view(), name='api-v2.1-file-comments'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/(?P<file_uuid>[-0-9a-f]{36})/comments/(?P<comment_id>\d+)/$', FileCommentView.as_view(), name='api-v2.1-file-comment'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/(?P<file_uuid>[-0-9a-f]{36})/comments/(?P<comment_id>\d+)/replies/$', FileCommentRepliesView.as_view(), name='api-v2.1-file-comment-replies'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file/(?P<file_uuid>[-0-9a-f]{36})/comments/(?P<comment_id>\d+)/replies/(?P<reply_id>\d+)/$', FileCommentReplyView.as_view(), name='api-v2.1-file-comment-repolies'),


    ## user:: repo-api-tokens
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/repo-api-tokens/$', RepoAPITokensView.as_view(), name='api-v2.1-repo-api-tokens'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/repo-api-tokens/(?P<app_name>.*)/$', RepoAPITokenView.as_view(), name='api-v2.1-repo-api-token'),

    ## user:: repo-jwt-tokens
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/repo-notification-jwt-token/$', RepoNotificationJwtTokenView.as_view(), name='api-v2.1-repo-jwt-token'),

    ## access repo from repo_api_tokens
    re_path(r'^api/v2.1/via-repo-token/dir/$', ViaRepoDirView.as_view(), name='via-repo-dir'),
    re_path(r'^api/v2.1/via-repo-token/upload-link/$', ViaRepoUploadLinkView.as_view(), name='via-upload-link'),
    re_path(r'^api/v2.1/via-repo-token/download-link/$', ViaRepoDownloadLinkView.as_view(), name='via-download-link'),
    re_path(r'^api/v2.1/via-repo-token/repo-info/$', RepoInfoView.as_view(), name='via-fetch-repo'),
    re_path(r'^api/v2.1/via-repo-token/sync-batch-move-item/$', ViaRepoBatchMove.as_view(), name='via-repo-token-move'),
    re_path(r'^api/v2.1/via-repo-token/sync-batch-copy-item/$', ViaRepoBatchCopy.as_view(), name='via-repo-token-copy'),
    re_path(r'^api/v2.1/via-repo-token/batch-delete-item/$', ViaRepoBatchDelete.as_view(), name='via-repo-token-delete'),
    re_path(r'^api/v2.1/via-repo-token/file/$', ViaRepoTokenFile.as_view(), name='via-repo-token-file'),
    re_path(r'^api/v2.1/via-repo-token/move-dir/$', ViaRepoMoveDir.as_view(), name='via-repo-token-move-dir'),
    re_path(r'^api/v2.1/via-repo-token/share-links/$', ViaRepoShareLink.as_view(), name='via-repo-token-share-links'),

    # user::related-files
    re_path(r'^api/v2.1/related-files/$', RelatedFilesView.as_view(), name='api-v2.1-related-files'),
    re_path(r'^api/v2.1/related-files/(?P<related_id>\d+)/$', RelatedFileView.as_view(), name='api-v2.1-related-file'),

    # user: markdown-lint
    re_path(r'^api/v2.1/markdown-lint/$', MarkdownLintView.as_view(), name='api-v2.1-markdown-lint'),

    # public repos search
    re_path(r'^api/v2.1/published-repo-search/$', PublishedRepoSearchView.as_view(), name='api-v2.1-published-repo-search'),

    re_path(r'^api/v2.1/recent-added-files/$', RecentAddedFilesView.as_view(), name='api-v2.1-recent-added-files'),

    # Deprecated
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/tags/$', FileTagsView.as_view(), name="api-v2.1-filetags-view"),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/tags/(?P<name>.*?)/$', FileTagView.as_view(), name="api-v2.1-filetag-view"),

    ## user::download-dir-zip-task
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/zip-task/$', ZipTaskView.as_view(), name='api-v2.1-zip-task'),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/file-uploaded-bytes/$', RepoFileUploadedBytesView.as_view(), name='api-v2.1-repo-file-uploaded-bytes'),
    re_path(r'^api/v2.1/share-link-zip-task/$', ShareLinkZipTaskView.as_view(), name='api-v2.1-share-link-zip-task'),
    re_path(r'^api/v2.1/query-zip-progress/$', QueryZipProgressView.as_view(), name='api-v2.1-query-zip-progress'),
    re_path(r'^api/v2.1/cancel-zip-task/$', CancelZipTaskView.as_view(), name='api-v2.1-cancel-zip-task'),
    re_path(r'^api/v2.1/copy-move-task/$', CopyMoveTaskView.as_view(), name='api-v2.1-copy-move-task'),
    re_path(r'^api/v2.1/query-copy-move-progress/$', QueryCopyMoveProgressView.as_view(), name='api-v2.1-query-copy-move-progress'),

    re_path(r'^api/v2.1/move-folder-merge/$', MoveFolderMergeView.as_view(), name='api-v2.1-move-folder-merge'),

    re_path(r'^api/v2.1/notifications/$', NotificationsView.as_view(), name='api-v2.1-notifications'),
    re_path(r'^api/v2.1/notification/$', NotificationView.as_view(), name='api-v2.1-notification'),
    re_path(r'^api/v2.1/sdoc-notifications/$', SdocNotificationsView.as_view(), name='api-v2.1-sdoc-notifications'),
    re_path(r'^api/v2.1/sdoc-notification/$', SdocNotificationView.as_view(), name='api-v2.1-notification'),
    re_path(r'^api/v2.1/all-notifications/$', AllNotificationsView.as_view(), name='api-v2.1-all-notification'),

    re_path(r'^api/v2.1/sys-user-notifications/(?P<nid>\d+)/seen/$', SysUserNotificationSeenView.as_view(), name='api-v2.1-notification-seen'),
    re_path(r'^api/v2.1/sys-user-notifications/unseen/$', SysUserNotificationUnseenView.as_view(), name='api-v2.1-notification-unseen'),
    ## user::invitations
    re_path(r'^api/v2.1/invitations/$', InvitationsView.as_view()),
    re_path(r'^api/v2.1/invitations/batch/$', InvitationsBatchView.as_view()),
    re_path(r'^api/v2.1/invitations/(?P<token>[a-f0-9]{32})/$', InvitationView.as_view()),
    re_path(r'^api/v2.1/invitations/(?P<token>[a-f0-9]{32})/revoke/$', InvitationRevokeView.as_view()),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/shared/invitations/$', RepoShareInvitationsView.as_view(), name="api-v2.1-repo-share-invitations"),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/shared/invitations/batch/$', RepoShareInvitationsBatchView.as_view(), name="api-v2.1-repo-share-invitations-batch"),
    re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/shared/invitation/$', RepoShareInvitationView.as_view(), name="api-v2.1-repo-share-invitation"),
    ## user::avatar
    re_path(r'^api/v2.1/user-avatar/$', UserAvatarView.as_view(), name='api-v2.1-user-avatar'),

    ## user:webdav
    re_path(r'^api/v2.1/webdav-secret/$', WebdavSecretView.as_view(), name='api-v2.1-webdav-secret'),

    ## user::starred-item
    re_path(r'^api/v2.1/starred-items/$', StarredItems.as_view(), name='api-v2.1-starred-items'),

    ## user::monitored-repos
    re_path(r'^api/v2.1/monitored-repos/$', MonitoredRepos.as_view(), name='api-v2.1-monitored-repos'),
    re_path(r'^api/v2.1/monitored-repos/(?P<repo_id>[-0-9a-f]{36})/$', MonitoredRepo.as_view(), name='api-v2.1-monitored-repo'),

    ## user::wiki
    re_path(r'^api/v2.1/wikis/$', WikisView.as_view(), name='api-v2.1-wikis'),
    re_path(r'^api/v2.1/wikis/(?P<wiki_id>\d+)/$', WikiView.as_view(), name='api-v2.1-wiki'),
    re_path(r'^api/v2.1/wikis/(?P<wiki_id>\d+)/dir/$', WikiPagesDirView.as_view(), name='api-v2.1-wiki-pages-dir'),
    re_path(r'^api/v2.1/wikis/(?P<wiki_id>\d+)/content/$', WikiPageContentView.as_view(), name='api-v2.1-wiki-pages-content'),
    path('view-image-via-public-wiki/', view_media_file_via_public_wiki, name='view_media_file_via_public_wiki'),

    ## user::wiki2
    re_path(r'^api/v2.1/wikis2/$', Wikis2View.as_view(), name='api-v2.1-wikis2'),
    re_path(r'^api/v2.1/wiki2/(?P<wiki_id>[-0-9a-f]{36})/$', Wiki2View.as_view(), name='api-v2.1-wiki2'),
    re_path(r'^api/v2.1/wiki2/(?P<wiki_id>[-0-9a-f]{36})/config/$', Wiki2ConfigView.as_view(), name='api-v2.1-wiki2-config'),
    re_path(r'^api/v2.1/wiki2/(?P<wiki_id>[-0-9a-f]{36})/publish/config/$', Wiki2PublishConfigView.as_view(), name='api-v2.1-wiki2-publish-config'),
    re_path(r'^api/v2.1/wiki2/(?P<wiki_id>[-0-9a-f]{36})/pages/$', Wiki2PagesView.as_view(), name='api-v2.1-wiki2-pages'),
    re_path(r'^api/v2.1/wiki2/(?P<wiki_id>[-0-9a-f]{36})/page/(?P<page_id>[-0-9a-zA-Z]{4})/$', Wiki2PageView.as_view(), name='api-v2.1-wiki2-page'),
    re_path(r'^api/v2.1/wiki2/(?P<wiki_id>[-0-9a-f]{36})/page/(?P<page_id>[-0-9a-zA-Z]{4})/export/$', WikiPageExport.as_view(), name='api-v2.1-wiki2-page-export'),
    re_path(r'^api/v2.1/wiki2/(?P<wiki_id>[-0-9a-f]{36})/publish/page/(?P<page_id>[-0-9a-zA-Z]{4})/$', Wiki2PublishPageView.as_view(), name='api-v2.1-wiki2-page'),
    re_path(r'^api/v2.1/wiki2/(?P<wiki_id>[-0-9a-f]{36})/duplicate-page/$', Wiki2DuplicatePageView.as_view(), name='api-v2.1-wiki2-duplicate-page'),
    re_path(r'^api/v2.1/wiki2/(?P<wiki_id>[-0-9a-f]{36})/trash/', WikiPageTrashView.as_view(), name='api-v2.1-wiki2-trash'),
    re_path(r'^api/v2.1/wiki2/(?P<wiki_id>[-0-9a-f]{36})/publish/$', Wiki2PublishView.as_view(), name='api-v2.1-wiki2-publish'),
    re_path(r'^api/v2.1/wiki2/search/$', WikiSearch.as_view(), name='api-v2.1-wiki2-search'),
    re_path(r'^api/v2.1/convert-wiki/$', WikiConvertView.as_view(), name='api-v2.1-wiki-convert'),
    ## user::drafts


    ## user::activities
    re_path(r'^api/v2.1/activities/$', ActivitiesView.as_view(), name='api-v2.1-acitvity'),

    ## user::ocm
    # ocm inter-server api, interact with other server
    path('ocm-provider/', OCMProviderView.as_view(), name='api-v2.1-ocm-protocol'),
    re_path(r'' + OCM_ENDPOINT + 'shares/$', OCMSharesView.as_view(), name='api-v2.1-ocm-shares'),
    re_path(r'' + OCM_ENDPOINT + 'notifications/$', OCMNotificationsView.as_view(), name='api-v2.1-ocm-notifications'),

    # ocm local api, no interaction with other server
    re_path(r'api/v2.1/ocm/shares-prepare/$', OCMSharesPrepareView.as_view(), name='api-v2.1-ocm-shares-prepare'),
    re_path(r'api/v2.1/ocm/shares-prepare/(?P<pk>\d+)/$', OCMSharePrepareView.as_view(), name='api-v2.1-ocm-share-prepare'),
    re_path(r'api/v2.1/ocm/shares-received/$', OCMSharesReceivedView.as_view(), name='api-v2.1-ocm-shares-received'),
    re_path(r'api/v2.1/ocm/shares-received/(?P<pk>\d+)/$', OCMShareReceivedView.as_view(), name='api-v2.1-ocm-share-received'),
    # ocm local api, repo related operations
    re_path(r'api/v2.1/ocm/providers/(?P<provider_id>[-0-9a-f]{36})/repos/(?P<repo_id>[-0-9a-f]{36})/dir/$', OCMReposDirView.as_view(), name='api-v2.1-ocm-repos-dir'),
    re_path(r'api/v2.1/ocm/providers/(?P<provider_id>[-0-9a-f]{36})/repos/(?P<repo_id>[-0-9a-f]{36})/download-link/$', OCMReposDownloadLinkView.as_view(), name='api-v2.1-ocm-repos-download-link'),
    re_path(r'api/v2.1/ocm/providers/(?P<provider_id>[-0-9a-f]{36})/repos/(?P<repo_id>[-0-9a-f]{36})/upload-link/$', OCMReposUploadLinkView.as_view(), name='api-v2.1-ocm-repos-upload-link'),

    # admin: activities
    re_path(r'^api/v2.1/admin/user-activities/$', UserActivitiesView.as_view(), name='api-v2.1-admin-user-activity'),

    ## user::abuse-report
    # user report an abuse file
    re_path(r'^api/v2.1/abuse-reports/$', AbuseReportsView.as_view(), name='api-v2.1-abuse-reports'),

    ## admin::abuse-reports
    # admin get all abuse reports
    re_path(r'^api/v2.1/admin/abuse-reports/$', AdminAbuseReportsView.as_view(), name='api-v2.1-admin-abuse-reports'),
    re_path(r'^api/v2.1/admin/abuse-reports/(?P<pk>\d+)/$', AdminAbuseReportView.as_view(), name='api-v2.1-admin-abuse-report'),


    ## admin::generate user auth token
    re_path(r'^api/v2.1/admin/generate-user-auth-token/$', AdminGenerateUserAuthToken.as_view(), name='api-v2.1-admin-generate-user-auth-token'),

    ## admin::sysinfo
    re_path(r'^api/v2.1/admin/sysinfo/$', SysInfo.as_view(), name='api-v2.1-sysinfo'),

    ## admin:web settings
    re_path(r'^api/v2.1/admin/web-settings/$', AdminWebSettings.as_view(), name='api-v2.1-web-settings'),

    ## admin::revision-tags
    re_path(r'^api/v2.1/admin/revision-tags/tagged-items/$', AdminTaggedItemsView.as_view(), name='api-v2.1-admin-revision-tags-tagged-items'),

    ## admin::statistics
    re_path(r'^api/v2.1/admin/statistics/file-operations/$', FileOperationsView.as_view(), name='api-v2.1-admin-statistics-file-operations'),
    re_path(r'^api/v2.1/admin/statistics/total-storage/$', TotalStorageView.as_view(), name='api-v2.1-admin-statistics-total-storage'),
    re_path(r'^api/v2.1/admin/statistics/active-users/$', ActiveUsersView.as_view(), name='api-v2.1-admin-statistics-active-users'),
    re_path(r'^api/v2.1/admin/statistics/system-traffic/$', SystemTrafficView.as_view(), name='api-v2.1-admin-statistics-system-traffic'),
    re_path(r'^api/v2.1/admin/statistics/system-user-traffic/$', SystemUserTrafficView.as_view(), name='api-v2.1-admin-statistics-system-user-traffic'),
    re_path(r'^api/v2.1/admin/statistics/system-org-traffic/$', SystemOrgTrafficView.as_view(), name='api-v2.1-admin-statistics-system-org-traffic'),
    re_path(r'^api/v2.1/admin/statistics/system-user-traffic/excel/$', SystemUserTrafficExcelView.as_view(), name='api-v2.1-admin-statistics-system-user-traffic-excel'),
    re_path(r'^api/v2.1/admin/statistics/system-user-storage/excel/$', SystemUserStorageExcelView.as_view(), name='api-v2.1-admin-statistics-system-user-storage-excel'),
    re_path(r'^api/v2.1/admin/statistics/system-metrics/$', SystemMetricsView.as_view(), name='api-v2.1-admin-statistics-system-metrics'),
    ## admin::users
    re_path(r'^api/v2.1/admin/users/$', AdminUsers.as_view(), name='api-v2.1-admin-users'),
    re_path(r'^api/v2.1/admin/ldap-users/$', AdminLDAPUsers.as_view(), name='api-v2.1-admin-ldap-users'),
    re_path(r'^api/v2.1/admin/search-user/$', AdminSearchUser.as_view(), name='api-v2.1-admin-search-user'),
    re_path(r'^api/v2.1/admin/update-user-ccnet-email/$', AdminUpdateUserCcnetEmail.as_view(), name='api-v2.1-admin-update-user-ccnet-email'),
    re_path(r'^api/v2.1/admin/user-list/$', AdminUserList.as_view(), name='api-v2.1-admin-user-list'),
    re_path(r'^api/v2.1/admin/user-convert-to-team/$', AdminUserConvertToTeamView.as_view(), name='api-v2.1-admin-user-list'),

    # [^...] Matches any single character not in brackets
    # + Matches between one and unlimited times, as many times as possible
    re_path(r'^api/v2.1/admin/users/(?P<email>[^/]+@[^/]+)/$', AdminUser.as_view(), name='api-v2.1-admin-user'),
    re_path(r'^api/v2.1/admin/users/(?P<email>[^/]+@[^/]+)/reset-password/$', AdminUserResetPassword.as_view(), name='api-v2.1-admin-user-reset-password'),
    re_path(r'^api/v2.1/admin/users/(?P<email>[^/]+@[^/]+)/groups/$', AdminUserGroups.as_view(), name='api-v2.1-admin-user-groups'),
    re_path(r'^api/v2.1/admin/users/(?P<email>[^/]+@[^/]+)/share-links/$', AdminUserShareLinks.as_view(), name='api-v2.1-admin-user-share-links'),
    re_path(r'^api/v2.1/admin/users/(?P<email>[^/]+@[^/]+)/upload-links/$', AdminUserUploadLinks.as_view(), name='api-v2.1-admin-user-upload-links'),
    re_path(r'^api/v2.1/admin/users/(?P<email>[^/]+@[^/]+)/beshared-repos/$', AdminUserBeSharedRepos.as_view(), name='api-v2.1-admin-user-beshared-repos'),

    re_path(r'^api/v2.1/admin/admin-users/$', AdminAdminUsers.as_view(), name='api-v2.1-admin-admin-users'),

    ## admin::users-batch
    re_path(r'^api/v2.1/admin/admin-users/batch/$', AdminAdminUsersBatch.as_view(), name='api-v2.1-admin-users-batch'),
    re_path(r'^api/v2.1/admin/users/batch/$', AdminUsersBatch.as_view(), name='api-v2.1-admin-users-batch'),
    re_path(r'^api/v2.1/admin/import-users/$', AdminImportUsers.as_view(), name='api-v2.1-admin-import-users'),

    ## admin::devices
    re_path(r'^api/v2.1/admin/devices/$', AdminDevices.as_view(), name='api-v2.1-admin-devices'),
    re_path(r'^api/v2.1/admin/device-errors/$', AdminDeviceErrors.as_view(), name='api-v2.1-admin-device-errors'),
    re_path(r'^api/v2.1/admin/device-trusted-ip/$', AdminDeviceTrustedIP.as_view(), name='api-v2.1-admin-device-trusted-ip'),

    ## admin::libraries
    re_path(r'^api/v2.1/admin/libraries/$', AdminLibraries.as_view(), name='api-v2.1-admin-libraries'),
    re_path(r'^api/v2.1/admin/search-library/$', AdminSearchLibrary.as_view(), name='api-v2.1-admin-search-library'),
    re_path(r'^api/v2.1/admin/libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminLibrary.as_view(), name='api-v2.1-admin-library'),
    re_path(r'^api/v2.1/admin/libraries/(?P<repo_id>[-0-9a-f]{36})/history-limit/$', AdminLibraryHistoryLimit.as_view(), name="api-v2.1-admin-library-history-limit"),
    re_path(r'^api/v2.1/admin/libraries/(?P<repo_id>[-0-9a-f]{36})/dirents/$', AdminLibraryDirents.as_view(), name='api-v2.1-admin-library-dirents'),
    re_path(r'^api/v2.1/admin/libraries/(?P<repo_id>[-0-9a-f]{36})/dirent/$', AdminLibraryDirent.as_view(), name='api-v2.1-admin-library-dirent'),

    ## admin::system-library
    re_path(r'^api/v2.1/admin/system-library/$', AdminSystemLibrary.as_view(), name='api-v2.1-admin-system-library'),
    re_path(r'^api/v2.1/admin/system-library/upload-link/$', AdminSystemLibraryUploadLink.as_view(), name='api-v2.1-admin-system-library-upload-link'),

    ## admin::default-library
    re_path(r'^api/v2.1/admin/default-library/$', AdminDefaultLibrary.as_view(), name='api-v2.1-admin-default-library'),

    ## admin::trash-libraries
    re_path(r'^api/v2.1/admin/trash-libraries/$', AdminTrashLibraries.as_view(), name='api-v2.1-admin-trash-libraries'),
    re_path(r'^api/v2.1/admin/trash-libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminTrashLibrary.as_view(), name='api-v2.1-admin-trash-library'),

    ## admin::groups
    re_path(r'^api/v2.1/admin/groups/$', AdminGroups.as_view(), name='api-v2.1-admin-groups'),
    re_path(r'^api/v2.1/admin/search-group/$', AdminSearchGroup.as_view(), name='api-v2.1-admin-search-group'),
    re_path(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/$', AdminGroup.as_view(), name='api-v2.1-admin-group'),
    re_path(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/libraries/$', AdminGroupLibraries.as_view(), name='api-v2.1-admin-group-libraries'),
    re_path(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminGroupLibrary.as_view(), name='api-v2.1-admin-group-library'),
    re_path(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/members/$', AdminGroupMembers.as_view(), name='api-v2.1-admin-group-members'),
    re_path(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/members/(?P<email>[^/]+)/$', AdminGroupMember.as_view(), name='api-v2.1-admin-group-member'),
    re_path(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/group-owned-libraries/$', AdminGroupOwnedLibraries.as_view(), name='api-v2.1-admin-group-owned-libraries'),
    re_path(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminGroupOwnedLibrary.as_view(), name='api-v2.1-admin-owned-group-library'),
    re_path(r'^api/v2.1/admin/groups/(?P<group_id>\d+)/group-to-department/', AdminGroupToDeptView.as_view(), name='api-v2.1-admin-group-to-department'),

    ## admin::departments
    re_path(r'api/v2.1/admin/departments/$', AdminDepartments.as_view(), name='api-v2.1-admin-departments'),

    ## admin::shares
    re_path(r'^api/v2.1/admin/shares/$', AdminShares.as_view(), name='api-v2.1-admin-shares'),

    ## admin::logs
    re_path(r'^api/v2.1/admin/logs/login-logs/$', AdminLogsLoginLogs.as_view(), name='api-v2.1-admin-logs-login-logs'),
    re_path(r'^api/v2.1/admin/logs/file-access-logs/$', AdminLogsFileAccessLogs.as_view(), name='api-v2.1-admin-logs-file-access-logs'),
    re_path(r'^api/v2.1/admin/logs/file-update-logs/$', AdminLogsFileUpdateLogs.as_view(), name='api-v2.1-admin-logs-file-update-logs'),
    re_path(r'^api/v2.1/admin/logs/share-permission-logs/$', AdminLogsSharePermissionLogs.as_view(), name='api-v2.1-admin-logs-share-permission-logs'),
    re_path(r'^api/v2.1/admin/logs/repo-transfer-logs/$', AdminLogsFileTransferLogs.as_view(), name='api-v2.1-admin-logs-repo-transfer-logs'),
    re_path(r'^api/v2.1/admin/logs/group-member-audit/$', AdminLogGroupMemberAuditLogs.as_view(), name='api-v2.1-admin-logs-group-member-audit'),

    ## admin::admin logs
    re_path(r'^api/v2.1/admin/admin-logs/$', AdminOperationLogs.as_view(), name='api-v2.1-admin-admin-operation-logs'),
    re_path(r'^api/v2.1/admin/admin-login-logs/$', AdminLoginLogs.as_view(), name='api-v2.1-admin-admin-login-logs'),

    ## admin::share-links
    re_path(r'^api/v2.1/admin/share-links/$', AdminShareLinks.as_view(), name='api-v2.1-admin-share-links'),
    re_path(r'^api/v2.1/admin/share-links/(?P<token>[a-f0-9]+)/$', AdminShareLink.as_view(), name='api-v2.1-admin-share-link'),
    re_path(r'^api/v2.1/admin/share-links/(?P<token>[a-f0-9]+)/download/$',
            AdminShareLinkDownload.as_view(), name='api-v2.1-admin-share-link-download'),
    re_path(r'^api/v2.1/admin/share-links/(?P<token>[a-f0-9]+)/check-password/$',
            AdminShareLinkCheckPassword.as_view(), name='api-v2.1-admin-share-link-check-password'),
    re_path(r'^api/v2.1/admin/share-links/(?P<token>[a-f0-9]+)/dirents/$',
            AdminShareLinkDirents.as_view(), name='api-v2.1-admin-share-link-dirents'),

    ## admin::upload-links
    re_path(r'^api/v2.1/admin/upload-links/$', AdminUploadLinks.as_view(), name='api-v2.1-admin-upload-links'),
    re_path(r'^api/v2.1/admin/upload-links/(?P<token>[a-f0-9]+)/$', AdminUploadLink.as_view(), name='api-v2.1-admin-upload-link'),
    re_path(r'^api/v2.1/admin/upload-links/(?P<token>[a-f0-9]+)/upload/$',
            AdminUploadLinkUpload.as_view(), name='api-v2.1-admin-upload-link-upload'),
    re_path(r'^api/v2.1/admin/upload-links/(?P<token>[a-f0-9]+)/check-password/$',
            AdminUploadLinkCheckPassword.as_view(), name='api-v2.1-admin-upload-link-check-password'),

    ## admin::admin-role
    re_path(r'^api/v2.1/admin/admin-role/$', AdminAdminRole.as_view(), name='api-v2.1-admin-admin-role'),

    ## admin::organizations
    re_path(r'^api/v2.1/admin/organizations/$', AdminOrganizations.as_view(), name='api-v2.1-admin-organizations'),
    re_path(r'^api/v2.1/admin/organizations-basic-info/$', AdminOrganizationsBaseInfo.as_view(), name='api-v2.1-admin-organizations-basic-info'),
    re_path(r'^api/v2.1/admin/search-organization/$', AdminSearchOrganization.as_view(), name='api-v2.1-admin-Search-organization'),
    re_path(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/$', AdminOrganization.as_view(), name='api-v2.1-admin-organization'),
    re_path(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/users/$', AdminOrgUsers.as_view(), name='api-v2.1-admin-org-users'),
    re_path(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/users/(?P<email>[^/]+)/$', AdminOrgUser.as_view(), name='api-v2.1-admin-org-user'),
    re_path(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/groups/$', AdminOrgGroups.as_view(),name='api-v2.1-admin-org-groups'),
    re_path(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/repos/$', AdminOrgRepos.as_view(),name='api-v2.1-admin-org-repos'),
    re_path(r'^api/v2.1/admin/organizations/(?P<org_id>\d+)/statistics/traffic/$', AdminOrgStatsTraffic.as_view(), name='api-v2.1-admin-org-stats-traffic'),

    ## admin::institutions
    re_path(r'^api/v2.1/admin/institutions/$', AdminInstitutions.as_view(), name='api-v2.1-admin-institutions'),
    re_path(r'^api/v2.1/admin/institutions/(?P<institution_id>\d+)/$', AdminInstitution.as_view(), name='api-v2.1-admin-institution'),
    re_path(r'^api/v2.1/admin/institutions/(?P<institution_id>\d+)/users/$', AdminInstitutionUsers.as_view(), name='api-v2.1-admin-institution-users'),
    re_path(r'^api/v2.1/admin/institutions/(?P<institution_id>\d+)/users/(?P<email>[^/]+)/$', AdminInstitutionUser.as_view(), name='api-v2.1-admin-institution-user'),

    ## admin::logo
    re_path(r'^api/v2.1/admin/logo/$', AdminLogo.as_view(), name='api-v2.1-admin-logo'),
    re_path(r'^api/v2.1/admin/favicon/$', AdminFavicon.as_view(), name='api-v2.1-admin-favicon'),
    re_path(r'^api/v2.1/admin/license/$', AdminLicense.as_view(), name='api-v2.1-admin-license'),
    re_path(r'^api/v2.1/admin/login-background-image/$', AdminLoginBgImage.as_view(), name='api-v2.1-admin-login-background-image'),

    ## admin::invitations
    re_path(r'^api/v2.1/admin/invitations/$', AdminInvitations.as_view(), name='api-v2.1-admin-invitations'),
    re_path(r'^api/v2.1/admin/invitations/(?P<token>[a-f0-9]{32})/$', AdminInvitation.as_view(), name='api-v2.1-admin-invitation'),

    ## admin:: wiki
    re_path(r'^api/v2.1/admin/wikis/$', AdminWikis.as_view(), name='api-v2.1-admin-wikis'),

    re_path(r'^wikis/(?P<wiki_id>[^/]+)/$', wiki_view, name='wiki'),
    re_path(r'^wikis/(?P<wiki_id>[^/]+)/(?P<page_id>[-0-9a-zA-Z]{4})/$', wiki_view, name='wiki'),
    re_path(r'^wiki/publish/(?P<publish_url>[-0-9a-zA-Z]+)/$', wiki_publish_view, name='wiki-publish'),
    re_path(r'^wiki/publish/(?P<publish_url>[-0-9a-zA-Z]+)/(?P<page_id>[-0-9a-zA-Z]{4})/$', wiki_publish_view, name='wiki-publish'),
    re_path(r'^wiki/file_revisions/(?P<wiki_id>[^/]+)/$', wiki_history_view, name='wiki-history'),

    path('avatar/', include('seahub.avatar.urls')),
    path('group/', include('seahub.group.urls')),
    path('options/', include('seahub.options.urls')),
    path('profile/', include('seahub.profile.urls')),
    path('share/', include('seahub.share.urls')),
    path('help/', include('seahub.help.urls')),
    path('captcha/', include('captcha.urls')),
    path('thumbnail/', include('seahub.thumbnail.urls')),
    path('inst/', include(('seahub.institutions.urls', 'institutions'), namespace='institutions')),
    path('invite/', include(('seahub.invitations.urls', 'invitations'), namespace='invitations')),
    path('terms/', include('termsandconditions.urls')),
    path('published/', include(('seahub.wiki.urls', 'wiki'), namespace='wiki')),
    path('work-weixin/', include('seahub.work_weixin.urls')),
    path('weixin/', include('seahub.weixin.urls')),
    # Must specify a namespace if specifying app_name.
    # path('drafts/', include(('seahub.drafts.urls', 'drafts'), namespace='drafts')),

    ## admin::address book
    re_path(r'^api/v2.1/admin/address-book/groups/$', AdminAddressBookGroups.as_view(), name='api-v2.1-admin-address-book-groups'),
    re_path(r'^api/v2.1/admin/address-book/groups/(?P<group_id>\d+)/$', AdminAddressBookGroup.as_view(), name='api-v2.1-admin-address-book-group'),

    ## admin::file-scan-records
    re_path(r'^api/v2.1/admin/file-scan-records/$', AdminFileScanRecords.as_view(), name='api-v2.1-admin-file-scan-records'),

    # admin::virus-files
    re_path(r'^api/v2.1/admin/virus-files/$', AdminVirusFilesView.as_view(), name='api-v2.1-admin-virus-files'),
    re_path(r'^api/v2.1/admin/virus-files/(?P<virus_id>\d+)/$', AdminVirusFileView.as_view(), name='api-v2.1-admin-virus-file'),
    re_path(r'^api/v2.1/admin/virus-files/batch/$', AdminVirusFilesBatchView.as_view(), name='api-v2.1-admin-virus-files-batch'),

    ## admin::notifications
    re_path(r'^api/v2.1/admin/notifications/$', AdminNotificationsView.as_view(), name='api-2.1-admin-notifications'),
    re_path(r'^api/v2.1/admin/sys-notifications/$', AdminSysNotificationsView.as_view(), name='api-2.1-admin-sys-notifications'),
    re_path(r'^api/v2.1/admin/sys-notifications/(?P<nid>\d+)/$', AdminSysNotificationView.as_view(),name='api-2.1-admin-sys-notification'),
    re_path(r'^api/v2.1/admin/sys-user-notifications/$', AdminSysUserNotificationsView.as_view(), name='api-2.1-admin-sys-user-notifications'),
    re_path(r'^api/v2.1/admin/sys-user-notifications/(?P<nid>\d+)/$', AdminSysUserNotificationView.as_view(), name='api-2.1-admin-sys-user-notification'),
    ## admin::terms and conditions
    re_path(r'^api/v2.1/admin/terms-and-conditions/$', AdminTermsAndConditions.as_view(), name='api-v2.1-admin-terms-and-conditions'),
    re_path(r'^api/v2.1/admin/terms-and-conditions/(?P<term_id>\d+)/$', AdminTermAndCondition.as_view(), name='api-v2.1-admin-term-and-condition'),

    ## admin::work weixin departments
    re_path(r'^api/v2.1/admin/work-weixin/departments/$', AdminWorkWeixinDepartments.as_view(), name='api-v2.1-admin-work-weixin-departments'),
    re_path(r'^api/v2.1/admin/work-weixin/departments/(?P<department_id>\d+)/members/$', AdminWorkWeixinDepartmentMembers.as_view(), name='api-v2.1-admin-work-weixin-department-members'),
    re_path(r'^api/v2.1/admin/work-weixin/users/batch/$', AdminWorkWeixinUsersBatch.as_view(), name='api-v2.1-admin-work-weixin-users'),
    re_path(r'^api/v2.1/admin/work-weixin/departments/import/$', AdminWorkWeixinDepartmentsImport.as_view(), name='api-v2.1-admin-work-weixin-department-import'),

    ## admin:dingtalk departments
    re_path(r'^api/v2.1/admin/dingtalk/departments/$', AdminDingtalkDepartments.as_view(), name='api-v2.1-admin-dingtalk-departments'),
    re_path(r'^api/v2.1/admin/dingtalk/departments/(?P<department_id>\d+)/members/$', AdminDingtalkDepartmentMembers.as_view(), name='api-v2.1-admin-dingtalk-department-members'),
    re_path(r'^api/v2.1/admin/dingtalk/users/batch/$', AdminDingtalkUsersBatch.as_view(), name='api-v2.1-admin-dingtalk-users-batch'),
    re_path(r'^api/v2.1/admin/dingtalk/departments/import/$', AdminDingtalkDepartmentsImport.as_view(), name='api-v2.1-admin-dingtalk-department-import'),

    ## internal
    re_path(r'^api/v2.1/internal/user-list/$', InternalUserListView.as_view(), name="api-v2.1-internal-user-list"),
    re_path(r'^api/v2.1/internal/check-share-link-access/$', InternalCheckShareLinkAccess.as_view(), name="api-v2.1-internal-share-link-info"),
    re_path(r'^api/v2.1/internal/repos/(?P<repo_id>[-0-9a-f]{36})/check-access/$', InternalCheckFileOperationAccess.as_view(), name="api-v2.1-internal-check-file-op-access"),
    re_path(r'^api/v2.1/internal/repos/(?P<repo_id>[-0-9a-f]{36})/check-thumbnail/$', CheckThumbnailAccess.as_view(), name='api-v2.1-internal-check-thumbnail-access'),
    re_path(r'^api/v2.1/internal/check-share-link-thumbnail/$', CheckShareLinkThumbnailAccess.as_view(), name='api-v2.1-internal-check-share-link-thumbnail-access'),
    ### system admin ###
    re_path(r'^sys/seafadmin/delete/(?P<repo_id>[-0-9a-f]{36})/$', sys_repo_delete, name='sys_repo_delete'),
    path('sys/useradmin/export-excel/', sys_useradmin_export_excel, name='sys_useradmin_export_excel'),
    path('sys/groupadmin/export-excel/', sys_group_admin_export_excel, name='sys_group_admin_export_excel'),
    path('sys/orgadmin/<int:org_id>/set_quota/', sys_org_set_quota, name='sys_org_set_quota'),
    path('sys/orgadmin/<int:org_id>/set_member_quota/', sys_org_set_member_quota, name='sys_org_set_member_quota'),
    re_path(r'^sys/sudo/', sys_sudo_mode, name='sys_sudo_mode'),
    re_path(r'^sys/check-license/', sys_check_license, name='sys_check_license'),
    path('useradmin/add/', user_add, name="user_add"),
    path('useradmin/remove/<str:email>/', user_remove, name="user_remove"),
    path('useradmin/removeadmin/<str:email>/', user_remove_admin, name='user_remove_admin'),
    path('useradmin/toggle_role/<str:email>/', user_toggle_role, name='user_toggle_role'),
    path('useradmin/<str:email>/set_quota/', user_set_quota, name='user_set_quota'),
    path('useradmin/password/reset/<str:email>/', user_reset, name='user_reset'),
    path('useradmin/batchmakeadmin/', batch_user_make_admin, name='batch_user_make_admin'),
    path('useradmin/batchadduser/example/', batch_add_user_example, name='batch_add_user_example'),

    path('sys/info/', sysadmin_react_fake_view, name="sys_info"),
    path('sys/statistics/file/', sysadmin_react_fake_view, name="sys_statistics_file"),
    path('sys/statistics/storage/', sysadmin_react_fake_view, name="sys_statistics_storage"),
    path('sys/statistics/user/', sysadmin_react_fake_view, name="sys_statistics_user"),
    path('sys/statistics/traffic/', sysadmin_react_fake_view, name="sys_statistics_traffic"),
    path('sys/statistics/reports/', sysadmin_react_fake_view, name="sys_statistics_reports"),
    path('sys/statistics/metrics/', sysadmin_react_fake_view, name="sys_statistics_metrics"),
    path('sys/desktop-devices/', sysadmin_react_fake_view, name="sys_desktop_devices"),
    path('sys/mobile-devices/', sysadmin_react_fake_view, name="sys_mobile_devices"),
    path('sys/device-errors/', sysadmin_react_fake_view, name="sys_device_errors"),
    path('sys/notifications/', sysadmin_react_fake_view, name="sys_notifications"),
    path('sys/web-settings/', sysadmin_react_fake_view, name="sys_web_settings"),
    path('sys/all-libraries/', sysadmin_react_fake_view, name="sys_all_libraries"),
    path('sys/all-wikis/', sysadmin_react_fake_view, name="sys_all_wikis"),
    path('sys/search-libraries/', sysadmin_react_fake_view, name="sys_search_libraries"),
    path('sys/system-library/', sysadmin_react_fake_view, name="sys_system_library"),
    path('sys/trash-libraries/', sysadmin_react_fake_view, name="sys_trash_libraries"),
    re_path(r'^sys/libraries/(?P<repo_id>[-0-9a-f]{36})/$', sysadmin_react_fake_view, name="sys_libraries_template"),
    re_path(r'^sys/libraries/(?P<repo_id>[-0-9a-f]{36})/(?P<repo_name>[^/]+)/(?P<path>.*)$', sysadmin_react_fake_view, name="sys_libraries_template_dirent"),
    path('sys/groups/', sysadmin_react_fake_view, name="sys_groups"),
    path('sys/search-groups/', sysadmin_react_fake_view, name="sys_search_groups"),
    path('sys/groups/<int:group_id>/libraries/', sysadmin_react_fake_view, name="sys_group_libraries"),
    path('sys/groups/<int:group_id>/members/', sysadmin_react_fake_view, name="sys_group_members"),
    path('sys/departments/', sysadmin_react_fake_view, name="sys_departments"),
    path('sys/departments/<int:group_id>/', sysadmin_react_fake_view, name="sys_department"),
    path('sys/departments/<int:group_id>/members/', sysadmin_react_fake_view, name="sys_department_members"),
    path('sys/departments/<int:group_id>/libraries/', sysadmin_react_fake_view, name="sys_department_libraries"),
    path('sys/users/', sysadmin_react_fake_view, name="sys_users"),
    path('sys/search-users/', sysadmin_react_fake_view, name="sys_search_users"),
    path('sys/users/admins/', sysadmin_react_fake_view, name="sys_users_admin"),
    path('sys/users/ldap/', sysadmin_react_fake_view, name="sys_users_ldap"),
    path('sys/users/ldap-imported/', sysadmin_react_fake_view, name="sys_users_ldap_imported"),
    path('sys/users/<str:email>/', sysadmin_react_fake_view, name="sys_user"),
    path('sys/users/<str:email>/owned-libraries/', sysadmin_react_fake_view, name="sys_user_repos"),
    path('sys/users/<str:email>/shared-libraries/', sysadmin_react_fake_view, name="sys_user_shared_repos"),
    path('sys/users/<str:email>/shared-links/', sysadmin_react_fake_view, name="sys_user_shared_links"),
    path('sys/users/<str:email>/groups/', sysadmin_react_fake_view, name="sys_user_groups"),
    path('sys/logs/login/', sysadmin_react_fake_view, name="sys_logs_login"),
    path('sys/logs/file-access/', sysadmin_react_fake_view, name="sys_logs_file_access"),
    path('sys/logs/file-update/', sysadmin_react_fake_view, name="sys_logs_file_update"),
    path('sys/logs/share-permission/', sysadmin_react_fake_view, name="sys_logs_share_permission"),
    path('sys/logs/repo-transfer/', sysadmin_react_fake_view, name="sys_logs_file_transfer"),
    path('sys/logs/group-member-audit/', sysadmin_react_fake_view, name="sys_logs_group_member_audit"),
    path('sys/admin-logs/operation/', sysadmin_react_fake_view, name="sys_admin_logs_operation"),
    path('sys/admin-logs/login/', sysadmin_react_fake_view, name="sys_admin_logs_login"),
    path('sys/organizations/', sysadmin_react_fake_view, name="sys_organizations"),
    path('sys/search-organizations/', sysadmin_react_fake_view, name="sys_search_organizations"),
    path('sys/organizations/<int:org_id>/info/', sysadmin_react_fake_view, name="sys_organization_info"),
    path('sys/organizations/<int:org_id>/users/', sysadmin_react_fake_view, name="sys_organization_users"),
    path('sys/organizations/<int:org_id>/groups/', sysadmin_react_fake_view, name="sys_organization_groups"),
    path('sys/organizations/<int:org_id>/libraries/', sysadmin_react_fake_view, name="sys_organization_repos"),
    path('sys/institutions/', sysadmin_react_fake_view, name="sys_institutions"),
    path('sys/institutions/<int:inst_id>/info/', sysadmin_react_fake_view, name="sys_institution_info"),
    path('sys/institutions/<int:inst_id>/members/', sysadmin_react_fake_view, name="sys_institution_members"),
    path('sys/institutions/<int:inst_id>/admins/', sysadmin_react_fake_view, name="sys_institution_admins"),
    path('sys/terms-and-conditions/', sysadmin_react_fake_view, name="terms_and_conditions"),
    path('sys/share-links/', sysadmin_react_fake_view, name="sys_share_links"),
    path('sys/upload-links/', sysadmin_react_fake_view, name="sys_upload_links"),
    path('sys/work-weixin/', sysadmin_react_fake_view, name="sys_work_weixin"),
    path('sys/work-weixin/departments/', sysadmin_react_fake_view, name="sys_work_weixin_departments"),
    path('sys/dingtalk/', sysadmin_react_fake_view, name="sys_dingtalk"),
    path('sys/dingtalk/departments/', sysadmin_react_fake_view, name="sys_dingtalk_departments"),
    path('sys/invitations/', sysadmin_react_fake_view, name="sys_invitations"),
    path('sys/abuse-reports/', sysadmin_react_fake_view, name="sys_abuse_reports"),

    path('client-login/', client_token_login, name='client_token_login'),
]

try:
    from seahub.settings import ENABLE_FILE_SCAN
except ImportError:
    ENABLE_FILE_SCAN = False
if ENABLE_FILE_SCAN:
    urlpatterns += [
        path('sys/file-scan-records/', sysadmin_react_fake_view, name="sys_file_scan_records"),
    ]

from seahub.utils import EVENTS_ENABLED
if EVENTS_ENABLED:
    urlpatterns += [
        path('sys/virus-files/all/', sysadmin_react_fake_view, name='sys_virus_scan_records'),
        path('sys/virus-files/unhandled/', sysadmin_react_fake_view, name='sys_virus_scan_records'),
    ]

if settings.SERVE_STATIC:
    from django.views.static import serve as static_view
    media_url = settings.MEDIA_URL.strip('/')
    urlpatterns += [
        re_path(r'^%s/(?P<path>.*)$' % (media_url), static_view,
            {'document_root': settings.MEDIA_ROOT}),
    ]

urlpatterns += [
    re_path(r'^demo/', demo),
]

from seahub.utils import is_pro_version
if is_pro_version():
    urlpatterns += [
        re_path(r'^api/v2.1/admin/logs/login/$', LoginLogs.as_view(), name='api-v2.1-admin-logs-login'),
        re_path(r'^api/v2.1/admin/logs/file-audit/$', FileAudit.as_view(), name='api-v2.1-admin-logs-file-audit'),
        re_path(r'^api/v2.1/admin/logs/file-update/$', FileUpdate.as_view(), name='api-v2.1-admin-logs-file-update'),
        re_path(r'^api/v2.1/admin/logs/perm-audit/$', PermAudit.as_view(), name='api-v2.1-admin-logs-perm-audit'),

        re_path(r'^api/v2.1/admin/logs/export-excel/$', SysLogsExport.as_view(), name='api-v2.1-admin-logs-export-excel'),
        re_path(r'^api/v2.1/query-io-status/$', SeahubIOStatus.as_view(), name='api-v2.1-query-export-status'),
        path('sys/log/export-excel/', sys_log_export_excel, name='sys_log_export_excel'),


    ]

if getattr(settings, 'MULTI_TENANCY', False):
    urlpatterns += [
        re_path(r'^api/v2.1/org/', include('seahub.organizations.api_urls')),
        path('org/', include('seahub.organizations.urls')),
    ]

if getattr(settings, 'MULTI_INSTITUTION', False):
    urlpatterns += [
        re_path(r'^api/v2.1/institutions/', include('seahub.institutions.api_urls')),
    ]

if getattr(settings, 'ENABLE_SHIB_LOGIN', False):
    urlpatterns += [
        re_path(r'^shib-complete/', TemplateView.as_view(template_name='shibboleth/complete.html'), name="shib_complete"),
        re_path(r'^shib-success/', TemplateView.as_view(template_name="shibboleth/success.html"), name="shib_success"),
    ]


if getattr(settings, 'ENABLE_KRB5_LOGIN', False):
    urlpatterns += [
        re_path(r'^krb5-login/', shib_login, name="krb5_login"),
    ]


if getattr(settings, 'ENABLE_LOGIN_SIMPLE_CHECK', False):
    urlpatterns += [
        re_path(r'^sso-auto-login/', login_simple_check),
    ]

if getattr(settings, 'ENABLE_MULTI_ADFS', False):
    from seahub.adfs_auth.views import *
    urlpatterns += [
        re_path(r'^multi_adfs_sso/$', multi_adfs_sso, name='multi_adfs_sso'),
        re_path(r'^org/custom/(?P<org_id>\d+)/saml2/login/$', login, name='org_saml2_login'),
        re_path(r'^org/custom/(?P<org_id>\d+)/saml2/acs/$', assertion_consumer_service, name='org_saml2_acs'),
        re_path(r'^org/custom/(?P<org_id>\d+)/saml2/metadata/$', metadata, name='org_saml2_metadata'),
        re_path(r'^org/custom/(?P<org_id>\d+)/saml2/connect/$', saml2_connect, name='org_saml2_connect'),
        re_path(r'^org/custom/(?P<org_id>\d+)/saml2/disconnect/$', saml2_disconnect, name='org_saml2_disconnect'),
        re_path(r'^org/custom/(?P<org_id>\d+)/saml2/ls/$', SamlLogoutView.as_view(), name='org_saml2_ls'),
        re_path(r'^org/custom/(?P<org_id>\d+)/saml2/ls/post/$', SamlLogoutView.as_view(), name='org_saml2_ls_post'),
        re_path(r'^org/custom/(?P<org_id>\d+)/saml2/', include(('djangosaml2.urls', 'djangosaml2'), namespace='org')),
        re_path(r'^org/custom/(?P<url_prefix>[a-z_0-9-]+)/saml2/login/$', adfs_compatible_view, name='login_compatible_view'),
        re_path(r'^org/custom/(?P<url_prefix>[a-z_0-9-]+)/saml2/acs/$', adfs_compatible_view, name='acs_compatible_view'),
        re_path(r'^org/custom/(?P<url_prefix>[a-z_0-9-]+)/saml2/metadata/$', adfs_compatible_view, name='metadate_compatible_view'),
        re_path(r'^org/custom/(?P<url_prefix>[a-z_0-9-]+)/saml2/ls/$', adfs_compatible_view, name='ls_compatible_view'),
        re_path(r'^org/custom/(?P<url_prefix>[a-z_0-9-]+)/saml2/ls/post/$', adfs_compatible_view, name='ls_post_compatible_view'),
    ]

if getattr(settings, 'ENABLE_ADFS_LOGIN', False):
    from seahub.adfs_auth.views import *
    urlpatterns += [
        path('saml2/login/', login, name='saml2_login'),
        path('saml2/acs/', assertion_consumer_service, name='saml2_acs'),
        path('saml2/metadata/', metadata, name='saml2_metadata'),
        path('saml2/connect/', saml2_connect, name='saml2_connect'),
        path('saml2/disconnect/', saml2_disconnect, name='saml2_disconnect'),
        path('saml2/', include('djangosaml2.urls')),
    ]

if getattr(settings, 'ENABLE_MULTI_ADFS', False) or getattr(settings, 'ENABLE_ADFS_LOGIN', False):
    from seahub.adfs_auth.views import auth_complete
    urlpatterns += [
        path('saml2/complete/', auth_complete, name='saml2_complete'),
    ]

if getattr(settings, 'ENABLE_ONLYOFFICE', False) or getattr(settings, 'ENABLE_MULTIPLE_OFFICE_SUITE', False):
    urlpatterns += [
        path('onlyoffice/', include('seahub.onlyoffice.urls')),
        path('onlyoffice-api/', include('seahub.onlyoffice.api_urls')),
    ]


if getattr(settings, 'ENABLE_CAS', False):
    from seahub.django_cas_ng.views import login as cas_login
    from seahub.django_cas_ng.views import logout as cas_logout
    from seahub.django_cas_ng.views import callback as cas_callback
    urlpatterns += [
        path('accounts/cas-login/', cas_login, name='cas_ng_login'),
        path('accounts/cas-logout/', cas_logout, name='cas_ng_logout'),
        path('accounts/cas-callback/', cas_callback, name='cas_ng_proxy_callback'),
    ]

if getattr(settings, 'ENABLE_SEADOC', False):
    urlpatterns += [
        re_path(r'^api/v2.1/seadoc/', include('seahub.seadoc.urls')),
    ]

if getattr(settings, 'ENABLE_EXCALIDRAW', False):
    urlpatterns += [
        re_path(r'^api/v2.1/exdraw/', include('seahub.exdraw.urls')),
    ]

if getattr(settings, 'CLIENT_SSO_VIA_LOCAL_BROWSER', False):
    urlpatterns += [
        re_path(r'^client-sso/(?P<token>[^/]+)/$', client_sso, name="client_sso"),
        re_path(r'^client-sso/(?P<token>[^/]+)/complete/$', client_sso_complete, name="client_sso_complete"),
    ]

if getattr(settings, 'ENABLE_SUBSCRIPTION', False):
    urlpatterns += [
        re_path(r'^subscription/', include('seahub.subscription.urls')),
        re_path(r'^api/v2.1/subscription/$', SubscriptionView.as_view(), name='api-v2.1-subscription'),
        re_path(r'^api/v2.1/subscription/plans/$', SubscriptionPlansView.as_view(), name='api-v2.1-subscription-plans'),
        re_path(r'^api/v2.1/subscription/logs/$', SubscriptionLogsView.as_view(), name='api-v2.1-subscription-logs'),
    ]

if getattr(settings, 'ENABLE_EXTERNAL_BILLING_SERVICE', False):
    urlpatterns += [
        re_path(r'^billing/', include('seahub.billing.urls')),
    ]

if getattr(settings, 'ENABLE_METADATA_MANAGEMENT', False):
    urlpatterns += [
        re_path(r'^api/v2.1/repos/(?P<repo_id>[-0-9a-f]{36})/metadata/', include('seahub.repo_metadata.urls')),
    ]

# ai API
urlpatterns += [
    re_path(r'^api/v2.1/ai/image-caption/$', ImageCaption.as_view(), name='api-v2.1-image-caption'),
    re_path(r'^api/v2.1/ai/generate-file-tags/$', GenerateFileTags.as_view(), name='api-v2.1-generate-file-tags'),
    re_path(r'^api/v2.1/ai/generate-summary/$', GenerateSummary.as_view(), name='api-v2.1-generate-summary'),
    re_path(r'^api/v2.1/ai/ocr/$', OCR.as_view(), name='api-v2.1-ocr'),
    re_path(r'^api/v2.1/ai/translate/$', Translate.as_view(), name='api-v2.1-translate'),
    re_path(r'^api/v2.1/ai/writing-assistant/$', WritingAssistant.as_view(), name='api-v2.1-writing-assistant'),
    re_path(r'^api/v2.1/ai/extract-text/$', ExtractText.as_view(), name='api-v2.1-extract-text'),
]
