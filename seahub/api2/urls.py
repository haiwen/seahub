from django.conf.urls import patterns, url, include

from .views import *
from .views_misc import ServerInfoView
from .views_auth import LogoutDeviceView, ClientLoginTokenView
from .endpoints.dir_shared_items import DirSharedItemsEndpoint
from .endpoints.account import Account

urlpatterns = patterns('',
    url(r'^ping/$', Ping.as_view()),
    url(r'^auth/ping/$', AuthPing.as_view()),
    url(r'^auth-token/', ObtainAuthToken.as_view()),
    url(r'^server-info/$', ServerInfoView.as_view()),
    url(r'^logout-device/$', LogoutDeviceView.as_view()),
    url(r'^client-login/$', ClientLoginTokenView.as_view()),

    # RESTful API
    url(r'^accounts/$', Accounts.as_view(), name="accounts"),
    url(r'^accounts/(?P<email>\S+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/$', Account.as_view(), name="api2-account"),
    url(r'^account/info/$', AccountInfo.as_view()),
    url(r'^regdevice/$', RegDevice.as_view(), name="regdevice"),
    url(r'^search/$', Search.as_view(), name='api_search'),
    url(r'^search-user/$', SearchUser.as_view(), name='search-user'),
    url(r'^repos/$', Repos.as_view(), name="api2-repos"),
    url(r'^repos/public/$', PubRepos.as_view(), name="api2-pub-repos"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/$', Repo.as_view(), name="api2-repo"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/history/$', RepoHistory.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/download-info/$', DownloadRepo.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/owner/$', RepoOwner.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/public/$', RepoPublic.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/upload-link/$', UploadLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/update-link/$', UpdateLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/upload-blks-link/$', UploadBlksLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/update-blks-link/$', UpdateBlksLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/$', FileView.as_view(), name='FileView'),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/files/(?P<file_id>[0-9a-f]{40})/blks/(?P<block_id>[0-9a-f]{40})/download-link/$', FileBlockDownloadLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/detail/$', FileDetailView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/history/$', FileHistory.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/revision/$', FileRevision.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/revert/$', FileRevert.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/shared-link/$', FileSharedLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/$', DirView.as_view(), name='DirView'),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/sub_repo/$', DirSubRepoView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/share/$', DirShareView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/shared_items/$', DirSharedItemsEndpoint.as_view(), name="api2-dir-shared-items"),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/download/$', DirDownloadView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/thumbnail/$', ThumbnailView.as_view(), name='api2-thumbnail'),
    url(r'^starredfiles/', StarredFileView.as_view(), name='starredfiles'),
    url(r'^shared-repos/$', SharedRepos.as_view(), name='sharedrepos'),
    url(r'^shared-repos/(?P<repo_id>[-0-9-a-f]{36})/$', SharedRepo.as_view(), name='sharedrepo'),
    url(r'^beshared-repos/$', BeShared.as_view(), name='beshared'),
    url(r'^default-repo/$', DefaultRepoView.as_view(), name='api2-defaultrepo'),
    url(r'^shared-links/$', SharedLinksView.as_view()),
    url(r'^shared-files/$', SharedFilesView.as_view()),
    url(r'^virtual-repos/$', VirtualRepos.as_view()),
    url(r'^repo-tokens/$', RepoTokensView.as_view()),

    url(r'^organization/$', OrganizationView.as_view()),

    url(r'^s/f/(?P<token>[a-f0-9]{10})/$', PrivateSharedFileView.as_view()),
    url(r'^s/f/(?P<token>[a-f0-9]{10})/detail/$', PrivateSharedFileDetailView.as_view()),
    url(r'^f/(?P<token>[a-f0-9]{10})/$', SharedFileView.as_view()),
    url(r'^f/(?P<token>[a-f0-9]{10})/detail/$', SharedFileDetailView.as_view()),
    url(r'^d/(?P<token>[a-f0-9]{10})/dir/$', SharedDirView.as_view()),

    url(r'^groupandcontacts/$', GroupAndContacts.as_view()),
    url(r'^events/$', EventsView.as_view()),
    url(r'^repo_history_changes/(?P<repo_id>[-0-9a-f]{36})/$', RepoHistoryChange.as_view()),
    url(r'^unseen_messages/$', UnseenMessagesCountView.as_view()),
    url(r'^group/msgs/(?P<group_id>\d+)/$', GroupMsgsView.as_view()),
    url(r'^group/(?P<group_id>\d+)/msg/(?P<msg_id>\d+)/$', GroupMsgView.as_view()),
    url(r'^user/msgs/(?P<id_or_email>[^/]+)/$', UserMsgsView.as_view()),
    url(r'^new_replies/$', NewRepliesView.as_view()),

    url(r'^avatars/user/(?P<user>\S+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/resized/(?P<size>[0-9]+)/$', UserAvatarView.as_view()),
    url(r'^avatars/group/(?P<group_id>\d+)/resized/(?P<size>[0-9]+)/$', GroupAvatarView.as_view()),

    url(r'^groups/$', Groups.as_view()),
    url(r'^groups/(?P<group_id>\d+)/$', Groups.as_view()),
    url(r'^groups/(?P<group_id>\d+)/members/$', GroupMembers.as_view()),
    url(r'^groups/(?P<group_id>\d+)/changes/$', GroupChanges.as_view(), name="api2-group-changes"),
    url(r'^groups/(?P<group_id>\d+)/repos/$', GroupRepos.as_view(), name="api2-grouprepos"),
    url(r'^groups/(?P<group_id>\d+)/repos/(?P<repo_id>[-0-9a-f]{36})/$', GroupRepo.as_view(), name="api2-grouprepo"),

    url(r'^html/events/$', EventsHtml.as_view()),
    url(r'^html/more_events/$', AjaxEvents.as_view(), name="more_events"),
    url(r'^html/repo_history_changes/(?P<repo_id>[-0-9a-f]{36})/$', RepoHistoryChangeHtml.as_view(), name='api_repo_history_changes'),
    url(r'^html/discussions/(?P<group_id>\d+)/$', DiscussionsHtml.as_view(), name="api_discussions"),
    url(r'^html/discussion/(?P<msg_id>\d+)/$', DiscussionHtml.as_view(), name="api_discussion"),
    url(r'^html/more_discussions/(?P<group_id>\d+)/$', AjaxDiscussions.as_view(), name="more_discussions"),
    url(r'^html/newreply/$', NewReplyHtml.as_view()),
    url(r'^html/usermsgs/(?P<id_or_email>[^/]+)/$', UserMsgsHtml.as_view()),
    url(r'^html/more_usermsgs/(?P<id_or_email>[^/]+)/$', AjaxUserMsgs.as_view(), name="api_more_usermsgs"),

    # Folowing is only for debug, will be removed
    #url(r'^html/newreply2/$', api_new_replies),
    #url(r'^html/events2/$', activity2),
    #url(r'^html/more_events/$', events2, name="more_events"),
    #url(r'^html/repo_history_changes/(?P<repo_id>[-0-9a-f]{36})/$', api_repo_history_changes, name='api_repo_history_changes'),

    #url(r'^html/discussions2/(?P<group_id>\d+)/$', discussions2, name="api_discussions2"),
    #url(r'^html/discussion/(?P<msg_id>\d+)/$', discussion2, name="api_discussion2"),
    #url(r'^html/more_discussions/(?P<group_id>\d+)/$', more_discussions2, name="more_discussions"),
    #url(r'^html/usermsgs2/(?P<id_or_email>[^/]+)/$', api_usermsgs),
    #url(r'^html/more_usermsgs/(?P<id_or_email>[^/]+)/$', api_more_usermsgs, name="api_more_usermsgs"),

    # Deprecated
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/delete/$', OpDeleteView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/copy/$', OpCopyView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/move/$', OpMoveView.as_view()),
)

# serve office converter static files
from seahub.utils import HAS_OFFICE_CONVERTER
if HAS_OFFICE_CONVERTER:
    from seahub.utils import OFFICE_HTML_DIR
    urlpatterns += patterns('',
        url(r'^office-convert/static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': OFFICE_HTML_DIR}, name='api_office_convert_static'),
    )
    urlpatterns += patterns('',
        url(r'^office-convert/status/$', OfficeConvertQueryStatus.as_view()),
    )
    urlpatterns += patterns('',
        url(r'^office-convert/generate/repos/(?P<repo_id>[-0-9-a-f]{36})/$', OfficeGenerateView.as_view()),
    )

from seahub import settings
if getattr(settings, 'ENABLE_OFFICE_WEB_APP', False):
    urlpatterns += patterns('',
        (r'^wopi/', include('seahub_extra.wopi.urls')),
    )
