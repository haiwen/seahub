import logging
import time
import jwt

from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from django.utils.translation import ugettext as _

from seaserv import seafile_api

from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle, AnonRateThrottle
from seahub.api2.utils import api_error
from seahub.dtable.models import Workspaces, DTables, DTableAPIToken
from seahub.settings import DTABLE_PRIVATE_KEY
from seahub.dtable.utils import check_dtable_admin_permission
from seahub.constants import PERMISSION_READ, PERMISSION_READ_WRITE

logger = logging.getLogger(__name__)
API_TOKEN_PERMISSION_TUPLE = (PERMISSION_READ, PERMISSION_READ_WRITE)


def _resource_check(workspace_id, table_name):
    workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
    if not workspace:
        error_msg = 'Workspace %s not found.' % workspace_id
        return api_error(status.HTTP_404_NOT_FOUND, error_msg), None, None

    repo_id = workspace.repo_id
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        error_msg = 'Library %s not found.' % repo_id
        return api_error(status.HTTP_404_NOT_FOUND, error_msg), None, None

    dtable = DTables.objects.get_dtable(workspace, table_name)
    if not dtable:
        error_msg = 'dtable %s not found.' % table_name
        return api_error(status.HTTP_404_NOT_FOUND, error_msg), None, None

    return None, workspace, dtable


def _permission_check_for_api_token(username, owner):
    # only owner or group admin
    if not check_dtable_admin_permission(username, owner):
        error_msg = _('Permission denied.')
        return api_error(status.HTTP_403_FORBIDDEN, error_msg)

    return None


def _api_token_obj_to_dict(api_token_obj):
    return {
        'id': api_token_obj.pk,
        'app_name': api_token_obj.app_name,
        'api_token': api_token_obj.token,
        'generated_by': api_token_obj.generated_by,
        'generated_at': datetime_to_isoformat_timestr(api_token_obj.generated_at),
        'last_access': datetime_to_isoformat_timestr(api_token_obj.last_access),
        'permission': api_token_obj.permission,
    }


class DTableAPITokensView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, workspace_id, name):
        """list dtable api token for thirdpart app
        """
        table_name = name
        username = request.user.username

        # resource check
        error, workspace, dtable = _resource_check(workspace_id, table_name)
        if error:
            return error

        # permission check
        owner = workspace.owner
        error = _permission_check_for_api_token(username, owner)
        if error:
            return error

        # main
        api_tokens = list()

        try:
            api_token_queryset = DTableAPIToken.objects.list_by_dtable(dtable)
            for api_token_obj in api_token_queryset:
                data = _api_token_obj_to_dict(api_token_obj)
                api_tokens.append(data)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'api_tokens': api_tokens})

    def post(self, request, workspace_id, name):
        """generate dtable api token
        """
        table_name = name
        username = request.user.username

        # argument check
        app_name = request.data.get('app_name')
        if not app_name:
            return api_error(status.HTTP_400_BAD_REQUEST, 'app_name invalid.')

        permission = request.data.get('permission')
        if not permission or permission not in API_TOKEN_PERMISSION_TUPLE:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        error, workspace, dtable = _resource_check(workspace_id, table_name)
        if error:
            return error

        # permission check
        owner = workspace.owner
        error = _permission_check_for_api_token(username, owner)
        if error:
            return error

        # main
        try:
            exist_obj = DTableAPIToken.objects.get_by_dtable_and_app_name(dtable, app_name)
            if exist_obj is not None:
                return api_error(status.HTTP_400_BAD_REQUEST, 'api token already exist.')

            api_token_obj = DTableAPIToken.objects.add(dtable, app_name, username, permission)

            data = _api_token_obj_to_dict(api_token_obj)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(data, status=status.HTTP_201_CREATED)


class DTableAPITokenView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, workspace_id, name, api_token_id):
        """delete dtable api token
        """
        table_name = name
        username = request.user.username

        # resource check
        error, workspace, dtable = _resource_check(workspace_id, table_name)
        if error:
            return error

        # permission check
        owner = workspace.owner
        error = _permission_check_for_api_token(username, owner)
        if error:
            return error

        # main
        try:
            api_token_obj = DTableAPIToken.objects.get_by_pk(api_token_id)
            if api_token_obj is None:
                return api_error(status.HTTP_404_NOT_FOUND, 'api token not found.')

            api_token_obj.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def put(self, request, workspace_id, name, api_token_id):
        """update dtable api token
        """
        table_name = name
        username = request.user.username

        # argument check
        permission = request.data.get('permission')
        if not permission or permission not in API_TOKEN_PERMISSION_TUPLE:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        error, workspace, dtable = _resource_check(workspace_id, table_name)
        if error:
            return error

        # permission check
        owner = workspace.owner
        error = _permission_check_for_api_token(username, owner)
        if error:
            return error

        # main
        try:
            api_token_obj = DTableAPIToken.objects.get_by_pk(api_token_id)
            if api_token_obj is None:
                return api_error(status.HTTP_404_NOT_FOUND, 'api token not found.')

            if permission == api_token_obj.permission:
                return api_error(status.HTTP_400_BAD_REQUEST, 'api token already has %s permission.' % permission)

            api_token_obj.permission = permission
            api_token_obj.save(update_fields=['permission'])

            data = _api_token_obj_to_dict(api_token_obj)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(data)


class DTableAppAccessTokenView(APIView):
    throttle_classes = (AnonRateThrottle,)

    def get(self, request, workspace_id, name):
        """thirdpart app use dtable api token to get access token
        """
        table_name = name

        # argument check
        token_list = request.META.get('HTTP_AUTHORIZATION', '').split()
        if not token_list or token_list[0].lower() != 'token' or len(token_list) != 2:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        api_token = token_list[1]

        # resource check
        error, workspace, dtable = _resource_check(workspace_id, table_name)
        if error:
            return error

        # main
        try:
            api_token_obj = DTableAPIToken.objects.get_by_token(api_token)
            if api_token_obj is None:
                return api_error(status.HTTP_404_NOT_FOUND, 'api token not found.')

            api_token_obj.update_last_access()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # generate json web token
        payload = {
            'exp': int(time.time()) + 86400 * 3,
            'dtable_uuid': dtable.uuid.hex,
            'username': api_token_obj.generated_by,
            'permission': api_token_obj.permission,
            'app_name': api_token_obj.app_name,
        }

        try:
            access_token = jwt.encode(
                payload, DTABLE_PRIVATE_KEY, algorithm='HS256'
            )
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({
            'access_token': access_token,
            'dtable_uuid': dtable.uuid.hex,
        })
