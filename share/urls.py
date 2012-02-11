from django.conf.urls.defaults import *

from views import *


urlpatterns = patterns('',
    url(r'^$', list_shared_repos),
    url(r'^list/$', list_shared_repos, name='shared_repo_list'),
    url(r'^add/$', share_repo),
    url(r'^delete/(?P<item_id>[^/]+)/$', delete_share_item),
)
