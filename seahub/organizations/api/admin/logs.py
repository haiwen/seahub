# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import os

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from seaserv import ccnet_api, seafile_api

from seahub.api2.permissions import IsProVersion
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.api2.endpoints.utils import get_user_name_dict, \
    get_user_contact_email_dict, get_repo_dict, get_group_dict

from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.utils import EVENTS_ENABLED, get_file_audit_events, get_file_update_events, get_perm_audit_events
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, datetime_to_isoformat_timestr

from seahub.organizations.api.permissions import IsOrgAdmin
from seahub.organizations.views import org_user_exists
from seahub.organizations.api.utils import update_log_perm_audit_type
logger = logging.getLogger(__name__)


class OrgAdminLogsFileAccess(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdmin)

    def get(self, request):
        """List organization file access in logs
        """

        if not EVENTS_ENABLED:
            error_msg = "Events not enabled."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # Make sure page request is an int. If not, deliver first page.
        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25

        user_selected = request.GET.get('email', None)
        repo_selected = request.GET.get('repo_id', None)

        start = per_page * (page - 1)
        limit = per_page

        org_id = request.user.org.org_id
        events = get_file_audit_events(user_selected, org_id, repo_selected, start, limit)

        event_list = []
        if not events:
            return Response({
                'log_list': event_list,
                'page': page,
                'page_next': False,
                })

        ev_user_list = []
        repo_id_list = []
        for ev in events:
            ev_user_list.append(ev.user)
            repo_id_list.append(ev.repo_id)

        ev_user_name_dict = get_user_name_dict(ev_user_list)
        ev_user_contact_email_dict = get_user_contact_email_dict(ev_user_list)
        ev_repo_dict = get_repo_dict(repo_id_list)

        for ev in events:
            event = {}
            event['type'] = ev.etype
            event['device'] = ev.device
            event['file_name'] = os.path.basename(ev.file_path)
            event['file_path'] = ev.file_path
            event['ip'] = ev.ip
            event['user_email'] = ev.user
            event['user_name'] = ev_user_name_dict[ev.user]
            event['user_contact_email'] = ev_user_contact_email_dict[ev.user]
            event['time'] = datetime_to_isoformat_timestr(ev.timestamp)
            event['repo_id'] = ev.repo_id
            event['repo_name'] = ev_repo_dict[ev.repo_id].name if ev_repo_dict[ev.repo_id] else ''

            event_list.append(event)

        page_next = True if len(events) == per_page else False

        return Response({
            'log_list': event_list,
            'page': page,
            'page_next': page_next,
            })


class OrgAdminLogsFileUpdate(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdmin)

    def get(self, request):
        """List organization file update in logs
        """
        if not EVENTS_ENABLED:
            error_msg = "Events not enabled."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # Make sure page request is an int. If not, deliver first page.
        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25

        user_selected = request.GET.get('email', None)
        repo_selected = request.GET.get('repo_id', None)

        start = per_page * (page - 1)
        limit = per_page

        org_id = request.user.org.org_id
        events = get_file_update_events(user_selected, org_id, repo_selected, start, limit)

        event_list = []

        if not events:
            return Response({
                'log_list': event_list,
                'page': page,
                'page_next': False,
                })

        repo_id_list = []
        ev_user_list = []
        for ev in events:
            ev_user_list.append(ev.user)
            repo_id_list.append(ev.repo_id)
        ev_user_name_dict = get_user_name_dict(ev_user_list)
        ev_user_contact_email_dict = get_user_contact_email_dict(ev_user_list)
        ev_repo_dict = get_repo_dict(repo_id_list)

        for ev in events:
            event = {}
            event['time'] = datetime_to_isoformat_timestr(ev.timestamp)
            event['user_email'] = ev.user
            event['user_name'] = ev_user_name_dict[ev.user]
            event['user_contact_email'] = ev_user_contact_email_dict[ev.user]
            event['description'] = ev.file_oper
            event['repo_encrypted'] = False
            event['repo_commit_id'] = ev.commit_id
            event['repo_id'] = ev.repo_id
            event['repo_name'] = ev_repo_dict[ev.repo_id].name if ev_repo_dict[ev.repo_id] else ''
            event['repo_encrypted'] = ev_repo_dict[ev.repo_id].encrypted if ev_repo_dict[ev.repo_id] else ''

            event_list.append(event)

        page_next = True if len(events) == per_page else False

        return Response({
            'log_list': event_list,
            'page': page,
            'page_next': page_next,
            })


class OrgAdminLogsPermAudit(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdmin)

    def get(self, request):
        """List organization permission audit in logs
        """
        if not EVENTS_ENABLED:
            error_msg = "Events not enabled."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # Make sure page request is an int. If not, deliver first page.
        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25

        user_selected = request.GET.get('email', None)
        repo_selected = request.GET.get('repo_id', None)

        start = per_page * (page - 1)
        limit = per_page

        org_id = request.user.org.org_id
        events = get_perm_audit_events(user_selected, org_id, repo_selected, start, limit)

        event_list = []
        if not events:
            return Response({
                'log_list': event_list,
                'page': page,
                'page_next': False
                })

        ev_user_list = []
        repo_id_list = []
        group_id_list = []
        for ev in events:
            ev_user_list.append(ev.from_user)
            repo_id_list.append(ev.repo_id)

            if '@' in ev.to:
                ev_user_list.append(ev.to)

            if ev.to.isdigit():
                group_id_list.append(ev.to)

        ev_user_name_dict = get_user_name_dict(ev_user_list)
        ev_user_contact_email_dict = get_user_contact_email_dict(ev_user_list)
        ev_repo_dict = get_repo_dict(repo_id_list)
        ev_group_dict = get_group_dict(group_id_list)
        for ev in events:
            event = {}

            event['from_user_email'] = ev.from_user
            event['from_user_name'] = ev_user_name_dict[ev.from_user]
            event['from_user_contact_email'] = ev_user_contact_email_dict[ev.from_user]

            if ev.to.isdigit():
                event['to_group_name'] = ev_group_dict[ev.to].group_name if ev_group_dict[ev.to] else ''
                event['to_group_id'] = ev.to
            elif ev.to == 'all':
                pass
            else:
                event['to_user_email'] = ev.to
                event['to_user_name'] = ev_user_name_dict[ev.to]
                event['to_user_contact_email'] = ev_user_contact_email_dict[ev.to]

            event['type'] = update_log_perm_audit_type(ev)
            event['permission'] = ev.permission

            event['repo_name'] = ev_repo_dict[ev.repo_id].name if ev_repo_dict[ev.repo_id] else ''
            event['repo_id'] = ev.repo_id

            event['folder_name'] = os.path.basename(ev.file_path)
            event['folder_path'] = ev.file_path
            event['time'] = datetime_to_isoformat_timestr(ev.timestamp)

            event_list.append(event)

        page_next = True if len(events) == per_page else False

        return Response({
                'log_list': event_list,
                'page': page,
                'page_next': page_next,
                })
