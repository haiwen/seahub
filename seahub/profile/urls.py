from django.conf.urls.defaults import *

urlpatterns = patterns('seahub.profile.views',
#    url(r'^list_user/$', 'list_userids', name="list_userids"),
    url(r'^$', 'edit_profile', name="edit_profile"),
    url(r'^(?P<username_or_id>[^/]+)/$', 'user_profile', name="user_profile"),
    url(r'^(?P<user>[^/]+)/get/$', 'get_user_profile', name="get_user_profile"),
    url(r'^(?P<user>[^/]+)/delete/$', 'delete_user_account', name="delete_user_account"),
#    url(r'^logout/$', 'logout_relay', name="logout_relay"),
)
