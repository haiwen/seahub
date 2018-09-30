# Copyright (c) 2012-2016 Seafile Ltd.
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.drafts.models import Draft, DraftReview, DraftReviewExist

class DraftReviewsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        """List all user draft review
        """
        username = request.user.username
        data = [x.to_dict() for x in DraftReview.objects.filter(creator=username)]

        return Response({'data': data})


    def post(self, request, format=None):
        """Create a draft review
        """
        draft_id = request.data.get('draft_id', '')
        try:
            d = Draft.objects.get(pk=draft_id)
        except Draft.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Draft %s not found.' % draft_id)

        # perm check
        if d.username != request.user.username:
            return api_error(status.HTTP_403_FORBIDDEN,
                             'Permission denied.')

        try:
            d_r = DraftReview.objects.add(creator=d.username, draft=d)
        except (DraftReviewExist):
            return api_error(status.HTTP_409_CONFLICT, 'Draft review already exists.')

        return Response(d_r.to_dict())


class DraftReviewView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, pk, format=None):
        """update review status 
        """

        st = request.data.get('status', '')
        if not st:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             'Status %s invalid.')

        try:
            r = DraftReview.objects.get(pk=pk)
        except DraftReview.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Review %s not found' % pk)
        if st == 'closed':
            r.status = st
            r.save()

        if st == 'finish':

            try:
                d = Draft.objects.get(pk=r.draft_id_id)
            except Draft.DoesNotExist:
                return api_error(status.HTTP_404_NOT_FOUND,
                                 'Draft %s not found.' % pk)

            try:
                d.publish()
            except (DraftFileConflict, IntegrityError):
                return api_error(status.HTTP_409_CONFLICT,
                             'There is a conflict between the draft and the original file')


        return Response(d.to_dict())
