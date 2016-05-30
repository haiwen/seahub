import logging
from constance import config

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils.translation import ugettext as _

from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle

from seahub.share.models import UploadLinkShare
from seahub.utils import gen_shared_upload_link
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)

class UploadLinks(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def _can_generate_shared_link(self, request):

        return request.user.permissions.can_generate_shared_link()

    def _get_upload_link_info(self, uls):
        data = {}
        token = uls.token

        data['repo_id'] = uls.repo_id
        data['path'] = uls.path
        data['ctime'] = uls.ctime
        data['link'] = gen_shared_upload_link(token)
        data['token'] = token
        data['username'] = uls.username

        return data

    def get(self, request):
        """ get upload link.
        """

        if not self._can_generate_shared_link(request):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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
                dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if not dir_id:
                error_msg = 'folder %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # folder permission check
            if not check_folder_permission(request, repo_id, path):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        upload_link_shares = UploadLinkShare.objects.filter(username=username)

        # filter result by args
        if repo_id:
            upload_link_shares = filter(lambda ufs: ufs.repo_id == repo_id, upload_link_shares)

        if path:
            if path[-1] != '/':
                path = path + '/'

            upload_link_shares = filter(lambda ufs: ufs.path == path, upload_link_shares)

        result = []
        for uls in upload_link_shares:
            link_info = self._get_upload_link_info(uls)
            result.append(link_info)

        if len(result) == 1:
            result = result[0]

        return Response(result)

    def post(self, request):
        """ create upload link.
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
            dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not dir_id:
            error_msg = 'folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        password = request.data.get('password', None)
        if password and len(password) < config.SHARE_LINK_PASSWORD_MIN_LENGTH:
            error_msg = _('Password is too short')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        user_perm = check_folder_permission(request, repo_id, '/')
        if user_perm != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        uls = UploadLinkShare.objects.get_upload_link_by_path(username, repo_id, path)
        if not uls:
            uls = UploadLinkShare.objects.create_upload_link_share(username,
                repo_id, path, password)

        link_info = self._get_upload_link_info(uls)
        return Response(link_info)

class UploadLink(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def _can_generate_shared_link(self, request):

        return request.user.permissions.can_generate_shared_link()

    def get(self, request, token):
        """ get upload link info.
        """

        try:
            uls = UploadLinkShare.objects.get(token=token)
        except UploadLinkShare.DoesNotExist:
            error_msg = 'token %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        link_info = self._get_upload_link_info(uls)
        return Response(link_info)

    def delete(self, request, token):
        """ delete upload link.
        """

        if not self._can_generate_shared_link(request):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            uls = UploadLinkShare.objects.get(token=token)
        except UploadLinkShare.DoesNotExist:
            error_msg = 'token %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        if not uls.is_owner(username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            uls.delete()
            return Response({'success': True})
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
