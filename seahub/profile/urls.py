# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import include, path, re_path
from .views import edit_profile, delete_user_account, default_repo, user_profile

urlpatterns = [
    path('', edit_profile, name="edit_profile"),
    path('delete/', delete_user_account, name="delete_user_account"),
    path('default-repo/', default_repo, name="default_repo"),
    path('two_factor_authentication/', include(('seahub.two_factor.urls', 'two_factor'), namespace='two_factor')),
]

# Move the catch-all pattern to the end.
urlpatterns += [
    re_path(r'^(?P<username>[^/]*)/$', user_profile, name="user_profile"),
]
