import logging
import os

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import ccnet_api, seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.utils import api_error

from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email, translate_commit_desc
from seahub.utils import get_file_audit_events, generate_file_audit_event_type, \
    get_file_update_events, get_perm_audit_events, is_valid_email
from seahub.utils.timeutils import datetime_to_isoformat_timestr, utc_datetime_to_isoformat_timestr
from seahub.utils.repo import is_valid_repo_id_format
from seahub.base.models import RepoTransfer, GroupInvite

logger = logging.getLogger(__name__)


class AdminLogsLoginLogs(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):

        """ Get all login logs.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_view_user_log():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        start = (current_page - 1) * per_page
        end = start + per_page

        from seahub.sysadmin_extra.models import UserLoginLog
        logs = UserLoginLog.objects.all().order_by('-login_date')[start:end]
        count = UserLoginLog.objects.all().count()

        # Use dict to reduce memcache fetch cost in large for-loop.
        nickname_dict = {}
        contact_email_dict = {}
        user_email_set = set([log.username for log in logs])
        for e in user_email_set:
            if e not in nickname_dict:
                nickname_dict[e] = email2nickname(e)
            if e not in contact_email_dict:
                contact_email_dict[e] = email2contact_email(e)

        logs_info = []
        for log in logs:
            data = {}
            data['login_time'] = datetime_to_isoformat_timestr(log.login_date)
            data['login_ip'] = log.login_ip
            data['log_success'] = log.login_success
            user_email = log.username
            data['name'] = nickname_dict.get(user_email, '')
            data['email'] = user_email
            data['contact_email'] = contact_email_dict.get(user_email, '')
            logs_info.append(data)

        resp = {
            'login_log_list': logs_info,
            'total_count': count,
        }

        return Response(resp)


class AdminLogsFileAccessLogs(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get all file access logs.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_view_user_log():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        user_selected = request.GET.get('email', None)
        if user_selected and not is_valid_email(user_selected):
            error_msg = 'email %s invalid.' % user_selected
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo_id_selected = request.GET.get('repo_id', None)
        if repo_id_selected and not is_valid_repo_id_format(repo_id_selected):
            error_msg = 'repo_id %s invalid.' % repo_id_selected
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        start = per_page * (current_page - 1)
        limit = per_page + 1

        if user_selected:
            org_id = -1
            orgs = ccnet_api.get_orgs_by_user(user_selected)
            if orgs:
                org_id = orgs[0].org_id
        elif repo_id_selected:
            org_id = seafile_api.get_org_id_by_repo_id(repo_id_selected)
        else:
            org_id = 0

        # org_id = 0, show all file audit
        events = get_file_audit_events(user_selected, org_id, repo_id_selected, start, limit) or []

        if len(events) > per_page:
            events = events[:per_page]
            has_next_page = True
        else:
            has_next_page = False

        # Use dict to reduce memcache fetch cost in large for-loop.
        nickname_dict = {}
        contact_email_dict = {}
        repo_dict = {}
        user_email_set = set()
        repo_id_set = set()

        for event in events:
            user_email_set.add(event.user)
            repo_id_set.add(event.repo_id)

        for e in user_email_set:
            if e not in nickname_dict:
                nickname_dict[e] = email2nickname(e)
            if e not in contact_email_dict:
                contact_email_dict[e] = email2contact_email(e)
        for e in repo_id_set:
            if e not in repo_dict:
                repo_dict[e] = seafile_api.get_repo(e)

        events_info = []
        for ev in events:
            data = {}
            user_email = ev.user
            data['email'] = user_email
            data['name'] = nickname_dict.get(user_email, '')
            data['contact_email'] = contact_email_dict.get(user_email, '')

            data['ip'] = ev.ip
            data['event_type'], data['device'] = generate_file_audit_event_type(ev)
            data['time'] = utc_datetime_to_isoformat_timestr(ev.timestamp)

            repo_id = ev.repo_id
            data['repo_id'] = repo_id
            repo = repo_dict.get(repo_id, None)
            data['repo_name'] = repo.name if repo else ''

            if ev.file_path.endswith('/'):
                data['file_or_dir_name'] = '/' if ev.file_path == '/' else os.path.basename(ev.file_path.rstrip('/'))
            else:
                data['file_or_dir_name'] = os.path.basename(ev.file_path)
            events_info.append(data)

        resp = {
            'file_access_log_list': events_info,
            'has_next_page': has_next_page,
        }

        return Response(resp)


class AdminLogsFileUpdateLogs(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get all file update logs.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_view_user_log():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        user_selected = request.GET.get('email', None)
        if user_selected and not is_valid_email(user_selected):
            error_msg = 'email %s invalid.' % user_selected
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo_id_selected = request.GET.get('repo_id', None)
        if repo_id_selected and not is_valid_repo_id_format(repo_id_selected):
            error_msg = 'repo_id %s invalid.' % repo_id_selected
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        start = per_page * (current_page - 1)
        limit = per_page

        # org_id = 0, show all file audit
        events = get_file_update_events(user_selected, 0, repo_id_selected, start, limit) or []

        has_next_page = True if len(events) == per_page else False

        # Use dict to reduce memcache fetch cost in large for-loop.
        nickname_dict = {}
        contact_email_dict = {}
        repo_dict = {}
        user_email_set = set()
        repo_id_set = set()

        for event in events:
            user_email_set.add(event.user)
            repo_id_set.add(event.repo_id)

        for e in user_email_set:
            if e not in nickname_dict:
                nickname_dict[e] = email2nickname(e)
            if e not in contact_email_dict:
                contact_email_dict[e] = email2contact_email(e)
        for e in repo_id_set:
            if e not in repo_dict:
                repo_dict[e] = seafile_api.get_repo(e)

        events_info = []
        for ev in events:
            data = {}
            user_email = ev.user
            data['email'] = user_email
            data['name'] = nickname_dict.get(user_email, '')
            data['contact_email'] = contact_email_dict.get(user_email, '')
            data['time'] = utc_datetime_to_isoformat_timestr(ev.timestamp)

            repo_id = ev.repo_id
            data['repo_id'] = repo_id
            repo = repo_dict.get(repo_id, None)
            data['repo_name'] = repo.name if repo else ''
            data['repo_encrypted'] = repo.encrypted if repo else None
            data['file_operation'] = translate_commit_desc(ev.file_oper)
            data['commit_id'] = ev.commit_id
            events_info.append(data)

        resp = {
            'file_update_log_list': events_info,
            'has_next_page': has_next_page,
        }

        return Response(resp)


class AdminLogsSharePermissionLogs(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get all share permissions logs.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_view_user_log():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        user_selected = request.GET.get('email', None)
        if user_selected and not is_valid_email(user_selected):
            error_msg = 'email %s invalid.' % user_selected
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo_id_selected = request.GET.get('repo_id', None)
        if repo_id_selected and not is_valid_repo_id_format(repo_id_selected):
            error_msg = 'repo_id %s invalid.' % repo_id_selected
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        start = per_page * (current_page - 1)
        limit = per_page

        # org_id = 0, show all file audit
        events = get_perm_audit_events(user_selected, 0, repo_id_selected, start, limit) or []

        has_next_page = True if len(events) == per_page else False

        # Use dict to reduce memcache fetch cost in large for-loop.
        from_nickname_dict = {}
        from_contact_email_dict = {}
        to_nickname_dict = {}
        to_contact_email_dict = {}
        repo_dict = {}
        to_group_name_dict = {}

        from_user_email_set = set()
        to_user_email_set = set()
        repo_id_set = set()
        to_group_id_set = set()
        department_set = set()

        for event in events:

            from_user_email_set.add(event.from_user)
            repo_id_set.add(event.repo_id)

            if is_valid_email(event.to):
                to_user_email_set.add(event.to)

            if event.to.isdigit():
                to_group_id_set.add(event.to)

        for e in from_user_email_set:
            if e not in from_nickname_dict:
                from_nickname_dict[e] = email2nickname(e)
            if e not in from_contact_email_dict:
                from_contact_email_dict[e] = email2contact_email(e)

        for e in to_user_email_set:
            if e not in to_nickname_dict:
                to_nickname_dict[e] = email2nickname(e)
            if e not in to_contact_email_dict:
                to_contact_email_dict[e] = email2contact_email(e)

        for e in repo_id_set:
            if e not in repo_dict:
                repo_dict[e] = seafile_api.get_repo(e)

        for group_id in to_group_id_set:
            if group_id not in to_group_name_dict:
                group = ccnet_api.get_group(int(group_id))
                if group:
                    to_group_name_dict[group_id] = group.group_name
                    if group.parent_group_id != 0:
                        department_set.add(group_id)

        events_info = []
        for ev in events:
            data = {}
            from_user_email = ev.from_user
            data['from_user_email'] = from_user_email
            data['from_user_name'] = from_nickname_dict.get(from_user_email, '')
            data['from_user_contact_email'] = from_contact_email_dict.get(from_user_email, '')

            data['etype'] = ev.etype
            data['permission'] = ev.permission

            repo_id = ev.repo_id
            data['repo_id'] = repo_id
            repo = repo_dict.get(repo_id, None)
            data['repo_name'] = repo.name if repo else ''

            data['folder'] = '/' if ev.file_path == '/' else os.path.basename(ev.file_path.rstrip('/'))
            data['date'] = utc_datetime_to_isoformat_timestr(ev.timestamp)

            data['share_type'] = 'all'

            data['to_user_email'] = ''
            data['to_user_name'] = ''
            data['to_user_contact_email'] = ''
            data['to_group_id'] = ''
            data['to_group_name'] = ''

            if is_valid_email(ev.to):
                to_user_email = ev.to
                data['to_user_email'] = to_user_email
                data['to_user_name'] = to_nickname_dict.get(to_user_email, '')
                data['to_user_contact_email'] = to_contact_email_dict.get(to_user_email, '')
                data['share_type'] = 'user'

            if ev.to.isdigit():

                to_group_id = ev.to
                data['to_group_id'] = to_group_id
                data['to_group_name'] = to_group_name_dict.get(to_group_id, '')

                if to_group_id in department_set:
                    data['share_type'] = 'department'
                else:
                    data['share_type'] = 'group'

            events_info.append(data)

        resp = {
            'share_permission_log_list': events_info,
            'has_next_page': has_next_page,
        }

        return Response(resp)


class AdminLogsFileTransferLogs(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get all transfer repo logs.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_view_user_log():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        start = per_page * (current_page - 1)
        limit = per_page

        if start < 0:
            error_msg = 'start invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if limit < 0:
            error_msg = 'limit invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        events = RepoTransfer.objects.all().order_by('-timestamp')[start:start+limit+1]
        if len(events) > limit:
            has_next_page = True
            events = events[:limit]
        else:
            has_next_page = False

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
                    
        events_info = []
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

            events_info.append(data)

        resp = {
            'repo_transfer_log_list': events_info,
            'has_next_page': has_next_page,
        }

        return Response(resp)


class AdminLogsGroupInviteLogs(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get all group invite logs.

        Permission checking:
        1. only admin can perform this action.
        """
        if not request.user.admin_permissions.can_view_user_log():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        start = per_page * (current_page - 1)
        limit = per_page

        if start < 0:
            error_msg = 'start invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if limit < 0:
            error_msg = 'limit invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        events = GroupInvite.objects.all().order_by('-timestamp')[start:start+limit+1]
        if len(events) > limit:
            has_next_page = True
            events = events[:limit]
        else:
            has_next_page = False

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
        

        events_info = []
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
            data['date'] = datetime_to_isoformat_timestr(ev.timestamp)

            data['operation'] = ev.operation
            data['group_id'] = ev.group_id
            data['group_name'] = group_name_dict.get(ev.group_id, '')

            events_info.append(data)

        resp = {
            'group_invite_log_list': events_info,
            'has_next_page': has_next_page,
        }
        return Response(resp)
