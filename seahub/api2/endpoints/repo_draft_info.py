# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import seafile_api
from django.utils.translation import gettext as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.views import check_folder_permission

from seahub.drafts.models import Draft

logger = logging.getLogger(__name__)


class RepoDraftCounts(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check perm
        perm = check_folder_permission(request, repo_id, '/')
        if not perm:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        result = {}

        # get draft counts
        result['draft_counts'] = Draft.objects.get_draft_counts_by_repo_id(repo_id)

        return Response(result)


class RepoDraftInfo(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check perm
        perm = check_folder_permission(request, repo_id, '/')
        if not perm:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        result = {}

        # list draft
        drafts = Draft.objects.list_draft_by_repo_id(repo_id)
        result['drafts'] = drafts

        return Response(result)
