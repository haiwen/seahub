from seaserv import ccnet_rpc

class UseridMiddleware(object):
    """Store ccnet user id in request.user.user_id"""

    def process_request(self, request):
        if not request.user.is_authenticated():
            return None

        try:
            request.user.user_id = ccnet_rpc.get_binding_userid(request.user.username)
        except:
            request.user.user_id = ''

        return None

    def process_response(self, request, response):
        return response
