# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from .views import *

urlpatterns = [
    url(r'^add/$', org_add, name='org_add'),
    url(r'^register/$', org_register, name='org_register'),

    url(r'^statistics-admin/file/$', react_fake_view, name='org_statistics_admin_file'),
    url(r'^statistics-admin/total-storage/$', react_fake_view, name='org_statistics_admin_total_storage'),
    url(r'^statistics-admin/active-users/$', react_fake_view, name='org_statistics_admin_active_users'),
    url(r'^statistics-admin/traffic/$', react_fake_view, name='org_statistics_admin_traffic'),

    url(r'^deviceadmin/desktop-devices/$', react_fake_view, name='org_device_admin'),
    url(r'^deviceadmin/mobile-devices/$', react_fake_view, name='org_device_admin_mobile_devices'),
    url(r'^deviceadmin/devices-errors/$', react_fake_view, name='org_device_admin_devices_errors'),

    url(r'^useradmin/$', react_fake_view, name='org_user_admin'),
    url(r'^useradmin/search-users/$', react_fake_view, name='org_user_admin_search_users'),
    url(r'^useradmin/admins/$', react_fake_view, name='org_useradmin_admins'),
    url(r'^useradmin/info/(?P<email>[^/]+)/$', react_fake_view, name='org_user_info'),
    url(r'^useradmin/info/(?P<email>[^/]+)/repos/$', react_fake_view, name='org_user_repos'),
    url(r'^useradmin/info/(?P<email>[^/]+)/shared-repos/$', react_fake_view, name='org_user_shared_repos'),
    url(r'^repoadmin/$', react_fake_view, name='org_repo_admin'),

    url(r'^groupadmin/$', react_fake_view, name='org_group_admin'),
    url(r'^groupadmin/search-groups/$', react_fake_view, name='org_group_admin_search_groups'),
    url(r'^groupadmin/(?P<group_id>\d+)/$', react_fake_view, name='org_admin_group_info'),
    url(r'^groupadmin/(?P<group_id>\d+)/repos/$', react_fake_view, name='org_admin_group_repos'),
    url(r'^groupadmin/(?P<group_id>\d+)/members/$', react_fake_view, name='org_admin_group_members'),
    url(r'^publinkadmin/$', react_fake_view, name='org_publink_admin'),
    url(r'^logadmin/$', react_fake_view, name='org_log_file_audit'),
    url(r'^logadmin/file-update/$', react_fake_view, name='org_log_file_update'),
    url(r'^logadmin/perm-audit/$', react_fake_view, name='org_log_perm_audit'),

    url(r'^info/$', react_fake_view, name='org_info'),
    url(r'^settings/$', react_fake_view, name='org_settings'),
    url(r'^departmentadmin/$', react_fake_view, name='org_department_admin'),
    url(r'^departmentadmin/groups/(?P<group_id>\d+)/', react_fake_view, name='org_department_admin'),
    url(r'^associate/(?P<token>.+)/$', org_associate, name='org_associate'),

    url(r'^samlconfig/$', react_fake_view, name='saml_config'),
]
