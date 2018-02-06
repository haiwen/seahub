# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url, include
from .views import *

urlpatterns = [
#    url(r'^list_user/$', 'list_userids', name="list_userids"),
    url(r'^$', edit_profile, name="edit_profile"),
    url(r'^(?P<user>[^/]+)/get/$', get_user_profile, name="get_user_profile"),
    url(r'^delete/$', delete_user_account, name="delete_user_account"),
    url(r'^default-repo/$', default_repo, name="default_repo"),
    url(r'^two_factor_authentication/', include('seahub.two_factor.urls', 'two_factor')),
]

# Move the catch-all pattern to the end.
urlpatterns += [
    url(r'^(?P<username>[^/]*)/$', user_profile, name="user_profile"),
]
