from django.conf.urls.defaults import *

from views import *

urlpatterns = patterns('',
    url(r'^$', list_share_out_repos, name='share_admin'),
    url(r'^links/$', list_shared_links, name='list_shared_links'),
    url(r'^files/$', list_priv_shared_files, name='list_priv_shared_files'),
                       
    url(r'^add/$', share_repo, name='share_repo'),
    url(r'^remove/$', repo_remove_share, name='repo_remove_share'),

    url(r'^link/get/$', get_shared_link, name='get_shared_link'),
    url(r'^link/remove/$', remove_shared_link, name='remove_shared_link'),
    url(r'^link/send/$', send_shared_link, name='send_shared_link'),
    url(r'^link/save/$', save_shared_link, name='save_shared_link'),

    url(r'^permission_admin/$', share_permission_admin, name='share_permission_admin'),


    # url('^remove/(?P<token>[^/]{24,24})/$', remove_anonymous_share, name='remove_anonymous_share'),
    # url('^(?P<token>[^/]{24})/$', anonymous_share_confirm, name='anonymous_share_confirm'),
                       
)
