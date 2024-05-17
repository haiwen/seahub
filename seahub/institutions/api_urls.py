# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from .api_views import InstAdminUsers, InstAdminUser, \
        InstAdminSearchUser, InstAdminUserLibraries, InstAdminUserGroups

urlpatterns = [
    path('admin/users/', InstAdminUsers.as_view(), name='api-v2.1-inst-admin-users'),
    path('admin/search-user/',
         InstAdminSearchUser.as_view(), name='api-v2.1-inst-admin-search-user'),
    path('admin/users/<str:email>/', InstAdminUser.as_view(), name='api-v2.1-inst-admin-user'),
    path('admin/users/<str:email>/libraries/',
         InstAdminUserLibraries.as_view(), name='api-v2.1-inst-admin-user-libraries'),
    path('admin/users/<str:email>/groups/',
         InstAdminUserGroups.as_view(), name='api-v2.1-inst-admin-user-groups'),
]
