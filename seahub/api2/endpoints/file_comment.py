# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsRepoAccessible
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, user_to_dict
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.base.models import FileComment

logger = logging.getLogger(__name__)


class FileCommentView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoAccessible)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, pk, format=None):
        """Get a comment.
        """
        try:
            o = FileComment.objects.get(pk=pk)
        except FileComment.DoesNotExist:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong comment id')

        try:
            avatar_size = int(request.GET.get('avatar_size',
                                              AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        comment = o.to_dict()
        comment.update(user_to_dict(o.author, request=request,
                                    avatar_size=avatar_size))

        return Response(comment)

    def delete(self, request, repo_id, pk, format=None):
        """Delete a comment, only comment author or repo owner can perform
        this op.
        """
        try:
            o = FileComment.objects.get(pk=pk)
        except FileComment.DoesNotExist:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong comment id')

        username = request.user.username
        if username != o.author and \
           not seafile_api.is_repo_owner(username, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        o.delete()

        return Response(status=204)
