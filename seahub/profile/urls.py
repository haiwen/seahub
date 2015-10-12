from django.conf.urls import patterns, url

urlpatterns = patterns('seahub.profile.views',
#    url(r'^list_user/$', 'list_userids', name="list_userids"),
    url(r'^$', 'edit_profile', name="edit_profile"),
    url(r'^(?P<user>[^/]+)/get/$', 'get_user_profile', name="get_user_profile"),
    url(r'^delete/$', 'delete_user_account', name="delete_user_account"),
    url(r'^default-repo/$', 'default_repo', name="default_repo"),

    url(r'^(?P<username>[^/]*)/$', 'user_profile', name="user_profile"),
#    url(r'^logout/$', 'logout_relay', name="logout_relay"),
)
