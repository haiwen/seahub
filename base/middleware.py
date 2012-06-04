from django.core.cache import cache

from seaserv import get_binding_peerids

from seahub.notifications.models import Notification
from seahub.notifications.utils import refresh_cache

class UseridMiddleware(object):
    """Store ccnet user ids in request.user.userid_list"""

    def process_request(self, request):
        if not request.user.is_authenticated():
            return None

        try:
            request.user.userid_list = get_binding_peerids(request.user.username)
        except:
            request.user.userid_list = []

        return None

    def process_response(self, request, response):
        return response

class InfobarMiddleware(object):
    """Query info bar close status, and store into reqeust."""

    def get_from_db(self):
        ret = Notification.objects.all().filter(primary=1)
        refresh_cache()
        return ret

    def process_request(self, request):
        topinfo_close = request.COOKIES.get('topinfo', '')

        cur_note = cache.get('CUR_TOPINFO') if cache.get('CUR_TOPINFO') else \
            self.get_from_db()
        if not cur_note:
            request.cur_note = None
        else:
            if str(cur_note[0].id) in topinfo_close.split(','):
                request.cur_note = None
            else:
                request.cur_note = cur_note[0]

        return None
            
    def process_response(self, request, response):
        return response
    
