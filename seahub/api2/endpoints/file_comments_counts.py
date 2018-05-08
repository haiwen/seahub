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
            dir_id = seafile_api.get_dir_id_by_path(repo_id,
                                                    path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                             'Internal error.')
        if not dir_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'Floder %s not found.' % dir_id)

        qs = FileComment.objects.get_by_parent_path(repo_id, path).values(
            'uuid__filename').annotate(total=Count('uuid__filename'))
        '''
        mysql exec:
        SELECT `tags_fileuuidmap`.`filename`, COUNT(`tags_fileuuidmap`.`filename`) AS `total` FROM `base_filecomment` INNER JOIN `tags_fileuuidmap` ON ( `base_filecomment`.`uuid_id` = `tags_fileuuidmap`.`uuid`  ) WHERE (`base_filecomment`.`uuid_id`) IN (SELECT U0.`uuid` FROM `tags_fileuuidmap` U0 WHERE (U0.`parent_path` = '/' AND U0.`repo_id` = '4674c2bb-3702-4dd0-b768-8952db27ac87')) GROUP BY `tags_fileuuidmap`.`filename` ORDER BY NULL LIMIT 21
        '''

        ret = []
        for e in qs:
            ret.append({e['uuid__filename']: e['total']})

        return Response(ret)
