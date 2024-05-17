# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from .views import (info, useradmin_react_fake_view, useradmin, user_info, user_remove, useradmin_search,
                    user_toggle_status, user_set_quota)

urlpatterns = [
    path('info/', info, name="info"),
    path('useradmin/', useradmin_react_fake_view, name="useradmin"),
    path('useradmin/search/', useradmin_react_fake_view, name="useradmin_search"),
    path('useradmin/<str:email>/', useradmin_react_fake_view, name='useraedmin_email'),
    path('useradmin/<str:email>/owned-libraries/', useradmin_react_fake_view, name='useradmin_libraries'),
    path('useradmin/<str:email>/groups/', useradmin_react_fake_view, name='useradmin_groups'),
    path('useradmin/info/<str:email>/', user_info, name='user_info'),
    path('useradmin/remove/<str:email>/', user_remove, name='user_remove'),
    path('useradmin/set_quota/<str:email>/', user_set_quota, name='user_set_quota'),
    path('useradmin/toggle_status/<str:email>/', user_toggle_status, name='user_toggle_status'),
]
