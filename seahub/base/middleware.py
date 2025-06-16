# Copyright (c) 2012-2016 Seafile Ltd.
import re

from rest_framework import status
from django.urls import reverse
from django.core.cache import cache
from django.http import HttpResponseRedirect
from django.utils.translation import gettext as _
from django.utils.deprecation import MiddlewareMixin

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


class BaseMiddleware(MiddlewareMixin):
    """
    Middleware that add organization, group info to user.
    """

    def process_request(self, request):

        username = request.user.username
        request.user.org = None

        # not enable multi-tenancy
        request.cloud_mode = CLOUD_MODE
        if not CLOUD_MODE or not MULTI_TENANCY:
            return None

        # not org user
        orgs = ccnet_api.get_orgs_by_user(username)
        if not orgs:
            return None

        # org is active
        request.user.org = orgs[0]
        if OrgSettings.objects.get_is_active_by_org(request.user.org):
            return None

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
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
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


class UserAgentMiddleWare(MiddlewareMixin):
    user_agents_test_match = (
        "w3c ", "acs-", "alav", "alca", "amoi", "audi",
        "avan", "benq", "bird", "blac", "blaz", "brew",
        "cell", "cldc", "cmd-", "dang", "doco", "eric",
        "hipt", "inno", "ipaq", "java", "jigs", "kddi",
        "keji", "leno", "lg-c", "lg-d", "lg-g", "lge-",
        "maui", "maxo", "midp", "mits", "mmef", "mobi",
        "mot-", "moto", "mwbp", "nec-", "newt", "noki",
        "xda",  "palm", "pana", "pant", "phil", "play",
        "port", "prox", "qwap", "sage", "sams", "sany",
        "sch-", "sec-", "send", "seri", "sgh-", "shar",
        "sie-", "siem", "smal", "smar", "sony", "sph-",
        "symb", "t-mo", "teli", "tim-", "tosh", "tsm-",
        "upg1", "upsi", "vk-v", "voda", "wap-", "wapa",
        "wapi", "wapp", "wapr", "webc", "winw", "xda-",)
    user_agents_test_search = u"(?:%s)" % u'|'.join((
        'up.browser', 'up.link', 'mmp', 'symbian', 'smartphone', 'midp',
        'wap', 'phone', 'windows ce', 'pda', 'mobile', 'mini', 'palm',
        'netfront', 'opera mobi',
    ))
    user_agents_exception_search = u"(?:%s)" % u'|'.join((
        'ipad',
    ))
    http_accept_regex = re.compile("application/vnd\.wap\.xhtml\+xml", re.IGNORECASE)
    user_agents_android_search = u"(?:android)"
    user_agents_mobile_search = u"(?:mobile)"
    user_agents_tablets_search = u"(?:%s)" % u'|'.join(('ipad', 'tablet', ))

    def __init__(self, get_response=None):
        self.get_response = get_response

        # these for detect mobile
        user_agents_test_match = r'^(?:%s)' % '|'.join(self.user_agents_test_match)
        self.user_agents_test_match_regex = re.compile(user_agents_test_match, re.IGNORECASE)
        self.user_agents_test_search_regex = re.compile(self.user_agents_test_search, re.IGNORECASE)
        self.user_agents_exception_search_regex = re.compile(self.user_agents_exception_search, re.IGNORECASE)

        # these three used to detect tablet
        self.user_agents_android_search_regex = re.compile(self.user_agents_android_search, re.IGNORECASE)
        self.user_agents_mobile_search_regex = re.compile(self.user_agents_mobile_search, re.IGNORECASE)
        self.user_agents_tablets_search_regex = re.compile(self.user_agents_tablets_search, re.IGNORECASE)

    def process_request(self, request):
        is_mobile = False
        is_tablet = False

        if 'HTTP_USER_AGENT' in request.META:
            user_agent = request.META['HTTP_USER_AGENT']

            # Test common mobile values.
            if self.user_agents_test_search_regex.search(user_agent) and \
                    not self.user_agents_exception_search_regex.search(user_agent):
                is_mobile = True
            else:
                # Nokia like test for WAP browsers.
                # http://www.developershome.com/wap/xhtmlmp/xhtml_mp_tutorial.asp?page=mimeTypesFileExtension

                if 'HTTP_ACCEPT' in request.META:
                    http_accept = request.META['HTTP_ACCEPT']
                    if self.http_accept_regex.search(http_accept):
                        is_mobile = True

            if not is_mobile:
                # Now we test the user_agent from a big list.
                if self.user_agents_test_match_regex.match(user_agent):
                    is_mobile = True

            # Ipad or Blackberry
            if self.user_agents_tablets_search_regex.search(user_agent):
                is_tablet = True
            # Android-device. If User-Agent doesn't contain Mobile, then it's a tablet
            elif (self.user_agents_android_search_regex.search(user_agent) and
                  not self.user_agents_mobile_search_regex.search(user_agent)):
                is_tablet = True

        request.is_mobile = is_mobile
        request.is_tablet = is_tablet
