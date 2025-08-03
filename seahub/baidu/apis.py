import os
import logging

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated

from seaserv import seafile_api

from seahub.views import check_folder_permission
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.utils import normalize_file_path, get_file_type_and_ext
from seahub.baidu.utils import (
    gen_baidu_access_token,
    get_baidu_file_uuid,
    is_valid_baidu_access_token,
)

logger = logging.getLogger(__name__)


class BaiduAccessToken(APIView):
    """
    API endpoint for generating Baidu Netdisk access token
    Similar to SeadocAccessToken but for Baidu Netdisk integration
    """

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        """
        Generate JWT access token for Baidu Netdisk operations

        Parameters:
        - repo_id: Repository ID
        - p: File path (from query parameter)
        - operation: Operation type (sync/upload/download)

        Returns:
        - access_token: JWT token for Baidu Netdisk operations
        """
        username = request.user.username

        # Argument check
        path = request.GET.get("p", None)
        if not path:
            error_msg = "p invalid."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = request.GET.get("operation", "sync")
        if operation not in ("sync", "upload", "download"):
            error_msg = "operation must be sync, upload, or download."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = normalize_file_path(path)
        parent_dir = os.path.dirname(path)
        filename = os.path.basename(path)

        # Resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = "Library %s not found." % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            obj_id = seafile_api.get_file_id_by_path(repo_id, path)
        except Exception as e:
            logger.error(e)
            error_msg = "Internal Server Error"
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not obj_id:
            error_msg = "File %s not found." % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # Permission check
        permission = check_folder_permission(request, repo_id, parent_dir)
        if not permission:
            error_msg = "Permission denied."
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # Generate file UUID and access token
        file_uuid = get_baidu_file_uuid(repo, path)
        access_token = gen_baidu_access_token(
            file_uuid, filename, username, permission=permission, operation=operation
        )

        return Response(
            {
                "access_token": access_token,
                "file_uuid": file_uuid,
                "operation": operation,
            }
        )


class BaiduFileInfo(APIView):
    """
    API endpoint for getting file information with Baidu token validation
    """

    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def get(self, request, file_uuid):
        """
        Get file information using Baidu access token

        Parameters:
        - file_uuid: File UUID
        - Authorization header with JWT token

        Returns:
        - File information including path, size, etc.
        """
        # JWT permission check
        auth = request.headers.get("authorization", "").split()
        is_valid, payload = is_valid_baidu_access_token(
            auth, file_uuid, return_payload=True
        )
        if not is_valid:
            error_msg = "Permission denied."
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        from seahub.tags.models import FileUUIDMap

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = "File uuid %s not found." % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = uuid_map.repo_id
        file_path = os.path.join(uuid_map.parent_path, uuid_map.filename)

        # Get file information
        try:
            file_obj = seafile_api.get_dirent_by_path(repo_id, file_path)
            if not file_obj:
                error_msg = "File not found in repository."
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except Exception as e:
            logger.error(e)
            error_msg = "Internal Server Error"
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # Get file type and extension
        filetype, fileext = get_file_type_and_ext(uuid_map.filename)

        return Response(
            {
                "file_uuid": file_uuid,
                "filename": uuid_map.filename,
                "file_path": file_path,
                "repo_id": repo_id,
                "file_type": filetype,
                "file_ext": fileext,
                "size": file_obj.size,
                "mtime": file_obj.mtime,
                "operation": payload.get("operation", "sync"),
                "username": payload.get("username", ""),
            }
        )


class BaiduValidateToken(APIView):
    """
    API endpoint for validating Baidu access token
    """

    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """
        Validate Baidu access token

        Parameters:
        - token: JWT token to validate
        - file_uuid: File UUID to validate against

        Returns:
        - is_valid: Boolean indicating token validity
        - payload: Token payload if valid
        """
        token = request.data.get("token", "")
        file_uuid = request.data.get("file_uuid", "")

        if not token or not file_uuid:
            error_msg = "token and file_uuid are required."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # Simulate auth header format
        auth = ["Bearer", token]
        is_valid, payload = is_valid_baidu_access_token(
            auth, file_uuid, return_payload=True
        )

        if is_valid:
            return Response({"is_valid": True, "payload": payload})
        else:
            return Response({"is_valid": False, "payload": None})
