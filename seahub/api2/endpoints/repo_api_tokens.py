import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils.translation import gettext as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seaserv import seafile_api

from seahub.constants import PERMISSION_READ_WRITE
from seahub.repo_api_tokens.models import RepoAPITokens
from seahub.repo_api_tokens.utils import permission_check_admin_owner

logger = logging.getLogger(__name__)


def _get_repo_token_info(repo_token_obj):
    return {
        'repo_id': repo_token_obj.repo_id,
        'app_name': repo_token_obj.app_name,
        'generated_by': repo_token_obj.generated_by,
        'permission': repo_token_obj.permission,
        'api_token': repo_token_obj.token
    }


class RepoAPITokensView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %(repo_id)s not found.' % {'repo_id': repo_id}
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not permission_check_admin_owner(request, username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        rats = RepoAPITokens.objects.filter(repo_id=repo_id).order_by('-generated_at')
        rat_infos = [_get_repo_token_info(rat) for rat in rats]
        return Response({'repo_api_tokens': rat_infos})

    def post(self, request, repo_id):
        # arguments check
        app_name = request.data.get('app_name')
        if not app_name:
            error_msg = 'app_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        repo_permission = request.data.get('permission')
        if repo_permission and repo_permission not in [perm[0] for perm in RepoAPITokens.PERMISSION_CHOICES]:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        repo_permission = repo_permission if repo_permission else PERMISSION_READ_WRITE

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %(repo_id)s not found.' % {'repo_id': repo_id}
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not permission_check_admin_owner(request, username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        rat = RepoAPITokens.objects.filter(app_name=app_name, repo_id=repo_id).first()
        if rat:
            error_msg = 'app: %(app)s token already exists.' % {'app': app_name}
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        try:
            rat = RepoAPITokens.objects.create_token(app_name=app_name,
                                                     repo_id=repo_id,
                                                     username=username,
                                                     permission=repo_permission)
        except Exception as e:
            logger.error('user: %s create repo: %s\'s token error: %s', username, repo_id, e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(_get_repo_token_info(rat))


class RepoAPITokenView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, repo_id, app_name):
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %(repo_id)s not found.' % {'repo_id': repo_id}
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        # permission check
        if not permission_check_admin_owner(request, username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            rat = RepoAPITokens.objects.filter(repo_id=repo_id, app_name=app_name).first()
            if not rat:
                error_msg = 'api token not found'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
            rat.delete()
        except Exception as e:
            logger.error('user: %s delete repo: %s app_name: %s error: %s', username, repo_id, app_name, e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        return Response({'success': True})

    def put(self, request, repo_id, app_name):
        # arguments check
        permission = request.data.get('permission')
        if not permission or permission not in [perm[0] for perm in RepoAPITokens.PERMISSION_CHOICES]:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %(repo_id)s not found.' % {'repo_id': repo_id}
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not permission_check_admin_owner(request, username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        rat = RepoAPITokens.objects.filter(app_name=app_name, repo_id=repo_id).first()
        if not rat:
            error_msg = 'api token not found'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            rat.permission = permission
            rat.save()
        except Exception as e:
            logger.error('user: %s update repo: %s app_name: %s error: %s', username, repo_id, app_name, e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(_get_repo_token_info(rat))
