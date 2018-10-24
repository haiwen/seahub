# Copyright (c) 2012-2016 Seafile Ltd.
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils.translation import ugettext as _

from seaserv import seafile_api
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

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

        # get reviewer list
        reviewers = [x.to_dict() for x in r.reviewreviewer_set.all()]

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
                error_msg = _(u'Draft review can not be asked owner to review.')
                result['failed'].append({
                    'email': reviewer,
                    'error_msg': error_msg
                })
                continue

            # check perm
            if seafile_api.check_permission_by_path(r.origin_repo_id, r.origin_file_path, reviewer) != 'rw':
                error_msg = _(u'Permission denied.')
                result['failed'].append({
                    'email': reviewer,
                    'error_msg': error_msg
                })
                continue

            if ReviewReviewer.objects.filter(review_id=r, reviewer=reviewer):
                error_msg = _(u'Reviewer %s has existed.') % reviewer
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
