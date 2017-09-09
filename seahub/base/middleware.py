# Copyright (c) 2012-2016 Seafile Ltd.
import re

from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect, HttpResponseForbidden

from seaserv import ccnet_api

from seahub.notifications.models import Notification
from seahub.notifications.utils import refresh_cache
from seahub.constants import DEFAULT_ADMIN

try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False
try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False
from seahub.settings import SITE_ROOT

class BaseMiddleware(object):
    """
    Middleware that add organization, group info to user.
    """

    def process_request(self, request):
        username = request.user.username
        request.user.org = None

        if CLOUD_MODE:
            request.cloud_mode = True

            if MULTI_TENANCY:
                orgs = ccnet_api.get_orgs_by_user(username)
                if orgs:
                    request.user.org = orgs[0]
        else:
            request.cloud_mode = False

        return None

    def process_response(self, request, response):
        return response

class InfobarMiddleware(object):
    """Query info bar close status, and store into request."""

    def get_from_db(self):
        ret = Notification.objects.all().filter(primary=1)
        refresh_cache()
        return ret

    def process_request(self, request):

        # filter AJAX request out
        if request.is_ajax():
            return None

        # filter API request out
        if "api2/" in request.path or "api/v2.1/" in request.path:
            return None

        topinfo_close = request.COOKIES.get('info_id', '')

        cur_note = cache.get('CUR_TOPINFO') if cache.get('CUR_TOPINFO') else \
            self.get_from_db()
        if not cur_note:
            request.cur_note = None
        else:
            if str(cur_note[0].id) in topinfo_close.split('_'):
                request.cur_note = None
            else:
                request.cur_note = cur_note[0]

        return None

    def process_response(self, request, response):
        return response


class ForcePasswdChangeMiddleware(object):
    def _request_in_black_list(self, request):
        path = request.path
        black_list = (r'^%s$' % SITE_ROOT, r'home/.+', r'repo/.+',
                      r'[f|d]/[a-f][0-9]+', r'group/\d+', r'groups/',
                      r'share/', r'profile/', r'notification/list/')

        for patt in black_list:
            if re.search(patt, path) is not None:
                return True
        return False

    def process_request(self, request):
        if request.session.get('force_passwd_change', False):
            if self._request_in_black_list(request):
                return HttpResponseRedirect(reverse('auth_password_change'))


class UserPermissionMiddleware(object):

    def process_request(self, request):

        user = request.user
        if not user.is_authenticated() or \
                not user.is_staff or \
                not hasattr(user, 'admin_role'):
            return None

        role = user.admin_role
        if not role or role == DEFAULT_ADMIN:
            return None

        permission_url = {
            'can_view_system_info': [
                'api/v2.1/admin/sysinfo',
            ],
            'can_view_statistic': [
                'sys/statistic/file',
                'sys/statistic/storage',
                'sys/statistic/user',
                'sys/trafficadmin',
                'api/v2.1/admin/statistics',
            ],
            'can_config_system': [
                'sys/settings',
                'api/v2.1/admin/logo',
                'api/v2.1/admin/favicon',
                'api/v2.1/admin/login-background-image',
            ],
            'can_manage_library': [
                'sys/seafadmin/transfer',
                'sys/seafadmin/delete',
                'api/v2.1/admin/libraries',
                'api/v2.1/admin/system-library',
                'api/v2.1/admin/default-library',
                'api/v2.1/admin/trash-libraries',
            ],
            'can_manage_user': [
                'sys/useradmin',
                'sys/useradmin/export-excel',
                'sys/useradmin/ldap',
                'sys/useradmin/ldap/imported',
                'sys/useradmin/admins',
                'useradmin/add',
                'useradmin/remove',
                'useradmin/removetrial',
                'useradmin/search',
                'useradmin/removeadmin',
                'useradmin/info',
                'useradmin/toggle_status',
                'useradmin/toggle_role',
                'useradmin', # for 'useradmin/(?P<email>[^/]+)/set_quota',
                'useradmin/password/reset',
                'useradmin/batchmakeadmin',
                'useradmin/batchadduser',
                'api/v2.1/admin/users/batch',
            ],
            'can_manage_group': [
                'sys/groupadmin/export-excel',
                'api/v2.1/admin/groups',
            ],
            'can_view_user_log': [
                'sys/loginadmin',
                'sys/loginadmin/export-excel',
                'sys/log/fileaudit',
                'sys/log/emailaudit',
                'sys/log/fileaudit/export-excel',
                'sys/log/fileupdate',
                'sys/log/fileupdate/export-excel',
                'sys/log/permaudit',
                'sys/log/permaudit/export-excel',
                'api/v2.1/admin/logs/login',
                'api/v2.1/admin/logs/file-audit',
                'api/v2.1/admin/logs/file-update',
                'api/v2.1/admin/logs/perm-audit',
            ],
            'can_view_admin_log': [
                'api/v2.1/admin/admin-logs',
                'api/v2.1/admin/admin-login-logs',
            ],
        }

        request_path = request.path
        def get_permission_by_request_path(request_path, permission_url):
            for permission, url_list in permission_url.iteritems():
                for url in url_list:
                    if url in request_path:
                        return permission

        permission = get_permission_by_request_path(request_path,
                permission_url)

        if permission == 'can_view_system_info':
            if not request.user.admin_permissions.can_view_system_info():
                return HttpResponseForbidden()
        elif permission == 'can_view_statistic':
            if not request.user.admin_permissions.can_view_statistic():
                return HttpResponseForbidden()
        elif permission == 'can_config_system':
            if not request.user.admin_permissions.can_config_system():
                return HttpResponseForbidden()
        elif permission == 'can_manage_library':
            if not request.user.admin_permissions.can_manage_library():
                return HttpResponseForbidden()
        elif permission == 'can_manage_user':
            if not request.user.admin_permissions.can_manage_user():
                return HttpResponseForbidden()
        elif permission == 'can_manage_group':
            if not request.user.admin_permissions.can_manage_group():
                return HttpResponseForbidden()
        elif permission == 'can_view_user_log':
            if not request.user.admin_permissions.can_view_user_log():
                return HttpResponseForbidden()
        elif permission == 'can_view_admin_log':
            if not request.user.admin_permissions.can_view_admin_log():
                return HttpResponseForbidden()
        else:
            return None
