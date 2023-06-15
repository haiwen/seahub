# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path, re_path

from .views import *

urlpatterns = [
    path('add/', org_add, name='org_add'),
    path('register/', org_register, name='org_register'),

    path('statistics-admin/file/', react_fake_view, name='org_statistics_admin_file'),
    path('statistics-admin/total-storage/', react_fake_view, name='org_statistics_admin_total_storage'),
    path('statistics-admin/active-users/', react_fake_view, name='org_statistics_admin_active_users'),
    path('statistics-admin/traffic/', react_fake_view, name='org_statistics_admin_traffic'),

    path('deviceadmin/desktop-devices/', react_fake_view, name='org_device_admin'),
    path('deviceadmin/mobile-devices/', react_fake_view, name='org_device_admin_mobile_devices'),
    path('deviceadmin/devices-errors/', react_fake_view, name='org_device_admin_devices_errors'),

    path('web-settings/', react_fake_view, name='org_web_settings'),
    path('useradmin/', react_fake_view, name='org_user_admin'),
    path('useradmin/search-users/', react_fake_view, name='org_user_admin_search_users'),
    path('useradmin/admins/', react_fake_view, name='org_useradmin_admins'),
    path('useradmin/info/<str:email>/', react_fake_view, name='org_user_info'),
    path('useradmin/info/<str:email>/repos/', react_fake_view, name='org_user_repos'),
    path('useradmin/info/<str:email>/shared-repos/', react_fake_view, name='org_user_shared_repos'),
    path('repoadmin/', react_fake_view, name='org_repo_admin'),

    path('groupadmin/', react_fake_view, name='org_group_admin'),
    path('groupadmin/search-groups/', react_fake_view, name='org_group_admin_search_groups'),
    path('groupadmin/<int:group_id>/', react_fake_view, name='org_admin_group_info'),
    path('groupadmin/<int:group_id>/repos/', react_fake_view, name='org_admin_group_repos'),
    path('groupadmin/<int:group_id>/members/', react_fake_view, name='org_admin_group_members'),
    path('publinkadmin/', react_fake_view, name='org_publink_admin'),
    path('logadmin/', react_fake_view, name='org_log_file_audit'),
    path('logadmin/file-update/', react_fake_view, name='org_log_file_update'),
    path('logadmin/perm-audit/', react_fake_view, name='org_log_perm_audit'),

    path('info/', react_fake_view, name='org_info'),
    path('settings/', react_fake_view, name='org_settings'),
    path('departmentadmin/', react_fake_view, name='org_department_admin'),
    re_path(r'^departmentadmin/groups/(?P<group_id>\d+)/', react_fake_view, name='org_department_admin'),
    path('associate/<path:token>/', org_associate, name='org_associate'),

    path('samlconfig/', react_fake_view, name='saml_config'),
]
