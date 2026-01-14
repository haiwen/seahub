# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from io import BytesIO
from openpyxl import load_workbook

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from django.utils.translation import gettext as _

from seahub.utils.ccnet_db import CcnetDB
from seaserv import ccnet_api, seafile_api

from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error, to_python_boolean
from seahub.api2.endpoints.utils import is_org_user
from seahub.auth.utils import get_virtual_id_by_email
from seahub.base.accounts import User
from seahub.base.models import UserLastLogin
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.profile.models import Profile
from seahub.settings import SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER
from seahub.utils import is_valid_email, IS_EMAIL_CONFIGURED, \
        get_file_type_and_ext
from seahub.utils.file_size import get_file_size_unit
from seahub.utils.error_msg import file_type_error_msg
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, \
        datetime_to_isoformat_timestr
from seahub.utils.licenseparse import user_number_over_limit
from seahub.views.sysadmin import send_user_add_mail
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.invitations.models import Invitation
from seahub.constants import DEFAULT_USER

from pysearpc import SearpcError

import seahub.settings as settings
from seahub.organizations.models import OrgMemberQuota
from seahub.organizations.settings import ORG_MEMBER_QUOTA_ENABLED, \
        ORG_ENABLE_ADMIN_INVITE_USER
from seahub.organizations.views import get_org_user_self_usage, \
        get_org_user_quota, is_org_staff, org_user_exists, \
        unset_org_user, set_org_user, set_org_staff, unset_org_staff


logger = logging.getLogger(__name__)


class OrgAdminUsers(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get_info_of_users_order_by_quota_usage(self, org, all_users,
                                               direction, page, per_page):

        # get user's quota usage info
        user_usage_dict = {}
        users_with_usage = seafile_api.list_org_user_quota_usage(org.org_id)
        for user in users_with_usage:
            email = user.user
            if email not in user_usage_dict:
                user_usage_dict[email] = user.usage

        # get all users and map quota usage to user
        for user in all_users:
            email = user.email
            user.quota_usage = user_usage_dict.get(email, 0)

        # sort
        all_users.sort(key=lambda item: item.quota_usage,
                       reverse=direction == 'desc')

        data = []
        for user in all_users[(page - 1) * per_page: page * per_page]:

            info = {}
            info['email'] = user.email
            info['name'] = email2nickname(user.email)
            info['contact_email'] = email2contact_email(user.email)

            info['is_staff'] = user.is_staff
            info['is_active'] = user.is_active
            info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)

            info['quota_usage'] = user.quota_usage
            info['quota_total'] = seafile_api.get_org_user_quota(org.org_id, user.email)

            last_login_obj = UserLastLogin.objects.get_by_username(user.email)
            info['last_login'] = datetime_to_isoformat_timestr(last_login_obj.last_login) if last_login_obj else ''

            data.append(info)

        return data

    def get(self, request, org_id):
        """List organization user
        """
        # resource check
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if request.user.org.org_id != org.org_id:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        is_staff = request.GET.get('is_staff', None)
        if is_staff:
            try:
                is_staff = to_python_boolean(is_staff)
            except ValueError:
                error_msg = 'is_staff invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            org_users = ccnet_api.get_org_users_by_url_prefix(org.url_prefix, -1, -1)

            users = []
            if is_staff:
                for user in org_users:
                    if is_org_staff(org.org_id, user.email):
                        users.append(user)
        else:
            # Make sure page request is an int. If not, deliver first page.

            try:
                current_page = int(request.GET.get('page', '1'))
                per_page = int(request.GET.get('per_page', '100'))
            except ValueError:
                current_page = 1
                per_page = 100

            order_by = request.GET.get('order_by', '').lower().strip()
            if order_by:
                if order_by not in ('quota_usage'):
                    error_msg = 'order_by invalid.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                direction = request.GET.get('direction', 'desc').lower().strip()
                if direction not in ('asc', 'desc'):
                    error_msg = 'direction invalid.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                all_users = ccnet_api.get_org_users_by_url_prefix(org.url_prefix, -1, -1)
                total_count = len(all_users)

                if total_count > 500 and \
                        not getattr(settings, 'ALWAYS_SORT_USERS_BY_QUOTA_USAGE', False):
                    error_msg = _("There are more than 500 users, and sort is not offered.")
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                try:
                    data = self.get_info_of_users_order_by_quota_usage(org,
                                                                       all_users,
                                                                       direction,
                                                                       current_page,
                                                                       per_page)
                except Exception as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

                result = {
                    'user_list': data,
                    'page': current_page,
                    'per_page': per_page,
                    'page_next': (current_page - 1) * per_page + len(data) < total_count,
                    'total_count': total_count
                }
                return Response(result)
            else:
                users_plus_one = ccnet_api.get_org_users_by_url_prefix(
                    org.url_prefix, per_page * (current_page - 1), per_page + 1)

                if len(users_plus_one) == per_page + 1:
                    page_next = True
                else:
                    page_next = False

                users = users_plus_one[:per_page]

        last_logins = UserLastLogin.objects.filter(username__in=[x.email for x in users])

        user_list = []
        for user in users:
            user_info = get_user_info(user.email, org_id)

            # populate user last login time
            user_info['last_login'] = None
            for last_login in last_logins:
                if last_login.username == user.email:
                    user_info['last_login'] = datetime_to_isoformat_timestr(last_login.last_login)

            user_info['is_active'] = user.is_active
            user_info['is_staff'] = user.is_staff
            user_info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)

            user_list.append(user_info)

        if is_staff:
            return Response({
                'user_list': user_list
            })
        else:
            return Response({
                'user_list': user_list,
                'page': current_page,
                'per_page': per_page,
                'page_next': page_next
            })

    def post(self, request, org_id):
        """Added an organization user, check member quota before adding.
        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check plan
        ccnet_db = CcnetDB()
        org_active_members_count = ccnet_db.count_org_active_users(org_id)
        if ORG_MEMBER_QUOTA_ENABLED:
            org_members_quota = OrgMemberQuota.objects.get_quota(request.user.org.org_id)
            if org_members_quota is not None and org_active_members_count >= org_members_quota:
                err_msg = 'The number of users exceeds the limit.'
                return api_error(status.HTTP_403_FORBIDDEN, err_msg)

        if user_number_over_limit():
            return api_error(status.HTTP_403_FORBIDDEN, 'The number of users exceeds the limit')

        email = request.data.get('email', '')
        name = request.data.get('name', '')
        password = request.data.get('password', '')

        if not email or not is_valid_email(email):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Email invalid.')

        if not password:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Password invalid.')

        name = name.strip()
        if not name:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Name invalid.')

        if len(name) > 64:
            error_msg = 'Name is too long (maximum is 64 characters).'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if "/" in name:
            error_msg = "Name should not include '/'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            user = User.objects.get(email=email)
            error_msg = 'User %s already exists.' % email
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        except User.DoesNotExist:
            pass

        if Profile.objects.filter(contact_email=email).first():
            error_msg = _('User %s already exists.') % email
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            user = User.objects.create_user(email, password, is_staff=False,
                                            is_active=True)
        except User.DoesNotExist as e:
            logger.error(e)
            error_msg = 'Fail to add user %s.' % email
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if user and name:
            Profile.objects.add_or_update(username=user.username, nickname=name)

        set_org_user(org_id, user.username)

        if IS_EMAIL_CONFIGURED:
            if SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER:
                try:
                    send_user_add_mail(request, email, password)
                except Exception as e:
                    logger.error(str(e))

        user_info = {}
        user_info['id'] = user.id
        user_info['is_active'] = user.is_active
        user_info['ctime'] = timestamp_to_isoformat_timestr(user.ctime)
        user_info['name'] = email2nickname(user.email)
        user_info['email'] = user.email
        user_info['contact_email'] = email2contact_email(user.email)
        user_info['last_login'] = None
        user_info['self_usage'] = 0  # get_org_user_self_usage(org.org_id, user.email)
        try:
            user_info['quota'] = get_org_user_quota(org_id, user.email)
        except SearpcError as e:
            logger.error(e)
            user_info['quota'] = -1

        user_info['quota_usage'] = user_info['self_usage']
        user_info['quota_total'] = user_info['quota']
        user_info['create_time'] = user_info['ctime']

        return Response(user_info)


class OrgAdminUser(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id, email):
        """Get org user info

        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            err_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, err_msg)

        # permission check
        if not ccnet_api.org_user_exists(org_id, email):
            err_msg = _('User %s not found in organization.') % email
            return api_error(status.HTTP_404_NOT_FOUND, err_msg)

        # get user info
        user_info = get_user_info(email, org_id)
        avatar_url, is_default, date_uploaded = api_avatar_url(email)
        user_info['avatar_url'] = avatar_url

        return Response(user_info)

    def put(self, request, org_id, email):
        """ update name of an org user.

        Permission checking:
        1. only admin can perform this action.
        """

        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not is_org_user(email, org_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # update user's name
        name = request.data.get("name", None)
        if name is not None:

            name = name.strip()
            if len(name) > 64:
                error_msg = 'Name is too long (maximum is 64 characters).'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if "/" in name:
                error_msg = "Name should not include '/'."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                Profile.objects.add_or_update(email, nickname=name)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # update user's contact email
        contact_email = request.data.get("contact_email", None)
        if contact_email is not None:

            contact_email = contact_email.strip()
            if contact_email != '' and not is_valid_email(contact_email):
                error_msg = 'contact_email invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                Profile.objects.add_or_update(email, contact_email=contact_email)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # update is_staff
        is_staff = request.data.get("is_staff", None)
        if is_staff is not None:
            try:
                is_staff = to_python_boolean(is_staff)
            except ValueError:
                error_msg = 'is_staff invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if is_staff:
                if is_org_staff(org_id, user.username):
                    error_msg = '%s is already organization staff.' % email
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                set_org_staff(org_id, user.username)

            if not is_staff:
                if not is_org_staff(org_id, user.username):
                    error_msg = '%s is not organization staff.' % email
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                unset_org_staff(org_id, user.username)

        # update is_active
        is_active = request.data.get("is_active", None)
        if is_active:
            is_active = is_active.lower()
            if is_active not in ('true', 'false'):
                error_msg = "is_active can only be 'true' or 'false'."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if is_active == 'true':
                if not user.is_active and ORG_MEMBER_QUOTA_ENABLED:
                    ccnet_db = CcnetDB()
                    org_active_members_count = ccnet_db.count_org_active_users(org_id)
                    org_members_quota = OrgMemberQuota.objects.get_quota(request.user.org.org_id)
                    if org_members_quota is not None and org_active_members_count >= org_members_quota:
                        err_msg = 'The number of users exceeds the limit.'
                        return api_error(status.HTTP_403_FORBIDDEN, err_msg)
            
            user.is_active = is_active == 'true'
            user.save()
            if not is_active == 'true':
                # del tokens and personal repo api tokens (not department)
                from seahub.utils import inactive_user
                try:
                    inactive_user(email)
                except Exception as e:
                    logger.error("Failed to inactive_user %s: %s." % (email, e))

        # update quota_total
        quota_total_mb = request.data.get("quota_total", None)
        if quota_total_mb:
            try:
                quota_total_mb = int(quota_total_mb)
            except ValueError:
                error_msg = "Must be an integer that is greater than or equal to 0."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if quota_total_mb < 0:
                error_msg = "Space quota is too low (minimum value is 0)."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            org_quota = seafile_api.get_org_quota(org_id)
            org_quota_mb = org_quota / get_file_size_unit('MB')

            # -1 means org has unlimited quota
            if org_quota > 0 and quota_total_mb > org_quota_mb:
                error_msg = 'Failed to set quota: maximum quota is %d MB' % org_quota_mb
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            quota_total = int(quota_total_mb) * get_file_size_unit('MB')
            try:
                seafile_api.set_org_user_quota(org_id, email, quota_total)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        info = get_user_info(email, org_id)
        info['is_active'] = user.is_active
        info['id'] = user.id
        info['ctime'] = timestamp_to_isoformat_timestr(user.ctime)

        try:
            last_login = UserLastLogin.objects.get(username=user.email)
            info['last_login'] = datetime_to_isoformat_timestr(last_login.last_login)
        except UserLastLogin.DoesNotExist:
            info['last_login'] = None

        # these two fields are designed to be compatible with the old API
        info['self_usage'] = info.get('quota_usage')
        info['quota'] = info.get('quota_total')

        return Response(info)

    def delete(self, request, org_id, email):
        """Remove an organization user
        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            err_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, err_msg)

        # permission check
        org = request.user.org
        if not org_user_exists(org.org_id, user.username):
            err_msg = 'User %s does not exist in the organization.' % email
            return api_error(status.HTTP_404_NOT_FOUND, err_msg)

        user.delete()
        unset_org_user(org.org_id, user.username)

        return Response({'success': True})


def get_user_info(email, org_id):

    info = {}
    info['email'] = email
    info['name'] = email2nickname(email)
    info['contact_email'] = email2contact_email(email)

    try:
        info['quota_usage'] = get_org_user_self_usage(org_id, email)
        info['quota_total'] = get_org_user_quota(org_id, email)
    except SearpcError as e:
        logger.error(e)
        info['quota_usage'] = -1
        info['quota_total'] = -1

    return info


class OrgAdminSearchUser(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):
        """Search organization user
        """

        # resource check
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if request.user.org.org_id != org.org_id:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        query = request.GET.get('query', '')
        if not query:
            error_msg = 'query invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        all_org_users = ccnet_api.get_org_users_by_url_prefix(org.url_prefix, -1, -1)
        all_org_user_emails = [u.email for u in all_org_users]

        org_user_profiles = Profile.objects.filter(user__in=all_org_user_emails)
        profile_filtered_by_nickname = org_user_profiles.filter(nickname__icontains=query)
        profile_filtered_by_contact_email = org_user_profiles.filter(contact_email__icontains=query)

        profile_user_emails = [p.user for p in profile_filtered_by_nickname]
        profile_user_emails += [p.user for p in profile_filtered_by_contact_email]

        # search user
        result_emails = []

        for email in profile_user_emails:
            if email not in result_emails:
                result_emails.append(email)

        for email in all_org_user_emails:
            if query not in email:
                continue
            if email not in result_emails:
                result_emails.append(email)

        last_logins = UserLastLogin.objects.filter(username__in=result_emails)

        user_list = []
        for user in all_org_users:

            if user.email not in result_emails:
                continue

            user_info = get_user_info(user.email, org_id)

            # populate user last login time
            user_info['last_login'] = None
            for last_login in last_logins:
                if last_login.username == user.email:
                    user_info['last_login'] = datetime_to_isoformat_timestr(last_login.last_login)

            user_info['is_active'] = user.is_active
            user_info['is_staff'] = user.is_staff
            user_info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)

            user_list.append(user_info)

        return Response({'user_list': user_list})


class OrgAdminImportUsers(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def post(self, request, org_id):
        """ Import users from xlsx file

        Permission checking:
        1. admin user.
        """

        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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

        # example file is like:
        # Email    Password Name(Optional) Space Quota(MB, Optional)
        # a@a.com  a        a              1024
        # b@b.com  b        b              2048

        rows = wb.worksheets[0].rows
        records = []

        # skip first row(head field).
        next(rows)
        for row in rows:
            if not all(col.value is None for col in row):
                records.append([col.value for col in row])

        # check plan
        ccnet_db = CcnetDB()
        org_active_members_count = ccnet_db.count_org_active_users(org_id)
        if ORG_MEMBER_QUOTA_ENABLED:
            from seahub.organizations.models import OrgMemberQuota
            org_members_quota = OrgMemberQuota.objects.get_quota(request.user.org.org_id)
            if org_members_quota is not None and org_active_members_count+len(records) > org_members_quota:
                err_msg = 'The number of users exceeds the limit.'
                return api_error(status.HTTP_403_FORBIDDEN, err_msg)

        if user_number_over_limit(new_users=len(records)):
            error_msg = 'The number of users exceeds the limit.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []
        for record in records:
            if record[0]:
                email = record[0].strip()
                if not is_valid_email(email):
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

            if not record[1] or not str(record[1]).strip():
                result['failed'].append({
                    'email': email,
                    'error_msg': 'password invalid.'
                })
                continue
            else:
                password = str(record[1]).strip()

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

            user = User.objects.create_user(email, password, is_staff=False, is_active=True)
            set_org_user(org_id, user.email)

            if IS_EMAIL_CONFIGURED:
                if SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER:
                    try:
                        send_user_add_mail(request, email, password)
                    except Exception as e:
                        logger.error(str(e))

            # update the user's optional info
            # update nikename
            if record[2]:
                try:
                    nickname = record[2].strip()
                    if len(nickname) <= 64 and '/' not in nickname:
                        Profile.objects.add_or_update(user.email, nickname, '')
                except Exception as e:
                    logger.error(e)

            # update quota
            if record[3]:
                try:
                    space_quota_mb = int(record[3])
                    if space_quota_mb >= 0:
                        space_quota = int(space_quota_mb) * get_file_size_unit('MB')
                        seafile_api.set_org_user_quota(org_id, user.email, space_quota)
                except Exception as e:
                    logger.error(e)

            info = {}
            info['email'] = user.email
            info['name'] = email2nickname(user.email)
            info['contact_email'] = email2contact_email(user.email)

            info['is_staff'] = user.is_staff
            info['is_active'] = user.is_active

            info['quota_usage'] = 0
            try:
                info['quota_total'] = get_org_user_quota(org_id, user.email)
            except SearpcError as e:
                logger.error(e)
                info['quota_total'] = -1

            info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)
            info['last_login'] = None

            result['success'].append(info)

        return Response(result)


class OrgAdminInviteUser(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def post(self, request, org_id):

        """Invite organization user
        """
        if not ORG_ENABLE_ADMIN_INVITE_USER:
            error_msg = _('Feature disabled.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not IS_EMAIL_CONFIGURED:
            error_msg = _('Failed to send email, email service is not properly configured, please contact administrator.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # parameter check
        email_list = request.data.getlist("email", None)
        if not email_list:
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = f'Organization {org_id} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check plan
        ccnet_db = CcnetDB()
        org_active_members_count = ccnet_db.count_org_active_users(org_id)
        if ORG_MEMBER_QUOTA_ENABLED:
            org_members_quota = OrgMemberQuota.objects.get_quota(request.user.org.org_id)
            if org_members_quota is not None and \
                    org_active_members_count + len(email_list) > org_members_quota:
                err_msg = _('The number of users exceeds the limit')
                return api_error(status.HTTP_403_FORBIDDEN, err_msg)

        if user_number_over_limit(len(email_list)):
            err_msg = _('The number of users exceeds the limit')
            return api_error(status.HTTP_403_FORBIDDEN, err_msg)

        username = request.user.username
        quota_total = seafile_api.get_org_quota(org_id)

        # add user
        result = {}
        result['failed'] = []
        result['success'] = []

        for email in email_list:

            vid = get_virtual_id_by_email(email)
            try:
                User.objects.get(email=vid)
                result['failed'].append({
                    'email': email,
                    'error_msg': _(f'User {email} already exists.')
                })
                continue
            except User.DoesNotExist:
                new_user = User.objects.create_user(email, '!',
                                                    is_staff=False,
                                                    is_active=False)
                set_org_user(org_id, new_user.username)

            # send invitation link
            i = Invitation.objects.add(inviter=username,
                                       accepter=email,
                                       invite_type=DEFAULT_USER)
            i.send_to(email=email, org_name=org.org_name)

            user_info = {}
            user_info['email'] = email
            user_info['name'] = email2nickname(email)
            user_info['contact_email'] = email2contact_email(email)
            user_info['is_staff'] = False
            user_info['is_active'] = False
            user_info['create_time'] = timestamp_to_isoformat_timestr(new_user.ctime)
            user_info['quota_usage'] = 0
            user_info['quota_total'] = quota_total
            user_info['last_login'] = ''
            result['success'].append(user_info)

        return Response(result)
