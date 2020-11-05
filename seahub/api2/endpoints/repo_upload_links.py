# Copyright (c) 2012-2016 Seafile Ltd.
import os
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

from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.share.models import UploadLinkShare
from seahub.utils import gen_shared_upload_link
from seahub.utils.repo import is_repo_admin
from seahub.utils.timeutils import datetime_to_isoformat_timestr

logger = logging.getLogger(__name__)

def get_upload_link_info(upload_link):

    data = {}
    token = upload_link.token

    path = upload_link.path
    if path:
        obj_name = '/' if path == '/' else os.path.basename(path.rstrip('/'))
    else:
        obj_name = ''

    if upload_link.ctime:
        ctime = datetime_to_isoformat_timestr(upload_link.ctime)
    else:
        ctime = ''

    if upload_link.expire_date:
        expire_date = datetime_to_isoformat_timestr(upload_link.expire_date)
    else:
        expire_date = ''

    creator_email = upload_link.username
    data['creator_email'] = creator_email
    data['creator_name'] = email2nickname(creator_email)
    data['creator_contact_email'] = email2contact_email(creator_email)

    data['path'] = path
    data['obj_name'] = obj_name
    data['token'] = token
    data['link'] = gen_shared_upload_link(token)
    data['ctime'] = ctime
    data['expire_date'] = expire_date

    return data


class RepoUploadLinks(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        """ Get all upload links of a repo.

        Permission checking:
        1. repo owner or admin;
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_repo_admin(username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        upload_links = UploadLinkShare.objects.filter(repo_id=repo_id)

        result = []
        for upload_link in upload_links:
            link_info = get_upload_link_info(upload_link)
            link_info['repo_id'] = repo_id
            link_info['repo_name'] = repo.name
            result.append(link_info)

        return Response(result)


class RepoUploadLink(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, repo_id, token):
        """ Delete upload link.

        Permission checking:
        1. repo owner or admin;
        """

        # resource check
        try:
            upload_link = UploadLinkShare.objects.get(token=token)
        except UploadLinkShare.DoesNotExist:
            error_msg = 'Upload link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_repo_admin(username, upload_link.repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            upload_link.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
