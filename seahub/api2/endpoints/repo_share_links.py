# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from django.utils.translation import ugettext as _

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication

from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.utils import gen_shared_link
from seahub.utils.repo import is_repo_admin
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.wiki.models import Wiki
from seahub.share.models import FileShare

logger = logging.getLogger(__name__)


def get_share_link_info(fileshare):

    data = {}
    token = fileshare.token

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

    creator_email = fileshare.username
    data['creator_email'] = creator_email
    data['creator_name'] = email2nickname(creator_email)
    data['creator_contact_email'] = email2contact_email(creator_email)

    data['path'] = path
    data['obj_name'] = obj_name
    data['is_dir'] = True if fileshare.s_type == 'd' else False

    data['token'] = token
    data['link'] = gen_shared_link(token, fileshare.s_type)
    data['ctime'] = ctime
    data['expire_date'] = expire_date

    return data


class RepoShareLinks(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        """ Get all share links of a repo.

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

        result = []
        fileshares = FileShare.objects.filter(repo_id=repo_id)

        for fileshare in fileshares:
            link_info = get_share_link_info(fileshare)
            link_info['repo_id'] = repo_id
            link_info['repo_name'] = repo.name
            result.append(link_info)

        return Response(result)


class RepoShareLink(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, repo_id, token):
        """ Delete share link.

        Permission checking:
        1. repo owner or admin;
        """

        # resource check
        try:
            fileshare = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Share link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_repo_admin(username, fileshare.repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        has_published_library = False
        if fileshare.path == '/':
            try:
                Wiki.objects.get(repo_id=fileshare.repo_id)
                has_published_library = True
            except Wiki.DoesNotExist:
                pass

        if has_published_library:
            error_msg = _('There is an associated published library.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            fileshare.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
