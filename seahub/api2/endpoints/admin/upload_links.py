# Copyright (c) 2012-2016 Seafile Ltd.
import os
import json
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

class AdminUploadLinks(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get all upload links.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        order_by = request.GET.get('order_by', '').lower().strip()
        if order_by:
            if order_by not in ('ctime', 'view_cnt'):
                error_msg = 'order_by invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            direction = request.GET.get('direction', 'desc').lower().strip()
            if direction not in ('asc', 'desc'):
                error_msg = 'direction invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        start = (current_page - 1) * per_page
        end = start + per_page

        if order_by:
            if order_by == 'ctime':
                if direction == 'desc':
                    sql_parameter = '-ctime'
                else:
                    sql_parameter = 'ctime'
            else:
                if direction == 'desc':
                    sql_parameter = '-view_cnt'
                else:
                    sql_parameter = 'view_cnt'
            upload_links = UploadLinkShare.objects.all().order_by(sql_parameter)[start:end]
        else:
            upload_links = UploadLinkShare.objects.all().order_by('ctime')[start:end]

        count = UploadLinkShare.objects.all().count()

        # Use dict to reduce memcache fetch cost in large for-loop.
        nickname_dict = {}
        owner_email_set = set([link.username for link in upload_links])
        for e in owner_email_set:
            if e not in nickname_dict:
                nickname_dict[e] = email2nickname(e)

        upload_links_info = []
        for link in upload_links:

            if link.expire_date:
                expire_date = datetime_to_isoformat_timestr(link.expire_date)
            else:
                expire_date = ''

            link_info = {}
            link_info['path'] = link.path
            link_info['token'] = link.token

            owner_email = link.username
            link_info['creator_email'] = owner_email
            link_info['creator_name'] = nickname_dict.get(owner_email, '')
            link_info['ctime'] = datetime_to_isoformat_timestr(link.ctime)
            link_info['view_cnt'] = link.view_cnt
            link_info['expire_date'] = expire_date
            link_info['is_expired'] = link.is_expired()
            upload_links_info.append(link_info)

        return Response({"upload_link_list": upload_links_info, "count": count})


class AdminUploadLink(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, token):
        """ Get a special upload link info.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            uploadlink = UploadLinkShare.objects.get(token=token)
        except UploadLinkShare.DoesNotExist:
            error_msg = 'Upload link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        link_info = get_upload_link_info(uploadlink)
        return Response(link_info)

    def delete(self, request, token):
        """ Remove a special upload link.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            upload_link = UploadLinkShare.objects.get(token=token)
        except UploadLinkShare.DoesNotExist:
            return Response({'success': True})

        try:
            upload_link.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class AdminUploadLinkUpload(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, token):
        """ Get FileServer url of the shared folder.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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
        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if not dir_id:
            error_msg = 'Folder not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        obj_id = json.dumps({'parent_dir': path})
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

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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
