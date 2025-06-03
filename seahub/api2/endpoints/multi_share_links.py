# Copyright (c) 2012-2016 Seafile Ltd.
import os
import stat
import logging
import json

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

from seaserv import seafile_api, ccnet_api

from seahub.api2.utils import api_error, send_share_link_emails
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import CanGenerateShareLink
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.constants import PERMISSION_READ_WRITE, PERMISSION_READ, PERMISSION_PREVIEW_EDIT, PERMISSION_PREVIEW, PERMISSION_INVISIBLE
from seahub.share.models import FileShare
from seahub.share.decorators import check_share_link_count
from seahub.share.utils import is_repo_admin, VALID_SHARE_LINK_SCOPE, SCOPE_SPECIFIC_EMAILS, SCOPE_SPECIFIC_USERS
from seahub.utils import is_org_context, get_password_strength_level, \
    is_valid_password, gen_shared_link, is_pro_version, is_valid_email, string2list
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.utils.repo import parse_repo_perm
from seahub.settings import SHARE_LINK_EXPIRE_DAYS_MAX, SHARE_LINK_EXPIRE_DAYS_MIN, SHARE_LINK_EXPIRE_DAYS_DEFAULT, \
    SHARE_LINK_MAX_NUMBER
from seahub.views.file import can_edit_file
from seahub.api2.endpoints.share_links import get_share_link_info, check_permissions_arg

logger = logging.getLogger(__name__)

FORBID_SHARE_LINK_CREATE_PERMISSIONS = [
    PERMISSION_INVISIBLE,
    PERMISSION_PREVIEW, 
    PERMISSION_PREVIEW_EDIT
]

def _user_pass_folder_permissions(request, repo_id):
    if not is_pro_version():
        return True
    
    username = request.user.username

    # 1. check repo user admin
    if is_repo_admin(username, repo_id):
        return True

    # 2. check folder permissions of the repo of users
    user_folder_perms = seafile_api.list_folder_user_perm_by_repo(repo_id)
    for ufp in user_folder_perms:
        if ufp.user == username and ufp.permission in FORBID_SHARE_LINK_CREATE_PERMISSIONS:
            return False
        
    # 3. check folder permissions of the repo of groups

    # 3.1 list folder perms of a groups    
    group_folder_perms = seafile_api.list_folder_group_perm_by_repo(repo_id)
    # 3.2 list user groups
    if group_folder_perms:
        if is_org_context(request):
            org_id = request.user.org.org_id
            user_groups = ccnet_api.get_org_groups_by_user(org_id, username, return_ancestors=True)
        else:
            user_groups = ccnet_api.get_groups(username, return_ancestors=True)

        user_group_ids = [g.id for g in user_groups]
        # 3.3 check folder permissions
        for gfp in group_folder_perms:
            if gfp.group_id in user_group_ids and gfp.permission in FORBID_SHARE_LINK_CREATE_PERMISSIONS:
                return False
        
    return True

class MultiShareLinks(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateShareLink)
    throttle_classes = (UserRateThrottle,)

    @check_share_link_count
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
        
        description = request.data.get('description', '')
        if description and len(description) > 100:
            error_msg = _('Description is too long.')
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
        
        origin_repo_id = repo_id
        if repo.is_virtual:
            origin_repo_id = repo.origin_repo_id

        if not _user_pass_folder_permissions(request, origin_repo_id):
            error_msg = 'Folder permission denied.'
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
                                                    permission=perm, org_id=org_id, description=description)

        else:
            fs = FileShare.objects.create_dir_link(username, repo_id, path,
                                                   password, expire_date,
                                                   permission=perm, org_id=org_id)

        user_scope = request.data.get('user_scope', '')
        emails_list = []
        if user_scope and user_scope in VALID_SHARE_LINK_SCOPE:
            if user_scope == SCOPE_SPECIFIC_USERS:
        
                emails = request.data.get('emails', [])
                emails_to_add = []
        
                for username in emails:
                    try:
                        User.objects.get(email=username)
                    except User.DoesNotExist:
                        continue
                    emails_to_add.append(username)
        
                fs.authed_details = json.dumps(
                    {'authed_users': emails_to_add}
                )
            elif user_scope == SCOPE_SPECIFIC_EMAILS:
                emails_str = request.data.get('emails', '')
                emails_list = string2list(emails_str)
                emails_list = [e for e in emails_list if is_valid_email(e)]
                fs.authed_details = json.dumps(
                    {'authed_emails': emails_list}
                )
    
            fs.user_scope = user_scope
            fs.save()
        if emails_list:
            shared_from = email2nickname(username)
            send_share_link_emails(emails_list, fs, shared_from)
        
        link_info = get_share_link_info(fs)
        return Response(link_info)


class MultiShareLinksBatch(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateShareLink)
    throttle_classes = (UserRateThrottle,)

    @check_share_link_count
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

        if share_link_num > SHARE_LINK_MAX_NUMBER:
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
        
        origin_repo_id = repo_id
        if repo.is_virtual:
            origin_repo_id = repo.origin_repo_id
        
        if not _user_pass_folder_permissions(request, origin_repo_id):
            error_msg = 'Folder permission denied.'
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
