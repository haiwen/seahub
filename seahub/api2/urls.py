from django.conf.urls.defaults import *

from views import *


urlpatterns = patterns('',
    url(r'^ping/$', Ping.as_view()),
    url(r'^auth/ping/$', AuthPing.as_view()),
    url(r'^auth-token/', ObtainAuthToken.as_view()),

    # RESTful API
    url(r'^account/info/$', Account.as_view()),
    url(r'^repos/$', Repos.as_view(), name="api2-repos"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/$', Repo.as_view(), name="api2-repo"),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/download-info/$', DownloadRepo.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/upload-link/$', UploadLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/update-link/$', UpdateLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/$', FileView.as_view(), name='FileView'),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/shared-link/$', FileSharedLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/$', DirView.as_view(), name='DirView'),
    url(r'^starredfiles/', StarredFileView.as_view(), name='starredfiles'),
    url(r'^shared-repos/$', SharedRepos.as_view(), name='sharedrepos'),
    url(r'^shared-repos/(?P<repo_id>[-0-9-a-f]{36})/$', SharedRepo.as_view(), name='sharedrepo'),
    url(r'^beshared-repos/$', BeShared.as_view(), name='beshared'),

    url(r'^groups/$', Groups.as_view()),
    url(r'^html/activity/$', ActivityHtml.as_view()),
    url(r'^html/discussion/(?P<group_id>\d+)/$', DiscussionHtml.as_view(), name="api_discussion"),
    url(r'^html/repo_history_changes/(?P<repo_id>[-0-9a-f]{36})/$', RepoHistoryChangeHtml.as_view(), name='api_repo_history_changes'),
    url(r'^html/events/$', EventsHtml.as_view()),
    url(r'^html/group_reply/(?P<msg_id>[\d]+)/$', MsgReplyHtml.as_view(), name='api_msg_reply'),

    # Folowing is only for debug, will be removed 
    #url(r'^html/events/$', events2),
    #url(r'^html/repo_history_changes/(?P<repo_id>[-0-9a-f]{36})/$', api_repo_history_changes, name='api_repo_history_changes'),
    #url(r'^html/group_reply/(?P<msg_id>[\d]+)/$', api_msg_reply, name='api_msg_reply'),
    url(r'^html/activity2/$', activity2),
    url(r'^html/discussion2/(?P<group_id>\d+)/$', discussion2, name="api_discussion2"),

    # Deprecated                       
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/delete/$', OpDeleteView.as_view()),
)
