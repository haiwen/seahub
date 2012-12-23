from django.conf.urls.defaults import *

# from django.views.decorators.csrf import csrf_exempt

from views import *


urlpatterns = patterns('',
    url(r'^ping/$', Ping.as_view()),
    url(r'^auth/ping/$', AuthPing.as_view()),
    url(r'^auth-token/', ObtainAuthToken.as_view()),

    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/dirents/$', RepoDirents.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/filepath/$', RepoFilepath.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/dirs/(?P<dir_id>[0-9a-f]{40})/$', RepoDirs.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/files/(?P<file_id>[0-9a-f]{40})/$', RepoFiles.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/delete/$', OpDeleteView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/rename/$', OpRenameView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/move/$', OpMoveView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/mkdir/$', OpMkdirView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/fileops/upload/$', OpUploadView.as_view()),

    # RESTful API
    url(r'^account/info/$', Account.as_view()),
    url(r'^repos/$', Repos.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/$', Repo.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9a-f]{36})/download-info/$', DownloadRepo.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/$', FileView.as_view(), name='FileView'),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/file/shared-link/$', FileSharedLinkView.as_view()),
    url(r'^repos/(?P<repo_id>[-0-9-a-f]{36})/dir/$', DirView.as_view(), name='DirView'),
    url(r'^starredfiles/', StarredFileView.as_view(), name='starredfiles'),
)
