# Copyright (c) 2012-2016 Seafile Ltd.
import os
import json
import stat
import logging
import posixpath

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.contrib.auth.hashers import check_password

from seaserv import seafile_api
import seaserv

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.share.models import FileShare
from seahub.utils import gen_file_get_url, gen_dir_zip_download_url, \
        is_windows_operating_system, gen_shared_link
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, \
        datetime_to_isoformat_timestr
from seahub.views.file import send_file_access_msg

logger = logging.getLogger(__name__)

def get_share_link_info(fileshare):
    data = {}
    token = fileshare.token

    repo_id = fileshare.repo_id
    try:
        repo = seafile_api.get_repo(repo_id)
    except Exception as e:
        logger.error(e)
        repo = None

    path = fileshare.path
    if path:
        obj_name = '/' if path == '/' else os.path.basename(path.rstrip('/'))
    else:
        obj_name = ''

    if fileshare.expire_date:
        expire_date = datetime_to_isoformat_timestr(fileshare.expire_date)
    else:
        expire_date = ''

    if fileshare.ctime:
        ctime = datetime_to_isoformat_timestr(fileshare.ctime)
    else:
        ctime = ''

    ccnet_email = fileshare.username
    data['creator_email'] = ccnet_email
    data['creator_name'] = email2nickname(ccnet_email)
    data['creator_contact_email'] = email2contact_email(ccnet_email)

    data['repo_id'] = repo_id
    data['repo_name'] = repo.repo_name if repo else ''

    data['path'] = path
    data['obj_name'] = obj_name
    data['is_dir'] = True if fileshare.s_type == 'd' else False

    data['token'] = token
    data['link'] = gen_shared_link(token, fileshare.s_type)
    data['view_cnt'] = fileshare.view_cnt
    data['ctime'] = ctime
    data['expire_date'] = expire_date
    data['is_expired'] = fileshare.is_expired()
    data['permissions'] = fileshare.get_permissions()

    if fileshare.s_type == 'f':
        obj_id = seafile_api.get_file_id_by_path(repo_id, path)
        data['size'] = seafile_api.get_file_size(repo.store_id,
                repo.version, obj_id)

    return data


class AdminShareLink(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, token):
        """ Get a special share link info.

        Permission checking:
        1. only admin can perform this action.
        """

        try:
            sharelink = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Share link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        link_info = get_share_link_info(sharelink)
        return Response(link_info)


class AdminShareLinkDirents(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, token):
        """ Get dirents of shared download dir.

        Permission checking:
        1. only admin can perform this action.
        """

        try:
            sharelink = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Share link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = sharelink.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        obj_path = sharelink.path
        obj_id = seafile_api.get_dir_id_by_path(repo_id, obj_path)
        if not obj_id:
            error_msg = 'Folder not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        req_path = request.GET.get('path', '/')

        if req_path == '/':
            real_path = obj_path
        else:
            real_path = posixpath.join(obj_path, req_path.strip('/'))

        if real_path[-1] != '/':
            real_path += '/'

        real_obj_id = seafile_api.get_dir_id_by_path(repo_id, real_path)
        if not real_obj_id:
            error_msg = 'Folder %s not found.' % req_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            current_commit = seafile_api.get_commit_list(repo_id, 0, 1)[0]
            dirent_list = seafile_api.list_dir_by_commit_and_path(repo_id,
                    current_commit.id, real_path, -1, -1)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = []
        for dirent in dirent_list:
            dirent_info = {}
            dirent_info['obj_name'] = dirent.obj_name
            dirent_info['path'] = posixpath.join(req_path, dirent.obj_name)
            dirent_info['size'] = dirent.size
            dirent_info['last_modified'] = timestamp_to_isoformat_timestr(dirent.mtime)
            if stat.S_ISDIR(dirent.mode):
                dirent_info['is_dir'] = True
            else:
                dirent_info['is_dir'] = False

            result.append(dirent_info)

        return Response(result)


class AdminShareLinkDownload(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, token):
        """ Get FileServer download url of the shared file/dir.

        Permission checking:
        1. only admin can perform this action.
        """

        try:
            sharelink = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Share link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = sharelink.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        result = {}
        obj_path = sharelink.path
        if sharelink.s_type == 'f':
            # download shared file
            obj_id = seafile_api.get_file_id_by_path(repo_id, obj_path)
            if not obj_id:
                error_msg = 'File not found.'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            try:
                # `username` parameter only used for encrypted repo
                download_token = seafile_api.get_fileserver_access_token(repo_id,
                        obj_id, 'download-link', sharelink.username, use_onetime=False)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if not download_token:
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            obj_name = os.path.basename(obj_path.rstrip('/'))
            result['download_link'] = gen_file_get_url(download_token, obj_name)
        else:
            # download (sub) file/folder in shared dir
            obj_id = seafile_api.get_dir_id_by_path(repo_id, obj_path)
            if not obj_id:
                error_msg = 'Folder not found.'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            download_type = request.GET.get('type', None)
            if not download_type or download_type not in ('file', 'folder'):
                error_msg = 'type invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            req_path = request.GET.get('path', None)
            if not req_path:
                error_msg = 'path invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if req_path == '/':
                real_path = obj_path
            else:
                real_path = posixpath.join(obj_path, req_path.strip('/'))

            if download_type == 'file':
                # download sub file in shared dir
                real_obj_id = seafile_api.get_file_id_by_path(repo_id, real_path)
                if not real_obj_id:
                    error_msg = 'File not found.'
                    return api_error(status.HTTP_404_NOT_FOUND, error_msg)

                try:
                    download_token = seafile_api.get_fileserver_access_token(repo_id,
                            real_obj_id, 'download-link', sharelink.username, use_onetime=False)
                except Exception as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

                if not download_token:
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

                file_name = os.path.basename(real_path.rstrip('/'))
                result['download_link'] = gen_file_get_url(download_token, file_name)
            else:
                # download sub folder in shared dir
                if real_path[-1] != '/':
                    real_path += '/'

                real_obj_id = seafile_api.get_dir_id_by_path(repo_id, real_path)
                if not real_obj_id:
                    error_msg = 'Folder %s not found.' % req_path
                    return api_error(status.HTTP_404_NOT_FOUND, error_msg)

                dir_name = repo.name if real_path == '/' else \
                        os.path.basename(real_path.rstrip('/'))

                dir_size = seafile_api.get_dir_size(
                        repo.store_id, repo.version, real_obj_id)
                if dir_size > seaserv.MAX_DOWNLOAD_DIR_SIZE:
                    error_msg = 'Unable to download directory "%s": size is too large.' % dir_name
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                # get file server access token
                is_windows = 0
                if is_windows_operating_system(request):
                    is_windows = 1

                fake_obj_id = {
                    'obj_id': real_obj_id,
                    'dir_name': dir_name,
                    'is_windows': is_windows
                }

                try:
                    zip_token = seafile_api.get_fileserver_access_token(repo_id,
                            json.dumps(fake_obj_id), 'download-dir-link',
                            sharelink.username, use_onetime=False)
                except Exception as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

                try:
                    # used for file audit
                    send_file_access_msg(request, repo, real_path, 'share-link')
                except Exception as e:
                    logger.error(e)

                result['download_link'] = gen_dir_zip_download_url(zip_token)

        return Response(result)


class AdminShareLinkCheckPassword(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, token):
        """ Check if password for an encrypted share link is correct.

        Permission checking:
        1. only admin can perform this action.
        """

        try:
            sharelink = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Share link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not sharelink.is_encrypted():
            error_msg = 'Share link is not encrypted.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        password = request.POST.get('password')
        if not password:
            error_msg = 'password invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if check_password(password, sharelink.password):
            return Response({'success': True})
        else:
            error_msg = 'Password is not correct.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
