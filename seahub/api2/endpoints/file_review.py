# Copyright (c) 2012-2016 Seafile Ltd.
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.core.urlresolvers import reverse
from django.db import IntegrityError
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.views import check_folder_permission
from seahub.drafts.utils import send_review_status_msg
from seahub.drafts.models import Draft, DraftReview, ReviewReviewer, \
        DraftFileExist, DraftReviewExist


class FileReviewView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        repo_id = request.POST.get('repo_id', '')
        file_path = request.POST.get('file_path', '')

        # new draft
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # perm check
        perm = check_folder_permission(request, repo.id, file_path)
        if perm is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        file_id = seafile_api.get_file_id_by_path(repo.id, file_path)
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND,
                             "File %s not found" % file_path)

        username = request.user.username
        dirent = seafile_api.get_dirent_by_path(repo_id, file_path)

        try:
            d = Draft.objects.add(username, repo, file_path, file_id)
        except (DraftFileExist, IntegrityError):
            return api_error(status.HTTP_409_CONFLICT, 'Draft already exists.')

        # new review
        try:
            r = DraftReview.objects.add(creator=username, draft=d, author=dirent.modifier)
        except (DraftReviewExist):
            return api_error(status.HTTP_409_CONFLICT, 'Draft review already exists.')

        # send review status change message
        send_review_status_msg(request, r)

        # new reviewer
        if username != d.username:
            ReviewReviewer.objects.add(username, r)

        return Response(r.to_dict())
