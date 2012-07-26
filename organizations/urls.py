from django.conf.urls.defaults import *

from views import *
from seahub.views import repo, repo_history, org_seafadmin, org_useradmin, \
    org_group_admin

urlpatterns = patterns('',
    (r'^create/$', create_org),
    (r'^change_account/$', change_account),
    (r'^(?P<url_prefix>[^/]+)/$', org_info),
    url(r'^(?P<url_prefix>[^/]+)/groups/$', org_groups, name='org_groups'),

    url(r'^([^/]+)/repo/(?P<repo_id>[^/]+)/$', repo, name='repo'),
    url(r'^([^/]+)/repo/history/(?P<repo_id>[^/]+)/$', repo_history, name='org_repo_history'),

    ### Org admin ###                       
    url(r'^([^/]+)/seafadmin/$', org_seafadmin, name='org_seafadmin'),
    url(r'^([^/]+)/useradmin/$', org_useradmin, name='org_useradmin'),
    url(r'^([^/]+)/groupadmin/$', org_group_admin, name='org_groupadmin'),
)
