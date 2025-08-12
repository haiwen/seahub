import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication

from seahub.views import check_folder_permission
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.utils.timeutils import utc_datetime_to_isoformat_timestr
from seahub.utils import is_org_context, is_pro_version, \
        FILE_AUDIT_ENABLED, get_file_audit_events_by_path, \
        generate_file_audit_event_type

logger = logging.getLogger(__name__)


class FileAccessLogView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        """ Get file access log.
        """

        if not is_pro_version() or not FILE_AUDIT_ENABLED:
            error_msg = 'feature is not enabled.'
            return api_error(501, error_msg)

        # argument check
        path = request.GET.get('path', '')
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_file_id_by_path(repo_id, path):
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get access log
        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            current_page = 1
            per_page = 25

        offset = per_page * (current_page - 1)

        org_id = 0
        if is_org_context(request):
            org_id = request.user.org.org_id

        events = get_file_audit_events_by_path(None, org_id, repo_id, path,
                                               offset, per_page)

        result = []
        for event in events:

            info = {}

            username = event.user
            url, is_default, date_uploaded = api_avatar_url(username)
            info['avatar_url'] = url
            info['email'] = username
            info['name'] = email2nickname(username)
            info['contact_email'] = email2contact_email(username)

            info['ip'] = event.ip
            info['time'] = utc_datetime_to_isoformat_timestr(event.timestamp)

            # type could be: 'web', 'share-link', 'API', 'download-sync',
            # 'upload-sync', 'seadrive-download'
            event_type, device = generate_file_audit_event_type(event)
            info['etype'] = event_type
            info['device'] = device

            result.append(info)

        return Response({'data': result})
