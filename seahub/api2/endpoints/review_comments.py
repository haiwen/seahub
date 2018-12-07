# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api
from django.core.urlresolvers import reverse

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, user_to_dict, to_python_boolean
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.utils.repo import get_repo_owner
from seahub.api2.endpoints.utils import generate_links_header_for_paginator
from seahub.views import check_folder_permission
from seahub.drafts.models import DraftReview, ReviewComment
from seahub.drafts.signals import comment_review_successful

logger = logging.getLogger(__name__)


class ReviewCommentsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, review_id, format=None):
        """List all comments of a review.
        """
        # resource check
        try:
            r = DraftReview.objects.get(pk=review_id)
        except DraftReview.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Review %s not found' % review_id)

        resolved = request.GET.get('resolved', None)
        if resolved not in ('true', 'false', None):
            error_msg = 'resolved invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        if check_folder_permission(request, r.origin_repo_id, '/') is None:
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

        total_count = ReviewComment.objects.filter(review_id=r).count()
        comments = []

        if resolved is None:
            file_comments = ReviewComment.objects.filter(review_id=r)
        else:
            comment_resolved = to_python_boolean(resolved)
            file_comments = ReviewComment.objects.filter(review_id=r, resolved=comment_resolved)[start: end]

        for file_comment in file_comments:
            comment = file_comment.to_dict()
            comment.update(user_to_dict(file_comment.author, request=request, avatar_size=avatar_size))
            comments.append(comment)

        result = {'comments': comments, 'total_count': total_count}
        resp = Response(result)
        base_url = reverse('api2-review-comments', args=[review_id])
        links_header = generate_links_header_for_paginator(base_url, page,
                                                           per_page, total_count)
        resp['Links'] = links_header
        return resp

    def post(self, request, review_id, format=None):
        """Post a comments of a review.
        """

        # resource check
        try:
            r = DraftReview.objects.get(pk=review_id)
        except DraftReview.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Review %s not found' % review_id)

        # permission check
        if check_folder_permission(request, r.origin_repo_id, '/') is None:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        comment = request.data.get('comment', '')
        if not comment:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Comment can not be empty.')

        try:
            avatar_size = int(request.GET.get('avatar_size',
                                              AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        detail = request.data.get('detail', '')
        username = request.user.username

        review_comment = ReviewComment.objects.add(comment, detail, username, r)

        # Send notification to review creator
        comment_review_successful.send(sender=None, review=r, comment=comment, author=username)

        comment = review_comment.to_dict()
        comment.update(user_to_dict(username, request=request, avatar_size=avatar_size))
        return Response(comment)


class ReviewCommentView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def delete(self, request, review_id, comment_id, format=None):
        """Delete a comment, only comment author or review creator can perform this op.
        """
        # resource check
        try:
            r = DraftReview.objects.get(pk=review_id)
        except DraftReview.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Review %s not found' % review_id)

        try:
            review_comment = ReviewComment.objects.get(pk=comment_id)
        except ReviewComment.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND, 
                            'Review comment %s not found' % comment_id)

        # permission check
        if check_folder_permission(request, r.origin_repo_id, '/') is None:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        review_comment.delete()

        return Response(status.HTTP_200_OK)

    def put(self, request, review_id, comment_id, format=None):
        """Update a comment, only comment author or review creator can perform
        this op
        1.Change resolved of comment
        2.Add comment_detail
        """

        # argument check
        resolved = request.data.get('resolved')
        if resolved not in ('true', 'false', None):
            error_msg = 'resolved invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        detail = request.data.get('detail', '')

        # resource check
        try:
            r = DraftReview.objects.get(pk=review_id)
        except DraftReview.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Review %s not found' % review_id)

        try:
            review_comment = ReviewComment.objects.get(pk=comment_id)
        except ReviewComment.DoesNotExist:
            error_msg = 'Review comment %s not found.' % comment_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, r.origin_repo_id, '/') is None:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if resolved is not None:
            comment_resolved = to_python_boolean(resolved)
            try:
                review_comment.resolved = comment_resolved
                review_comment.save()
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal error.')

        if detail:
            try:
                review_comment.detail = detail
                review_comment.save()
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal error.')

        try:
            avatar_size = int(request.GET.get('avatar_size', AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        username = request.user.username
        comment = review_comment.to_dict()
        comment.update(user_to_dict(username, request=request, avatar_size=avatar_size))

        return Response(comment)
