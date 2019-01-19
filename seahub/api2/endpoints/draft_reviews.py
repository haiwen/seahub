# Copyright (c) 2012-2016 Seafile Ltd.
import os
import posixpath

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db import IntegrityError

from seaserv import seafile_api
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.constants import PERMISSION_READ_WRITE
from seahub.views import check_folder_permission

from seahub.drafts.models import Draft, DraftReview, DraftReviewExist, \
        DraftFileConflict, ReviewReviewer, OriginalFileConflict
from seahub.drafts.signals import update_review_successful
from seahub.drafts.utils import send_review_status_msg


class DraftReviewsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        """ List all reviews related to the user and their corresponding reviewers based on the review status
        case1: List the reviews created by the user and their associated reviewers by status
        case2: List the reviews of the user as reviewer and their associated reviewers by status
        status: open / finished / closed
        """
        username = request.user.username

        st = request.GET.get('status', 'open')

        if st not in ('open', 'finished', 'closed'):
            error_msg = 'Status invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # case1: List the reviews created by the user and their associated reviewers by status
        reviews_1 = DraftReview.objects.get_reviews_by_creator_and_status(creator=username, status=st)

        # case2: List the reviews of the user as reviewer and their associated reviewers by status
        reviews_2 = DraftReview.objects.get_reviews_by_reviewer_and_status(reviewer=username, status=st)

        result = reviews_1 + reviews_2
        data = sorted(result, key=lambda k: k['updated_at'], reverse=True)

        return Response({'data': data})

    def post(self, request, format=None):
        """Create a draft review if the user has read permission to the repo
        """
        draft_id = request.data.get('draft_id', '')
        try:
            d = Draft.objects.get(pk=draft_id)
        except Draft.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Draft %s not found.' % draft_id)

        origin_repo_id = d.origin_repo_id
        file_path = d.draft_file_path
        draft_file = seafile_api.get_file_id_by_path(origin_repo_id, file_path)
        if not draft_file:
            error_msg = 'Draft file not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # perm check
        perm = check_folder_permission(request, origin_repo_id, '/')

        if perm is None:
            return api_error(status.HTTP_403_FORBIDDEN,
                             'Permission denied.')

        username = request.user.username
        try:
            d_r = DraftReview.objects.add(creator=username, draft=d)
        except (DraftReviewExist):
            return api_error(status.HTTP_409_CONFLICT, 'Draft review already exists.')

        # send review status change message
        send_review_status_msg(request, d_r)

        return Response(d_r.to_dict())


class DraftReviewView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, pk, format=None):
        """update review status 
        Close: the user has read permission to the repo
        Publish: the user has read-write permission to the repo
        """
        username = request.user.username
        st = request.data.get('status', '')
        if not st:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Status %s invalid.')

        try:
            r = DraftReview.objects.get(pk=pk)
        except DraftReview.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Review %s not found' % pk)

        try:
            Draft.objects.get(pk=r.draft_id_id)
        except Draft.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Draft %s not found.' % pk)

        perm = check_folder_permission(request, r.origin_repo_id, '/')

        # Close: the user has read permission to the repo
        if st == 'closed':
            if perm is None:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            r.close()

        # Publish: the user has read-write permission to the repo
        if st == 'finished':
            if perm != PERMISSION_READ_WRITE:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                r.publish(operator=username)
            except DraftFileConflict:
                error_msg = 'There is a conflict between the draft and the original file.'
                return api_error(status.HTTP_409_CONFLICT, error_msg)
            except OriginalFileConflict:
                error_msg = 'Original file not found.'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        reviewers = ReviewReviewer.objects.filter(review_id=r)
        # send notice to other reviewers if has
        if reviewers:
            for i in reviewers:
                #  If it is a reviewer operation, exclude it.
                if i.reviewer == username:
                    continue

                update_review_successful.send(sender=None, from_user=username,
                                              to_user=i.reviewer, review_id=r.id, status=st)

        # send notice to review owner
        if username != r.creator:
            update_review_successful.send(sender=None, from_user=username,
                                          to_user=r.creator, review_id=r.id, status=st)

        # send review status change message
        send_review_status_msg(request, r)

        result = r.to_dict()

        return Response(result)
