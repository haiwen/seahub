# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
from types import FunctionType
from constance import config

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache
from django.utils.translation import ugettext as _

from seaserv import seafile_api, ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean

import seahub.settings as settings
from seahub.settings import SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER, INIT_PASSWD, \
    SEND_EMAIL_ON_RESETTING_USER_PASSWD
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.base.accounts import User
from seahub.base.models import UserLastLogin
from seahub.two_factor.models import default_device
from seahub.profile.models import Profile, DetailedProfile
from seahub.profile.settings import CONTACT_CACHE_TIMEOUT, CONTACT_CACHE_PREFIX, \
    NICKNAME_CACHE_PREFIX, NICKNAME_CACHE_TIMEOUT
from seahub.utils import is_valid_username, is_org_context, \
        is_pro_version, normalize_cache_key, is_valid_email, \
        IS_EMAIL_CONFIGURED, send_html_email, get_site_name
from seahub.utils.file_size import get_file_size_unit
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, datetime_to_isoformat_timestr
from seahub.utils.user_permissions import get_user_role
from seahub.utils.repo import normalize_repo_status_code
from seahub.constants import DEFAULT_ADMIN
from seahub.role_permissions.models import AdminRole
from seahub.role_permissions.utils import get_available_roles
from seahub.utils.licenseparse import user_number_over_limit
from seahub.constants import DEFAULT_USER
from seahub.institutions.models import Institution
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.admin_log.signals import admin_operation
from seahub.admin_log.models import USER_DELETE, USER_ADD
from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner
from seahub.group.utils import group_id_to_name

from seahub.options.models import UserOptions
from seahub.share.models import FileShare, UploadLinkShare

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'


def get_user_upload_link_info(uls):
    data = {}

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

    data['repo_name'] = repo.repo_name if repo else ''
    data['path'] = path
    data['token'] = uls.token
    data['obj_name'] = obj_name
    data['view_cnt'] = uls.view_cnt

    return data


def get_user_share_link_info(fileshare):
    data = {}

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

    data['repo_name'] = repo.repo_name if repo else ''
    data['token'] = fileshare.token

    data['path'] = path
    data['obj_name'] = obj_name
    data['is_dir'] = True if fileshare.s_type == 'd' else False

    data['view_cnt'] = fileshare.view_cnt

    if fileshare.s_type == 'f':
        obj_id = seafile_api.get_file_id_by_path(repo_id, path)
        data['size'] = seafile_api.get_file_size(repo.store_id,
                repo.version, obj_id)
    else:
        data['size'] = 0

    return data


def create_user_info(request, email, role, nickname, contact_email, quota_total_mb):
    # update additional user info

    if is_pro_version() and role:
        User.objects.update_role(email, role)

    if nickname is not None:
        Profile.objects.add_or_update(email, nickname)
        key = normalize_cache_key(nickname, NICKNAME_CACHE_PREFIX)
        cache.set(key, nickname, NICKNAME_CACHE_TIMEOUT)

    if contact_email is not None:
        Profile.objects.add_or_update(email, contact_email=contact_email)
        key = normalize_cache_key(email, CONTACT_CACHE_PREFIX)
        cache.set(key, contact_email, CONTACT_CACHE_TIMEOUT)

    if quota_total_mb:
        quota_total = int(quota_total_mb) * get_file_size_unit('MB')
        if is_org_context(request):
            org_id = request.user.org.org_id
            seafile_api.set_org_user_quota(org_id, email, quota_total)
        else:
            seafile_api.set_user_quota(email, quota_total)


def update_user_info(request, user, password, is_active, is_staff, role,
                     nickname, login_id, contact_email, reference_id, quota_total_mb, institution_name):

    # update basic user info
    if is_active is not None:
        user.is_active = is_active

    if password:
        user.set_password(password)

    if is_staff is not None:
        user.is_staff = is_staff

    # update user
    user.save()

    email = user.username

    # update additional user info
    if is_pro_version() and role:
        User.objects.update_role(email, role)

    if nickname is not None:
        Profile.objects.add_or_update(email, nickname)
        key = normalize_cache_key(nickname, NICKNAME_CACHE_PREFIX)
        cache.set(key, nickname, NICKNAME_CACHE_TIMEOUT)

    if login_id is not None:
        Profile.objects.add_or_update(email, login_id=login_id)

    if contact_email is not None:
        Profile.objects.add_or_update(email, contact_email=contact_email)
        key = normalize_cache_key(email, CONTACT_CACHE_PREFIX)
        cache.set(key, contact_email, CONTACT_CACHE_TIMEOUT)

    if reference_id is not None:
        if reference_id.strip():
            ccnet_api.set_reference_id(email, reference_id.strip())
        else:
            # remove reference id
            ccnet_api.set_reference_id(email, None)

    if institution_name is not None:
        Profile.objects.add_or_update(email, institution=institution_name)

    if quota_total_mb:
        quota_total = int(quota_total_mb) * get_file_size_unit('MB')
        orgs = ccnet_api.get_orgs_by_user(email)
        try:
            if orgs:
                org_id = orgs[0].org_id
                seafile_api.set_org_user_quota(org_id, email, quota_total)
            else:
                seafile_api.set_user_quota(email, quota_total)
        except Exception as e:
            logger.error(e)
            seafile_api.set_user_quota(email, -1)

def get_user_info(email):

    user = User.objects.get(email=email)
    profile = Profile.objects.get_profile_by_user(email)

    info = {}
    info['email'] = email
    info['name'] = email2nickname(email)
    info['contact_email'] = profile.contact_email if profile and profile.contact_email else ''
    info['login_id'] = profile.login_id if profile and profile.login_id else ''

    info['is_staff'] = user.is_staff
    info['is_active'] = user.is_active
    info['reference_id'] = user.reference_id if user.reference_id else ''

    orgs = ccnet_api.get_orgs_by_user(email)
    try:
        if orgs:
            org_id = orgs[0].org_id
            info['org_id'] = org_id
            info['org_name'] = orgs[0].org_name
            info['quota_usage'] = seafile_api.get_org_user_quota_usage(org_id, user.email)
            info['quota_total'] = seafile_api.get_org_user_quota(org_id, user.email)
        else:
            info['quota_usage'] = seafile_api.get_user_self_usage(user.email)
            info['quota_total'] = seafile_api.get_user_quota(user.email)
    except Exception as e:
        logger.error(e)
        info['quota_usage'] = -1
        info['quota_total'] = -1

    info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)

    info['has_default_device'] = True if default_device(user) else False
    info['is_force_2fa'] = UserOptions.objects.is_force_2fa(email)

    if getattr(settings, 'MULTI_INSTITUTION', False):
        info['institution'] = profile.institution if profile else ''

    info['role'] = get_user_role(user)

    return info


class AdminAdminUsers(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """List all admins from database and ldap imported
        """
        try:
            admin_users = ccnet_api.get_superusers()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        admin_users_info = []
        for user in admin_users:
            user_info = {}
            profile = Profile.objects.get_profile_by_user(user.email)
            user_info['email'] = user.email
            user_info['name'] = email2nickname(user.email)
            user_info['contact_email'] = email2contact_email(user.email)
            user_info['login_id'] = profile.login_id if profile and profile.login_id else ''

            user_info['is_staff'] = user.is_staff
            user_info['is_active'] = user.is_active

            orgs = ccnet_api.get_orgs_by_user(user.email)
            try:
                if orgs:
                    org_id = orgs[0].org_id
                    user_info['org_id'] = org_id
                    user_info['org_name'] = orgs[0].org_name
                    user_info['quota_usage'] = seafile_api.get_org_user_quota_usage(org_id, user.email)
                    user_info['quota_total'] = seafile_api.get_org_user_quota(org_id, user.email)
                else:
                    user_info['quota_usage'] = seafile_api.get_user_self_usage(user.email)
                    user_info['quota_total'] = seafile_api.get_user_quota(user.email)
            except Exception as e:
                logger.error(e)
                user_info['quota_usage'] = -1
                user_info['quota_total'] = -1

            user_info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)
            last_login_obj = UserLastLogin.objects.get_by_username(user.email)
            user_info['last_login'] = datetime_to_isoformat_timestr(last_login_obj.last_login) if last_login_obj else ''

            try:
                admin_role = AdminRole.objects.get_admin_role(user.email)
                user_info['admin_role'] = admin_role.role
            except AdminRole.DoesNotExist:
                user_info['admin_role'] = DEFAULT_ADMIN
            admin_users_info.append(user_info)

        result = {
            'admin_user_list': admin_users_info,
        }
        return Response(result)

class AdminUsers(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """List all users in DB or LDAPImport

        Permission checking:
        1. only admin can perform this action.
        """

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25

        start = (page - 1) * per_page

        # source: 'DB' or 'LDAPImport', default is 'DB'
        source = request.GET.get('source', 'DB')
        source = source.lower()
        if source not in ['db', 'ldapimport']:
            error_msg = 'source %s invalid.' % source
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if source == 'db':
            users = ccnet_api.get_emailusers('DB', start, per_page)
            total_count = ccnet_api.count_emailusers('DB') + \
                          ccnet_api.count_inactive_emailusers('DB')
        elif source == 'ldapimport':
            users = ccnet_api.get_emailusers('LDAPImport', start, per_page)
            # api param is 'LDAP', but actually get count of 'LDAPImport' users
            total_count = ccnet_api.count_emailusers('LDAP') + \
                          ccnet_api.count_inactive_emailusers('LDAP')

        data = []
        for user in users:
            profile = Profile.objects.get_profile_by_user(user.email)

            info = {}
            info['email'] = user.email
            info['name'] = email2nickname(user.email)
            info['contact_email'] = email2contact_email(user.email)
            info['login_id'] = profile.login_id if profile and profile.login_id else ''

            info['is_staff'] = user.is_staff
            info['is_active'] = user.is_active

            orgs = ccnet_api.get_orgs_by_user(user.email)
            try:
                if orgs:
                    org_id = orgs[0].org_id
                    info['org_id'] = org_id
                    info['org_name'] = orgs[0].org_name
                    info['quota_usage'] = seafile_api.get_org_user_quota_usage(org_id, user.email)
                    info['quota_total'] = seafile_api.get_org_user_quota(org_id, user.email)
                else:
                    info['quota_usage'] = seafile_api.get_user_self_usage(user.email)
                    info['quota_total'] = seafile_api.get_user_quota(user.email)
            except Exception as e:
                logger.error(e)
                info['quota_usage'] = -1
                info['quota_total'] = -1

            info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)
            last_login_obj = UserLastLogin.objects.get_by_username(user.email)
            info['last_login'] = datetime_to_isoformat_timestr(last_login_obj.last_login) if last_login_obj else ''
            info['role'] = get_user_role(user)
            if getattr(settings, 'MULTI_INSTITUTION', False):
                info['institution'] = profile.institution if profile else ''

            data.append(info)

        result = {'data': data, 'total_count': total_count}
        return Response(result)

    def post(self, request):

        if user_number_over_limit():
            error_msg = _("The number of users exceeds the limit.")
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        email = request.data.get('email', None)
        if not email or not is_valid_username(email):
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # basic user info check
        is_staff = request.data.get("is_staff", 'False')
        try:
            is_staff = to_python_boolean(is_staff)
        except ValueError:
            error_msg = 'is_staff invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_active = request.data.get("is_active", 'True')
        try:
            is_active = to_python_boolean(is_active)
        except ValueError:
            error_msg = 'is_active invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # additional user info check
        role = request.data.get("role", None)
        if role:
            available_roles = get_available_roles()
            if role.lower() not in available_roles:
                error_msg = 'role must be in %s.' % str(available_roles)
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        name = request.data.get("name", None)
        if name:
            if len(name) > 64:
                error_msg = 'Name is too long (maximum is 64 characters).'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if "/" in name:
                error_msg = "Name should not include '/'."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        contact_email = request.data.get('contact_email', None)
        if contact_email and not is_valid_username(contact_email):
            error_msg = 'contact_email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

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

            if is_org_context(request):
                org_id = request.user.org.org_id
                org_quota_mb = seafile_api.get_org_quota(org_id) / \
                        get_file_size_unit('MB')

                if quota_total_mb > org_quota_mb:
                    error_msg = 'Failed to set quota: maximum quota is %d MB' % org_quota_mb
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            User.objects.get(email=email)
            user_exist = True
        except User.DoesNotExist:
            user_exist = False

        if user_exist:
            error_msg = "User %s already exists." % email
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        password = request.data.get('password', None)
        if not password:
            error_msg = 'password required.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # create user
        try:
            user_obj = User.objects.create_user(email, password, is_staff, is_active)
            create_user_info(request, email=user_obj.username, role=role,
                             nickname=name, contact_email=contact_email,
                             quota_total_mb=quota_total_mb)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        add_user_tip = _('Successfully added user %(user)s.') % {'user': email}
        if IS_EMAIL_CONFIGURED and SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER:
            c = {'user': request.user.username, 'email': email, 'password': password}
            try:
                send_html_email(_('You are invited to join %s') % get_site_name(),
                        'sysadmin/user_add_email.html', c, None, [email])
                add_user_tip = _('Successfully added user %(user)s. An email notification has been sent.') % {'user': email}
            except Exception as e:
                logger.error(str(e))
                add_user_tip = _('Successfully added user %(user)s. But email notification can not be sent, because Email service is not properly configured.') % {'user': email}

        user_info = get_user_info(email)
        user_info['add_user_tip'] = add_user_tip

        # send admin operation log signal
        admin_op_detail = {
            "email": email,
        }
        admin_operation.send(sender=None, admin_name=request.user.username,
                             operation=USER_ADD, detail=admin_op_detail)

        return Response(user_info)


class AdminLDAPUsers(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """List all users from LDAP server

        Permission checking:
        1. only admin can perform this action.
        """

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25

        start = (page - 1) * per_page
        end = page * per_page + 1
        users = ccnet_api.get_emailusers('LDAP', start, end)

        if len(users) == end - start:
            users = users[:per_page]
            has_next_page = True
        else:
            has_next_page = False

        data = []
        for user in users:
            info = {}
            info['email'] = user.email
            info['quota_total'] = seafile_api.get_user_quota(user.email)
            info['quota_usage'] = seafile_api.get_user_self_usage(user.email)
            info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)
            last_login_obj = UserLastLogin.objects.get_by_username(user.email)
            info['last_login'] = datetime_to_isoformat_timestr(last_login_obj.last_login) if last_login_obj else ''
            data.append(info)

        result = {'ldap_user_list': data, 'has_next_page': has_next_page}
        return Response(result)

class AdminUser(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, email):

        avatar_size = request.data.get('avatar_size', 64)
        try:
            avatar_size = int(avatar_size)
        except Exception as e:
            logger.error(e)
            error_msg = 'avatar_size invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        user_info = get_user_info(email)
        user_info['avatar_url'], _, _ = api_avatar_url(email, avatar_size)

        return Response(user_info)

    def put(self, request, email):

        # basic user info check
        is_staff = request.data.get("is_staff", None)
        if is_staff:
            try:
                is_staff = to_python_boolean(is_staff)
            except ValueError:
                error_msg = 'is_staff invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_active = request.data.get("is_active", None)
        if is_active:
            try:
                is_active = to_python_boolean(is_active)
            except ValueError:
                error_msg = 'is_active invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # additional user info check
        role = request.data.get("role", None)
        if role:
            available_roles = get_available_roles()
            if role.lower() not in available_roles:
                error_msg = 'role must be in %s.' % str(available_roles)
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        name = request.data.get("name", None)
        if name:
            if len(name) > 64:
                error_msg = 'Name is too long (maximum is 64 characters).'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if "/" in name:
                error_msg = "Name should not include '/'."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # argument check for login_id
        login_id = request.data.get("login_id", None)
        if login_id is not None:
            login_id = login_id.strip()
            username_by_login_id = Profile.objects.get_username_by_login_id(login_id)
            if username_by_login_id is not None:
                return api_error(status.HTTP_400_BAD_REQUEST, 
                                 _("Login id %s already exists." % login_id))

        contact_email = request.data.get("contact_email", None)
        if contact_email is not None and contact_email.strip() != '':
            if not is_valid_email(contact_email):
                error_msg = 'Contact email invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        password = request.data.get("password")

        reference_id = request.data.get("reference_id", "")
        if reference_id:
            if ' ' in reference_id:
                return api_error(status.HTTP_400_BAD_REQUEST, 'Reference ID can not contain spaces.')
            primary_id = ccnet_api.get_primary_id(reference_id)
            if primary_id:
                return api_error(status.HTTP_400_BAD_REQUEST, 'Reference ID %s already exists.' % reference_id)

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

            if is_org_context(request):
                org_id = request.user.org.org_id
                org_quota_mb = seafile_api.get_org_quota(org_id) / \
                        get_file_size_unit('MB')

                if quota_total_mb > org_quota_mb:
                    error_msg = 'Failed to set quota: maximum quota is %d MB' % org_quota_mb
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        institution = request.data.get("institution", None)
        if institution:
            try:
                Institution.objects.get(name=institution)
            except Institution.DoesNotExist:
                error_msg = 'Institution %s does not exist' % institution
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # query user info
        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            update_user_info(request, user=user_obj, password=password, is_active=is_active, is_staff=is_staff,
                             role=role, nickname=name, login_id=login_id, contact_email=contact_email,
                             reference_id=reference_id, quota_total_mb=quota_total_mb, institution_name=institution)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # update user
        try:
            user_obj.save()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal server error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        update_status_tip = ''
        if is_active is not None:
            update_status_tip = _('Edit succeeded')
            if user_obj.is_active and IS_EMAIL_CONFIGURED:
                try:
                    send_html_email(_(u'Your account on %s is activated') % get_site_name(),
                                    'sysadmin/user_activation_email.html', {'username': user_obj.email}, None, [user_obj.email])
                    update_status_tip = _('Edit succeeded, an email has been sent.')
                except Exception as e:
                    logger.error(e)
                    update_status_tip = _('Edit succeeded, but failed to send email, please check your email configuration.')

        user_info = get_user_info(email)
        user_info['update_status_tip'] = update_status_tip

        return Response(user_info)

    def delete(self, request, email):

        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # delete user
        try:
            User.objects.get(email=email).delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # send admin operation log signal
        admin_op_detail = {
            "email": email,
        }
        admin_operation.send(sender=None, admin_name=request.user.username,
                             operation=USER_DELETE, detail=admin_op_detail)

        return Response({'success': True})


class AdminUserResetPassword(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, email):
        """Reset password for user

        Permission checking:
        1. only admin can perform this action.
        """

        if not is_valid_username(email):
            error_msg = 'email invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist as e:
            logger.error(e)
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if isinstance(INIT_PASSWD, FunctionType):
            new_password = INIT_PASSWD()
        else:
            new_password = INIT_PASSWD
        user.set_password(new_password)
        user.save()

        if config.FORCE_PASSWORD_CHANGE:
            UserOptions.objects.set_force_passwd_change(user.username)

        if IS_EMAIL_CONFIGURED:
            if SEND_EMAIL_ON_RESETTING_USER_PASSWD:
                c = {'email': email, 'password': new_password}
                contact_email = Profile.objects.get_contact_email_by_user(email)
                try:
                    send_html_email(_(u'Password has been reset on %s') % get_site_name(),
                                'sysadmin/user_reset_email.html', c, None, [contact_email])
                    reset_tip = _('Successfully reset password to %(passwd)s, an email has been sent to %(user)s.') % \
                        {'passwd': new_password, 'user': contact_email}
                except Exception as e:
                    logger.warning(e)
                    reset_tip = _('Successfully reset password to %(passwd)s, but failed to send email to %(user)s, please check your email configuration.') % \
                        {'passwd': new_password, 'user': email}
            else:
                reset_tip = _('Successfully reset password to %(passwd)s for user %(user)s.') % \
                    {'passwd': new_password, 'user': email}
        else:
            reset_tip = _('Successfully reset password to %(passwd)s for user %(user)s. But email notification can not be sent, because Email service is not properly configured.') % \
                {'passwd': new_password, 'user': email}

        return Response({'new_password': new_password, 'reset_tip': reset_tip})


class AdminUserGroups(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, email):
        """ return all groups user joined

        Permission checking:
        1. Admin user;
        """

        if not is_valid_username(email):
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            User.objects.get(email=email)
        except User.DoesNotExist as e:
            logger.error(e)
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        groups_info = []
        try:
            groups = ccnet_api.get_personal_groups_by_user(email)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # Use dict to reduce memcache fetch cost in large for-loop.
        nickname_dict = {}
        creator_name_set = set([g.creator_name for g in groups])
        for e in creator_name_set:
            if e not in nickname_dict:
                nickname_dict[e] = email2nickname(e)

        for group in groups:
            isoformat_timestr = timestamp_to_isoformat_timestr(group.timestamp)
            group_info = {
                "id": group.id,
                "name": group.group_name,
                "owner_email": group.creator_name,
                "owner_name": nickname_dict.get(group.creator_name, ''),
                "created_at": isoformat_timestr,
                "parent_group_id": group.parent_group_id if is_pro_version() else 0
            }
            groups_info.append(group_info)

            try:
                is_group_staff = ccnet_api.check_group_staff(group.id, email)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if email == group.creator_name:
                group_info['role'] = 'Owner'
            elif is_group_staff:
                group_info['role'] = 'Admin'
            else:
                group_info['role'] = 'Member'
        return Response({'group_list': groups_info})


class AdminUserShareLinks(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, email):
        """ Get all shared download links of a user.

        Permission checking:
        1. only admin can perform this action.
        """
        if not is_valid_username(email):
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            User.objects.get(email=email)
        except User.DoesNotExist as e:
            logger.error(e)
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        share_links = FileShare.objects.filter(username=email)

        links_info = []
        for fs in share_links:
            link_info = get_user_share_link_info(fs)
            links_info.append(link_info)

        return Response({'share_link_list': links_info})


class AdminUserUploadLinks(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, email):
        """ Get all shared upload links of a user.

        Permission checking:
        1. only admin can perform this action.
        """

        if not is_valid_username(email):
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            User.objects.get(email=email)
        except User.DoesNotExist as e:
            logger.error(e)
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        upload_links = UploadLinkShare.objects.filter(username=email)

        links_info = []
        for fs in upload_links:
            link_info = get_user_upload_link_info(fs)
            links_info.append(link_info)

        return Response({'upload_link_list': links_info})


class AdminUserBeSharedRepos(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, email):
        """ List 'all' libraries shared to a user

        Permission checking:
        1. only admin can perform this action.
        """

        if not is_valid_username(email):
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            User.objects.get(email=email)
        except User.DoesNotExist as e:
            logger.error(e)
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            beshared_repos = seafile_api.get_share_in_repo_list(email, -1, -1)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # Use dict to reduce memcache fetch cost in large for-loop.
        nickname_dict = {}
        owner_set = set([x.user for x in beshared_repos])
        for email in owner_set:
            if email not in nickname_dict:
                if '@seafile_group' in email:
                    group_id = get_group_id_by_repo_owner(email)
                    group_name= group_id_to_name(group_id)
                    nickname_dict[email] = group_name
                else:
                    nickname_dict[email] = email2nickname(email)

        repos_info = []
        for repo in beshared_repos:
            repo_info = {}
            repo_info['id'] = repo.repo_id
            repo_info['name'] = repo.repo_name
            repo_info['owner_email'] = repo.user
            repo_info['owner_name'] = nickname_dict.get(repo.user, '')
            repo_info['size'] = repo.size
            repo_info['encrypted'] = repo.encrypted
            repo_info['file_count'] = repo.file_count
            repo_info['status'] = normalize_repo_status_code(repo.status)
            repo_info['last_modify'] = timestamp_to_isoformat_timestr(repo.last_modify)

            repos_info.append(repo_info)

        return Response({'repo_list': repos_info})
