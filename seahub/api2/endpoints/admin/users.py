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

from django.db import connection
from django.db.models import Q
from django.core.cache import cache
from django.utils.translation import gettext as _
from django.utils.timezone import make_naive, is_aware
import ldap
from ldap import sasl
from ldap.controls.libldap import SimplePagedResultsControl

from seaserv import seafile_api, ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.utils import is_org_user
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean, get_user_common_info, get_user_contact_email
from seahub.api2.models import TokenV2
from seahub.organizations.models import OrgSettings
from seahub.organizations.views import gen_org_url_prefix
from seahub.utils.auth import can_user_update_password
from seahub.utils.ccnet_db import get_ccnet_db_name
import seahub.settings as settings
from seahub.settings import SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER, INIT_PASSWD, \
    SEND_EMAIL_ON_RESETTING_USER_PASSWD
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.base.accounts import User
from seahub.base.models import UserLastLogin
from seahub.two_factor.models import default_device
from seahub.profile.models import Profile
from seahub.profile.settings import CONTACT_CACHE_TIMEOUT, CONTACT_CACHE_PREFIX, \
    NICKNAME_CACHE_PREFIX, NICKNAME_CACHE_TIMEOUT
from seahub.utils import is_valid_username2, is_org_context, \
        is_pro_version, normalize_cache_key, is_valid_email, \
        IS_EMAIL_CONFIGURED, send_html_email, get_site_name, \
        gen_shared_link, gen_shared_upload_link
from seahub.utils.db_api import SeafileDB

from seahub.utils.file_size import get_file_size_unit, byte_to_kb
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, \
        datetime_to_isoformat_timestr
from seahub.utils.user_permissions import get_user_role
from seahub.utils.repo import normalize_repo_status_code
from seahub.utils.ccnet_db import CcnetDB
from seahub.constants import DEFAULT_ADMIN, DEFAULT_ORG
from seahub.role_permissions.models import AdminRole
from seahub.role_permissions.utils import get_available_roles
from seahub.utils.licenseparse import user_number_over_limit
from seahub.institutions.models import Institution
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.admin_log.signals import admin_operation
from seahub.admin_log.models import USER_DELETE, USER_ADD
from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner
from seahub.group.utils import group_id_to_name
from seahub.institutions.models import InstitutionAdmin
from seahub.auth.utils import get_virtual_id_by_email
from seahub.auth.models import SocialAuthUser

from seahub.options.models import UserOptions
from seahub.share.models import FileShare, UploadLinkShare, ExtraSharePermission, CustomSharePermissions
from seahub.utils.ldap import ENABLE_LDAP, LDAP_FILTER, ENABLE_SASL, SASL_MECHANISM, ENABLE_SSO_USER_CHANGE_PASSWORD, \
    LDAP_PROVIDER, LDAP_SERVER_URL, LDAP_BASE_DN, LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD, LDAP_LOGIN_ATTR, LDAP_USER_OBJECT_CLASS, \
    ENABLE_MULTI_LDAP, MULTI_LDAP_1_SERVER_URL, MULTI_LDAP_1_BASE_DN, MULTI_LDAP_1_ADMIN_DN, \
    MULTI_LDAP_1_ADMIN_PASSWORD, MULTI_LDAP_1_LOGIN_ATTR, \
    MULTI_LDAP_1_PROVIDER, MULTI_LDAP_1_FILTER, \
    MULTI_LDAP_1_ENABLE_SASL, MULTI_LDAP_1_SASL_MECHANISM, MULTI_LDAP_1_USER_OBJECT_CLASS, \
    MULTI_LDAP_1_PROVIDER, MULTI_LDAP_1_FILTER, MULTI_LDAP_1_ENABLE_SASL, MULTI_LDAP_1_SASL_MECHANISM, \
    LDAP_FOLLOW_REFERRALS, MULTI_LDAP_1_FOLLOW_REFERRALS

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'


class UserObj(object):
    def __init__(self, email, ctime, is_staff, is_active, role):
        self.email = email
        self.ctime = ctime
        self.is_staff = is_staff
        self.is_active = is_active
        self.role = role


def get_user_objs_from_ccnet(email_list):
    db_name = get_ccnet_db_name()

    if not email_list:
        return list(), None

    sql = """SELECT e.email, is_staff, is_active, ctime, role FROM `%s`.`EmailUser` e
             LEFT JOIN `%s`.`UserRole` r ON e.email=r.email WHERE e.email IN %%s""" % (db_name, db_name)
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, (email_list,))
            res = cursor.fetchall()
    except Exception as e:
        logger.error('Failed to query email_user object list from ccnet_db, error: %s.' % e)
        return list(), api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

    user_objs = list()
    for email, is_staff, is_active, ctime, role in res:
        user_objs.append(UserObj(email, ctime, is_staff, is_active, role))

    return user_objs, None


def ldap_bind(server_url, dn, authc_id, password, enable_sasl, sasl_mechanism, follow_referrals):
    bind_conn = ldap.initialize(server_url)

    try:
        bind_conn.set_option(ldap.OPT_REFERRALS, 1 if follow_referrals else 0)
    except Exception as e:
        raise Exception('Failed to set referrals option: %s' % e)

    try:
        bind_conn.protocol_version = ldap.VERSION3
        if enable_sasl and sasl_mechanism:
            sasl_cb_value_dict = {}
            if sasl_mechanism != 'EXTERNAL' and sasl_mechanism != 'GSSAPI':
                sasl_cb_value_dict = {
                    sasl.CB_AUTHNAME: authc_id,
                    sasl.CB_PASS: password,
                }
            sasl_auth = sasl.sasl(sasl_cb_value_dict, sasl_mechanism)
            bind_conn.sasl_interactive_bind_s('', sasl_auth)
        else:
            bind_conn.simple_bind_s(dn, password)
    except Exception as e:
        raise Exception('Failed to bind ldap server: %s' % e)

    return bind_conn


def get_ldap_users(server_url, admin_dn, admin_password, enable_sasl, sasl_mechanism, base_dn,
                   login_attr, serch_filter, object_class, follow_referrals):
    try:
        admin_bind = ldap_bind(server_url, admin_dn, admin_dn, admin_password, enable_sasl, sasl_mechanism, follow_referrals)
    except Exception as e:
        raise Exception(e)

    if serch_filter:
        filterstr = '(&(objectClass=%s)(%s))' % (object_class, serch_filter)
    else:
        filterstr = '(objectClass=%s)' % object_class

    result_data = []
    attr_list = [login_attr]
    base_list = base_dn.split(';')
    for base in base_list:
        if base == '':
            continue
        ctrl = SimplePagedResultsControl(True, size=100, cookie='')
        while True:
            try:
                result = admin_bind.search_ext(base, ldap.SCOPE_SUBTREE, filterstr, attr_list, serverctrls=[ctrl])
                rtype, rdata, rmsgid, ctrls = admin_bind.result3(result)
            except Exception as e:
                raise Exception('Failed to get users from ldap server: %s.' % e)

            result_data.extend(rdata)

            page_ctrls = [c for c in ctrls if c.controlType == SimplePagedResultsControl.controlType]
            if not page_ctrls or not page_ctrls[0].cookie:
                break
            ctrl.cookie = page_ctrls[0].cookie

    # get ldap user's uid list, uid means login_attr, likes: ['uid1', 'uid2', 'uid3', 'uid5', ...]
    ldap_uid_list = list()
    for pair in result_data:
        user_dn, attrs = pair
        if not isinstance(attrs, dict):
            continue
        if login_attr not in attrs:
            continue
        uid = attrs[login_attr][0].lower().decode()
        ldap_uid_list.append(uid)

    # get uid_email_map, likes {'uid2': '2@2.com', 'uid3': '3@3.com', 'uid4': '4@4.com', ...}
    imported_ldap_users = SocialAuthUser.objects.filter(provider__in=[LDAP_PROVIDER, MULTI_LDAP_1_PROVIDER],
                                                        uid__in=ldap_uid_list)
    uid_email_map = dict()
    for user in imported_ldap_users:
        uid_email_map[user.uid] = user.username

    users = list()
    email_list = list()
    for uid in ldap_uid_list:
        if uid in uid_email_map:
            email_list.append(uid_email_map[uid])
        else:
            users.append(UserObj(uid, None, None, None, None))

    user_objs, error = get_user_objs_from_ccnet(email_list)
    if error:
        raise Exception('Failed to query email_user object list from ccnet_db.')
    users.extend(user_objs)

    return users


def get_user_last_access_time(email, last_login_time):

    device_last_access = ''
    devices = TokenV2.objects.filter(user=email).order_by('-last_accessed')
    if devices:
        device_last_access = devices[0].last_accessed

    # before make_naive
    # 2021-04-09 05:32:30+00:00
    # tzinfo: UTC

    # after make_naive
    # 2021-04-09 13:32:30
    # tzinfo: None
    last_access_time_list = []
    if last_login_time:
        if is_aware(last_login_time):
            last_login_time = make_naive(last_login_time)
        last_access_time_list.append(last_login_time)

    if device_last_access:
        if is_aware(device_last_access):
            device_last_access = make_naive(device_last_access)
        last_access_time_list.append(device_last_access)

    if not last_access_time_list:
        return ''
    else:
        return datetime_to_isoformat_timestr(sorted(last_access_time_list)[-1])


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
    data['link'] = gen_shared_upload_link(uls.token)
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
    data['link'] = gen_shared_link(fileshare.token, fileshare.s_type)

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


def create_user_info(request, email, role, nickname,
                     contact_email, quota_total_mb,
                     login_id):
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

    if login_id is not None:
        Profile.objects.add_or_update(email, login_id=login_id)


def update_user_info(request, user, password, is_active, is_staff, role,
                     nickname, login_id, contact_email,
                     quota_total_mb, institution_name,
                     upload_rate_limit, download_rate_limit):

    email = user.username

    # update basic user info
    if is_active is not None:
        user.is_active = is_active
        if not is_active:
            # del tokens and personal repo api tokens (not department)
            from seahub.utils import inactive_user
            try:
                inactive_user(email)
            except Exception as e:
                logger.error("Failed to inactive_user %s: %s." % (email, e))

    if password:
        user.set_password(password)

    if is_staff is not None:
        user.is_staff = is_staff

    # update user
    user.save()

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

    if institution_name is not None:
        Profile.objects.add_or_update(email, institution=institution_name)
        if institution_name == '':
            InstitutionAdmin.objects.filter(user=email).delete()

    if quota_total_mb is not None:
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

    if is_pro_version() and upload_rate_limit is not None:
        seafile_api.set_user_upload_rate_limit(email, upload_rate_limit * 1000)

    if is_pro_version() and download_rate_limit is not None:
        seafile_api.set_user_download_rate_limit(email, download_rate_limit * 1000)


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

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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
            if last_login_obj:
                user_info['last_login'] = datetime_to_isoformat_timestr(last_login_obj.last_login)
                user_info['last_access_time'] = get_user_last_access_time(user.email,
                                                                          last_login_obj.last_login)
            else:
                user_info['last_login'] = ''
                user_info['last_access_time'] = get_user_last_access_time(user.email, '')

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

    def get_info_of_users_order_by_quota_usage(self, source, direction,
                                               page, per_page, is_active=None, role=None):

        # get user's quota usage info
        user_usage_dict = {}
        users_with_usage = seafile_api.list_user_quota_usage()
        for user in users_with_usage:
            email = user.user
            if email not in user_usage_dict:
                user_usage_dict[email] = user.usage

        # get all users and map quota usage to user
        if source == 'db':
            users = ccnet_api.get_emailusers('DB', -1, -1)
        else:
            email_list = list()
            if ENABLE_LDAP:
                ldap_users = SocialAuthUser.objects.filter(provider=LDAP_PROVIDER)
                email_list.extend([user.username for user in ldap_users])
            if ENABLE_MULTI_LDAP:
                multi_ldap_users = SocialAuthUser.objects.filter(provider=MULTI_LDAP_1_PROVIDER)
                email_list.extend([user.username for user in multi_ldap_users])
            users, error = get_user_objs_from_ccnet(email_list)
            if error:
                return error

        for user in users:
            email = user.email
            user.quota_usage = user_usage_dict.get(email, -1)

        # sort
        users.sort(key=lambda item: item.quota_usage,
                   reverse=direction == 'desc')
        if is_active == '1':
            users = [u for u in users if u.is_active]
        elif is_active == '0':
            users = [u for u in users if not u.is_active]

        if role:
            users = [u for u in users if get_user_role(u) == role]

        data = []
        MULTI_INSTITUTION = getattr(settings, 'MULTI_INSTITUTION', False)
        for user in users[(page-1)*per_page: page*per_page]:

            info = {}
            info['email'] = user.email
            info['name'] = email2nickname(user.email)
            info['contact_email'] = email2contact_email(user.email)

            profile = Profile.objects.get_profile_by_user(user.email)
            info['login_id'] = profile.login_id if profile and profile.login_id else ''

            info['is_staff'] = user.is_staff
            info['is_active'] = user.is_active
            info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)

            info['quota_usage'] = user.quota_usage
            info['quota_total'] = seafile_api.get_user_quota(user.email)

            last_login_obj = UserLastLogin.objects.get_by_username(user.email)
            if last_login_obj:
                info['last_login'] = datetime_to_isoformat_timestr(last_login_obj.last_login)
                info['last_access_time'] = get_user_last_access_time(user.email,
                                                                     last_login_obj.last_login)
            else:
                info['last_login'] = ''
                info['last_access_time'] = get_user_last_access_time(user.email, '')

            info['role'] = get_user_role(user)

            if MULTI_INSTITUTION:
                info['institution'] = profile.institution if profile else ''

            orgs = ccnet_api.get_orgs_by_user(user.email)
            if orgs:
                info['org_id'] = orgs[0].org_id
                info['org_name'] = orgs[0].org_name

            data.append(info)

        return data

    def get(self, request):
        """List all users in DB or LDAPImport

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # parameter check
        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
            is_active = request.GET.get('is_active', None)
            role = request.GET.get('role', None)
        except ValueError:
            page = 1
            per_page = 25
            is_active, role = None, None

        start = (page - 1) * per_page
        limit = per_page + 1
        source = request.GET.get('source', 'DB').lower().strip()
        if source not in ['db', 'ldapimport']:
            # source: 'DB' or 'LDAPImport', default is 'DB'
            error_msg = 'source %s invalid.' % source
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        order_by = request.GET.get('order_by', '').lower().strip()
        if order_by:
            if order_by not in ('quota_usage'):
                error_msg = 'order_by invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            direction = request.GET.get('direction', 'desc').lower().strip()
            if direction not in ('asc', 'desc'):
                error_msg = 'direction invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if source == 'db':

            total_count = ccnet_api.count_emailusers('DB') + \
                          ccnet_api.count_inactive_emailusers('DB')
            if order_by:

                if total_count > 500 and \
                        not getattr(settings, 'ALWAYS_SORT_USERS_BY_QUOTA_USAGE', False):
                    error_msg = _("There are more than 500 users, and sort is not offered.")
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                try:
                    data = self.get_info_of_users_order_by_quota_usage(source,
                                                                       direction,
                                                                       page,
                                                                       per_page,
                                                                       is_active,
                                                                       role,
                                                                       )
                except Exception as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

                result = {'data': data, 'total_count': total_count}
                return Response(result)
            else:
                try:
                    ccnet_db = CcnetDB()
                    users, total_count = ccnet_db.list_eligible_users(start, limit, is_active, role)
                except Exception:
                    users = ccnet_api.get_emailusers('DB', start, per_page)

        elif source == 'ldapimport':
            ldap_users_count = multi_ldap_users_count = 0
            if ENABLE_LDAP:
                ldap_users_count = SocialAuthUser.objects.filter(provider=LDAP_PROVIDER).count()
            if ENABLE_MULTI_LDAP:
                multi_ldap_users_count = SocialAuthUser.objects.filter(provider=MULTI_LDAP_1_PROVIDER).count()
            total_count = ldap_users_count + multi_ldap_users_count

            if order_by:

                if total_count > 500 and \
                        not getattr(settings, 'ALWAYS_SORT_USERS_BY_QUOTA_USAGE', False):
                    error_msg = _("There are more than 500 users, and sort is not offered.")
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                try:
                    data = self.get_info_of_users_order_by_quota_usage(source,
                                                                       direction,
                                                                       page,
                                                                       per_page)
                except Exception as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

                result = {'data': data, 'total_count': total_count}
                return Response(result)
            else:
                email_list = list()
                if ENABLE_LDAP:
                    ldap_users = SocialAuthUser.objects.filter(provider=LDAP_PROVIDER)
                    email_list.extend([user.username for user in ldap_users])
                if ENABLE_MULTI_LDAP:
                    multi_ldap_users = SocialAuthUser.objects.filter(provider=MULTI_LDAP_1_PROVIDER)
                    email_list.extend([user.username for user in multi_ldap_users])
                all_ldap_users, error = get_user_objs_from_ccnet(email_list)
                if error:
                    return error
                users = all_ldap_users[start: start + per_page]

        data = []
        email_list = [user.email for user in users]
        social_auth_user_queryset = SocialAuthUser.objects.filter(username__in=email_list)
        social_auth_user_dict = {}
        for item in social_auth_user_queryset:
            if item.username in social_auth_user_dict:
                social_auth_user_dict[item.username].append(item)
            else:
                social_auth_user_dict[item.username] = [item]

        for user in users:
            url, _, _ = api_avatar_url(user.email)
            profile = Profile.objects.get_profile_by_user(user.email)

            info = {}
            info['avatar_url'] = url
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

            info['role'] = get_user_role(user)

            info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)

            last_login_obj = UserLastLogin.objects.get_by_username(user.email)
            if last_login_obj:
                info['last_login'] = datetime_to_isoformat_timestr(last_login_obj.last_login)
                info['last_access_time'] = get_user_last_access_time(user.email,
                                                                     last_login_obj.last_login)
            else:
                info['last_login'] = ''
                info['last_access_time'] = get_user_last_access_time(user.email, '')

            if getattr(settings, 'MULTI_INSTITUTION', False):
                if profile and profile.institution and \
                        profile.institution.lower() != "null":
                    info['institution'] = profile.institution
                else:
                    info['institution'] = ''

            social_auth_user = social_auth_user_dict.get(user.email, [])
            info['social_auth'] = [{'provider': item.provider, 'uid': item.uid} for item in social_auth_user]

            data.append(info)

        result = {'data': data, 'total_count': total_count}
        return Response(result)

    def post(self, request):

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if user_number_over_limit():
            error_msg = _("The number of users exceeds the limit.")
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        email = request.data.get('email', None)
        if not email or not is_valid_email(email):
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
        role = ''
        if is_pro_version():
            role = request.data.get("role", None)
        if role:
            available_roles = get_available_roles()
            if role not in available_roles:
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
                org_quota_mb = seafile_api.get_org_quota(org_id) / get_file_size_unit('MB')

                if quota_total_mb > org_quota_mb:
                    error_msg = 'Failed to set quota: maximum quota is %d MB' % org_quota_mb
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        vid = get_virtual_id_by_email(email)
        try:
            User.objects.get(email=vid)
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

        login_id = request.data.get("login_id", None)
        if login_id is not None:
            login_id = login_id.strip()
            username_by_login_id = Profile.objects.get_username_by_login_id(login_id)
            if username_by_login_id is not None:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 _("Login id %s already exists." % login_id))

        # create user
        try:
            user_obj = User.objects.create_user(email, password, is_staff, is_active)
            create_user_info(request, email=user_obj.username, role=role,
                             nickname=name, contact_email=email,
                             quota_total_mb=quota_total_mb,
                             login_id=login_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        add_user_tip = _('Successfully added user %(user)s.') % {'user': email}
        if IS_EMAIL_CONFIGURED and SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER:
            c = {'user': request.user.username, 'email': email, 'password': password}
            try:
                send_html_email(_('You are invited to join %s') % get_site_name(),
                                'sysadmin/user_add_email.html',
                                c, None, [email2contact_email(email)])

                add_user_tip = _('Successfully added user %(user)s. An email notification has been sent.') % {'user': email}
            except Exception as e:
                logger.error(str(e))
                add_user_tip = _('Successfully added user %(user)s. But email notification can not be sent, because Email service is not properly configured.') % {'user': email}

        user_info = get_user_info(user_obj.username)
        user_info['add_user_tip'] = add_user_tip

        # send admin operation log signal
        admin_op_detail = {
            "email": email,
        }
        admin_operation.send(sender=None, admin_name=request.user.username,
                             operation=USER_ADD, detail=admin_op_detail)

        if config.FORCE_PASSWORD_CHANGE:
            UserOptions.objects.set_force_passwd_change(user_obj.email)

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
        if not ENABLE_LDAP:
            error_msg = 'Feature not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25

        start = (page - 1) * per_page
        end = page * per_page
        try:
            ldap_users = get_ldap_users(LDAP_SERVER_URL, LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD,
                                        ENABLE_SASL, SASL_MECHANISM, LDAP_BASE_DN, LDAP_LOGIN_ATTR,
                                        LDAP_FILTER, LDAP_USER_OBJECT_CLASS, LDAP_FOLLOW_REFERRALS)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        multi_ldap_users = list()
        if ENABLE_MULTI_LDAP:
            try:
                multi_ldap_users = get_ldap_users(MULTI_LDAP_1_SERVER_URL, MULTI_LDAP_1_ADMIN_DN,
                                                  MULTI_LDAP_1_ADMIN_PASSWORD, MULTI_LDAP_1_ENABLE_SASL,
                                                  MULTI_LDAP_1_SASL_MECHANISM, MULTI_LDAP_1_BASE_DN,
                                                  MULTI_LDAP_1_LOGIN_ATTR, MULTI_LDAP_1_FILTER,
                                                  MULTI_LDAP_1_USER_OBJECT_CLASS, MULTI_LDAP_1_FOLLOW_REFERRALS)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        users = ldap_users + multi_ldap_users
        users = users[start: end]
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
            if last_login_obj:
                info['last_login'] = datetime_to_isoformat_timestr(last_login_obj.last_login)
                info['last_access_time'] = get_user_last_access_time(user.email,
                                                                     last_login_obj.last_login)
            else:
                info['last_login'] = ''
                info['last_access_time'] = get_user_last_access_time(user.email, '')

            data.append(info)

        result = {'ldap_user_list': data, 'has_next_page': has_next_page}
        return Response(result)


class AdminSearchUser(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """Search user from DB, LDAPImport and Profile

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        query_str = request.GET.get('query', '').lower()
        if not query_str:
            error_msg = 'query invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        users = []

        page = request.GET.get('page', '')
        per_page = request.GET.get('per_page', '')

        if not page or not per_page:

            # search user from ccnet db
            users += ccnet_api.search_emailusers('DB', query_str, 0, 10)

            ccnet_user_emails = [u.email for u in users]

            # get institution for user from ccnet
            if getattr(settings, 'MULTI_INSTITUTION', False):
                user_institution_dict = {}
                profiles = Profile.objects.filter(user__in=ccnet_user_emails)
                for profile in profiles:
                    email = profile.user
                    if email not in user_institution_dict:
                        user_institution_dict[email] = profile.institution

                for user in users:
                    user.institution = user_institution_dict.get(user.email, '')

            # search user from profile
            searched_profile = Profile.objects.filter(
                Q(nickname__icontains=query_str) |
                Q(contact_email__icontains=query_str) |
                Q(login_id__icontains=query_str)
            )[:10]

            for profile in searched_profile:
                email = profile.user
                institution = profile.institution

                # remove duplicate emails
                if email not in ccnet_user_emails:
                    try:
                        # get is_staff and is_active info
                        user = User.objects.get(email=email)
                        user.institution = institution
                        users.append(user)
                    except User.DoesNotExist:
                        continue

            page_info = {
                'has_next_page': '',
                'current_page': ''
            }

        else:

            try:
                page = int(page)
                per_page = int(per_page)
            except ValueError:
                page = 1
                per_page = 25

            ccnet_users = []
            ccnet_db_users = ccnet_api.search_emailusers('DB', query_str, 0, page * per_page)

            if len(ccnet_db_users) == page * per_page:

                # users from ccnet db is enough
                ccnet_users = ccnet_db_users[-per_page:]

            # search user from profile
            all_ccnet_users = ccnet_db_users
            all_profile_users = []

            if len(all_ccnet_users) == page * per_page:

                # users from ccnet is enough
                users = ccnet_users

            if len(all_ccnet_users) < page * per_page:

                all_profile_users = Profile.objects.filter(
                    Q(nickname__icontains=query_str) |
                    Q(contact_email__icontains=query_str) |
                    Q(login_id__icontains=query_str)
                )[:page * per_page - len(all_ccnet_users)]

                if int(len(all_ccnet_users)/per_page) == page-1:
                    # need ccnet users + profile users
                    tmp_users = []
                    for profile_user in all_profile_users:
                        try:
                            user = User.objects.get(email=profile_user.user)
                            tmp_users.append(user)
                        except User.DoesNotExist:
                            continue

                    users = ccnet_users + tmp_users

                if int(len(all_ccnet_users)/per_page) < page-1:
                    # only need profile users
                    for profile_user in list(all_profile_users)[-per_page:]:
                        try:
                            user = User.objects.get(email=profile_user.user)
                            users.append(user)
                        except User.DoesNotExist:
                            continue

            if len(all_ccnet_users) + len(all_profile_users) >= page * per_page:
                has_next_page = True
            else:
                has_next_page = False

            page_info = {
                'has_next_page': has_next_page,
                'current_page': page
            }

            # get institution for user from ccnet
            if getattr(settings, 'MULTI_INSTITUTION', False):
                for user in users:
                    if not hasattr(user, 'institution'):
                        try:
                            profile = Profile.objects.get(user=user.email)
                            user.institution = profile.institution
                        except Exception as e:
                            logger.error(e)

        data = []
        has_appended = []

        for user in users:

            if user.email in has_appended:
                continue
            else:
                has_appended.append(user.email)

            info = {}
            url, is_default, date_uploaded = api_avatar_url(user.email)
            info['avatar_url'] = url
            info['email'] = user.email
            info['name'] = email2nickname(user.email)
            info['contact_email'] = get_user_contact_email(user.email)

            info['is_staff'] = user.is_staff
            info['is_active'] = user.is_active

            info['source'] = user.source.lower()

            orgs = ccnet_api.get_orgs_by_user(user.email)
            if orgs:
                org_id = orgs[0].org_id
                info['org_id'] = org_id
                info['org_name'] = orgs[0].org_name
                info['quota_usage'] = seafile_api.get_org_user_quota_usage(org_id, user.email)
                info['quota_total'] = seafile_api.get_org_user_quota(org_id, user.email)
            else:
                info['quota_usage'] = seafile_api.get_user_self_usage(user.email)
                info['quota_total'] = seafile_api.get_user_quota(user.email)

            info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)

            last_login_obj = UserLastLogin.objects.get_by_username(user.email)
            if last_login_obj:
                info['last_login'] = datetime_to_isoformat_timestr(last_login_obj.last_login)
                info['last_access_time'] = get_user_last_access_time(user.email,
                                                                     last_login_obj.last_login)
            else:
                info['last_login'] = ''
                info['last_access_time'] = get_user_last_access_time(user.email, '')

            info['role'] = get_user_role(user)

            if getattr(settings, 'MULTI_INSTITUTION', False):
                info['institution'] = user.institution

            data.append(info)

        result = {
            'user_list': data,
            'page_info': page_info,
        }
        return Response(result)


class AdminUser(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, email):

        if not (request.user.admin_permissions.can_manage_user() or
                request.user.admin_permissions.can_update_user()):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        user_info = get_user_info(email)
        user_info['avatar_url'], _, _ = api_avatar_url(email)
        if is_pro_version():
            user_info['upload_rate_limit'] = byte_to_kb(seafile_api.get_user_upload_rate_limit(email))
            user_info['download_rate_limit'] = byte_to_kb(seafile_api.get_user_download_rate_limit(email))

        last_login_obj = UserLastLogin.objects.get_by_username(email)
        if last_login_obj:
            user_info['last_login'] = datetime_to_isoformat_timestr(last_login_obj.last_login)
            user_info['last_access_time'] = get_user_last_access_time(email,
                                                                      last_login_obj.last_login)
        else:
            user_info['last_login'] = ''
            user_info['last_access_time'] = get_user_last_access_time(email, '')

        return Response(user_info)

    def put(self, request, email):

        if not (request.user.admin_permissions.can_manage_user() or
                request.user.admin_permissions.can_update_user()):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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
            keep_sharing = request.data.get("keep_sharing", None)
            username = request.user.username
            
            if keep_sharing and keep_sharing == 'false':
                seafile_db = SeafileDB()
                orgs = ccnet_api.get_orgs_by_user(email)
                if orgs:
                    org_id = orgs[0].org_id
                    seafile_db.delete_received_share_by_user(email, org_id)
                    seafile_db.delete_share_by_user(email, org_id)
                else:
                    seafile_db.delete_received_share_by_user(email)
                    seafile_db.delete_share_by_user(email)
                ExtraSharePermission.objects.filter(share_to=username).delete()
            try:
                is_active = to_python_boolean(is_active)
            except ValueError:
                error_msg = 'is_active invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if is_pro_version() and is_active and user_number_over_limit(new_users=1):
                error_msg = _("The number of users exceeds the limit.")
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # additional user info check
        role = request.data.get("role", None)
        if role:
            available_roles = get_available_roles()
            if role not in available_roles:
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
                org_quota_mb = seafile_api.get_org_quota(org_id) / get_file_size_unit('MB')

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

        upload_rate_limit = request.data.get("upload_rate_limit", None)
        if upload_rate_limit:

            if not is_pro_version():
                error_msg = 'Feature disabled.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                upload_rate_limit = int(upload_rate_limit)
            except ValueError:
                error_msg = _('Must be an integer that is greater than or equal to 0.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if upload_rate_limit < 0:
                error_msg = _('Must be an integer that is greater than or equal to 0.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        download_rate_limit = request.data.get("download_rate_limit", None)
        if download_rate_limit:

            if not is_pro_version():
                error_msg = 'Feature disabled.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                download_rate_limit = int(download_rate_limit)
            except ValueError:
                error_msg = _('Must be an integer that is greater than or equal to 0.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if download_rate_limit < 0:
                error_msg = _('Must be an integer that is greater than or equal to 0.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # query user info
        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            update_user_info(request,
                             user=user_obj,
                             password=password,
                             is_active=is_active,
                             is_staff=is_staff,
                             role=role,
                             nickname=name,
                             login_id=login_id,
                             contact_email=contact_email,
                             quota_total_mb=quota_total_mb,
                             institution_name=institution,
                             upload_rate_limit=upload_rate_limit,
                             download_rate_limit=download_rate_limit)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # update user
        try:
            user_obj.save()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        update_status_tip = ''
        if is_active is not None:
            update_status_tip = _('Edit succeeded')
            if user_obj.is_active and IS_EMAIL_CONFIGURED:
                try:
                    send_html_email(_(u'Your account on %s is activated') % get_site_name(),
                                    'sysadmin/user_activation_email.html',
                                    {'username': email2contact_email(user_obj.email)},
                                    None,
                                    [email2contact_email(user_obj.email)])
                    update_status_tip = _('Edit succeeded, an email has been sent.')
                except Exception as e:
                    logger.error(e)
                    update_status_tip = _('Edit succeeded, but failed to send email, please check your email configuration.')

        user_info = get_user_info(email)
        user_info['update_status_tip'] = update_status_tip
        if is_pro_version():
            user_info['upload_rate_limit'] = byte_to_kb(seafile_api.get_user_upload_rate_limit(email))
            user_info['download_rate_limit'] = byte_to_kb(seafile_api.get_user_download_rate_limit(email))

        return Response(user_info)

    def delete(self, request, email):

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if not is_valid_username2(email):
            error_msg = 'email invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist as e:
            logger.error(e)
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        can_reset_password = can_user_update_password(user)
        if not can_reset_password:
            return api_error(status.HTTP_400_BAD_REQUEST, _('Unable to reset password.'))

        profile = Profile.objects.get_profile_by_user(email)
        if IS_EMAIL_CONFIGURED and profile and profile.contact_email:

            from django.utils.http import int_to_base36
            from seahub.auth.tokens import default_token_generator

            site_name = get_site_name()
            contact_email = profile.contact_email
            email_template_name = 'sysadmin/short_time_linving_password_reset_link.html'
            c = {
                'email': contact_email,
                'uid': int_to_base36(user.id),
                'user': user,
                'token': default_token_generator.make_token(user),
            }

            send_html_email(_("Reset Password on %s") % site_name,
                            email_template_name, c, None,
                            [email2contact_email(user.username)])

            reset_tip = _(f'A password reset link has been sent to {contact_email}.')
            return Response({'reset_tip': reset_tip})

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
                    reset_tip = _('Successfully reset password, an email has been sent to %(user)s.') % \
                        {'user': contact_email}
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

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            User.objects.get(email=email)
        except User.DoesNotExist as e:
            logger.error(e)
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        groups_info = []
        try:
            groups = ccnet_api.get_groups(email)
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

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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
                    group_name = group_id_to_name(group_id)
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


class AdminUpdateUserCcnetEmail(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request):
        """update ccnet email

        Permission checking:
        1. only admin can perform this action.
        """

        # argument check
        old_ccnet_email = request.data.get("old_email", None)
        if not old_ccnet_email:
            error_msg = 'old_email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        new_ccnet_email = request.data.get("new_email", None)
        if not new_ccnet_email:
            error_msg = 'new_email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        new_ccnet_email = new_ccnet_email.strip()
        if not is_valid_email(new_ccnet_email):
            error_msg = 'new_email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        if not ccnet_api.get_emailuser(old_ccnet_email):
            error_msg = 'User %s not found.' % old_ccnet_email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if ccnet_api.get_emailuser(new_ccnet_email):
            error_msg = "User %s already exists." % new_ccnet_email
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # update
        try:
            ccnet_api.update_emailuser_id(old_ccnet_email, new_ccnet_email)
            logger.debug('the ccnet database was successfully updated')
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            from seahub.api2.models import Token
            token_list = Token.objects.filter(user=old_ccnet_email)
            for token in token_list:
                token.user = new_ccnet_email
                token.save()
            logger.debug('the api2_token table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            from seahub.api2.models import TokenV2
            tokenv2_list = TokenV2.objects.filter(user=old_ccnet_email)
            for tokenv2 in tokenv2_list:
                tokenv2.user = new_ccnet_email
                tokenv2.save()
            logger.debug('the api2_tokenv2 table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            from seahub.admin_log.models import AdminLog
            adminlog_list = AdminLog.objects.filter(email=old_ccnet_email)
            for adminlog in adminlog_list:
                adminlog.email = new_ccnet_email
                adminlog.save()
            logger.debug('the admin_log_adminlog table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.avatar.models import Avatar
            avatar_list = Avatar.objects.filter(emailuser=old_ccnet_email)
            for avatar in avatar_list:
                avatar.emailuser = new_ccnet_email
                avatar.save()
            logger.debug('the avatar_avatar table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.base.models import ClientLoginToken
            clientlogintoken_list = ClientLoginToken.objects.filter(username=old_ccnet_email)
            for clientlogintoken in clientlogintoken_list:
                clientlogintoken.username = new_ccnet_email
                clientlogintoken.save()
            logger.debug('the base_clientlogintoken table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.base.models import DeviceToken
            devicetoken_list = DeviceToken.objects.filter(user=old_ccnet_email)
            for devicetoken in devicetoken_list:
                devicetoken.user = new_ccnet_email
                devicetoken.save()
            logger.debug('the base_devicetoken table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.base.models import FileComment
            filecomment_list = FileComment.objects.filter(author=old_ccnet_email)
            for filecomment in filecomment_list:
                filecomment.author = new_ccnet_email
                filecomment.save()
            logger.debug('the base_filecomment table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.base.models import UserLastLogin
            userlastlogin_list = UserLastLogin.objects.filter(username=old_ccnet_email)
            for userlastlogin in userlastlogin_list:
                userlastlogin.username = new_ccnet_email
                userlastlogin.save()
            logger.debug('the base_userlastlogin table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.base.models import UserStarredFiles
            userstarredfiles_list = UserStarredFiles.objects.filter(email=old_ccnet_email)
            for userstarredfiles in userstarredfiles_list:
                userstarredfiles.email = new_ccnet_email
                userstarredfiles.save()
            logger.debug('the base_userstarredfiles table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.file_participants.models import FileParticipant
            fileparticipant_list = FileParticipant.objects.filter(username=old_ccnet_email)
            for fileparticipant in fileparticipant_list:
                fileparticipant.username = new_ccnet_email
                fileparticipant.save()
            logger.debug('the file_participants_fileparticipant table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.institutions.models import InstitutionAdmin
            institutionadmin_list = InstitutionAdmin.objects.filter(user=old_ccnet_email)
            for institutionadmin in institutionadmin_list:
                institutionadmin.user = new_ccnet_email
                institutionadmin.save()
            logger.debug('the institutions_institutionadmin table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.invitations.models import Invitation
            invitation_list = Invitation.objects.filter(inviter=old_ccnet_email)
            for invitation in invitation_list:
                invitation.inviter = new_ccnet_email
                invitation.save()
            logger.debug('the invitations_invitation table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.notifications.models import UserNotification
            usernotification_list = UserNotification.objects.filter(to_user=old_ccnet_email)
            for usernotification in usernotification_list:
                usernotification.to_user = new_ccnet_email
                usernotification.save()
            logger.debug('the notifications_usernotification table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.options.models import UserOptions
            useroptions_list = UserOptions.objects.filter(email=old_ccnet_email)
            for useroptions in useroptions_list:
                useroptions.email = new_ccnet_email
                useroptions.save()
            logger.debug('the options_useroptions table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.profile.models import DetailedProfile
            detailedprofile_list = DetailedProfile.objects.filter(user=old_ccnet_email)
            for detailedprofile in detailedprofile_list:
                detailedprofile.user = new_ccnet_email
                detailedprofile.save()
            logger.debug('the profile_detailedprofile table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.profile.models import Profile
            profile_list = Profile.objects.filter(user=old_ccnet_email)
            for profile in profile_list:
                profile.user = new_ccnet_email
                profile.save()
            logger.debug('the profile_profile table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.role_permissions.models import AdminRole
            adminrole_list = AdminRole.objects.filter(email=old_ccnet_email)
            for adminrole in adminrole_list:
                adminrole.email = new_ccnet_email
                adminrole.save()
            logger.debug('the role_permissions_adminrole table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.share.models import AnonymousShare
            anonymousshare_list = AnonymousShare.objects.filter(repo_owner=old_ccnet_email)
            for anonymousshare in anonymousshare_list:
                anonymousshare.repo_owner = new_ccnet_email
                anonymousshare.save()
            logger.debug('the share_anonymousshare table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.share.models import FileShare
            fileshare_list = FileShare.objects.filter(username=old_ccnet_email)
            for fileshare in fileshare_list:
                fileshare.username = new_ccnet_email
                fileshare.save()
            logger.debug('the share_fileshare table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.share.models import UploadLinkShare
            uploadlinkshare_list = UploadLinkShare.objects.filter(username=old_ccnet_email)
            for uploadlinkshare in uploadlinkshare_list:
                uploadlinkshare.username = new_ccnet_email
                uploadlinkshare.save()
            logger.debug('the share_uploadlinkshare table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.auth.models import SocialAuthUser
            socialauthuser_list = SocialAuthUser.objects.filter(username=old_ccnet_email)
            for socialauthuser in socialauthuser_list:
                socialauthuser.username = new_ccnet_email
                socialauthuser.save()
            logger.debug('the social_auth_usersocialauth table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.sysadmin_extra.models import UserLoginLog
            userlastlogin_list = UserLoginLog.objects.filter(username=old_ccnet_email)
            for userlastlogin in userlastlogin_list:
                userlastlogin.username = new_ccnet_email
                userlastlogin.save()
            logger.debug('the sysadmin_extra_userloginlog table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.tags.models import FileTag
            filetag_list = FileTag.objects.filter(username=old_ccnet_email)
            for filetag in filetag_list:
                filetag.username = new_ccnet_email
                filetag.save()
            logger.debug('the tags_filetag table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from termsandconditions.models import UserTermsAndConditions
            usertermsandconditions_list = UserTermsAndConditions.objects.filter(username=old_ccnet_email)
            for usertermsandconditions in usertermsandconditions_list:
                usertermsandconditions.username = new_ccnet_email
                usertermsandconditions.save()
            logger.debug('the termsandconditions_usertermsandconditions table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.wiki.models import Wiki
            wiki_list = Wiki.objects.filter(username=old_ccnet_email)
            for wiki in wiki_list:
                wiki.username = new_ccnet_email
                wiki.save()
            logger.debug('the wiki_wiki table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.ocm.models import OCMShare
            ocmshare_list = OCMShare.objects.filter(from_user=old_ccnet_email)
            for ocmshare in ocmshare_list:
                ocmshare.from_user = new_ccnet_email
                ocmshare.save()
            logger.debug('the ocm_share table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        try:
            from seahub.ocm.models import OCMShareReceived
            ocmsharereceived_list = OCMShareReceived.objects.filter(to_user=old_ccnet_email)
            for ocmsharereceived in ocmsharereceived_list:
                ocmsharereceived.to_user = new_ccnet_email
                ocmsharereceived.save()
            logger.debug('the ocm_share_received table in seahub database was successfully updated')
        except Exception as e:
            logger.error(e)

        return Response({'success': True})


class AdminUserList(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        """return user_list by user_id_list
        """
        # argument check
        user_id_list = request.data.get('user_id_list')
        if not isinstance(user_id_list, list):
            error_msg = 'user_id_list invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # main
        user_list = list()
        for user_id in user_id_list:
            if not isinstance(user_id, str):
                continue
            user_info = get_user_common_info(user_id)
            user_list.append(user_info)

        return Response({'user_list': user_list})


class AdminUserConvertToTeamView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        username = request.data.get('email')
        if not username:
            return api_error(status.HTTP_400_BAD_REQUEST, 'email invalid.')

        # resource check
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % username
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if is_org_user(username):
            error_msg = 'User is already in team.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org_role = DEFAULT_ORG

        url_prefix = gen_org_url_prefix(3)
        if url_prefix is None:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # Use the nickname as the org_name, but the org_name does not support emoji
        nickname = email2nickname(username)
        nickname_characters = []
        for character in nickname:
            if len(character.encode('utf-8')) > 3:
                nickname_characters.append('_')
            else:
                nickname_characters.append(character)
        org_name = ''.join(nickname_characters)

        try:
            # 1. Create a new org, and add the user(username) to org as a team admin
            #    by ccnet_api.create_org
            org_id = ccnet_api.create_org(org_name, url_prefix, username)
            # 2. Update org-settings
            new_org = ccnet_api.get_org_by_id(org_id)
            OrgSettings.objects.add_or_update(new_org, org_role)
            # 3. Add user's repo to OrgRepo
            owned_repos = seafile_api.get_owned_repo_list(username, ret_corrupted=True)
            owned_repo_ids = [item.repo_id for item in owned_repos]
            seafile_db = SeafileDB()
            seafile_db.add_repos_to_org_user(org_id, username, owned_repo_ids)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
    

class AdminUserSharedFolders(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, email):
        """ List 'all' folders a user share out

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        shared_repos = []
        username = email

        try:
            if is_org_user(username):
                orgs = ccnet_api.get_orgs_by_user(username)
                org = orgs[0]
                org_id = org.org_id
                shared_repos += seafile_api.get_org_share_out_repo_list(org_id, username, -1, -1)
                shared_repos += seafile_api.get_org_group_repos_by_owner(org_id, username)
            else:
                shared_repos += seafile_api.get_share_out_repo_list(username, -1, -1)
                shared_repos += seafile_api.get_group_repos_by_owner(username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        repo_id_list = []
        for repo in shared_repos:
    
            if repo.is_virtual:
                continue
    
            repo_id = repo.repo_id
            repo_id_list.append(repo_id)

        custom_permission_dict = {}
        custom_permissions = CustomSharePermissions.objects.filter(repo_id__in=repo_id_list)
        for custom_permission in custom_permissions:
            custom_id = f'custom-{custom_permission.id}'
            custom_permission_dict[custom_id] = custom_permission.name

        returned_result = []
        shared_repos.sort(key=lambda x: x.repo_name)
        for repo in shared_repos:
            if not repo.is_virtual:
                continue
    
            result = {}
            result['repo_id'] = repo.origin_repo_id
            result['repo_name'] = repo.origin_repo_name
            result['path'] = repo.origin_path
            result['folder_name'] = repo.name
            result['share_type'] = repo.share_type
            result['share_permission'] = repo.permission
            result['share_permission_name'] = custom_permission_dict.get(repo.permission, '')
            result['share_from']  = username
            result['share_from_user_name']  = email2nickname(username)
    
            if repo.share_type == 'personal':
                result['user_name'] = email2nickname(repo.user)
                result['user_email'] = repo.user
                result['contact_email'] = Profile.objects.get_contact_email_by_user(repo.user)
    
            if repo.share_type == 'group':
                group = ccnet_api.get_group(repo.group_id)
        
                if not group:
                    if is_org_user(username):
                        seafile_api.org_unshare_subdir_for_group(org_id,
                                                                 repo.repo_id,
                                                                 repo.origin_path,
                                                                 username,
                                                                 repo.group_id)
                    else:
                        seafile_api.unshare_subdir_for_group(repo.repo_id,
                                                             repo.origin_path,
                                                             username,
                                                             repo.group_id)
                    continue
        
                result['group_id'] = repo.group_id
                result['group_name'] = group.group_name
    
            returned_result.append(result)

        return Response(returned_result)


class AdminUserSharedRepos(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)
    
    def get(self, request, email):
        """ List 'all' repos a user share out

        Permission checking:
        1. only admin can perform this action.
        """
        
        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        shared_repos = []
        username = email
        try:
            if is_org_user(username):
                orgs = ccnet_api.get_orgs_by_user(username)
                org = orgs[0]
                org_id = org.org_id
                shared_repos += seafile_api.get_org_share_out_repo_list(org_id, username, -1, -1)
                shared_repos += seafile_api.get_org_group_repos_by_owner(org_id, username)
                shared_repos += seafile_api.list_org_inner_pub_repos_by_owner(org_id, username)
            else:
                shared_repos += seafile_api.get_share_out_repo_list(username, -1, -1)
                shared_repos += seafile_api.get_group_repos_by_owner(username)
                if not request.cloud_mode:
                    shared_repos += seafile_api.list_inner_pub_repos_by_owner(username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        repo_id_list = []
        for repo in shared_repos:
    
            if repo.is_virtual:
                continue
    
            repo_id = repo.repo_id
            repo_id_list.append(repo_id)

        custom_permission_dict = {}
        custom_permissions = CustomSharePermissions.objects.filter(repo_id__in=repo_id_list)
        for custom_permission in custom_permissions:
            custom_id = f'custom-{custom_permission.id}'
            custom_permission_dict[custom_id] = custom_permission.name

        returned_result = []
        shared_repos.sort(key=lambda x: x.repo_name)

        for repo in shared_repos:
            if repo.is_virtual:
                continue
    
            result = {}
            result['repo_id'] = repo.repo_id
            result['repo_name'] = repo.repo_name
            result['encrypted'] = repo.encrypted
            result['share_type'] = repo.share_type
            result['share_permission'] = repo.permission
            result['share_permission_name'] = custom_permission_dict.get(repo.permission, '')
            result['modifier_email'] = repo.last_modifier
            result['modifier_name'] = email2nickname(repo.last_modifier)
            result['modifier_contact_email'] = email2contact_email(repo.last_modifier)
            result['share_from'] = username
            result['share_from_user_name'] = email2nickname(username)
    
            if repo.share_type == 'personal':
                result['user_name'] = email2nickname(repo.user)
                result['user_email'] = repo.user
                result['contact_email'] = Profile.objects.get_contact_email_by_user(repo.user)
    
            if repo.share_type == 'group':
                group = ccnet_api.get_group(repo.group_id)
                result['group_id'] = repo.group_id
                result['group_name'] = group.group_name if group else ''
    
            returned_result.append(result)

        return Response(returned_result)
