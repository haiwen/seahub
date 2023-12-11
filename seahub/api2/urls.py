# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import include, path, re_path

from .views import *
from .views_misc import ServerInfoView
from .views_auth import LogoutDeviceView, ClientLoginTokenView
from .endpoints.admin.two_factor_auth import TwoFactorAuthView
from .endpoints.dir_shared_items import DirSharedItemsEndpoint
from .endpoints.admin.account import Account
from .endpoints.shared_upload_links import SharedUploadLinksView
from .endpoints.be_shared_repo import BeSharedRepo
from .endpoints.file_comment import FileCommentView
from .endpoints.file_comments import FileCommentsView
from .endpoints.file_comments_counts import FileCommentsCounts
from .endpoints.search_user import SearchUser
from .endpoints.send_share_link_email import SendShareLinkView
from .endpoints.send_upload_link_email import SendUploadLinkView

urlpatterns = [
    path('ping/', Ping.as_view()),
    path('auth/ping/', AuthPing.as_view()),
    re_path(r'^auth-token/', ObtainAuthToken.as_view()),
    path('server-info/', ServerInfoView.as_view()),
    path('logout-device/', LogoutDeviceView.as_view()),
    path('client-login/', ClientLoginTokenView.as_view()),
    re_path(r'^two-factor-auth/(?P<email>\S+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/$', TwoFactorAuthView.as_view(), name="two-factor-auth-view"),
    path('device-wiped/', RemoteWipeReportView.as_view()),
    path('wopi/', include('seahub.wopi.urls')),

    # RESTful API
    path('accounts/', Accounts.as_view(), name="accounts"),
    re_path(r'^accounts/(?P<email>\S+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/$', Account.as_view(), name="api2-account"),
    path('account/info/', AccountInfo.as_view()),
    path('regdevice/', RegDevice.as_view(), name="regdevice"),
    path('search/', Search.as_view(), name='api_search'),
    path('search-user/', SearchUser.as_view(), name='search-user'),
    path('repos/', Repos.as_view(), name="api2-repos"),
    path('repos/public/', PubRepos.as_view(), name="api2-pub-repos"),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/$', Repo.as_view(), name="api2-repo"),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/history/$', RepoHistory.as_view()),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/user-folder-perm/$', RepoUserFolderPerm.as_view(), name="api2-repo-user-folder-perm"),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/group-folder-perm/$', RepoGroupFolderPerm.as_view(), name="api2-repo-group-folder-perm"),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/history-limit/$', RepoHistoryLimit.as_view(), name="api2-repo-history-limit"),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/download-info/$', DownloadRepo.as_view()),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/owner/$', RepoOwner.as_view(), name="api2-repo-owner"),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/download-shared-links/$', RepoDownloadSharedLinks.as_view(), name="api2-repo-download-shared-links"),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/download-shared-links/(?P<token>[a-f0-9]+)/$', RepoDownloadSharedLink.as_view(), name="api2-repo-download-shared-link"),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/upload-shared-links/$', RepoUploadSharedLinks.as_view(), name="api2-repo-upload-shared-links"),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/upload-shared-links/(?P<token>[a-f0-9]+)/$', RepoUploadSharedLink.as_view(), name="api2-repo-upload-shared-link"),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/upload-link/$', UploadLinkView.as_view()),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/update-link/$', UpdateLinkView.as_view()),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/upload-blks-link/$', UploadBlksLinkView.as_view()),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/update-blks-link/$', UpdateBlksLinkView.as_view()),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/owa-file/$', OwaFileView.as_view(), name='api2-owa-file-view'),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/$', FileView.as_view(), name='FileView'),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/metadata/$', FileMetaDataView.as_view(), name='FileMetaDataView'),
    re_path(r'^repos/(?P<repo_id>[-0-9a-f]{36})/files/(?P<file_id>[0-9a-f]{40})/blks/(?P<block_id>[0-9a-f]{40})/download-link/$', FileBlockDownloadLinkView.as_view()),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/comments/$', FileCommentsView.as_view(), name='api2-file-comments'),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/comments/counts/$', FileCommentsCounts.as_view(), name='api2-file-comments-counts'),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/comments/(?P<comment_id>\d+)/$', FileCommentView.as_view(), name='api2-file-comment'),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/detail/$', FileDetailView.as_view()),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/history/$', FileHistory.as_view()),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/revision/$', FileRevision.as_view()),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/revert/$', FileRevert.as_view(), name='api2-file-revert'),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/shared-link/$', FileSharedLinkView.as_view()),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/$', DirView.as_view(), name='DirView'),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/metadata/$', DirMetaDataView.as_view(), name='DirMetaDataView'),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/sub_repo/$', DirSubRepoView.as_view(), name="api2-dir-sub-repo"),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/shared_items/$', DirSharedItemsEndpoint.as_view(), name="api2-dir-shared-items"),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/revert/$', DirRevert.as_view(), name='api2-dir-revert'),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/thumbnail/$', ThumbnailView.as_view(), name='api2-thumbnail'),
    re_path(r'^starredfiles/', StarredFileView.as_view(), name='starredfiles'),
    re_path(r'^devices/', DevicesView.as_view(), name='api2-devices'),
    path('shared-repos/', SharedRepos.as_view(), name='sharedrepos'),
    re_path(r'^shared-repos/(?P<repo_id>[-0-9-a-f]{36})/$', SharedRepo.as_view(), name='sharedrepo'),
    path('beshared-repos/', BeSharedRepos.as_view(), name='beshared-repos'),
    re_path(r'^beshared-repos/(?P<repo_id>[-0-9-a-f]{36})/$', BeSharedRepo.as_view(), name='beshared-repo'),
    path('default-repo/', DefaultRepoView.as_view(), name='api2-defaultrepo'),
    path('send-share-link/', SendShareLinkView.as_view(), name='api2-send-share-link'),
    path('send-upload-link/', SendUploadLinkView.as_view(), name='api2-send-upload-link'),
    path('shared-links/', SharedLinksView.as_view()),
    path('shared-upload-links/', SharedUploadLinksView.as_view()),
    path('repo-tokens/', RepoTokensView.as_view(), name='api2-repo-tokens'),

    path('organization/', OrganizationView.as_view(), name='api2-org'),

    re_path(r'^f/(?P<token>[a-f0-9]+)/$', SharedFileView.as_view()),
    re_path(r'^f/(?P<token>[a-f0-9]+)/detail/$', SharedFileDetailView.as_view()),
    re_path(r'^d/(?P<token>[a-f0-9]+)/dir/$', SharedDirView.as_view()),

    re_path(r'^repo_history_changes/(?P<repo_id>[-0-9a-f]{36})/$', RepoHistoryChange.as_view()),
    path('unseen_messages/', UnseenMessagesCountView.as_view()),

    re_path(r'^avatars/user/(?P<user>\S+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/resized/(?P<size>[0-9]+)/$', UserAvatarView.as_view()),
    path('avatars/group/<int:group_id>/resized/<int:size>/', GroupAvatarView.as_view()),

    path('groups/', Groups.as_view()),
    path('groups/<int:group_id>/', Groups.as_view()),
    path('groups/<int:group_id>/members/', GroupMembers.as_view()),
    path('groups/<int:group_id>/repos/', GroupRepos.as_view(), name="api2-grouprepos"),
    re_path(r'^groups/(?P<group_id>\d+)/repos/(?P<repo_id>[-0-9a-f]{36})/$', GroupRepo.as_view(), name="api2-grouprepo"),

    # Deprecated
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/delete/$', OpDeleteView.as_view(), name="api2-fileops-delete"),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/copy/$', OpCopyView.as_view(), name="api2-fileops-copy"),
    re_path(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/move/$', OpMoveView.as_view(), name="api2-fileops-move"),
]

# serve office converter static files
from seahub.utils import HAS_OFFICE_CONVERTER
if HAS_OFFICE_CONVERTER:
    urlpatterns += [
        path('office-convert/status/', OfficeConvertQueryStatus.as_view()),
    ]
    urlpatterns += [
        re_path(r'^office-convert/generate/repos/(?P<repo_id>[-0-9-a-f]{36})/$', OfficeGenerateView.as_view()),
    ]
