# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsRepoAccessible
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, user_to_dict, to_python_boolean
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.base.models import FileComment
from seahub.utils.repo import is_repo_owner
from seahub.views import check_folder_permission
from seahub.constants import PERMISSION_READ_WRITE

logger = logging.getLogger(__name__)


class FileCommentView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoAccessible)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, comment_id, format=None):
        """Get a comment.
        """
        # resource check
        try:
            file_comment = FileComment.objects.get(pk=comment_id)
        except FileComment.DoesNotExist:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong comment id')

        if file_comment.uuid.repo_id != repo_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File comment not found: %s' % comment_id)

        # permission check
        if check_folder_permission(request, repo_id, '/') is None:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        try:
            avatar_size = int(request.GET.get('avatar_size',
                                              AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        comment = file_comment.to_dict()
        comment.update(user_to_dict(file_comment.author, request=request,
                                    avatar_size=avatar_size))

        return Response(comment)

    def delete(self, request, repo_id, comment_id, format=None):
        """Delete a comment, only comment author or repo owner can perform
        this op.
        """
        # resource check
        try:
            file_comment = FileComment.objects.get(pk=comment_id)
        except FileComment.DoesNotExist:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong comment id')

        if file_comment.uuid.repo_id != repo_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File comment not found: %s' % comment_id)

        # permission check
        username = request.user.username
        if username != file_comment.author and not is_repo_owner(request, repo_id, username):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        file_comment.delete()

        return Response(status=204)

    def put(self, request, repo_id, comment_id, format=None):
        """Update a comment, only comment author can perform
        this op
        1.Change resolved of comment
        2.Add comment_detail
        """
        # argument check
        resolved = request.data.get('resolved')
        if resolved not in ('true', 'false', None):
            error_msg = 'resolved invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        detail = request.data.get('detail')

        # resource check
        try:
            file_comment = FileComment.objects.get(pk=comment_id)
        except FileComment.DoesNotExist:
            error_msg = 'FileComment %s not found.' % comment_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if file_comment.uuid.repo_id != repo_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File comment not found: %s' % comment_id)

        # permission check
        username = request.user.username
        if username != file_comment.author or \
                check_folder_permission(request, repo_id, '/') != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if resolved is not None:
            comment_resolved = to_python_boolean(resolved)
            try:
                file_comment.resolved = comment_resolved
                file_comment.save()
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if detail is not None:
            try:
                file_comment.detail = detail
                file_comment.save()
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        comment = request.data.get('comment')
        if comment is not None:
            try:
                file_comment.comment = comment
                file_comment.save()
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        try:
            avatar_size = int(request.GET.get('avatar_size', AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        comment = file_comment.to_dict()
        comment.update(user_to_dict(file_comment.author, request=request, avatar_size=avatar_size))

        return Response(comment)
