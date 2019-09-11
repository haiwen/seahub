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
from seahub.tags.models import FileUUIDMap
from seahub.views import check_folder_permission
from seahub.utils import is_valid_username
from seahub.drafts.models import Draft, DraftReviewer
from seahub.drafts.signals import request_reviewer_successful


class DraftReviewerView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, pk, format=None):
        try:
            d = Draft.objects.get(pk=pk)
        except Draft.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Draft %s not found' % pk)

        # format user result
        try:
            avatar_size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            avatar_size = 32

        # get reviewer list
        reviewers = []
        for x in d.draftreviewer_set.all():
            reviewer = user_to_dict(x.reviewer, request=request, avatar_size=avatar_size)
            reviewers.append(reviewer)

        return Response({'reviewers': reviewers})

    def post(self, request, pk, format=None):
        """add draft reviewer
        """
        try:
            d = Draft.objects.get(pk=pk)
        except Draft.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Draft %s not found' % pk)

        result = {}
        result['failed'] = []
        result['success'] = []

        reviewers = request.data.getlist('reviewer')
        for reviewer in reviewers:
            if not is_valid_username(reviewer):
                result['failed'].append({
                    'email': reviewer,
                    'error_msg': _('username invalid.')
                    })
                continue

            try:
                User.objects.get(email=reviewer)
            except User.DoesNotExist:
                result['failed'].append({
                    'email': reviewer,
                    'error_msg': _('User %s not found.') % reviewer
                    })
                continue

            # can't share to owner
            if reviewer == d.username:
                error_msg = 'Draft can not be asked owner to review.'
                result['failed'].append({
                    'email': reviewer,
                    'error_msg': error_msg
                })
                continue

            uuid = FileUUIDMap.objects.get_fileuuidmap_by_uuid(d.origin_file_uuid)
            origin_file_path = posixpath.join(uuid.parent_path, uuid.filename)
            # check perm
            if seafile_api.check_permission_by_path(d.origin_repo_id, origin_file_path, reviewer) != 'rw':
                error_msg = _('Permission denied.')
                result['failed'].append({
                    'email': reviewer,
                    'error_msg': error_msg
                })
                continue

            if DraftReviewer.objects.filter(draft=d, reviewer=reviewer):
                error_msg = 'Reviewer %s has existed.' % reviewer
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

            DraftReviewer.objects.add(reviewer, d)

            request_reviewer_successful.send(sender=None, from_user=request.user.username,
                                             to_user=reviewer, draft_id=d.id)

        return Response(result)

    def delete(self, request, pk):
        """Delete a reviewer 
        """
        try:
            d = Draft.objects.get(pk=pk)
        except Draft.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Draft %s not found' % pk)

        perm = check_folder_permission(request, d.origin_repo_id, '/')

        if perm is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        reviewer = request.GET.get('username')

        if reviewer is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Email %s invalid.' % reviewer)

        try:
            reviewer = DraftReviewer.objects.get(reviewer=reviewer, draft=d)
        except DraftReviewer.DoesNotExist:
            return Response(status.HTTP_200_OK)

        reviewer.delete()

        return Response(status.HTTP_200_OK)
