# Copyright (c) 2012-2016 Seafile Ltd.

import logging
from io import BytesIO
from openpyxl import load_workbook
from constance import config

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils.translation import gettext as _

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.base.accounts import User
from seahub.profile.models import Profile
from seahub.institutions.models import Institution
from seahub.utils.file_size import get_file_size_unit
from seahub.utils import is_valid_username, get_file_type_and_ext, \
    is_pro_version, get_site_name
from seahub.utils.error_msg import file_type_error_msg
from seahub.utils.licenseparse import user_number_over_limit
from seahub.utils.mail import send_html_email_with_dj_template
from seahub.admin_log.models import USER_DELETE, USER_ADD
from seahub.admin_log.signals import admin_operation
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, datetime_to_isoformat_timestr
from seahub.constants import DEFAULT_ADMIN
from seahub.role_permissions.models import AdminRole
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.base.models import UserLastLogin
from seahub.options.models import UserOptions
from seahub.role_permissions.utils import get_available_roles
from seahub.utils.user_permissions import get_user_role
from seahub.api2.endpoints.admin.users import get_virtual_id_by_email

logger = logging.getLogger(__name__)


class AdminAdminUsersBatch(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def post(self, request):
        """ Add admin in batch
        """

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        emails = request.POST.getlist('email', None)
        if not emails:
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []
        for email in emails:
            if not is_valid_username(email):
                result['failed'].append({
                    'email': email,
                    'error_msg': 'email %s invalid.' % email
                })
                continue

            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                result['failed'].append({
                    'email': email,
                    'error_msg': 'user %s not found.' % email
                })
                continue

            user.is_staff = True
            try:
                user.save()
            except Exception as e:
                logger.error(e)
                result['failed'].append({
                    'email': email,
                    'error_msg': 'Internal Server Error'
                })
                continue

            profile = Profile.objects.get_profile_by_user(user.email)
            user_info = {}
            user_info['email'] = user.email
            user_info['name'] = email2nickname(user.email)
            user_info['contact_email'] = email2contact_email(user.email)
            user_info['login_id'] = profile.login_id if profile and profile.login_id else ''

            user_info['is_staff'] = user.is_staff
            user_info['is_active'] = user.is_active

            user_info['quota_total'] = seafile_api.get_user_quota(user.email)
            user_info['quota_usage'] = seafile_api.get_user_self_usage(user.email)

            user_info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)
            last_login_obj = UserLastLogin.objects.get_by_username(user.email)
            user_info['last_login'] = datetime_to_isoformat_timestr(last_login_obj.last_login) if last_login_obj else ''

            try:
                admin_role = AdminRole.objects.get_admin_role(user.email)
                user_info['admin_role'] = admin_role.role
            except AdminRole.DoesNotExist:
                user_info['admin_role'] = DEFAULT_ADMIN
            result['success'].append(user_info)

        return Response(result)


class AdminUsersBatch(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def post(self, request):
        """ Set user quota, set user institution, delete users, in batch.

        Permission checking:
        1. admin user.
        """

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        emails = request.POST.getlist('email', None)
        if not emails:
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = request.POST.get('operation', None)
        if operation not in ('set-quota', 'delete-user', 'set-institution'):
            error_msg = "operation can only be 'set-quota', 'delete-user', or 'set-institution'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []

        existed_users = []
        for email in emails:
            try:
                user = User.objects.get(email=email)
                existed_users.append(user)
            except User.DoesNotExist:
                result['failed'].append({
                    'email': email,
                    'error_msg': 'User %s not found.' % email
                    })
                continue

        if operation == 'set-quota':
            quota_total_mb = request.POST.get('quota_total', None)
            if not quota_total_mb:
                error_msg = 'quota_total invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                quota_total_mb = int(quota_total_mb)
            except ValueError:
                error_msg = _('must be an integer that is greater than or equal to 0.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if quota_total_mb < 0:
                error_msg = _('Space quota is too low (minimum value is 0)')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            quota_total_byte = quota_total_mb * get_file_size_unit('MB')

            for user in existed_users:
                email = user.email
                try:
                    seafile_api.set_user_quota(email, quota_total_byte)
                except Exception as e:
                    logger.error(e)
                    result['failed'].append({
                        'email': email,
                        'error_msg': 'Internal Server Error'
                        })
                    continue

                result['success'].append({
                    'email': email,
                    'quota_total': seafile_api.get_user_quota(email),
                })

        if operation == 'delete-user':
            for user in existed_users:
                email = user.email
                try:
                    user.delete()
                except Exception as e:
                    logger.error(e)
                    result['failed'].append({
                        'email': email,
                        'error_msg': 'Internal Server Error'
                        })
                    continue

                result['success'].append({
                    'email': email,
                })

                # send admin operation log signal
                admin_op_detail = {
                    "email": email,
                }
                admin_operation.send(sender=None, admin_name=request.user.username,
                                     operation=USER_DELETE, detail=admin_op_detail)

        if operation == 'set-institution':
            institution = request.POST.get('institution', None)
            if institution is None:
                error_msg = 'Institution can not be blank.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if institution != '':
                try:
                    Institution.objects.get(name=institution)
                except Institution.DoesNotExist:
                    error_msg = 'Institution %s does not exist' % institution
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            for user in existed_users:
                email = user.email
                profile = Profile.objects.get_profile_by_user(email)
                if profile is None:
                    profile = Profile(user=email)
                profile.institution = institution
                profile.save()
                result['success'].append({
                    'email': email,
                    'institution': institution
                })

        return Response(result)


class AdminImportUsers(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def post(self, request):
        """ Import users from xlsx file

        Permission checking:
        1. admin user.
        """

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        xlsx_file = request.FILES.get('file', None)
        if not xlsx_file:
            error_msg = 'file can not be found.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_type, ext = get_file_type_and_ext(xlsx_file.name)
        if ext != 'xlsx':
            error_msg = file_type_error_msg(ext, 'xlsx')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        content = xlsx_file.read()

        try:
            fs = BytesIO(content)
            wb = load_workbook(filename=fs, read_only=True)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        # example file is like:
        # Email    Password Name(Optional) Role(Optional) Space Quota(MB, Optional) Login ID
        # a@a.com  a        a              default        1024                      login id a
        # b@b.com  b        b              default        2048                      login id b

        rows = wb.worksheets[0].rows
        records = []
        # skip first row(head field).
        next(rows)
        for row in rows:
            if not all(col.value is None for col in row):
                records.append([col.value for col in row])

        if user_number_over_limit(new_users=len(records)):
            error_msg = 'The number of users exceeds the limit.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []
        for record in records:
            if record[0]:
                email = record[0].strip()
                if not is_valid_username(email):
                    result['failed'].append({
                        'email': email,
                        'error_msg': 'email %s invalid.' % email
                    })
                    continue
            else:
                result['failed'].append({
                    'email': '',
                    'error_msg': 'email invalid.'
                })
                continue

            if record[1]:
                password = record[1].strip()
                if not password:
                    result['failed'].append({
                        'email': email,
                        'error_msg': 'password invalid.'
                    })
                    continue
            else:
                result['failed'].append({
                    'email': email,
                    'error_msg': 'password invalid.'
                })
                continue

            vid = get_virtual_id_by_email(email)
            try:
                User.objects.get(email=vid)
                result['failed'].append({
                    'email': email,
                    'error_msg': 'user %s exists.' % email
                })
                continue
            except User.DoesNotExist:
                pass

            User.objects.create_user(email, password, is_staff=False, is_active=True)
            if config.FORCE_PASSWORD_CHANGE:
                UserOptions.objects.set_force_passwd_change(vid)

            # update the user's optional info
            # update nikename
            nickname = email.split('@')[0]
            try:
                if record[2]:
                    input_nickname = str(record[2]).strip()
                    if len(input_nickname) <= 64 and '/' not in input_nickname:
                        nickname = input_nickname
                Profile.objects.add_or_update(vid, nickname, '')
            except Exception as e:
                logger.error(e)

            # update role
            if record[3]:
                try:
                    role = record[3].strip()
                    if is_pro_version() and role in get_available_roles():
                        User.objects.update_role(vid, role)
                except Exception as e:
                    logger.error(e)

            # update quota
            if record[4]:
                try:
                    space_quota_mb = int(record[4])
                    if space_quota_mb >= 0:
                        space_quota = int(space_quota_mb) * get_file_size_unit('MB')
                        seafile_api.set_user_quota(vid, space_quota)
                except Exception as e:
                    logger.error(e)

            # login id
            if record[5]:
                try:
                    Profile.objects.add_or_update(vid, login_id=record[5])
                except Exception as e:
                    logger.error(e)

            send_html_email_with_dj_template(email,
                                             subject=_('You are invited to join %s') % get_site_name(),
                                             dj_template='sysadmin/user_batch_add_email.html',
                                             context={
                                                 'user': email2nickname(request.user.username),
                                                 'email': email,
                                                 'password': password
                                             })

            user = User.objects.get(email=vid)
            info = dict()
            info['email'] = email
            info['name'] = email2nickname(email)
            info['contact_email'] = email2contact_email(email)

            info['is_staff'] = user.is_staff
            info['is_active'] = user.is_active

            info['quota_usage'] = seafile_api.get_user_self_usage(user.email)
            info['quota_total'] = seafile_api.get_user_quota(user.email)

            info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)

            info['role'] = get_user_role(user)
            result['success'].append(info)

            # send admin operation log signal
            admin_op_detail = {
                "email": email,
            }
            admin_operation.send(sender=None, admin_name=request.user.username,
                                 operation=USER_ADD, detail=admin_op_detail)

        return Response(result)
