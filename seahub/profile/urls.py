from django.conf.urls import patterns, url, include
from seahub.utils.two_factor_auth import HAS_TWO_FACTOR_AUTH

urlpatterns = patterns('seahub.profile.views',
#    url(r'^list_user/$', 'list_userids', name="list_userids"),
    url(r'^$', 'edit_profile', name="edit_profile"),
    url(r'^(?P<user>[^/]+)/get/$', 'get_user_profile', name="get_user_profile"),
    url(r'^delete/$', 'delete_user_account', name="delete_user_account"),
    url(r'^default-repo/$', 'default_repo', name="default_repo"),
)

if HAS_TWO_FACTOR_AUTH:
    urlpatterns += patterns('',
        (r'^two_factor_authentication/', include('seahub_extra.two_factor.urls', 'two_factor')),
    )

# Move the catch-all pattern to the end.
urlpatterns += patterns('seahub.profile.views',
    url(r'^(?P<username>[^/]*)/$', 'user_profile', name="user_profile"),
)
