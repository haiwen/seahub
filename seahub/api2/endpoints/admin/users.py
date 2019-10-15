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

from seahub.settings import SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER, INIT_PASSWD, \
    SEND_EMAIL_ON_RESETTING_USER_PASSWD
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.base.accounts import User
from seahub.base.models import UserLastLogin
from seahub.two_factor.models import default_device
from seahub.profile.models import Profile, DetailedProfile
from seahub.profile.settings import CONTACT_CACHE_TIMEOUT, CONTACT_CACHE_PREFIX
from seahub.utils import is_valid_username, is_org_context, \
        is_pro_version, normalize_cache_key, is_valid_email, \
        IS_EMAIL_CONFIGURED, send_html_email, get_site_name
from seahub.utils.file_size import get_file_size_unit
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils.repo import normalize_repo_status_code
from seahub.constants import DEFAULT_ADMIN
from seahub.role_permissions.models import AdminRole
from seahub.role_permissions.utils import get_available_roles
from seahub.utils.licenseparse import user_number_over_limit

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

    data['path'] = path
    data['obj_name'] = obj_name
    data['is_dir'] = True if fileshare.s_type == 'd' else False

    data['view_cnt'] = fileshare.view_cnt

    if fileshare.s_type == 'f':
        obj_id = seafile_api.get_file_id_by_path(repo_id, path)
        data['size'] = seafile_api.get_file_size(repo.store_id,
                repo.version, obj_id)
    else:
        data['size'] = ''

    return data


def update_user_info(request, user):

    # update basic user info
    password = request.data.get("password")
    if password:
        user.set_password(password)

    is_staff = request.data.get("is_staff")
    if is_staff:
        is_staff = to_python_boolean(is_staff)
        user.is_staff = is_staff

    is_active = request.data.get("is_active")
    if is_active:
        is_active = to_python_boolean(is_active)
        user.is_active = is_active
        if user.is_active:
            try:
                send_html_email(_(u'Your account on %s is activated') % get_site_name(),
                                'sysadmin/user_activation_email.html', {'username': user.email}, None, [user.email])
            except Exception as e:
                logger.error(e)

    # update user
    user.save()

    email = user.username

    # update additional user info
    if is_pro_version():
        role = request.data.get("role")
        if role:
            User.objects.update_role(email, role)

    nickname = request.data.get("name", None)
    if nickname is not None:
        Profile.objects.add_or_update(email, nickname)

    # update account login_id
    login_id = request.data.get("login_id", None)
    if login_id is not None:
        Profile.objects.add_or_update(email, login_id=login_id)

    # update account contact email
    contact_email = request.data.get('contact_email', None)
    if contact_email is not None:
        Profile.objects.add_or_update(email, contact_email=contact_email)
        key = normalize_cache_key(email, CONTACT_CACHE_PREFIX)
        cache.set(key, contact_email, CONTACT_CACHE_TIMEOUT)

    reference_id = request.data.get("reference_id", None)
    if reference_id is not None:
        if reference_id.strip():
            ccnet_api.set_reference_id(email, reference_id.strip())
        else:
            # remove reference id
            ccnet_api.set_reference_id(email, None)

    department = request.data.get("department")
    if department:
        d_profile = DetailedProfile.objects.get_detailed_profile_by_user(email)
        if d_profile is None:
            d_profile = DetailedProfile(user=email)

        d_profile.department = department
        d_profile.save()

    quota_total_mb = request.data.get("quota_total")
    if quota_total_mb:
        quota_total = int(quota_total_mb) * get_file_size_unit('MB')
        if is_org_context(request):
            org_id = request.user.org.org_id
            seafile_api.set_org_user_quota(org_id, email, quota_total)
        else:
            seafile_api.set_user_quota(email, quota_total)

def get_user_info(email):

    user = User.objects.get(email=email)
    d_profile = DetailedProfile.objects.get_detailed_profile_by_user(email)
    profile = Profile.objects.get_profile_by_user(email)

    info = {}
    info['email'] = email
    info['name'] = email2nickname(email)
    info['contact_email'] = profile.contact_email if profile and profile.contact_email else ''
    info['login_id'] = profile.login_id if profile and profile.login_id else ''

    info['is_staff'] = user.is_staff
    info['is_active'] = user.is_active
    info['reference_id'] = user.reference_id if user.reference_id else ''

    info['department'] = d_profile.department if d_profile else ''

    info['quota_total'] = seafile_api.get_user_quota(email)
    info['quota_usage'] = seafile_api.get_user_self_usage(email)

    info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)

    info['has_default_device'] = True if default_device(user) else False
    info['is_force_2fa'] = UserOptions.objects.is_force_2fa(email)

    if is_pro_version():
        info['role'] = user.role

    return info


class AdminAdminUsers(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """List all admins from database and ldap imported
        """
        try:
            db_users = ccnet_api.get_emailusers('DB', -1, -1)
            ldap_imported_users = ccnet_api.get_emailusers('LDAPImport', -1, -1)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        admin_users = []
        for user in db_users + ldap_imported_users:
            if user.is_staff is True:
                admin_users.append(user)

        admin_users_info = []
        for user in admin_users:
            user_info = {}
            profile = Profile.objects.get_profile_by_user(user.email)
            user_info['email'] = user.email
            user_info['name'] = email2nickname(user.email)
            user_info['contact_email'] = profile.contact_email if profile and profile.contact_email else ''
            user_info['login_id'] = profile.login_id if profile and profile.login_id else ''

            user_info['is_staff'] = user.is_staff
            user_info['is_active'] = user.is_active

            user_info['quota_total'] = seafile_api.get_user_quota(user.email)
            user_info['quota_usage'] = seafile_api.get_user_self_usage(user.email)

            user_info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)
            user_info['last_login'] = UserLastLogin.objects.get_by_username(user.email).last_login if UserLastLogin.objects.get_by_username(user.email) else ''

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

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25

        start = (page - 1) * per_page
        end = start + per_page
        users = ccnet_api.get_emailusers('DB', start, end)
        total_count = ccnet_api.count_emailusers('DB') + \
                ccnet_api.count_inactive_emailusers('DB')

        data = []
        for user in users:
            profile = Profile.objects.get_profile_by_user(user.email)

            info = {}
            info['email'] = user.email
            info['name'] = email2nickname(user.email)
            info['contact_email'] = profile.contact_email if profile and profile.contact_email else ''
            info['login_id'] = profile.login_id if profile and profile.login_id else ''

            info['is_staff'] = user.is_staff
            info['is_active'] = user.is_active

            info['quota_total'] = seafile_api.get_user_quota(user.email)
            info['quota_usage'] = seafile_api.get_user_self_usage(user.email)

            info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)
            info['last_login'] = UserLastLogin.objects.get_by_username(user.email).last_login if UserLastLogin.objects.get_by_username(user.email) else ''

            if is_pro_version():
                info['role'] = user.role

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

        department = request.data.get("department", None)
        if department:
            if len(department) > 512:
                error_msg = "Department is too long (maximum is 512 characters)."
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
            user_obj = User.objects.create_user(email)
            update_user_info(request, user_obj)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if IS_EMAIL_CONFIGURED and SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER:
            c = {'user': request.user.username, 'email': email, 'password': password}
            try:
                send_html_email(_('You are invited to join %s') % get_site_name(),
                        'sysadmin/user_add_email.html', c, None, [email])
            except Exception as e:
                logger.error(str(e))

        user_info = get_user_info(email)

        return Response(user_info)


class AdminUser(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, email):

        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        user_info = get_user_info(email)
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
            profile = Profile.objects.get_profile_by_contact_email(contact_email)
            if profile:
                error_msg = 'Contact email %s already exists.' % contact_email
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        reference_id = request.data.get("reference_id", "")
        if reference_id:
            if ' ' in reference_id:
                return api_error(status.HTTP_400_BAD_REQUEST, 'Reference ID can not contain spaces.')
            primary_id = ccnet_api.get_primary_id(reference_id)
            if primary_id:
                return api_error(status.HTTP_400_BAD_REQUEST, 'Reference ID %s already exists.' % reference_id)

        department = request.data.get("department", None)
        if department:
            if len(department) > 512:
                error_msg = "Department is too long (maximum is 512 characters)."
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

        # query user info
        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            update_user_info(request, user_obj)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        user_info = get_user_info(email)

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

        if IS_EMAIL_CONFIGURED and SEND_EMAIL_ON_RESETTING_USER_PASSWD:
            c = {'email': email, 'password': new_password}
            try:
                send_html_email(_(u'Password has been reset on %s') % get_site_name(),
                                'sysadmin/user_reset_email.html', c, None, [email])
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'new_password': new_password})


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
        for e in owner_set:
            if e not in nickname_dict:
                nickname_dict[e] = email2nickname(e)

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
