# Copyright (c) 2012-2016 Seafile Ltd.
import os
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
from seahub.api2.permissions import CanGenerateShareLink

from seahub.share.models import FileShare, OrgFileShare
from seahub.utils import gen_shared_link, is_org_context
from seahub.views import check_folder_permission
from seahub.utils.timeutils import datetime_to_isoformat_timestr

from seahub.settings import SHARE_LINK_EXPIRE_DAYS_MAX, \
        SHARE_LINK_EXPIRE_DAYS_MIN

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

    data['username'] = fileshare.username
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
    return data

class ShareLinks(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateShareLink)
    throttle_classes = (UserRateThrottle,)

    def _generate_obj_id_and_type_by_path(self, repo_id, path):

        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if file_id:
            return (file_id, 'f')

        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if dir_id:
            return (dir_id, 'd')

        return (None, None)

    def _check_permissions_arg(self, request):
        permissions = request.data.get('permissions', None)
        if permissions is not None:
            if isinstance(permissions, dict):
                perm_dict = permissions
            elif isinstance(permissions, basestring):
                import json
                try:
                    perm_dict = json.loads(permissions)
                except ValueError:
                    error_msg = 'permissions invalid: %s' % permissions
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            else:
                error_msg = 'permissions invalid: %s' % permissions
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        else:
            perm_dict = None

        can_download = True
        can_edit = False

        if perm_dict is not None:
            can_download = perm_dict.get('can_download', True)
            can_edit = perm_dict.get('can_edit', False)

        if not can_edit and can_download:
            perm = FileShare.PERM_VIEW_DL

        if not can_edit and not can_download:
            perm = FileShare.PERM_VIEW_ONLY

        if can_edit and can_download:
            perm = FileShare.PERM_EDIT_DL

        if can_edit and not can_download:
            perm = FileShare.PERM_EDIT_ONLY

        return perm

    def get(self, request):
        """ Get all share links of a user.

        Permission checking:
        1. default(NOT guest) user;
        """

        # get all share links
        username = request.user.username
        fileshares = FileShare.objects.filter(username=username)

        repo_id = request.GET.get('repo_id', None)
        if repo_id:
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                error_msg = 'Library %s not found.' % repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # filter share links by repo
            fileshares = filter(lambda fs: fs.repo_id == repo_id, fileshares)

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

                # if path invalid, filter share links by repo
                if s_type == 'd' and path[-1] != '/':
                    path = path + '/'

                fileshares = filter(lambda fs: fs.path == path, fileshares)

        links_info = []
        for fs in fileshares:
            link_info = get_share_link_info(fs)
            links_info.append(link_info)

        if len(links_info) == 1:
            result = links_info
        else:
            dir_list = filter(lambda x: x['is_dir'], links_info)
            file_list = filter(lambda x: not x['is_dir'], links_info)

            dir_list.sort(lambda x, y: cmp(x['obj_name'], y['obj_name']))
            file_list.sort(lambda x, y: cmp(x['obj_name'], y['obj_name']))

            result = dir_list + file_list

        return Response(result)

    def post(self, request):
        """ Create share link.

        Permission checking:
        1. default(NOT guest) user;
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
            error_msg = _('Password is too short.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            expire_days = int(request.data.get('expire_days', 0))
        except ValueError:
            expire_days = 0

        if SHARE_LINK_EXPIRE_DAYS_MIN > 0:
            if expire_days < SHARE_LINK_EXPIRE_DAYS_MIN:
                error_msg = _('Expire days should be greater or equal to %s') % \
                        SHARE_LINK_EXPIRE_DAYS_MIN
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if SHARE_LINK_EXPIRE_DAYS_MAX > 0:
            if expire_days > SHARE_LINK_EXPIRE_DAYS_MAX:
                error_msg = _('Expire days should be less than or equal to %s') % \
                        SHARE_LINK_EXPIRE_DAYS_MAX
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if expire_days <= 0:
            expire_date = None
        else:
            expire_date = timezone.now() + relativedelta(days=expire_days)

        perm = self._check_permissions_arg(request)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if repo.encrypted:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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

        username = request.user.username
        org_id = request.user.org.org_id if is_org_context(request) else None
        if s_type == 'f':
            fs = FileShare.objects.get_file_link_by_path(username, repo_id, path)
            if not fs:
                fs = FileShare.objects.create_file_link(username, repo_id, path,
                                                        password, expire_date,
                                                        permission=perm, org_id=org_id)

        elif s_type == 'd':
            fs = FileShare.objects.get_dir_link_by_path(username, repo_id, path)
            if not fs:
                fs = FileShare.objects.create_dir_link(username, repo_id, path,
                                                       password, expire_date,
                                                       permission=perm, org_id=org_id)

        link_info = get_share_link_info(fs)
        return Response(link_info)

class ShareLink(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateShareLink)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, token):
        """ Get a special share link info.

        Permission checking:
        1. default(NOT guest) user;
        """

        try:
            fs = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'token %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        link_info = get_share_link_info(fs)
        return Response(link_info)

    def delete(self, request, token):
        """ Delete share link.

        Permission checking:
        1. default(NOT guest) user;
        2. link owner;
        """

        try:
            fs = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            return Response({'success': True})

        username = request.user.username
        if not fs.is_owner(username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            fs.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
