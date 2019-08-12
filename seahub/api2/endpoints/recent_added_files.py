# -*- coding: utf-8 -*-
import logging
from datetime import datetime, timedelta

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from rest_framework import status
from rest_framework.response import Response

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.utils import EVENTS_ENABLED, get_user_activities_by_timestamp
from seahub.api2.utils import api_error
from seahub.drafts.models import Draft


logger = logging.getLogger(__name__)


class RecentAddedFilesView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """get recent added files by date
        """
        if not EVENTS_ENABLED:
            error_msg = 'Events not enabled'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # argument check
        try:
            days = int(request.GET.get('days', 3))
        except ValueError:
            error_msg = 'days invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        delta = timedelta(days=days)
        end = datetime.utcnow()
        start = end - delta

        username = request.user.username

        try:
            events = get_user_activities_by_timestamp(username, start, end)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        recent_added_files = list()
        for event in events:
            if event.op_type != 'create' or event.obj_type != 'file':
                continue

            file_dict = dict(repo_id=event.repo_id)
            file_dict['path'] = event.path
            file_dict['added_time'] = event.timestamp

            if event.path.endswith('(draft).md'):
                try:
                    draft = Draft.objects.filter(
                        username=event.op_user,
                        origin_repo_id=event.repo_id,
                        draft_file_path=event.path
                    )
                    if draft:
                        draft = draft[0]
                        file_dict['draft_id'] = draft.id
                    else:
                        logger.warning('draft %s not found' % event.path)
                except Draft.DoesNotExist:
                    pass

            recent_added_files.append(file_dict)

        return Response({'recent_added_files': recent_added_files})
