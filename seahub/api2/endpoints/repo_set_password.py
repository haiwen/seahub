from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils.translation import ugettext as _

from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

class RepoSetPassword(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        password = request.POST.get('password', None)
        if not password:
            error_msg = 'password invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            seafile_api.set_passwd(repo_id, request.user.username, password)
            return Response({'success': True})
        except SearpcError as e:
            if e.msg == 'Bad arguments':
                error_msg = 'Bad arguments'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            elif e.msg == 'Incorrect password':
                error_msg = _(u'Wrong password')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            elif e.msg == 'Internal server error':
                error_msg = _(u'Internal server error')
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
            else:
                error_msg = _(u'Decrypt library error')
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
