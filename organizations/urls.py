from django.conf.urls.defaults import *

from views import *
from seahub.views import repo, repo_history

urlpatterns = patterns('',
    url(r'^create/$', create_org, name='create_org'),
    url(r'^messages/$', org_msg, name='org_msg'),
    url(r'^(?P<url_prefix>[^/]+)/$', org_info, name='org_info'),
    url(r'^(?P<url_prefix>[^/]+)/personal/$', org_personal, name='org_personal'),
    url(r'^(?P<url_prefix>[^/]+)/repo/create/$', org_repo_create, name='org_repo_create'),
    url(r'^(?P<url_prefix>[^/]+)/innerpubrepo/create/$', org_inner_pub_repo_create, name='org_inner_pub_repo_create'),
    url(r'^(?P<url_prefix>[^/]+)/groups/$', org_groups, name='org_groups'),
    url(r'^([^/]+)/repo/create/$', org_repo_create, name='org_repo_create'),
    url(r'^([^/]+)/repo/history/(?P<repo_id>[^/]+)/$', repo_history, name='org_repo_history'),

    # repo share
    url(r'^(?P<url_prefix>[^/]+)/shareadmin/$', org_shareadmin, name='org_shareadmin'),
    url(r'^(?P<url_prefix>[^/]+)/repo/share/$', org_repo_share, name='org_repo_share'),
   url(r'^(?P<url_prefix>[^/]+)/repo/unshare/$', org_repo_unshare, name='org_repo_unshare'),
                       
    url(r'^([^/]+)/repo/(?P<repo_id>[^/]+)/$', repo, name='repo'),

    ### Org admin ###                       
    url(r'^(?P<url_prefix>[^/]+)/seafadmin/$', org_seafadmin, name='org_seafadmin'),
    url(r'^(?P<url_prefix>[^/]+)/useradmin/$', org_useradmin, name='org_useradmin'),
    url(r'^(?P<url_prefix>[^/]+)/useradmin/remove/(?P<user>[^/]+)/$', org_user_remove, name='org_user_remove'),
    url(r'^(?P<url_prefix>[^/]+)/groupadmin/$', org_group_admin, name='org_groupadmin'),
    url(r'^(?P<url_prefix>[^/]+)/group/remove/(?P<group_id>[\d]+)/$', org_group_remove, name='org_group_remove'),
)
