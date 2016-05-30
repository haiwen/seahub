import logging
from constance import config
from dateutil.relativedelta import relativedelta

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils import timezone
from django.utils.translation import ugettext as _

from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle

from seahub.share.models import FileShare, OrgFileShare
from seahub.utils import gen_shared_link, is_org_context
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)


def get_share_link_info(fileshare):
    data = {}
    token = fileshare.token

    data['repo_id'] = fileshare.repo_id
    data['path'] = fileshare.path
    data['ctime'] = fileshare.ctime
    data['view_cnt'] = fileshare.view_cnt
    data['link'] = gen_shared_link(token, fileshare.s_type)
    data['token'] = token
    data['expire_date'] = fileshare.expire_date
    data['is_expired'] = fileshare.is_expired()
    data['username'] = fileshare.username

    return data

class ShareLinks(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def _can_generate_shared_link(self, request):

        return request.user.permissions.can_generate_shared_link()

    def _generate_obj_id_and_type_by_path(self, repo_id, path):

        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if file_id:
            return (file_id, 'f')

        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if dir_id:
            return (dir_id, 'd')

        return (None, None)

    def get(self, request):
        """ get share links.
        """

        if not self._can_generate_shared_link(request):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check if args invalid
        repo_id = request.GET.get('repo_id', None)
        if repo_id:
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                error_msg = 'Library %s not found.' % repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # repo level permission check
            if not check_folder_permission(request, repo_id, '/'):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        path = request.GET.get('path', None)
        if path:
            try:
                obj_id, s_type = self._generate_obj_id_and_type_by_path(repo_id, path)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if not obj_id:
                if s_type == 'f':
                    error_msg = 'file %s not found.' % path
                elif s_type == 'd':
                    error_msg = 'folder %s not found.' % path
                else:
                    error_msg = 'path %s not found.' % path

                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # folder/path permission check
            if not check_folder_permission(request, repo_id, path):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        fileshares = FileShare.objects.filter(username=username)

        # filter result by args
        if repo_id:
            fileshares = filter(lambda fs: fs.repo_id == repo_id, fileshares)

        if path:
            if s_type == 'd' and path[-1] != '/':
                path = path + '/'

            fileshares = filter(lambda fs: fs.path == path, fileshares)

        result = []
        for fs in fileshares:
            link_info = get_share_link_info(fs)
            result.append(link_info)

        if len(result) == 1:
            result = result[0]

        return Response(result)

    def post(self, request):
        """ create share link.
        """

        if not self._can_generate_shared_link(request):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = request.data.get('repo_id', None)
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.data.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            obj_id, s_type = self._generate_obj_id_and_type_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not obj_id:
            if s_type == 'f':
                error_msg = 'file %s not found.' % path
            elif s_type == 'd':
                error_msg = 'folder %s not found.' % path
            else:
                error_msg = 'path %s not found.' % path

            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, path):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        password = request.data.get('password', None)
        if password and len(password) < config.SHARE_LINK_PASSWORD_MIN_LENGTH:
            error_msg = _('Password is too short.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            expire_days = int(request.data.get('expire_days', 0))
        except ValueError:
            expire_days = 0

        if expire_days <= 0:
            expire_date = None
        else:
            expire_date = timezone.now() + relativedelta(days=expire_days)

        username = request.user.username
        if s_type == 'f':
            fs = FileShare.objects.get_file_link_by_path(username, repo_id, path)
            if not fs:
                fs = FileShare.objects.create_file_link(username, repo_id, path,
                                                        password, expire_date)
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    OrgFileShare.objects.set_org_file_share(org_id, fs)

        elif s_type == 'd':
            fs = FileShare.objects.get_dir_link_by_path(username, repo_id, path)
            if not fs:
                fs = FileShare.objects.create_dir_link(username, repo_id, path,
                                                        password, expire_date)
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    OrgFileShare.objects.set_org_file_share(org_id, fs)

        link_info = get_share_link_info(fs)
        return Response(link_info)

class ShareLink(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def _can_generate_shared_link(self, request):

        return request.user.permissions.can_generate_shared_link()

    def get(self, request, token):
        try:
            fs = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'token %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        link_info = get_share_link_info(fs)
        return Response(link_info)

    def delete(self, request, token):
        """ delete share link.
        """

        if not self._can_generate_shared_link(request):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            fs = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'token %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        if not fs.is_owner(username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            fs.delete()
            return Response({'success': True})
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
