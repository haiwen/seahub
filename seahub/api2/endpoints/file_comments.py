# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api
from pysearpc import SearpcError
from django.urls import reverse

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsRepoAccessible
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, user_to_dict, to_python_boolean
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.base.models import FileComment
from seahub.utils.repo import get_repo_owner
from seahub.signals import comment_file_successful
from seahub.drafts.signals import comment_draft_successful
from seahub.drafts.utils import is_draft_file
from seahub.drafts.models import Draft
from seahub.api2.endpoints.utils import generate_links_header_for_paginator
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)


class FileCommentsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoAccessible)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        """List all comments of a file.
        """
        path = request.GET.get('p', '/').rstrip('/')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong path.')

        resolved = request.GET.get('resolved', None)
        if resolved not in ('true', 'false', None):
            error_msg = 'resolved invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, '/') is None:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            avatar_size = int(request.GET.get('avatar_size',
                                              AVATAR_DEFAULT_SIZE))
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE
            page = 1
            per_page = 25

        start = (page - 1) * per_page
        end = page * per_page 

        total_count = FileComment.objects.get_by_file_path(repo_id, path).count()
        comments = []

        if resolved is None:
            file_comments = FileComment.objects.get_by_file_path(repo_id, path)[start: end]
        else:
            comment_resolved = to_python_boolean(resolved)
            file_comments = FileComment.objects.get_by_file_path(repo_id, path).filter(resolved=comment_resolved)[start: end]

        for file_comment in file_comments:
            comment = file_comment.to_dict()
            comment.update(user_to_dict(file_comment.author, request=request, avatar_size=avatar_size))
            comments.append(comment)

        result = {'comments': comments, 'total_count': total_count}
        resp = Response(result)
        base_url = reverse('api2-file-comments', args=[repo_id])
        links_header = generate_links_header_for_paginator(base_url, page, 
                                                           per_page, total_count)
        resp['Links'] = links_header
        return resp

    def post(self, request, repo_id, format=None):
        """Post a comments of a file.
        """
        # argument check
        path = request.GET.get('p', '/').rstrip('/')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong path.')

        comment = request.data.get('comment', '')
        if not comment:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Comment can not be empty.')

        try:
            avatar_size = int(request.GET.get('avatar_size',
                                              AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        # resource check
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                             'Internal Server Error')
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        # permission check
        if check_folder_permission(request, repo_id, '/') is None:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        detail = request.data.get('detail', '')
        username = request.user.username
        file_comment = FileComment.objects.add_by_file_path(
            repo_id=repo_id, file_path=path, author=username, comment=comment, detail=detail)
        repo = seafile_api.get_repo(repo_id)
        repo_owner = get_repo_owner(request, repo.id)

        if is_draft_file(repo_id, path):
            draft = Draft.objects.filter(origin_repo_id=repo_id, draft_file_path=path)
            if draft:
                draft = draft[0]
                comment_draft_successful.send(sender=None,
                                              draft=draft,
                                              comment=comment,
                                              author=username)
            else:
                Draft.DoesNotExist
        else:
            comment_file_successful.send(sender=None,
                                         repo=repo,
                                         repo_owner=repo_owner,
                                         file_path=path,
                                         comment=comment,
                                         author=username)

        comment = file_comment.to_dict()
        comment.update(user_to_dict(username, request=request, avatar_size=avatar_size))
        return Response(comment, status=201)
