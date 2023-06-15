# Copyright (c) 2012-2016 Seafile Ltd.
import os
import stat
import json
import time
import logging
import posixpath
from constance import config
from dateutil.relativedelta import relativedelta
import dateutil.parser
from collections import defaultdict

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils import timezone
from django.utils.timezone import get_current_timezone
from django.utils.translation import gettext as _
from urllib.parse import quote

from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import CanGenerateShareLink, IsProVersion
from seahub.constants import PERMISSION_READ_WRITE, PERMISSION_READ, \
        PERMISSION_PREVIEW_EDIT, PERMISSION_PREVIEW
from seahub.share.models import FileShare, UploadLinkShare, check_share_link_access
from seahub.utils import gen_shared_link, is_org_context, normalize_file_path, \
        normalize_dir_path, is_pro_version, get_file_type_and_ext, \
        check_filename_with_rename, gen_file_upload_url, \
        get_password_strength_level, is_valid_password
from seahub.utils.file_op import if_locked_by_online_office
from seahub.utils.file_types import IMAGE, VIDEO, XMIND
from seahub.utils.file_tags import get_tagged_files, get_files_tags_in_dir
from seahub.utils.timeutils import datetime_to_isoformat_timestr, \
        timestamp_to_isoformat_timestr
from seahub.utils.repo import parse_repo_perm
from seahub.thumbnail.utils import get_share_link_thumbnail_src
from seahub.settings import SHARE_LINK_EXPIRE_DAYS_MAX, \
        SHARE_LINK_EXPIRE_DAYS_MIN, SHARE_LINK_LOGIN_REQUIRED, \
        SHARE_LINK_EXPIRE_DAYS_DEFAULT, \
        ENABLE_SHARE_LINK_AUDIT, ENABLE_VIDEO_THUMBNAIL, \
        THUMBNAIL_ROOT, ENABLE_UPLOAD_LINK_VIRUS_CHECK
from seahub.wiki.models import Wiki
from seahub.views.file import can_edit_file
from seahub.views import check_folder_permission
from seahub.signals import upload_file_successful
from seahub.repo_tags.models import RepoTags

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

    if repo:
        if fileshare.s_type == 'd':
            folder_path = normalize_dir_path(fileshare.path)
            obj_id = seafile_api.get_dir_id_by_path(repo_id, folder_path)
        else:
            file_path = normalize_file_path(fileshare.path)
            obj_id = seafile_api.get_file_id_by_path(repo_id, file_path)
    else:
        obj_id = ''

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
    data['obj_id'] = obj_id or ""
    data['is_dir'] = True if fileshare.s_type == 'd' else False

    data['token'] = token
    data['link'] = gen_shared_link(token, fileshare.s_type)
    data['view_cnt'] = fileshare.view_cnt
    data['ctime'] = ctime
    data['expire_date'] = expire_date
    data['is_expired'] = fileshare.is_expired()
    data['permissions'] = fileshare.get_permissions()
    data['password'] = fileshare.get_password()

    data['can_edit'] = False
    if repo and path != '/' and not data['is_dir']:
        try:
            dirent = seafile_api.get_dirent_by_path(repo_id, path)
        except Exception as e:
            logger.error(e)
            dirent = None

        if dirent:
            try:
                can_edit, error_msg = can_edit_file(obj_name, dirent.size, repo)
                data['can_edit'] = can_edit
            except Exception as e:
                logger.error(e)
        else:
            data['can_edit'] = False

    return data


def check_permissions_arg(request):

    permissions = request.data.get('permissions', '')
    if not permissions:
        return FileShare.PERM_VIEW_DL

    if isinstance(permissions, dict):
        perm_dict = permissions
    elif isinstance(permissions, str):
        perm_dict = json.loads(str(permissions))

    can_edit = perm_dict.get('can_edit', False)
    can_download = perm_dict.get('can_download', True)
    can_upload = perm_dict.get('can_upload', False)

    if not can_edit and can_download:
        perm = FileShare.PERM_VIEW_DL

    if not can_edit and not can_download:
        perm = FileShare.PERM_VIEW_ONLY

    if can_edit and can_download:
        perm = FileShare.PERM_EDIT_DL

    if can_edit and not can_download:
        perm = FileShare.PERM_EDIT_ONLY

    if not can_edit and can_download and can_upload:
        perm = FileShare.PERM_VIEW_DL_UPLOAD

    return perm


class ShareLinks(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateShareLink)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get all share links of a user.

        Permission checking:
        1. default(NOT guest) user;
        """

        username = request.user.username

        repo_id = request.GET.get('repo_id', '')
        path = request.GET.get('path', '')

        fileshares = []
        # get all share links of current user
        if not repo_id and not path:
            fileshares = FileShare.objects.filter(username=username)

        # share links in repo
        if repo_id and not path:
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                error_msg = 'Library %s not found.' % repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            fileshares = FileShare.objects.filter(username=username) \
                                          .filter(repo_id=repo_id)

        # share links by repo and path
        if repo_id and path:
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                error_msg = 'Library %s not found.' % repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if path != '/':
                dirent = seafile_api.get_dirent_by_path(repo_id, path)
                if not dirent:
                    error_msg = 'Dirent %s not found.' % path
                    return api_error(status.HTTP_404_NOT_FOUND, error_msg)

                if stat.S_ISDIR(dirent.mode):
                    path = normalize_dir_path(path)
                else:
                    path = normalize_file_path(path)

            fileshares = FileShare.objects.filter(username=username) \
                                          .filter(repo_id=repo_id) \
                                          .filter(path=path)

        repo_object_dict = {}
        for fileshare in fileshares:
            repo_id = fileshare.repo_id
            if repo_id not in repo_object_dict:
                repo = seafile_api.get_repo(repo_id)
                repo_object_dict[repo_id] = repo

        links_info = []
        for fs in fileshares:

            link_info = {}

            token = fs.token
            repo_id = fs.repo_id
            path = fs.path
            s_type = fs.s_type

            link_info['username'] = username
            link_info['repo_id'] = repo_id

            repo_object = repo_object_dict.get(repo_id, '')
            if repo_object:
                repo_name = repo_object.repo_name
            else:
                repo_name = ''

            if path:
                obj_name = '/' if path == '/' else os.path.basename(path.rstrip('/'))
            else:
                obj_name = ''

            link_info['repo_name'] = repo_name
            link_info['path'] = path
            link_info['obj_name'] = obj_name
            link_info['is_dir'] = True if s_type == 'd' else False
            link_info['token'] = token
            link_info['link'] = gen_shared_link(token, s_type)
            link_info['view_cnt'] = fs.view_cnt
            link_info['ctime'] = datetime_to_isoformat_timestr(fs.ctime) if fs.ctime else ''
            link_info['expire_date'] = datetime_to_isoformat_timestr(fs.expire_date) if fs.expire_date else ''
            link_info['is_expired'] = fs.is_expired()
            link_info['permissions'] = fs.get_permissions()
            link_info['password'] = fs.get_password()
            links_info.append(link_info)

        if len(links_info) == 1:
            result = links_info
        else:
            dir_list = [x for x in links_info if x['is_dir']]
            file_list = [x for x in links_info if not x['is_dir']]

            dir_list.sort(key=lambda x: x['obj_name'])
            file_list.sort(key=lambda x: x['obj_name'])

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
        if s_type == 'f':
            fs = FileShare.objects.get_file_link_by_path(username, repo_id, path)
            if fs:
                error_msg = _('Share link %s already exists.' % fs.token)
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            fs = FileShare.objects.create_file_link(username, repo_id, path,
                                                    password, expire_date,
                                                    permission=perm, org_id=org_id)

        elif s_type == 'd':
            fs = FileShare.objects.get_dir_link_by_path(username, repo_id, path)
            if fs:
                error_msg = _('Share link %s already exists.' % fs.token)
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
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

    def put(self, request, token):
        """ Update share link's permission and expiration.

        Permission checking:
        share link creater
        """

        # resource check
        try:
            fs = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'token %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = fs.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo_id:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if fs.path != '/':
            dirent = seafile_api.get_dirent_by_path(repo_id, fs.path)
            if not dirent:
                error_msg = 'Dirent %s not found.' % repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not fs.is_owner(username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get permission of origin repo/folder
        if fs.s_type == 'd':
            folder_path = normalize_dir_path(fs.path)
        else:
            file_path = normalize_file_path(fs.path)
            folder_path = os.path.dirname(file_path)

        username = request.user.username
        repo_folder_permission = seafile_api.check_permission_by_path(repo_id,
                                                                      folder_path,
                                                                      username)
        if not repo_folder_permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # argument check
        permissions = request.data.get('permissions', '')
        if permissions:
            try:
                perm = check_permissions_arg(request)
            except Exception:
                error_msg = 'permissions invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if repo_folder_permission in (PERMISSION_PREVIEW_EDIT, PERMISSION_PREVIEW) \
                    and perm != FileShare.PERM_VIEW_ONLY:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if repo_folder_permission in (PERMISSION_READ) \
                    and perm not in (FileShare.PERM_VIEW_DL, FileShare.PERM_VIEW_ONLY):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if fs.s_type == 'f':
                file_name = os.path.basename(fs.path.rstrip('/'))
                can_edit, error_msg = can_edit_file(file_name, dirent.size, repo)
                if not can_edit and perm in (FileShare.PERM_EDIT_DL, FileShare.PERM_EDIT_ONLY):
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # update share link permission
            fs.permission = perm
            fs.save()

        expire_days = request.data.get('expire_days', '')
        expiration_time = request.data.get('expiration_time', '')

        if expire_days and expiration_time:
            error_msg = 'Can not pass expire_days and expiration_time at the same time.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

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
            fs.expire_date = expire_date
            fs.save()

        if expiration_time:

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

            fs.expire_date = expire_date
            fs.save()

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

        has_published_library = False
        if fs.path == '/':
            try:
                Wiki.objects.get(repo_id=fs.repo_id)
                has_published_library = True
            except Wiki.DoesNotExist:
                pass

        username = request.user.username
        if not fs.is_owner(username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if has_published_library:
            error_msg = _('There is an associated published library.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            fs.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class ShareLinkOnlineOfficeLock(APIView):

    permission_classes = (IsProVersion,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, token):
        """ This api only used for refresh OnlineOffice lock
        when user edit office file via share link.

        Permission checking:
        1, If enable SHARE_LINK_LOGIN_REQUIRED, user must have been authenticated.
        2, Share link should have can_edit permission.
        3, File must have been locked by OnlineOffice.
        """

        expire = request.data.get('expire', 0)
        try:
            expire = int(expire)
        except ValueError:
            error_msg = 'expire invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if expire < 0:
            error_msg = 'expire invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if SHARE_LINK_LOGIN_REQUIRED and \
                not request.user.is_authenticated:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            share_link = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Share link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if share_link.is_expired():
            error_msg = 'Share link %s is expired.' % token
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        shared_by = share_link.username
        repo_id = share_link.repo_id
        path = normalize_file_path(share_link.path)
        parent_dir = os.path.dirname(path)
        if seafile_api.check_permission_by_path(repo_id,
                                                parent_dir,
                                                shared_by) != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        permissions = share_link.get_permissions()
        can_edit = permissions['can_edit']
        if not can_edit:
            error_msg = 'Share link %s has no edit permission.' % token
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        locked_by_online_office = if_locked_by_online_office(repo_id, path)
        if locked_by_online_office:

            # refresh lock file
            try:
                seafile_api.refresh_file_lock(repo_id, path,
                                              int(time.time()) + expire)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        else:
            error_msg = _("You can not refresh this file's lock.")
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        return Response({'success': True})


class ShareLinkDirents(APIView):

    throttle_classes = (UserRateThrottle,)

    def get(self, request, token):
        """ Only used for get dirents in a folder share link.

        Permission checking:
        1, If enable SHARE_LINK_LOGIN_REQUIRED, user must have been authenticated.
        2, If enable ENABLE_SHARE_LINK_AUDIT, user must have been authenticated, or have been audited.
        3, If share link is encrypted, share link password must have been checked.
        """

        # argument check
        thumbnail_size = request.GET.get('thumbnail_size', 48)
        try:
            thumbnail_size = int(thumbnail_size)
        except ValueError:
            error_msg = 'thumbnail_size invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check

        # check if login required
        if SHARE_LINK_LOGIN_REQUIRED and \
                not request.user.is_authenticated:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check share link audit
        if is_pro_version() and ENABLE_SHARE_LINK_AUDIT and \
                not request.user.is_authenticated and \
                not request.session.get('anonymous_email'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # resource check
        try:
            share_link = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Share link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check share link password
        if share_link.is_encrypted() and not check_share_link_access(request, token):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if share_link.s_type != 'd':
            error_msg = 'Share link %s is not a folder share link.' % token
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo_id = share_link.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        share_link_path = share_link.path
        request_path = request.GET.get('path', '/')
        if request_path == '/':
            path = share_link_path
        else:
            path = posixpath.join(share_link_path, request_path.strip('/'))

        path = normalize_dir_path(path)
        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % request_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            current_commit = seafile_api.get_commit_list(repo_id, 0, 1)[0]
            dirent_list = seafile_api.list_dir_by_commit_and_path(repo_id,
                                                                  current_commit.id,
                                                                  path, -1, -1)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            files_tags_in_dir = get_files_tags_in_dir(repo_id, path)
        except Exception as e:
            logger.error(e)
            files_tags_in_dir = {}

        result = []
        for dirent in dirent_list:

            # don't return parent folder(share link path) info to user
            # so use request_path here
            dirent_path = posixpath.join(request_path, dirent.obj_name)

            dirent_info = {}
            dirent_info['size'] = dirent.size
            dirent_info['last_modified'] = timestamp_to_isoformat_timestr(dirent.mtime)

            if stat.S_ISDIR(dirent.mode):
                dirent_info['is_dir'] = True
                dirent_info['folder_path'] = normalize_dir_path(dirent_path)
                dirent_info['folder_name'] = dirent.obj_name
            else:
                dirent_info['is_dir'] = False
                dirent_info['file_path'] = normalize_file_path(dirent_path)
                dirent_info['file_name'] = dirent.obj_name

                file_type, file_ext = get_file_type_and_ext(dirent.obj_name)
                if file_type in (IMAGE, XMIND) or \
                        (file_type == VIDEO and ENABLE_VIDEO_THUMBNAIL):

                    if os.path.exists(os.path.join(THUMBNAIL_ROOT, str(thumbnail_size), dirent.obj_id)):
                        req_image_path = posixpath.join(request_path, dirent.obj_name)
                        src = get_share_link_thumbnail_src(token, thumbnail_size, req_image_path)
                        dirent_info['encoded_thumbnail_src'] = quote(src)

                # get tag info
                file_tags = files_tags_in_dir.get(dirent.obj_name, [])
                if file_tags:
                    dirent_info['file_tags'] = []
                    for file_tag in file_tags:
                        dirent_info['file_tags'].append(file_tag)

            result.append(dirent_info)

        return Response({'dirent_list': result})


class ShareLinkUpload(APIView):

    throttle_classes = (UserRateThrottle, )

    def get(self, request, token):
        """ Only used for get seafhttp upload link for a folder share link.
        Permission checking:
        1, If enable SHARE_LINK_LOGIN_REQUIRED, user must have been authenticated.
        2, If enable ENABLE_SHARE_LINK_AUDIT, user must have been authenticated, or have been audited.
        3, If share link is encrypted, share link password must have been checked.
        4, Share link must be a folder share link and has can_upload permission.
        """

        # check if login required
        if SHARE_LINK_LOGIN_REQUIRED and \
                not request.user.is_authenticated:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check share link audit
        if is_pro_version() and ENABLE_SHARE_LINK_AUDIT and \
                not request.user.is_authenticated and \
                not request.session.get('anonymous_email'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # resource check
        try:
            share_link = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Share link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not share_link.is_dir_share_link():
            error_msg = 'Share link %s is not a folder share link.' % token
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo_id = share_link.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        share_link_path = share_link.path
        request_path = request.GET.get('path', '/')
        if request_path == '/':
            path = share_link_path
        else:
            path = posixpath.join(share_link_path, request_path.strip('/'))

        path = normalize_dir_path(path)
        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % request_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if share_link.is_encrypted() and not check_share_link_access(request, token):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not share_link.get_permissions()['can_upload']:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # generate token
        obj_id = json.dumps({'parent_dir': path})

        check_virus = False
        if is_pro_version() and ENABLE_UPLOAD_LINK_VIRUS_CHECK:
            check_virus = True

        if check_virus:
            token = seafile_api.get_fileserver_access_token(repo_id,
                                                            obj_id,
                                                            'upload-link',
                                                            share_link.username,
                                                            use_onetime=False,
                                                            check_virus=check_virus)
        else:
            token = seafile_api.get_fileserver_access_token(repo_id,
                                                            obj_id,
                                                            'upload-link',
                                                            share_link.username,
                                                            use_onetime=False)

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = {}
        result['upload_link'] = gen_file_upload_url(token, 'upload-api')
        return Response(result)


class ShareLinkUploadDone(APIView):

    throttle_classes = (UserRateThrottle, )

    def post(self, request, token):

        """ Only used for saving notification after user upload file via folder share link and upload link.

        Permission checking:
        1, If enable SHARE_LINK_LOGIN_REQUIRED, user must have been authenticated.
        2, If enable ENABLE_SHARE_LINK_AUDIT, user must have been authenticated, or have been audited.
        3, If share link is encrypted, share link password must have been checked.
        4, Share link must be a folder share link and has can_upload permission.
        """

        # resource check

        share_link = None
        upload_link = None

        try:
            share_link = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            upload_link = UploadLinkShare.objects.get(token=token)
        except UploadLinkShare.DoesNotExist:
            error_msg = 'token %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if share_link:

            # check if login required
            if SHARE_LINK_LOGIN_REQUIRED and \
                    not request.user.is_authenticated:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # check share link audit
            if is_pro_version() and ENABLE_SHARE_LINK_AUDIT and \
                    not request.user.is_authenticated and \
                    not request.session.get('anonymous_email'):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # check share link validation
            if share_link.is_encrypted() and not check_share_link_access(request, token):
                error_msg = 'Share link is encrypted.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if not share_link.get_permissions()['can_upload']:
                error_msg = 'Share link has no can_upload permission'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if share_link.is_expired():
                error_msg = 'Share link is expired'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if not share_link.is_dir_share_link():
                error_msg = 'Share link %s is not a folder share link.' % token
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # recourse check
            repo_id = share_link.repo_id
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                error_msg = 'Library %s not found.' % repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            parent_dir = share_link.path
            if seafile_api.check_permission_by_path(repo_id, parent_dir, share_link.username) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            file_path = request.data.get('file_path')
            if not file_path:
                error_msg = 'file_path invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            file_id = seafile_api.get_file_id_by_path(repo_id, file_path)
            if not file_id:
                error_msg = 'File %s not found.' % file_path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # send singal
            upload_file_successful.send(sender=None,
                                        repo_id=repo_id,
                                        file_path=file_path,
                                        owner=share_link.username)

            return Response({'success': True})

        if upload_link:

            if upload_link.is_encrypted() and not check_share_link_access(request,
                                                                          token,
                                                                          is_upload_link=True):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if upload_link.is_expired():
                error_msg = 'Upload link is expired'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            repo_id = upload_link.repo_id
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                error_msg = 'Library %s not found.' % repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            parent_dir = upload_link.path
            if seafile_api.check_permission_by_path(repo_id, parent_dir, upload_link.username) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            file_path = request.data.get('file_path')
            if not file_path:
                error_msg = 'file_path invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            file_id = seafile_api.get_file_id_by_path(repo_id, file_path)
            if not file_id:
                error_msg = 'File %s not found.' % file_path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            upload_file_successful.send(sender=None,
                                        repo_id=repo_id,
                                        file_path=file_path,
                                        owner=upload_link.username)

            return Response({'success': True})


class ShareLinkSaveFileToRepo(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, token):

        # argument check
        dst_repo_id = request.POST.get('dst_repo_id', '')
        if not dst_repo_id:
            error_msg = 'dst_repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        dst_parent_dir = request.POST.get('dst_parent_dir', '')
        if not dst_parent_dir:
            error_msg = 'dst_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            share_link = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Share link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_repo(dst_repo_id):
            error_msg = 'Library %s not found.' % dst_repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(dst_repo_id, dst_parent_dir):
            error_msg = 'Folder %s not found.' % dst_parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        share_link_permission = share_link.get_permissions()
        if not share_link_permission.get('can_download', False):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if check_folder_permission(request,
                                   dst_repo_id,
                                   dst_parent_dir) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # copy file
        if share_link.s_type == 'f':
            src_dirent_path = share_link.path
        else:
            path = request.POST.get('path', '')
            if not path:
                error_msg = 'path invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            src_dirent_path = posixpath.join(share_link.path,
                                             path.strip('/'))

        src_repo_id = share_link.repo_id
        src_parent_dir = os.path.dirname(src_dirent_path)
        src_dirent_name = os.path.basename(src_dirent_path)
        dst_dirent_name = check_filename_with_rename(dst_repo_id,
                                                     dst_parent_dir,
                                                     src_dirent_name)

        username = request.user.username
        seafile_api.copy_file(src_repo_id, src_parent_dir,
                              json.dumps([src_dirent_name]),
                              dst_repo_id, dst_parent_dir,
                              json.dumps([dst_dirent_name]),
                              username, need_progress=0)

        return Response({'success': True})


class ShareLinkSaveItemsToRepo(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, token):

        # argument check
        dst_repo_id = request.POST.get('dst_repo_id', '')
        if not dst_repo_id:
            error_msg = 'dst_repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        dst_parent_dir = request.POST.get('dst_parent_dir', '')
        if not dst_parent_dir:
            error_msg = 'dst_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            share_link = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Share link %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_repo(dst_repo_id):
            error_msg = 'Library %s not found.' % dst_repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(dst_repo_id, dst_parent_dir):
            error_msg = 'Folder %s not found.' % dst_parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        share_link_permission = share_link.get_permissions()
        if not share_link_permission.get('can_download', False):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if check_folder_permission(request,
                                   dst_repo_id,
                                   dst_parent_dir) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # save items
        username = request.user.username
        src_repo_id = share_link.repo_id

        # save file in file share link
        if share_link.s_type == 'f':

            src_dirent_path = share_link.path
            src_parent_dir = os.path.dirname(src_dirent_path)
            src_dirent_name = os.path.basename(src_dirent_path)

            check_filename_with_rename(dst_repo_id,
                                       dst_parent_dir,
                                       src_dirent_name)
        else:
            # save items in folder share link
            src_parent_dir = request.POST.get('src_parent_dir', '')
            if not src_parent_dir:
                error_msg = 'src_parent_dir invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            src_dirents = request.POST.getlist('src_dirents', [])
            if not src_dirents:
                error_msg = 'src_dirents invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            src_parent_dir = posixpath.join(share_link.path, src_parent_dir.strip('/'))
        try:
            res = seafile_api.copy_file(src_repo_id, src_parent_dir,
                                        json.dumps(src_dirents),
                                        dst_repo_id, dst_parent_dir,
                                        json.dumps(src_dirents),
                                        username, need_progress=1, synchronous=0)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not res:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = {}
        if res.background:
            result['task_id'] = res.task_id

        return Response(result)


class ShareLinkRepoTags(APIView):

    throttle_classes = (UserRateThrottle,)

    def get(self, request, token):
        """get all repo_tags by share link token.
        """

        try:
            share_link = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Token %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = share_link.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # get all tags in repo
        repo_tags = RepoTags.objects.filter(repo_id=repo_id)

        # get tagged files by tag id
        tag_id_file_list_dict = defaultdict(list)
        for repo_tag in repo_tags:
            tagged_files = get_tagged_files(repo, repo_tag.pk)['tagged_files']
            tagged_files = [item for item in tagged_files if item.get('parent_path') and item.get('parent_path').startswith(share_link.path.rstrip('/'))]
            tag_id_file_list_dict[repo_tag.pk] = tagged_files

        # generate response
        result = {
            "repo_tags": []
        }

        for repo_tag in repo_tags:

            repo_tag_info = repo_tag.to_dict()
            repo_tag_id = repo_tag_info["repo_tag_id"]
            repo_tag_info["files_count"] = len(tag_id_file_list_dict.get(repo_tag_id, []))

            result['repo_tags'].append(repo_tag_info)

        return Response(result)


class ShareLinkRepoTagsTaggedFiles(APIView):

    throttle_classes = (UserRateThrottle,)

    def get(self, request, token, tag_id):
        """get tagged files by share link token and tag id.
        """

        try:
            share_link = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'Token %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = share_link.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_tag = RepoTags.objects.get_repo_tag_by_id(tag_id)
        if not repo_tag:
            error_msg = 'repo_tag %s not found.' % tag_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        share_link_path = share_link.path.rstrip('/') if share_link.path != '/' else '/'

        filtered_tagged_files = []
        tagged_files = get_tagged_files(repo, tag_id)
        for tagged_file in tagged_files.get('tagged_files', []):

            if tagged_file.get('file_deleted', False):
                continue

            tagged_file_parent_path = tagged_file.get('parent_path', '')
            if share_link_path == '/':
                filtered_tagged_files.append(tagged_file)
            elif tagged_file_parent_path.startswith(share_link_path):
                tagged_file['parent_path'] = '/' + tagged_file_parent_path.lstrip(share_link_path)
                filtered_tagged_files.append(tagged_file)

        return Response({'tagged_files': filtered_tagged_files})


class ShareLinksCleanInvalid(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateShareLink)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request):
        """ Clean invalid share links.
        """

        username = request.user.username
        share_links = FileShare.objects.filter(username=username)

        for share_link in share_links:

            if share_link.is_expired():
                share_link.delete()
                continue

            repo_id = share_link.repo_id
            if not seafile_api.get_repo(repo_id):
                share_link.delete()
                continue

            if share_link.s_type == 'd':
                folder_path = normalize_dir_path(share_link.path)
                obj_id = seafile_api.get_dir_id_by_path(repo_id, folder_path)
            else:
                file_path = normalize_file_path(share_link.path)
                obj_id = seafile_api.get_file_id_by_path(repo_id, file_path)

            if not obj_id:
                share_link.delete()
                continue

        return Response({'success': True})
