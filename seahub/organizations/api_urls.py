# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from .api.address_book.groups import (
    AdminAddressBookGroups, AdminAddressBookGroup
)

from .api.group_libraries import AdminGroupLibraries, AdminGroupLibrary
from .api.group_owned_libraries import (
    AdminGroupOwnedLibraries, AdminGroupOwnedLibrary
)
from .api.group_members import AdminGroupMembers, AdminGroupMember
from .api.admin.users import OrgAdminUser, OrgAdminUsers, OrgAdminSearchUser
from .api.admin.user_set_password import OrgAdminUserSetPassword
from .api.admin.groups import OrgAdminGroups, OrgAdminGroup, OrgAdminSearchGroup
from .api.admin.repos import OrgAdminRepos, OrgAdminRepo
from .api.admin.info import OrgAdminInfo
from .api.admin.links import OrgAdminLinks, OrgAdminLink
from .api.admin.logs import OrgAdminLogsFileAccess, OrgAdminLogsFileUpdate, OrgAdminLogsPermAudit
from .api.admin.user_repos import OrgAdminUserRepos, OrgAdminUserBesharedRepos

urlpatterns = [
    url(r'^(?P<org_id>\d+)/admin/address-book/groups/$', AdminAddressBookGroups.as_view(), name='api-admin-address-book-groups'),
    url(r'^(?P<org_id>\d+)/admin/address-book/groups/(?P<group_id>\d+)/$', AdminAddressBookGroup.as_view(), name='api-admin-address-book-group'),

    url(r'^(?P<org_id>\d+)/admin/groups/$', OrgAdminGroups.as_view(), name='api-v2.1-org-admin-groups'),
    url(r'^(?P<org_id>\d+)/admin/search-group/$', OrgAdminSearchGroup.as_view(), name='api-v2.1-org-admin-search-group'),
    url(r'^(?P<org_id>\d+)/admin/groups/(?P<group_id>\d+)/$', OrgAdminGroup.as_view(), name='api-admin-group'),
    url(r'^(?P<org_id>\d+)/admin/groups/(?P<group_id>\d+)/libraries/$', AdminGroupLibraries.as_view(), name='api-admin-group-libraries'),
    url(r'^(?P<org_id>\d+)/admin/groups/(?P<group_id>\d+)/libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminGroupLibrary.as_view(), name='api-admin-group-library'),

    url(r'^(?P<org_id>\d+)/admin/groups/(?P<group_id>\d+)/group-owned-libraries/$', AdminGroupOwnedLibraries.as_view(), name='api-admin-group-owned-libraries'),
    url(r'^(?P<org_id>\d+)/admin/groups/(?P<group_id>\d+)/group-owned-libraries/(?P<repo_id>[-0-9a-f]{36})/$', AdminGroupOwnedLibrary.as_view(), name='api-admin-group-owned-library'),

    url(r'^(?P<org_id>\d+)/admin/groups/(?P<group_id>\d+)/members/$', AdminGroupMembers.as_view(), name='api-admin-group-members'),
    url(r'^(?P<org_id>\d+)/admin/groups/(?P<group_id>\d+)/members/(?P<email>[^/]+)/$', AdminGroupMember.as_view(), name='api-admin-group-member'),
    url(r'^(?P<org_id>\d+)/admin/users/$', OrgAdminUsers.as_view(), name='api-v2.1-org-admin-users'),
    url(r'^(?P<org_id>\d+)/admin/search-user/$', OrgAdminSearchUser.as_view(), name='api-v2.1-org-admin-search-user'),
    url(r'^(?P<org_id>\d+)/admin/users/(?P<email>[^/]+)/$', OrgAdminUser.as_view(), name='api-v2.1-org-admin-user'),
    url(r'^(?P<org_id>\d+)/admin/users/(?P<email>[^/]+)/set-password/', OrgAdminUserSetPassword.as_view(), name='api-v2.1-org-admin-user-reset-password'),
    url(r'^(?P<org_id>\d+)/admin/users/(?P<email>[^/]+)/repos/$', OrgAdminUserRepos.as_view(), name='api-v2.1-org-admin-user-repos'),
    url(r'^(?P<org_id>\d+)/admin/users/(?P<email>[^/]+)/beshared-repos/$', OrgAdminUserBesharedRepos.as_view(), name='api-v2.1-org-admin-user-beshared-repos'),
    url(r'^(?P<org_id>\d+)/admin/repos/$', OrgAdminRepos.as_view(), name='api-v2.1-org-admin-repos'),
    url(r'^(?P<org_id>\d+)/admin/repos/(?P<repo_id>[-0-9a-f]{36})/$', OrgAdminRepo.as_view(), name='api-v2.1-org-admin-repo'),
    url(r'^admin/info/$', OrgAdminInfo.as_view(), name='api-v2.1-org-admin-info'),
    url(r'^admin/links/$', OrgAdminLinks.as_view(), name='api-v2.1-org-admin-links'),
    url(r'^admin/links/(?P<token>[a-f0-9]+)/$', OrgAdminLink.as_view(), name='api-v2.1-org-admin-link'),
    url(r'^admin/logs/file-access/$', OrgAdminLogsFileAccess.as_view(), name='api-v2.1-org-admin-logs-file-access'),
    url(r'^admin/logs/file-update/$', OrgAdminLogsFileUpdate.as_view(), name='api-v2.1-org-admin-logs-file-update'),
    url(r'^admin/logs/repo-permission/$', OrgAdminLogsPermAudit.as_view(), name='api-v2.1-org-admin-logs-repo-permission'),
]
