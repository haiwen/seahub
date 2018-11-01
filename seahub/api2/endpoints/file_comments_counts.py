# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Count

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.models import FileComment
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)


class FileCommentsCounts(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):
        """Get file comment count.
        """

        # recource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('p', '/')
        if seafile_api.get_dir_id_by_path(repo_id, path):
            is_dir = True
        elif seafile_api.get_file_id_by_path(repo_id, path):
            is_dir = False
        else:
            error_msg = 'Dirent %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if is_dir:
            '''
            SELECT `tags_fileuuidmap`.`filename`, COUNT(`tags_fileuuidmap`.`filename`) AS `total` FROM `base_filecomment` INNER JOIN `tags_fileuuidmap` ON ( `base_filecomment`.`uuid_id` = `tags_fileuuidmap`.`uuid`  ) WHERE (`base_filecomment`.`uuid_id`) IN (SELECT U0.`uuid` FROM `tags_fileuuidmap` U0 WHERE (U0.`parent_path` = '/' AND U0.`repo_id` = '4674c2bb-3702-4dd0-b768-8952db27ac87')) GROUP BY `tags_fileuuidmap`.`filename` ORDER BY NULL LIMIT 21
            '''
            # get comment count of all files in folder
            qs = FileComment.objects.get_by_parent_path(repo_id, path).values(
                    'uuid__filename').annotate(total=Count('uuid__filename'))
            ret = []
            for e in qs:
                ret.append({e['uuid__filename']: e['total']})
        else:
            count = FileComment.objects.get_by_file_path(repo_id, path).count()
            ret = {}
            ret[os.path.basename(path)] = count

        return Response(ret)
