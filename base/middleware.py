from seaserv import get_binding_userids

class UseridMiddleware(object):
    """Store ccnet user ids in request.user.userid_list"""

    def process_request(self, request):
        if not request.user.is_authenticated():
            return None

        try:
            request.user.userid_list = get_binding_userids(request.user.username)
        except:
            request.user.userid_list = []

        return None

    def process_response(self, request, response):
        return response
