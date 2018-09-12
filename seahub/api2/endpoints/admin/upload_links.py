# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.contrib.auth.hashers import check_password

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle

from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.utils import gen_file_upload_url, gen_shared_upload_link
from seahub.utils.timeutils import datetime_to_isoformat_timestr

from seahub.share.models import UploadLinkShare

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

    ccnet_email = uls.username
    data['creator_email'] = ccnet_email
    data['creator_name'] = email2nickname(ccnet_email)
    data['creator_contact_email'] = email2contact_email(ccnet_email)

    return data


class AdminUploadLink(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, token):
        """ Get a special upload link info.

        Permission checking:
        1. only admin can perform this action.
        """

        try:
            uploadlink = UploadLinkShare.objects.get(token=token)
        except UploadLinkShare.DoesNotExist:
            error_msg = 'Upload link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        link_info = get_upload_link_info(uploadlink)
        return Response(link_info)


class AdminUploadLinkUpload(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, token):
        """ Get FileServer url of the shared folder.

        Permission checking:
        1. only admin can perform this action.
        """

        try:
            uploadlink = UploadLinkShare.objects.get(token=token)
        except UploadLinkShare.DoesNotExist:
            error_msg = 'Upload link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = uploadlink.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = uploadlink.path
        obj_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if not obj_id:
            error_msg = 'Folder not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        upload_token = seafile_api.get_fileserver_access_token(repo_id,
                obj_id, 'upload-link', uploadlink.username, use_onetime=False)

        if not upload_token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = {}
        result['upload_link'] = gen_file_upload_url(upload_token, 'upload-api')

        return Response(result)

class AdminUploadLinkCheckPassword(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, token):
        """ Check if password for an encrypted upload link is correct.

        Permission checking:
        1. only admin can perform this action.
        """

        try:
            uploadlink = UploadLinkShare.objects.get(token=token)
        except UploadLinkShare.DoesNotExist:
            error_msg = 'Upload link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not uploadlink.is_encrypted():
            error_msg = 'Upload link is not encrypted.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        password = request.POST.get('password')
        if not password:
            error_msg = 'password invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if check_password(password, uploadlink.password):
            return Response({'success': True})
        else:
            error_msg = 'Password is not correct.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
