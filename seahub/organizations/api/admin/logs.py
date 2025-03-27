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
from seahub.base.models import RepoTransfer, GroupMemberAudit
from seahub.utils import EVENTS_ENABLED, get_file_audit_events, get_file_update_events, get_perm_audit_events, is_valid_email
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, datetime_to_isoformat_timestr

from seahub.organizations.api.permissions import IsOrgAdmin
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


class OrgAdminLogsFileTransfer(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdmin)

    def get(self, request):
        """List organization file transfer in logs
        """
        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25

        start = per_page * (page - 1)
        limit = per_page

        org_id = request.user.org.org_id
        events = RepoTransfer.objects.filter(org_id=org_id).all().order_by('-timestamp')[start:start+limit+1]
        if len(events) > limit:
            page_next = True
            events = events[:limit]
        else:
            page_next = False

        event_list = []
        if not events:
            return Response({
                'log_list': event_list,
                'page': page,
                'page_next': False
                })

        # Use dict to reduce memcache fetch cost in large for-loop.
        nickname_dict = {}
        contact_email_dict = {}
        repo_dict = {}
        group_name_dict = {}

        user_email_set = set()
        repo_id_set = set()
        group_id_set = set()

        for event in events:
            repo_id_set.add(event.repo_id)
            if is_valid_email(event.from_user):
                user_email_set.add(event.from_user)
            if is_valid_email(event.to):
                user_email_set.add(event.to)
            if is_valid_email(event.operator):
                user_email_set.add(event.operator)
            if '@seafile_group' in event.to:
                group_id = int(event.to.split('@')[0])
                group_id_set.add(group_id)
            if '@seafile_group' in event.from_user:
                group_id = int(event.from_user.split('@')[0])
                group_id_set.add(group_id)

        for e in user_email_set:
            if e not in nickname_dict:
                nickname_dict[e] = email2nickname(e)
            if e not in contact_email_dict:
                contact_email_dict[e] = email2contact_email(e)
        for e in repo_id_set:
            if e not in repo_dict:
                repo_dict[e] = seafile_api.get_repo(e)

        for group_id in group_id_set:
            if group_id not in group_name_dict:
                group = ccnet_api.get_group(int(group_id))
                if group:
                    group_name_dict[group_id] = group.group_name

        event_list = []
        for ev in events:
            data = {
                'from_user_email': '',
                'from_user_name': '',
                'from_user_contact_email': '',
                'from_group_id': '',
                'from_group_name': '',
                'to_user_email': '',
                'to_user_name': '',
                'to_user_contact_email': '',
                'to_group_id': '',
                'to_group_name': '',
                'operator_email': '',
                'operator_name': '',
                'operator_contact_email': '',
            }
            from_user_email = ev.from_user
            data['from_user_email'] = from_user_email
            data['from_user_name'] = nickname_dict.get(from_user_email, '')
            data['from_user_contact_email'] = contact_email_dict.get(from_user_email, '')

            operator_email = ev.operator
            data['operator_email'] = operator_email
            data['operator_name'] = nickname_dict.get(operator_email, '')
            data['operator_contact_email'] = contact_email_dict.get(operator_email, '')

            if is_valid_email(from_user_email):
                data['from_type'] = 'user'
            if '@seafile_group' in from_user_email:
                from_group_id = int(from_user_email.split('@')[0])
                data['from_group_id'] = from_group_id
                data['from_group_name'] = group_name_dict.get(from_group_id, '')
                data['from_type'] = 'group'

            repo_id = ev.repo_id
            data['repo_id'] = repo_id
            repo = repo_dict.get(repo_id, None)
            data['repo_name'] = repo.name if repo else ''
            data['date'] = datetime_to_isoformat_timestr(ev.timestamp)

            if is_valid_email(ev.to):
                to_user_email = ev.to
                data['to_user_email'] = to_user_email
                data['to_user_name'] = nickname_dict.get(to_user_email, '')
                data['to_user_contact_email'] = contact_email_dict.get(to_user_email, '')
                data['to_type'] = 'user'
            if '@seafile_group' in ev.to:
                to_group_id = int(ev.to.split('@')[0])
                data['to_group_id'] = to_group_id
                data['to_group_name'] = group_name_dict.get(to_group_id, '')
                data['to_type'] = 'group'

            event_list.append(data)

        return Response({
                'log_list': event_list,
                'page': page,
                'page_next': page_next,
                })


class OrgAdminLogsGroupInvite(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdmin)

    def get(self, request):
        """List organization group invite in logs
        """
        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25

        start = per_page * (page - 1)
        limit = per_page

        org_id = request.user.org.org_id
        events = GroupMemberAudit.objects.filter(org_id=org_id).all().order_by('-timestamp')[start:start+limit+1]
        if len(events) > limit:
            page_next = True
            events = events[:limit]
        else:
            page_next = False

        event_list = []
        if not events:
            return Response({
                'log_list': event_list,
                'page': page,
                'page_next': False
                })
        
        # Use dict to reduce memcache fetch cost in large for-loop.
        nickname_dict = {}
        contact_email_dict = {}
        group_name_dict = {}

        user_email_set = set()
        group_id_set = set()

        for event in events:
            if is_valid_email(event.user):
                user_email_set.add(event.user)
            if is_valid_email(event.operator):
                user_email_set.add(event.operator)
            if event.group_id not in group_id_set:
                group_id_set.add(event.group_id)

        for e in user_email_set:
            if e not in nickname_dict:
                nickname_dict[e] = email2nickname(e)
            if e not in contact_email_dict:
                contact_email_dict[e] = email2contact_email(e)

        for group_id in group_id_set:
            if group_id not in group_name_dict:
                group = ccnet_api.get_group(int(group_id))
                if group:
                    group_name_dict[group_id] = group.group_name
        event_list = []
        for ev in events:
            data = {
                'user_email': '',
                'user_name': '',
                'user_contact_email': '',
                'group_id': '',
                'group_name': '',
                'operator_email': '',
                'operator_name': '',
                'operator_contact_email': '',
            }
            user_email = ev.user
            data['user_email'] = user_email
            data['user_name'] = nickname_dict.get(user_email, '')
            data['user_contact_email'] = contact_email_dict.get(user_email, '')

            operator_email = ev.operator
            data['operator_email'] = operator_email
            data['operator_name'] = nickname_dict.get(operator_email, '')
            data['operator_contact_email'] = contact_email_dict.get(operator_email, '')

            data['group_id'] = ev.group_id
            data['group_name'] = group_name_dict.get(ev.group_id, '')
            data['operation'] = ev.operation
            data['date'] = datetime_to_isoformat_timestr(ev.timestamp)

            event_list.append(data)

        return Response({
                'log_list': event_list,
                'page': page,
                'page_next': page_next,
                })
