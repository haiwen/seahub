# Copyright (c) 2012-2016 Seafile Ltd.
import os
import stat
import logging

import dateutil.parser
from dateutil.relativedelta import relativedelta
from constance import config
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils import timezone
from django.utils.timezone import get_current_timezone
from django.utils.translation import gettext as _

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import CanGenerateShareLink
from seahub.constants import PERMISSION_READ_WRITE, PERMISSION_READ, PERMISSION_PREVIEW_EDIT, PERMISSION_PREVIEW
from seahub.share.models import FileShare
from seahub.utils import is_org_context, get_password_strength_level, \
        is_valid_password, gen_shared_link
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.utils.repo import parse_repo_perm
from seahub.settings import SHARE_LINK_EXPIRE_DAYS_MAX, SHARE_LINK_EXPIRE_DAYS_MIN, SHARE_LINK_EXPIRE_DAYS_DEFAULT
from seahub.views.file import can_edit_file
from seahub.api2.endpoints.share_links import get_share_link_info, check_permissions_arg

logger = logging.getLogger(__name__)


class MultiShareLinks(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateShareLink)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
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
        if config.SHARE_LINK_FORCE_USE_PASSWORD and not password:
            error_msg = _('Password is required.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if password:
            if len(password) < config.SHARE_LINK_PASSWORD_MIN_LENGTH:
                error_msg = _('Password is too short.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if get_password_strength_level(password) < config.SHARE_LINK_PASSWORD_STRENGTH_LEVEL:
                error_msg = _('Password is too weak.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if not is_valid_password(password):
                error_msg = _('Password can only contain number, upper letter, lower letter and other symbols.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        expire_days = request.data.get('expire_days', '')
        expiration_time = request.data.get('expiration_time', '')
        if expire_days and expiration_time:
            error_msg = 'Can not pass expire_days and expiration_time at the same time.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        expire_date = None
        if expire_days:
            try:
                expire_days = int(expire_days)
            except ValueError:
                error_msg = 'expire_days invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if expire_days <= 0:
                error_msg = 'expire_days invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if SHARE_LINK_EXPIRE_DAYS_MIN > 0:
                if expire_days < SHARE_LINK_EXPIRE_DAYS_MIN:
                    error_msg = _('Expire days should be greater or equal to %s') % SHARE_LINK_EXPIRE_DAYS_MIN
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if SHARE_LINK_EXPIRE_DAYS_MAX > 0:
                if expire_days > SHARE_LINK_EXPIRE_DAYS_MAX:
                    error_msg = _('Expire days should be less than or equal to %s') % SHARE_LINK_EXPIRE_DAYS_MAX
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            expire_date = timezone.now() + relativedelta(days=expire_days)

        elif expiration_time:
            try:
                expire_date = dateutil.parser.isoparse(expiration_time)
            except Exception as e:
                logger.error(e)
                error_msg = 'expiration_time invalid, should be iso format, for example: 2020-05-17T10:26:22+08:00'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            expire_date = expire_date.astimezone(get_current_timezone()).replace(tzinfo=None)

            if SHARE_LINK_EXPIRE_DAYS_MIN > 0:
                expire_date_min_limit = timezone.now() + relativedelta(days=SHARE_LINK_EXPIRE_DAYS_MIN)
                expire_date_min_limit = expire_date_min_limit.replace(hour=0).replace(minute=0).replace(second=0)

                if expire_date < expire_date_min_limit:
                    error_msg = _('Expiration time should be later than %s.') % \
                                expire_date_min_limit.strftime("%Y-%m-%d %H:%M:%S")
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if SHARE_LINK_EXPIRE_DAYS_MAX > 0:
                expire_date_max_limit = timezone.now() + relativedelta(days=SHARE_LINK_EXPIRE_DAYS_MAX)
                expire_date_max_limit = expire_date_max_limit.replace(hour=23).replace(minute=59).replace(second=59)

                if expire_date > expire_date_max_limit:
                    error_msg = _('Expiration time should be earlier than %s.') % \
                                expire_date_max_limit.strftime("%Y-%m-%d %H:%M:%S")
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        else:
            if SHARE_LINK_EXPIRE_DAYS_DEFAULT > 0:
                expire_date = timezone.now() + relativedelta(days=SHARE_LINK_EXPIRE_DAYS_DEFAULT)

        try:
            perm = check_permissions_arg(request)
        except Exception as e:
            logger.error(e)
            error_msg = 'permissions invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        dirent = None
        if path != '/':
            dirent = seafile_api.get_dirent_by_path(repo_id, path)
            if not dirent:
                error_msg = 'Dirent %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if repo.encrypted:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        repo_folder_permission = seafile_api.check_permission_by_path(repo_id, path, username)
        if parse_repo_perm(repo_folder_permission).can_generate_share_link is False:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if repo_folder_permission in (PERMISSION_PREVIEW_EDIT, PERMISSION_PREVIEW) \
                and perm != FileShare.PERM_VIEW_ONLY:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if repo_folder_permission in (PERMISSION_READ, ) \
                and perm not in (FileShare.PERM_VIEW_DL, FileShare.PERM_VIEW_ONLY):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # can_upload requires rw repo permission
        if perm == FileShare.PERM_VIEW_DL_UPLOAD and \
                repo_folder_permission != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if path != '/':
            s_type = 'd' if stat.S_ISDIR(dirent.mode) else 'f'
            if s_type == 'f':
                file_name = os.path.basename(path.rstrip('/'))
                can_edit, error_msg = can_edit_file(file_name, dirent.size, repo)
                if not can_edit and perm in (FileShare.PERM_EDIT_DL, FileShare.PERM_EDIT_ONLY):
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        else:
            s_type = 'd'

        # create share link
        org_id = request.user.org.org_id if is_org_context(request) else None
        if s_type == 'f':
            fs = FileShare.objects.create_file_link(username, repo_id, path,
                                                    password, expire_date,
                                                    permission=perm, org_id=org_id)

        else:
            fs = FileShare.objects.create_dir_link(username, repo_id, path,
                                                   password, expire_date,
                                                   permission=perm, org_id=org_id)

        link_info = get_share_link_info(fs)
        return Response(link_info)


class MultiShareLinksBatch(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateShareLink)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """ Create multi share link.
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

        share_link_num = request.data.get('number')
        if not share_link_num:
            error_msg = 'number invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            share_link_num = int(share_link_num)
        except ValueError:
            error_msg = 'number invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if share_link_num <= 0:
            error_msg = 'number invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        auto_generate_password = request.data.get('auto_generate_password')
        if not auto_generate_password:
            error_msg = 'auto_generate_password invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        auto_generate_password = auto_generate_password.lower()
        if auto_generate_password not in ('true', 'false'):
            error_msg = 'auto_generate_password invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        auto_generate_password = auto_generate_password == 'true'

        if config.SHARE_LINK_FORCE_USE_PASSWORD and not auto_generate_password:
            error_msg = _('Password is required.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        expire_days = request.data.get('expire_days', '')
        expiration_time = request.data.get('expiration_time', '')
        if expire_days and expiration_time:
            error_msg = 'Can not pass expire_days and expiration_time at the same time.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        expire_date = None
        if expire_days:
            try:
                expire_days = int(expire_days)
            except ValueError:
                error_msg = 'expire_days invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if expire_days <= 0:
                error_msg = 'expire_days invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

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

            expire_date = timezone.now() + relativedelta(days=expire_days)

        elif expiration_time:

            try:
                expire_date = dateutil.parser.isoparse(expiration_time)
            except Exception as e:
                logger.error(e)
                error_msg = 'expiration_time invalid, should be iso format, for example: 2020-05-17T10:26:22+08:00'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            expire_date = expire_date.astimezone(get_current_timezone()).replace(tzinfo=None)

            if SHARE_LINK_EXPIRE_DAYS_MIN > 0:
                expire_date_min_limit = timezone.now() + relativedelta(days=SHARE_LINK_EXPIRE_DAYS_MIN)
                expire_date_min_limit = expire_date_min_limit.replace(hour=0).replace(minute=0).replace(second=0)

                if expire_date < expire_date_min_limit:
                    error_msg = _('Expiration time should be later than %s.') % \
                            expire_date_min_limit.strftime("%Y-%m-%d %H:%M:%S")
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if SHARE_LINK_EXPIRE_DAYS_MAX > 0:
                expire_date_max_limit = timezone.now() + relativedelta(days=SHARE_LINK_EXPIRE_DAYS_MAX)
                expire_date_max_limit = expire_date_max_limit.replace(hour=23).replace(minute=59).replace(second=59)

                if expire_date > expire_date_max_limit:
                    error_msg = _('Expiration time should be earlier than %s.') % \
                            expire_date_max_limit.strftime("%Y-%m-%d %H:%M:%S")
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        else:
            if SHARE_LINK_EXPIRE_DAYS_DEFAULT > 0:
                expire_date = timezone.now() + relativedelta(days=SHARE_LINK_EXPIRE_DAYS_DEFAULT)

        try:
            perm = check_permissions_arg(request)
        except Exception:
            error_msg = 'permissions invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if path != '/':
            dirent = seafile_api.get_dirent_by_path(repo_id, path)
            if not dirent:
                error_msg = 'Dirent %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if repo.encrypted:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        repo_folder_permission = seafile_api.check_permission_by_path(repo_id, path, username)
        if parse_repo_perm(repo_folder_permission).can_generate_share_link is False:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if repo_folder_permission in (PERMISSION_PREVIEW_EDIT, PERMISSION_PREVIEW) \
                and perm != FileShare.PERM_VIEW_ONLY:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if repo_folder_permission in (PERMISSION_READ) \
                and perm not in (FileShare.PERM_VIEW_DL, FileShare.PERM_VIEW_ONLY):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # can_upload requires rw repo permission
        if perm == FileShare.PERM_VIEW_DL_UPLOAD and \
                repo_folder_permission != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if path != '/':
            s_type = 'd' if stat.S_ISDIR(dirent.mode) else 'f'
            if s_type == 'f':
                file_name = os.path.basename(path.rstrip('/'))
                can_edit, error_msg = can_edit_file(file_name, dirent.size, repo)
                if not can_edit and perm in (FileShare.PERM_EDIT_DL, FileShare.PERM_EDIT_ONLY):
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        else:
            s_type = 'd'

        # create share link
        org_id = request.user.org.org_id if is_org_context(request) else None

        def generate_password():
            import random
            import string
            password_length = 8
            characters = string.ascii_letters + string.digits + string.punctuation
            password = ''.join(random.choices(characters, k=password_length))
            return password

        created_share_links = []
        for i in range(share_link_num):
            password = generate_password() if auto_generate_password else None
            if s_type == 'f':
                fs = FileShare.objects.create_file_link(username, repo_id, path,
                                                        password, expire_date,
                                                        permission=perm, org_id=org_id)

            elif s_type == 'd':
                fs = FileShare.objects.create_dir_link(username, repo_id, path,
                                                       password, expire_date,
                                                       permission=perm, org_id=org_id)

            created_share_links.append(fs)

        links_info = []
        for fs in created_share_links:

            token = fs.token

            link_info = {}
            link_info['username'] = username
            link_info['repo_id'] = repo_id
            link_info['repo_name'] = repo.repo_name

            if path:
                obj_name = '/' if path == '/' else os.path.basename(path.rstrip('/'))
            else:
                obj_name = ''

            link_info['path'] = path
            link_info['obj_name'] = obj_name
            link_info['is_dir'] = True if s_type == 'd' else False
            link_info['token'] = token
            link_info['link'] = gen_shared_link(token, s_type)
            link_info['ctime'] = datetime_to_isoformat_timestr(fs.ctime) if fs.ctime else ''
            link_info['expire_date'] = datetime_to_isoformat_timestr(fs.expire_date) if fs.expire_date else ''
            link_info['permissions'] = fs.get_permissions()
            link_info['password'] = fs.get_password()
            links_info.append(link_info)

        return Response(links_info)
