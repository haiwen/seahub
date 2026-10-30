# Copyright (c) 2012-2016 Seafile Ltd.
import re

from rest_framework import status
from django.urls import reverse
from django.core.cache import cache
from django.http import HttpResponseRedirect
from django.utils.translation import gettext as _

from seaserv import ccnet_api

from seahub.auth import logout
from seahub.utils import render_error
from seahub.organizations.models import OrgSettings
from seahub.organizations.utils import generate_org_reactivate_link
from seahub.notifications.models import Notification
from seahub.notifications.utils import refresh_cache
from seahub.api2.utils import api_error

from seahub.settings import SITE_ROOT, SUPPORT_EMAIL
from seahub.organizations.settings import ORG_ENABLE_REACTIVATE
try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False
try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False


class BaseMiddleware:
    """
    Middleware that add organization, group info to user.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        username = request.user.username
        request.user.org = None

        # not enable multi-tenancy
        request.cloud_mode = CLOUD_MODE
        if not CLOUD_MODE or not MULTI_TENANCY:
            return self.get_response(request)

        # not org user
        orgs = ccnet_api.get_orgs_by_user(username)
        if not orgs:
            return self.get_response(request)

        # org is active
        request.user.org = orgs[0]
        if OrgSettings.objects.get_is_active_by_org(request.user.org):
            return self.get_response(request)

        # handle inactive org
        org_id = request.user.org.org_id
        org_name = request.user.org.org_name
        is_org_staff = request.user.org.is_staff
        logout(request)

        error_msg = _(f"Team {org_name} is inactive.")
        if "api2/" in request.path or "api/v2.1/" in request.path:
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        extra_ctx = {"organization_inactive": True}

        if ORG_ENABLE_REACTIVATE and is_org_staff:
            reactivate_link = generate_org_reactivate_link(org_id)
            extra_ctx["reactivate_link"] = reactivate_link
            return render_error(request, error_msg, extra_ctx)

        if SUPPORT_EMAIL:
            contact_msg = _(f"Please contact {SUPPORT_EMAIL} if you want to activate the team.")
            error_msg = f"{error_msg} {contact_msg}"

        return render_error(request, error_msg, extra_ctx)


class InfobarMiddleware:
    """Query info bar close status, and store into request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def get_from_db(self):
        ret = Notification.objects.all().filter(primary=1)
        refresh_cache()
        return ret

    def __call__(self, request):
        # filter AJAX request out
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return self.get_response(request)

        # filter API request out
        if "api2/" in request.path or "api/v2.1/" in request.path:
            return self.get_response(request)

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

        return self.get_response(request)

class ForcePasswdChangeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def _request_in_black_list(self, request):
        path = request.path
        black_list = (r'^%s$' % SITE_ROOT, r'home/.+', r'repo/.+',
                      r'[f|d]/[a-f][0-9]+', r'group/\d+', r'groups/',
                      r'share/', r'profile/', r'notification/list/')

        for patt in black_list:
            if re.search(patt, path) is not None:
                return True
        return False

    def __call__(self, request):
        if request.session.get('force_passwd_change', False):
            if self._request_in_black_list(request):
                return HttpResponseRedirect(reverse('auth_password_change'))

        return self.get_response(request)
