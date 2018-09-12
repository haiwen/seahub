# Copyright (c) 2012-2016 Seafile Ltd.
import os
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
from seahub.api2.throttling import AnonRateThrottle, UserRateThrottle
from seahub.api2.permissions import CanGenerateUploadLink

from seahub.share.models import UploadLinkShare
from seahub.utils import gen_shared_upload_link, gen_file_upload_url
from seahub.views import check_folder_permission
from seahub.utils.timeutils import datetime_to_isoformat_timestr

logger = logging.getLogger(__name__)

def get_upload_link_info(uls):
    data = {}
    token = uls.token

    repo_id = uls.repo_id
    try:
        repo = seafile_api.get_repo(repo_id)
    except Exception as e:
        logger.error(e)
        repo = None

    path = uls.path
    if path:
        obj_name = '/' if path == '/' else os.path.basename(path.rstrip('/'))
    else:
        obj_name = ''

    if uls.ctime:
        ctime = datetime_to_isoformat_timestr(uls.ctime)
    else:
        ctime = ''

    data['repo_id'] = repo_id
    data['repo_name'] = repo.repo_name if repo else ''
    data['path'] = path
    data['obj_name'] = obj_name
    data['view_cnt'] = uls.view_cnt
    data['ctime'] = ctime
    data['link'] = gen_shared_upload_link(token)
    data['token'] = token
    data['username'] = uls.username

    return data


class UploadLinks(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateUploadLink)
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """ Get all upload links of a user.

        Permission checking:
        1. default(NOT guest) user;
        """

        # get all upload links
        username = request.user.username
        upload_link_shares = UploadLinkShare.objects.filter(username=username)

        repo_id = request.GET.get('repo_id', None)
        if repo_id:
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                error_msg = 'Library %s not found.' % repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # filter share links by repo
            upload_link_shares = filter(lambda ufs: ufs.repo_id==repo_id, upload_link_shares)

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

                if path[-1] != '/':
                    path = path + '/'

                # filter share links by path
                upload_link_shares = filter(lambda ufs: ufs.path==path, upload_link_shares)

        result = []
        for uls in upload_link_shares:
            link_info = get_upload_link_info(uls)
            result.append(link_info)

        if len(result) == 1:
            result = result
        else:
            result.sort(lambda x, y: cmp(x['obj_name'], y['obj_name']))

        return Response(result)

    def post(self, request):
        """ Create upload link.

        Permission checking:
        1. default(NOT guest) user;
        2. user with 'rw' permission;
        """

        # argument check
        repo_id = request.data.get('repo_id', None)
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = request.data.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        password = request.data.get('password', None)
        if password and len(password) < config.SHARE_LINK_PASSWORD_MIN_LENGTH:
            error_msg = _('Password is too short')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not dir_id:
            error_msg = 'folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if check_folder_permission(request, repo_id, path) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        uls = UploadLinkShare.objects.get_upload_link_by_path(username, repo_id, path)
        if not uls:
            uls = UploadLinkShare.objects.create_upload_link_share(username,
                repo_id, path, password)

        link_info = get_upload_link_info(uls)
        return Response(link_info)

class UploadLink(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateUploadLink)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, token):
        """ Get upload link info.

        Permission checking:
        1. default(NOT guest) user;
        """

        try:
            uls = UploadLinkShare.objects.get(token=token)
        except UploadLinkShare.DoesNotExist:
            error_msg = 'token %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        link_info = get_upload_link_info(uls)
        return Response(link_info)

    def delete(self, request, token):
        """ Delete upload link.

        Permission checking:
        1. default(NOT guest) user;
        2. link owner;
        """

        try:
            uls = UploadLinkShare.objects.get(token=token)
        except UploadLinkShare.DoesNotExist:
            return Response({'success': True})

        username = request.user.username
        if not uls.is_owner(username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            uls.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class UploadLinkUpload(APIView):

    throttle_classes = (AnonRateThrottle, )

    def get(self, request, token):
        """ Get file upload url according to upload link token.

        Permission checking:
        1. anyone has the upload link token can perform this action;
        """

        try:
            uls = UploadLinkShare.objects.get(token=token)
        except UploadLinkShare.DoesNotExist:
            error_msg = 'token %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # currently not support encrypted upload link
        if uls.is_encrypted():
            error_msg = 'Upload link %s is encrypted.' % token
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = uls.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = uls.path
        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if repo.encrypted or \
                seafile_api.check_permission_by_path(repo_id, '/', uls.username) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        token = seafile_api.get_fileserver_access_token(repo_id,
                dir_id, 'upload-link', uls.username, use_onetime=False)

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = {}
        result['upload_link'] = gen_file_upload_url(token, 'upload-api')
        return Response(result)
