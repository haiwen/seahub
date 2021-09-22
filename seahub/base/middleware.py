# Copyright (c) 2012-2016 Seafile Ltd.
import re
from http import cookies

from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache
from django.urls import reverse
from django.http import HttpResponseRedirect

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

class BaseMiddleware(MiddlewareMixin):
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

class InfobarMiddleware(MiddlewareMixin):
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


class ForcePasswdChangeMiddleware(MiddlewareMixin):
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


cookies.Morsel._reserved["samesite"] = "SameSite"
OLD_CHROME_REGEX = r"(Chrome|Chromium)\/((5[1-9])|6[0-6])"


class SameSiteNoneMiddleware:
    """Set SameSite="None" if it was None before (workaround for django#30862)

    This middleware will be obsolete when your app will start using Django 3.1.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # same-site = None introduced for Chrome 80 breaks for Chrome 51-66
        # Refer (https://www.chromium.org/updates/same-site/incompatible-clients)
        user_agent = request.META.get("HTTP_USER_AGENT")
        if not (user_agent and re.search(OLD_CHROME_REGEX, user_agent)):
            for name, value in response.cookies.items():
                if not value.get("samesite"):
                    value["samesite"] = "None"
                    value["secure"] = True  # fixes plain set_cookie(name, value)

        return response
