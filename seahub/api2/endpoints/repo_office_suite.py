
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error

from seahub.onlyoffice.models import RepoOfficeSuite
from seahub.settings import OFFICE_SUITES, ENABLE_MULTIPLE_OFFICE_SUITE
from seahub.role_permissions.settings import ENABLED_ROLE_PERMISSIONS
from seahub.utils.user_permissions import get_user_role

class OfficeSuiteConfig(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        if not request.user.permissions.can_use_office_suite:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        current_suite = RepoOfficeSuite.objects.filter(repo_id=repo_id).values().first()
        suites_info = []
        for office_suite in OFFICE_SUITES:
            suite_info = {}
            suite_info['id'] = office_suite.get('id')
            suite_info['name'] = office_suite.get('name')
            suite_info['is_default'] = office_suite.get('is_default')
            if current_suite:
                suite_info['is_selected'] = (True if current_suite.get('suite_id') == office_suite.get('id') else False)
            else:
                suite_info['is_selected'] = office_suite.get('is_default')
            suites_info.append(suite_info)

        return Response({'suites_info': suites_info})
    
    def put(self, request, repo_id):
        # arguments check
        suite_id = request.data.get('suite_id', '')
        if suite_id not in ['collabora', 'onlyoffice']:
            error_msg = 'suite_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        if not request.user.permissions.can_use_office_suite:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        RepoOfficeSuite.objects.update_or_create(repo_id=repo_id,
                                                 defaults= {'suite_id':suite_id} )

        return Response({"success": True}, status=status.HTTP_200_OK)
