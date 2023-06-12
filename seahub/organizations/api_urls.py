# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path, re_path

from .api.address_book.groups import (
    AdminAddressBookGroups, AdminAddressBookGroup
)

from .api.group_libraries import AdminGroupLibraries, AdminGroupLibrary
from .api.group_owned_libraries import (
    AdminGroupOwnedLibraries, AdminGroupOwnedLibrary
)
from .api.group_members import AdminGroupMembers, AdminGroupMember
from .api.admin.users import OrgAdminUser, OrgAdminUsers, OrgAdminSearchUser, \
        OrgAdminImportUsers
from .api.admin.user_set_password import OrgAdminUserSetPassword
from .api.admin.groups import OrgAdminGroups, OrgAdminGroup, OrgAdminSearchGroup
from .api.admin.repos import OrgAdminRepos, OrgAdminRepo
from .api.admin.info import OrgAdminInfo
from .api.admin.links import OrgAdminLinks, OrgAdminLink
from .api.admin.web_settings import OrgAdminWebSettings
from .api.admin.logs import OrgAdminLogsFileAccess, OrgAdminLogsFileUpdate, OrgAdminLogsPermAudit
from .api.admin.user_repos import OrgAdminUserRepos, OrgAdminUserBesharedRepos

from .api.admin.devices import OrgAdminDevices, OrgAdminDevicesErrors
from .api.admin.logo import OrgAdminLogo

from .api.admin.statistics import OrgFileOperationsView, OrgTotalStorageView, \
        OrgActiveUsersView, OrgSystemTrafficView, OrgUserTrafficView, \
        OrgUserTrafficExcelView, OrgUserStorageExcelView
from .api.admin.saml_config import OrgUploadIdPCertificateView, OrgSAMLConfigView, OrgUrlPrefixView


urlpatterns = [
    path('<int:org_id>/admin/statistics/file-operations/',
        OrgFileOperationsView.as_view(),
        name='api-v2.1-org-admin-statistics-file-operations'),
    path('<int:org_id>/admin/statistics/total-storage/',
        OrgTotalStorageView.as_view(),
        name='api-v2.1-org-admin-statistics-total-storage'),
    path('<int:org_id>/admin/statistics/active-users/',
        OrgActiveUsersView.as_view(),
        name='api-v2.1-org-admin-statistics-active-users'),
    path('<int:org_id>/admin/statistics/system-traffic/',
        OrgSystemTrafficView.as_view(),
        name='api-v2.1-org-admin-statistics-system-traffic'),
    path('<int:org_id>/admin/statistics/user-traffic/',
        OrgUserTrafficView.as_view(),
        name='api-v2.1-org-admin-statistics-user-traffic'),
    path('<int:org_id>/admin/statistics/user-traffic/excel/',
        OrgUserTrafficExcelView.as_view(),
        name='api-v2.1-org-admin-statistics-user-traffic-excel'),
    path('<int:org_id>/admin/statistics/user-storage/excel/',
        OrgUserStorageExcelView.as_view(),
        name='api-v2.1-org-admin-statistics-user-storage-excel'),

    path('<int:org_id>/admin/saml-idp-certificate/',
        OrgUploadIdPCertificateView.as_view(),
        name='api-v2.1-org-admin-saml-idp-certificate'),
    path('<int:org_id>/admin/saml-config/',
        OrgSAMLConfigView.as_view(),
        name='api-v2.1-org-admin-saml-config'),
    path('<int:org_id>/admin/url-prefix/',
        OrgUrlPrefixView.as_view(),
        name='api-v2.1-org-admin-url-prefix'),

    path('<int:org_id>/admin/logo/', OrgAdminLogo.as_view(), name='api-v2.1-org-admin-logo'),
    path('<int:org_id>/admin/devices/', OrgAdminDevices.as_view(), name='api-v2.1-org-admin-devices'),
    path('<int:org_id>/admin/devices-errors/', OrgAdminDevicesErrors.as_view(), name='api-v2.1-org-admin-devices-errors'),

    path('<int:org_id>/admin/address-book/groups/', AdminAddressBookGroups.as_view(), name='api-admin-address-book-groups'),
    path('<int:org_id>/admin/address-book/groups/<int:group_id>/', AdminAddressBookGroup.as_view(), name='api-admin-address-book-group'),

    path('<int:org_id>/admin/groups/', OrgAdminGroups.as_view(), name='api-v2.1-org-admin-groups'),
    path('<int:org_id>/admin/search-group/', OrgAdminSearchGroup.as_view(), name='api-v2.1-org-admin-search-group'),
    path('<int:org_id>/admin/groups/<int:group_id>/', OrgAdminGroup.as_view(), name='api-admin-group'),
    path('<int:org_id>/admin/groups/<int:group_id>/libraries/', AdminGroupLibraries.as_view(), name='api-admin-group-libraries'),
    re_path(r'^(?P<org_id>\d+)/admin/groups/(?P<group_id>\d+)/libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminGroupLibrary.as_view(), name='api-admin-group-library'),

    path('<int:org_id>/admin/groups/<int:group_id>/group-owned-libraries/', AdminGroupOwnedLibraries.as_view(), name='api-admin-group-owned-libraries'),
    re_path(r'^(?P<org_id>\d+)/admin/groups/(?P<group_id>\d+)/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminGroupOwnedLibrary.as_view(), name='api-admin-group-owned-library'),

    path('<int:org_id>/admin/groups/<int:group_id>/members/', AdminGroupMembers.as_view(), name='api-admin-group-members'),
    path('<int:org_id>/admin/groups/<int:group_id>/members/<str:email>/', AdminGroupMember.as_view(), name='api-admin-group-member'),
    path('<int:org_id>/admin/users/', OrgAdminUsers.as_view(), name='api-v2.1-org-admin-users'),
    path('<int:org_id>/admin/import-users/', OrgAdminImportUsers.as_view(), name='api-v2.1-org-admin-import-users'),
    path('<int:org_id>/admin/search-user/', OrgAdminSearchUser.as_view(), name='api-v2.1-org-admin-search-user'),
    path('<int:org_id>/admin/users/<str:email>/', OrgAdminUser.as_view(), name='api-v2.1-org-admin-user'),
    re_path(r'^(?P<org_id>\d+)/admin/users/(?P<email>[^/]+)/set-password/', OrgAdminUserSetPassword.as_view(), name='api-v2.1-org-admin-user-reset-password'),
    path('<int:org_id>/admin/users/<str:email>/repos/', OrgAdminUserRepos.as_view(), name='api-v2.1-org-admin-user-repos'),
    path('<int:org_id>/admin/users/<str:email>/beshared-repos/', OrgAdminUserBesharedRepos.as_view(), name='api-v2.1-org-admin-user-beshared-repos'),
    path('<int:org_id>/admin/repos/', OrgAdminRepos.as_view(), name='api-v2.1-org-admin-repos'),
    re_path(r'^(?P<org_id>\d+)/admin/repos/(?P<repo_id>[-0-9a-f]{36})/$', OrgAdminRepo.as_view(), name='api-v2.1-org-admin-repo'),
    path('<int:org_id>/admin/web-settings/', OrgAdminWebSettings.as_view(), name='api-v2.1-org-admin-web-settings'),
    path('admin/info/', OrgAdminInfo.as_view(), name='api-v2.1-org-admin-info'),
    path('admin/links/', OrgAdminLinks.as_view(), name='api-v2.1-org-admin-links'),
    re_path(r'^admin/links/(?P<token>[a-f0-9]+)/$', OrgAdminLink.as_view(), name='api-v2.1-org-admin-link'),
    path('admin/logs/file-access/', OrgAdminLogsFileAccess.as_view(), name='api-v2.1-org-admin-logs-file-access'),
    path('admin/logs/file-update/', OrgAdminLogsFileUpdate.as_view(), name='api-v2.1-org-admin-logs-file-update'),
    path('admin/logs/repo-permission/', OrgAdminLogsPermAudit.as_view(), name='api-v2.1-org-admin-logs-repo-permission'),
]
