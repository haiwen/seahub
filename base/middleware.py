
from seahub.profile.models import UserProfile

class UseridMiddleware(object):
    """Store ccnet user id in request.user.user_id"""

    def process_request(self, request):
        if not request.user.is_authenticated():
            return None

        try:
            profile = request.user.get_profile()
            request.user.user_id = profile.ccnet_user_id
        except UserProfile.DoesNotExist:
            request.user.user_id = ''

        return None

    def process_response(self, request, response):
        return response
