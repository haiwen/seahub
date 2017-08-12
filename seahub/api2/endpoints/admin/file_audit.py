# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.endpoints.utils import check_time_period_valid, \
    get_log_events_by_type_and_time

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.utils import api_error

from seahub.api2.endpoints.utils import get_user_name_dict, \
        get_user_contact_email_dict

from seahub.utils.timeutils import datetime_to_isoformat_timestr

logger = logging.getLogger(__name__)


class FileAudit(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):

        # check the date format, should be like '2015-10-10'
        start = request.GET.get('start', None)
        end = request.GET.get('end', None)

        if not check_time_period_valid(start, end):
            error_msg = 'start or end date invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            events = get_log_events_by_type_and_time('file_audit', start, end)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = []
        if events:

            # get name/contact_email dict for events user/repo_owner
            ev_user_list = []
            ev_repo_owner_list = []
            for ev in events:
                repo_id = ev.repo_id
                repo = seafile_api.get_repo(repo_id)

                if repo:
                    ev.repo_name = repo.name
                    ev.repo_owner = seafile_api.get_repo_owner(repo_id) or \
                            seafile_api.get_org_repo_owner(repo_id)
                else:
                    ev.repo_name = ''
                    ev.repo_owner = ''

                ev_user_list.append(ev.user)
                ev_repo_owner_list.append(ev.repo_owner)

            ev_user_name_dict = get_user_name_dict(ev_user_list)
            ev_user_contact_email_dict = get_user_contact_email_dict(ev_user_list)
            ev_repo_owner_name_dict = get_user_name_dict(ev_repo_owner_list)
            ev_repo_owner_contact_email_dict = get_user_contact_email_dict(ev_repo_owner_list)

            for ev in events:
                result.append({
                    'repo_id': ev.repo_id,
                    'repo_name': ev.repo_name,

                    'repo_owner_email': ev.repo_owner,
                    'repo_owner_name': ev_repo_owner_name_dict[ev.repo_owner],
                    'repo_owner_contact_email': ev_repo_owner_contact_email_dict[ev.repo_owner],

                    'time': datetime_to_isoformat_timestr(ev.timestamp),
                    'ip': ev.ip,
                    'file_path': ev.file_path,
                    'etype': ev.etype,

                    'user_email': ev.user,
                    'user_name': ev_user_name_dict[ev.user],
                    'user_contact_email': ev_user_contact_email_dict[ev.user],
                })

        return Response(result)
