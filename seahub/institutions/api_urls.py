# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from .api_views import InstAdminUsers, InstAdminUser, \
        InstAdminSearchUser, InstAdminLibraries, InstAdminGroups

urlpatterns = [
    path('admin/users/', InstAdminUsers.as_view(), name='api-v2.1-inst-admin-users'),
    path('admin/users/<str:email>/', InstAdminUser.as_view(), name='api-v2.1-inst-admin-user'),
    path('admin/search-user/', InstAdminSearchUser.as_view(), name='api-v2.1-inst-admin-search-user'),
    path('admin/libraries/', InstAdminLibraries.as_view(), name='api-v2.1-inst-admin-libraries'),
    path('admin/groups/', InstAdminGroups.as_view(), name='api-v2.1-inst-admin-groups'),
]
