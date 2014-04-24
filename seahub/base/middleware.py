from django.core.cache import cache

import seaserv

from seahub.notifications.models import Notification
from seahub.notifications.utils import refresh_cache
try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False
try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False

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
                orgs = seaserv.get_orgs_by_user(username)
                if orgs:
                    request.user.org = orgs[0]
        else:
            request.cloud_mode = False

        if CLOUD_MODE and request.user.org is not None:
            org_id = request.user.org.org_id
            request.user.joined_groups = seaserv.get_org_groups_by_user(
                org_id, username)
        else:
            request.user.joined_groups = seaserv.get_personal_groups_by_user(
                username)

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
