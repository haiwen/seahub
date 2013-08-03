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
    url(r'^html/events/$', ActivityHtml.as_view()),
    url(r'^html/more_events/$', AjaxEvents.as_view(), name="more_events"),
    url(r'^html/repo_history_changes/(?P<repo_id>[-0-9a-f]{36})/$', RepoHistoryChangeHtml.as_view(), name='api_repo_history_changes'),
    url(r'^html/discussions/(?P<group_id>\d+)/$', DiscussionsHtml.as_view(), name="api_discussions"),
    url(r'^html/discussion/(?P<msg_id>\d+)/$', DiscussionHtml.as_view(), name="api_discussion"),
    url(r'^html/more_discussions/(?P<group_id>\d+)/$', AjaxDiscussions.as_view(), name="more_discussions"),
    url(r'^html/newreply/$', NewReplyHtml.as_view()),

    # Folowing is only for debug, will be removed 
    #url(r'^html/newreply2/$', api_new_replies),
    #url(r'^html/events2/$', activity2),
    #url(r'^html/more_events/$', events2),
    #url(r'^html/repo_history_changes/(?P<repo_id>[-0-9a-f]{36})/$', api_repo_history_changes, name='api_repo_history_changes'),

    #url(r'^html/discussions2/(?P<group_id>\d+)/$', discussions2, name="api_discussions2"),
    #url(r'^html/discussion/(?P<msg_id>\d+)/$', discussion2, name="api_discussion2"),
    #url(r'^html/more_discussions/(?P<group_id>\d+)/$', more_discussions2, name="more_discussions"),

    # Deprecated                       
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/delete/$', OpDeleteView.as_view()),
)
