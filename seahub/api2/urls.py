# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url, include

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
from .endpoints.group_discussions import GroupDiscussions
from .endpoints.group_discussion import GroupDiscussion
from .endpoints.send_share_link_email import SendShareLinkView
from .endpoints.send_upload_link_email import SendUploadLinkView
from .endpoints.review_comments import ReviewCommentsView, ReviewCommentView

urlpatterns = [
    url(r'^ping/$', Ping.as_view()),
    url(r'^auth/ping/$', AuthPing.as_view()),
    url(r'^auth-token/', ObtainAuthToken.as_view()),
    url(r'^server-info/$', ServerInfoView.as_view()),
    url(r'^logout-device/$', LogoutDeviceView.as_view()),
    url(r'^client-login/$', ClientLoginTokenView.as_view()),
    url(r'^two-factor-auth/(?P<email>\S+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/$', TwoFactorAuthView.as_view(), name="two-factor-auth-view"),
    url(r'^device-wiped/$', RemoteWipeReportView.as_view()),
    url(r'^wopi/', include('seahub.wopi.urls')),

    # RESTful API
    url(r'^accounts/$', Accounts.as_view(), name="accounts"),
    url(r'^accounts/(?P<email>\S+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/$', Account.as_view(), name="api2-account"),
    url(r'^account/info/$', AccountInfo.as_view()),
    url(r'^regdevice/$', RegDevice.as_view(), name="regdevice"),
    url(r'^search/$', Search.as_view(), name='api_search'),
    url(r'^search-user/$', SearchUser.as_view(), name='search-user'),
    url(r'^review/(?P<review_id>\d+)/comments/$', ReviewCommentsView.as_view(), name='api2-review-comments'),
    url(r'^review/(?P<review_id>\d+)/comment/(?P<comment_id>\d+)/$', ReviewCommentView.as_view(), name='api2-review-comment'),
    url(r'^repos/$', Repos.as_view(), name="api2-repos"),
    url(r'^repos/public/$', PubRepos.as_view(), name="api2-pub-repos"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/$', Repo.as_view(), name="api2-repo"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/history/$', RepoHistory.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/user-folder-perm/$', RepoUserFolderPerm.as_view(), name="api2-repo-user-folder-perm"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/group-folder-perm/$', RepoGroupFolderPerm.as_view(), name="api2-repo-group-folder-perm"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/history-limit/$', RepoHistoryLimit.as_view(), name="api2-repo-history-limit"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/download-info/$', DownloadRepo.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/owner/$', RepoOwner.as_view(), name="api2-repo-owner"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/download-shared-links/$', RepoDownloadSharedLinks.as_view(), name="api2-repo-download-shared-links"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/download-shared-links/(?P<token>[a-f0-9]+)/$', RepoDownloadSharedLink.as_view(), name="api2-repo-download-shared-link"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/upload-shared-links/$', RepoUploadSharedLinks.as_view(), name="api2-repo-upload-shared-links"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/upload-shared-links/(?P<token>[a-f0-9]+)/$', RepoUploadSharedLink.as_view(), name="api2-repo-upload-shared-link"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/upload-link/$', UploadLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/update-link/$', UpdateLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/upload-blks-link/$', UploadBlksLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/update-blks-link/$', UpdateBlksLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/owa-file/$', OwaFileView.as_view(), name='api2-owa-file-view'),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/$', FileView.as_view(), name='FileView'),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/metadata/$', FileMetaDataView.as_view(), name='FileMetaDataView'),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/files/(?P<file_id>[0-9a-f]{40})/blks/(?P<block_id>[0-9a-f]{40})/download-link/$', FileBlockDownloadLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/comments/$', FileCommentsView.as_view(), name='api2-file-comments'),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/comments/counts/$', FileCommentsCounts.as_view(), name='api2-file-comments-counts'),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/comments/(?P<comment_id>\d+)/$', FileCommentView.as_view(), name='api2-file-comment'),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/detail/$', FileDetailView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/history/$', FileHistory.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/revision/$', FileRevision.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/revert/$', FileRevert.as_view(), name='api2-file-revert'),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/shared-link/$', FileSharedLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/$', DirView.as_view(), name='DirView'),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/metadata/$', DirMetaDataView.as_view(), name='DirMetaDataView'),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/sub_repo/$', DirSubRepoView.as_view(), name="api2-dir-sub-repo"),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/shared_items/$', DirSharedItemsEndpoint.as_view(), name="api2-dir-shared-items"),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/revert/$', DirRevert.as_view(), name='api2-dir-revert'),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/thumbnail/$', ThumbnailView.as_view(), name='api2-thumbnail'),
    url(r'^starredfiles/', StarredFileView.as_view(), name='starredfiles'),
    url(r'^devices/', DevicesView.as_view(), name='api2-devices'),
    url(r'^shared-repos/$', SharedRepos.as_view(), name='sharedrepos'),
    url(r'^shared-repos/(?P<repo_id>[-0-9-a-f]{36})/$', SharedRepo.as_view(), name='sharedrepo'),
    url(r'^beshared-repos/$', BeSharedRepos.as_view(), name='beshared-repos'),
    url(r'^beshared-repos/(?P<repo_id>[-0-9-a-f]{36})/$', BeSharedRepo.as_view(), name='beshared-repo'),
    url(r'^default-repo/$', DefaultRepoView.as_view(), name='api2-defaultrepo'),
    url(r'^send-share-link/$', SendShareLinkView.as_view(), name='api2-send-share-link'),
    url(r'^send-upload-link/$', SendUploadLinkView.as_view(), name='api2-send-upload-link'),
    url(r'^shared-links/$', SharedLinksView.as_view()),
    url(r'^shared-upload-links/$', SharedUploadLinksView.as_view()),
    url(r'^repo-tokens/$', RepoTokensView.as_view(), name='api2-repo-tokens'),

    url(r'^organization/$', OrganizationView.as_view(), name='api2-org'),

    url(r'^f/(?P<token>[a-f0-9]+)/$', SharedFileView.as_view()),
    url(r'^f/(?P<token>[a-f0-9]+)/detail/$', SharedFileDetailView.as_view()),
    url(r'^d/(?P<token>[a-f0-9]+)/dir/$', SharedDirView.as_view()),

    url(r'^events/$', EventsView.as_view()),
    url(r'^repo_history_changes/(?P<repo_id>[-0-9a-f]{36})/$', RepoHistoryChange.as_view()),
    url(r'^unseen_messages/$', UnseenMessagesCountView.as_view()),

    url(r'^avatars/user/(?P<user>\S+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/resized/(?P<size>[0-9]+)/$', UserAvatarView.as_view()),
    url(r'^avatars/group/(?P<group_id>\d+)/resized/(?P<size>[0-9]+)/$', GroupAvatarView.as_view()),

    url(r'^groups/$', Groups.as_view()),
    url(r'^groups/(?P<group_id>\d+)/$', Groups.as_view()),
    url(r'^groups/(?P<group_id>\d+)/members/$', GroupMembers.as_view()),
    url(r'^groups/(?P<group_id>\d+)/repos/$', GroupRepos.as_view(), name="api2-grouprepos"),
    url(r'^groups/(?P<group_id>\d+)/repos/(?P<repo_id>[-0-9a-f]{36})/$', GroupRepo.as_view(), name="api2-grouprepo"),
    url(r'^groups/(?P<group_id>\d+)/discussions/$', GroupDiscussions.as_view(), name="api2-group-discussions"),
    url(r'^groups/(?P<group_id>\d+)/discussions/(?P<discuss_id>\d+)/$', GroupDiscussion.as_view(), name="api2-group-discussion"),

    # Deprecated
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/delete/$', OpDeleteView.as_view(), name="api2-fileops-delete"),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/copy/$', OpCopyView.as_view(), name="api2-fileops-copy"),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/move/$', OpMoveView.as_view(), name="api2-fileops-move"),
]

# serve office converter static files
from seahub.utils import HAS_OFFICE_CONVERTER
if HAS_OFFICE_CONVERTER:
    from seahub.utils import OFFICE_HTML_DIR
    from django.views.static import serve as static_view

    urlpatterns += [
        url(r'^office-convert/static/(?P<path>.*)$', static_view, {'document_root': OFFICE_HTML_DIR}, name='api_office_convert_static'),
    ]
    urlpatterns += [
        url(r'^office-convert/status/$', OfficeConvertQueryStatus.as_view()),
    ]
    urlpatterns += [
        url(r'^office-convert/generate/repos/(?P<repo_id>[-0-9-a-f]{36})/$', OfficeGenerateView.as_view()),
    ]
