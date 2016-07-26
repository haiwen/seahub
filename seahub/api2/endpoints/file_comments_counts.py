# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from django.db.models import Count
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsRepoAccessible
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.models import FileComment

logger = logging.getLogger(__name__)


class FileCommentsCounts(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoAccessible)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        """Count all comments of all file under certain parent dir.
        """
        path = request.GET.get('p', '/')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong path.')

        try:
            obj_id = seafile_api.get_dir_id_by_path(repo_id,
                                                    path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                             'Internal error.')
        if not obj_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'Parent dir not found.')

        ret = []
        qs = FileComment.objects.get_by_parent_path(repo_id, path).values(
            'item_name').annotate(total=Count('item_name'))
        for e in qs:
            ret.append({e['item_name']: e['total']})
        return Response(ret)
'''
>>> print qs.query
SELECT "base_filecomment"."item_name", COUNT("base_filecomment"."item_name") AS "total" FROM "base_filecomment" WHERE "base_filecomment"."repo_id_parent_path_md5" = c80beeeb8e48566a394d000f6c8492ac GROUP BY "base_filecomment"."item_name"
'''
