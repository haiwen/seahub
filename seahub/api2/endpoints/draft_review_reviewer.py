# Copyright (c) 2012-2016 Seafile Ltd.
import posixpath

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils.translation import ugettext as _

from seaserv import seafile_api
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, user_to_dict

from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.base.accounts import User
from seahub.views import check_folder_permission
from seahub.utils import is_valid_username
from seahub.drafts.models import DraftReview, ReviewReviewer
from seahub.drafts.signals import request_reviewer_successful


class DraftReviewReviewerView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, pk, format=None):
        try:
            r = DraftReview.objects.get(pk=pk)
        except DraftReview.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Review %s not found' % pk)

        # format user result
        try:
            avatar_size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            avatar_size = 32

        # get reviewer list
        reviewers = []
        for x in r.reviewreviewer_set.all():
            reviewer = user_to_dict(x.reviewer, request=request, avatar_size=avatar_size)
            reviewers.append(reviewer)

        return Response({'reviewers': reviewers})

    def post(self, request, pk, format=None):
        """Create a draft review
        """
        try:
            r = DraftReview.objects.get(pk=pk)
        except DraftReview.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Review %s not found' % pk)

        result = {}
        result['failed'] = []
        result['success'] = []

        reviewers = request.data.getlist('reviewer')
        for reviewer in reviewers:
            if not is_valid_username(reviewer):
                result['failed'].append({
                    'email': reviewer,
                    'error_msg': _(u'username invalid.')
                    })
                continue

            try:
                User.objects.get(email=reviewer)
            except User.DoesNotExist:
                result['failed'].append({
                    'email': reviewer,
                    'error_msg': _(u'User %s not found.') % reviewer
                    })
                continue

            # can't share to owner
            if reviewer == r.creator:
                error_msg = 'Draft review can not be asked owner to review.'
                result['failed'].append({
                    'email': reviewer,
                    'error_msg': error_msg
                })
                continue

            uuid = r.origin_file_uuid
            origin_file_path = posixpath.join(uuid.parent_path, uuid.filename)
            # check perm
            if seafile_api.check_permission_by_path(r.origin_repo_id, origin_file_path, reviewer) != 'rw':
                error_msg = _(u'Permission denied.')
                result['failed'].append({
                    'email': reviewer,
                    'error_msg': error_msg
                })
                continue

            if ReviewReviewer.objects.filter(review_id=r, reviewer=reviewer):
                error_msg = u'Reviewer %s has existed.' % reviewer
                result['failed'].append({
                    'email': reviewer,
                    'error_msg': error_msg
                })
                continue

            result['success'].append({
                "user_info": {
                    "name": reviewer,
                    "nickname": email2nickname(reviewer)
                }
            })

            ReviewReviewer.objects.add(reviewer, r)

            request_reviewer_successful.send(sender=None, from_user=r.creator,
                                             to_user=reviewer, review_id=r.id)

        return Response(result)

    def delete(self, request, pk):
        """Delete a reviewer 
        """
        try:
            r = DraftReview.objects.get(pk=pk)
        except DraftReview.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Review %s not found' % pk)

        perm = check_folder_permission(request, r.origin_repo_id, '/')

        if perm is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        reviewer = request.GET.get('username')

        if reviewer is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Email %s invalid.' % reviewer)

        try:
            reviewer_obj = ReviewReviewer.objects.get(reviewer=reviewer, review_id=r)
        except ReviewReviewer.DoesNotExist:
            return Response(status.HTTP_200_OK)

        reviewer_obj.delete()

        return Response(status.HTTP_200_OK)
