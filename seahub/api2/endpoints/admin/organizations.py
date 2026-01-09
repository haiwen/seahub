# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from datetime import datetime
from django.utils.translation import gettext as _
from django.utils.crypto import get_random_string

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import ccnet_api, seafile_api

from seahub.constants import DEFAULT_ORG
from seahub.auth.utils import get_virtual_id_by_email
from seahub.organizations.settings import ORG_MEMBER_QUOTA_DEFAULT, \
        ORG_ENABLE_REACTIVATE
from seahub.organizations.signals import org_deleted
from seahub.organizations.utils import generate_org_reactivate_link
from seahub.utils import is_valid_email, IS_EMAIL_CONFIGURED, send_html_email, \
        get_org_traffic_by_month
from seahub.utils.file_size import get_file_size_unit
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, datetime_to_isoformat_timestr
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.base.accounts import User
from seahub.base.models import OrgLastActivityTime
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean
from seahub.api2.permissions import IsProVersion
from seahub.role_permissions.utils import get_available_roles
from seahub.organizations.models import OrgSAMLConfig, OrgAdminSettings
from seahub.utils.ccnet_db import CcnetDB
from seahub.utils.db_api import SeafileDB

try:
    from seahub.settings import ORG_MEMBER_QUOTA_ENABLED
except ImportError:
    ORG_MEMBER_QUOTA_ENABLED = False

if ORG_MEMBER_QUOTA_ENABLED:
    from seahub.organizations.models import OrgMemberQuota

try:
    from seahub.settings import MULTI_TENANCY
    from seahub.organizations.models import OrgSettings
except ImportError:
    MULTI_TENANCY = False

try:
    from seahub.settings import ENABLE_MULTI_ADFS
except ImportError:
    ENABLE_MULTI_ADFS = False

try:
    from seahub.settings import ENABLE_OAUTH
except ImportError:
    ENABLE_OAUTH = False

logger = logging.getLogger(__name__)


def get_org_info(org):
    if not org:
        return {'org_id': None}
    org_id = org.org_id

    org_info = {}
    org_info['org_id'] = org_id
    org_info['org_name'] = org.org_name
    org_info['ctime'] = timestamp_to_isoformat_timestr(org.ctime)
    org_info['org_url_prefix'] = org.url_prefix
    org_info['role'] = OrgSettings.objects.get_role_by_org(org)
    org_info['is_active'] = OrgSettings.objects.get_is_active_by_org(org)

    creator = org.creator
    org_info['creator_email'] = creator
    org_info['creator_name'] = email2nickname(creator)
    org_info['creator_contact_email'] = email2contact_email(creator)

    org_info['quota'] = seafile_api.get_org_quota(org_id)
    org_info['quota_usage'] = seafile_api.get_org_quota_usage(org_id)

    org_info['monthly_traffic_limit'] = OrgSettings.objects.get_monthly_traffic_limit_by_org(org)

    current_date = datetime.now()
    org_info['monthly_traffic_usage'] = get_org_traffic_by_month(org_id, current_date)

    if ORG_MEMBER_QUOTA_ENABLED:
        org_info['max_user_number'] = OrgMemberQuota.objects.get_quota(org_id)

    return org_info


def get_org_detailed_info(org):

    org_id = org.org_id
    org_info = get_org_info(org)

    # users
    users = ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
    org_info['users_count'] = len(users)

    active_users_count = len([m for m in users if m.is_active])
    org_info['active_users_count'] = active_users_count

    repos = seafile_api.get_org_repo_list(org_id, -1, -1)
    org_info['repos_count'] = len(repos)

    # groups
    groups = ccnet_api.get_org_groups(org_id, -1, -1)
    org_info['groups_count'] = len(groups)

    # saml config
    org_info['enable_saml_login'] = False
    org_info['enable_sso'] = False
    org_info['force_adfs_login'] = 0
    if ENABLE_OAUTH or ENABLE_MULTI_ADFS:
        org_info['enable_sso'] = True
        org_setting = OrgAdminSettings.objects.filter(org_id=org_id, key='force_adfs_login').first()
        org_info['force_adfs_login'] = org_setting and int(org_setting.value) or 0

    if ENABLE_MULTI_ADFS:
        org_saml_config = OrgSAMLConfig.objects.get_config_by_org_id(org_id)
        if org_saml_config:
            org_info['enable_saml_login'] = True
            org_info['metadata_url'] = org_saml_config.metadata_url
            org_info['domain'] = org_saml_config.domain

    return org_info


def gen_org_url_prefix(max_trial=None, length=20):
    """Generate organization url prefix automatically.
    If ``max_trial`` is large than 0, then re-try that times if failed.

    Arguments:
    - `max_trial`:

    Returns:
        Url prefix if succed, otherwise, ``None``.
    """
    def _gen_prefix():
        url_prefix = 'org-' + get_random_string(
            length, allowed_chars='abcdefghijklmnopqrstuvwxyz0123456789')
        if ccnet_api.get_org_by_url_prefix(url_prefix) is not None:
            logger.error("org url prefix, %s is duplicated" % url_prefix)
            return None
        else:
            return url_prefix

    try:
        max_trial = int(max_trial)
    except (TypeError, ValueError):
        max_trial = 0

    while max_trial >= 0:
        ret = _gen_prefix()
        if ret is not None:
            return ret
        else:
            max_trial -= 1

    logger.error("Failed to generate org url prefix, retry: %d" % max_trial)
    return None


class AdminOrganizations(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get all organizations

        Permission checking:
        1. only admin can perform this action.
        """

        if not MULTI_TENANCY:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25

        start = (page - 1) * per_page

        is_active = request.GET.get('is_active', None)
        if is_active is not None:

            is_active = is_active.lower()
            is_active = str(is_active)
            if is_active not in ('true', 'false', '1', '0'):
                error_msg = "is_active invalid."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            ccnet_db = CcnetDB()
            total_count, orgs = ccnet_db.get_orgs_by_is_active(is_active, page, per_page)

            org_ids = [org.org_id for org in orgs]
            orgs_last_activity = OrgLastActivityTime.objects.filter(org_id__in=org_ids)
            orgs_last_activity_dict = {org.org_id: org.timestamp for org in orgs_last_activity}

            result = []
            for org in orgs:

                org_id = org.org_id

                org_info = {}
                org_info['org_id'] = org_id
                org_info['org_name'] = org.org_name
                org_info['ctime'] = timestamp_to_isoformat_timestr(org.ctime)
                org_info['org_url_prefix'] = org.url_prefix

                if not org.role:
                    role = DEFAULT_ORG
                elif org.role in get_available_roles():
                    role = org.role
                else:
                    logger.warning('Role %s is not valid' % org.role)
                    role = DEFAULT_ORG

                org_info['role'] = role
                org_info['is_active'] = True if org.is_active else False

                creator = org.creator
                org_info['creator_email'] = creator
                org_info['creator_name'] = email2nickname(creator)
                org_info['creator_contact_email'] = email2contact_email(creator)

                org_info['quota'] = seafile_api.get_org_quota(org_id)
                org_info['quota_usage'] = seafile_api.get_org_quota_usage(org_id)

                if ORG_MEMBER_QUOTA_ENABLED:
                    org_info['max_user_number'] = OrgMemberQuota.objects.get_quota(org_id)

                if org_id in orgs_last_activity_dict:
                    org_info['last_activity_time'] = datetime_to_isoformat_timestr(orgs_last_activity_dict[org_id])
                else:
                    org_info['last_activity_time'] = None

                result.append(org_info)
        else:
            try:
                orgs = ccnet_api.get_all_orgs(start, per_page)
                total_count = ccnet_api.count_orgs()
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            result = []
            org_ids = [org.org_id for org in orgs]
            orgs_last_activity = OrgLastActivityTime.objects.filter(org_id__in=org_ids)
            orgs_last_activity_dict = {org.org_id: org.timestamp for org in orgs_last_activity}
            for org in orgs:
                org_info = get_org_info(org)
                org_id = org_info['org_id']
                if org_id in orgs_last_activity_dict:
                    org_info['last_activity_time'] = datetime_to_isoformat_timestr(orgs_last_activity_dict[org_id])
                else:
                    org_info['last_activity_time'] = None

                result.append(org_info)

        return Response({'organizations': result, 'total_count': total_count})

    def post(self, request):
        """ Create an organization

        Permission checking:
        1. only admin can perform this action.
        """
        if not MULTI_TENANCY:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        org_name = request.data.get('org_name', None)
        if not org_name:
            error_msg = 'org_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        owner_email = request.data.get('owner_email', None)
        if not owner_email or not is_valid_email(owner_email):
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        owner_password = request.data.get('owner_password', None)
        if not owner_password:
            error_msg = 'owner_password invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        url_prefix = gen_org_url_prefix(5, 20)
        if ccnet_api.get_org_by_url_prefix(url_prefix):
            error_msg = 'Failed to create organization, please try again later.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        vid = get_virtual_id_by_email(owner_email)
        try:
            User.objects.get(email=vid)
        except User.DoesNotExist:
            pass
        else:
            error_msg = "User %s already exists." % owner_email
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            new_user = User.objects.create_user(owner_email, owner_password,
                                                is_staff=False, is_active=True)
        except User.DoesNotExist as e:
            logger.error(e)
            error_msg = 'Failed to add user %s.' % owner_email
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            org_id = ccnet_api.create_org(org_name, url_prefix, new_user.username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        quota = request.data.get('quota', None)
        if quota:
            try:
                quota_mb = int(quota)
                quota = quota_mb * get_file_size_unit('MB')
                seafile_api.set_org_quota(org_id, quota)
            except ValueError as e:
                logger.error(e)
                return api_error(status.HTTP_400_BAD_REQUEST, "Quota is not valid")

        if ORG_MEMBER_QUOTA_ENABLED:
            member_limit = request.data.get('member_limit', ORG_MEMBER_QUOTA_DEFAULT)
            OrgMemberQuota.objects.set_quota(org_id, member_limit)

        org = ccnet_api.get_org_by_id(org_id)
        try:
            org_info = get_org_info(org)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(org_info)


class AdminOrganization(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, org_id):
        """ Get base info of a organization

        Permission checking:
        1. only admin can perform this action.
        """

        if not MULTI_TENANCY:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            org_info = get_org_detailed_info(org)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(org_info)

    def put(self, request, org_id):
        """ Update base info of a organization

        Permission checking:
        1. only admin can perform this action.
        """

        if not MULTI_TENANCY:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # update org name
        new_name = request.data.get('org_name', None)
        if new_name:
            try:
                ccnet_api.set_org_name(org_id, new_name)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # update org max user number
        max_user_number = request.data.get('max_user_number', None)
        if max_user_number and ORG_MEMBER_QUOTA_ENABLED:

            try:
                max_user_number = int(max_user_number)
            except ValueError:
                error_msg = 'max_user_number invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if max_user_number <= 0:
                error_msg = 'max_user_number invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                OrgMemberQuota.objects.set_quota(org_id, max_user_number)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        quota_mb = request.data.get('quota', None)
        if quota_mb:

            try:
                quota_mb = int(quota_mb)
            except ValueError:
                error_msg = 'quota invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if quota_mb < 0:
                error_msg = 'quota invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            quota = quota_mb * get_file_size_unit('MB')
            try:
                seafile_api.set_org_quota(org_id, quota)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        role = request.data.get('role', None)
        if role:
            if role not in get_available_roles():
                error_msg = 'Role %s invalid.' % role
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            OrgSettings.objects.add_or_update(org, role)

        is_active = request.data.get('is_active', None)
        if is_active:
            is_active = is_active.lower()
            if is_active not in ('true', 'false'):
                error_msg = 'is_active invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            OrgSettings.objects.add_or_update(org, is_active=is_active == 'true')

            if is_active == 'false' and IS_EMAIL_CONFIGURED and ORG_ENABLE_REACTIVATE:

                subject = _(f'Your team {org.org_name} has been deactivated')
                email_template = 'organizations/org_deactivate_email.html'
                from_email = None

                org_users = ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
                org_admin_users = [org_user.email for org_user in org_users
                                   if ccnet_api.is_org_staff(org_id, org_user.email)]
                for email in org_admin_users:
                    con_context = {
                        'org_name': org.org_name,
                        'reactivate_link': generate_org_reactivate_link(org_id)
                    }
                    send_html_email(subject, email_template, con_context,
                                    from_email, [email2contact_email(email)])

        force_adfs_login = request.data.get('force_adfs_login', None)
        if force_adfs_login is not None:
            OrgAdminSettings.objects.update_or_create(org_id=org_id, key='force_adfs_login',
                                                      defaults={'value': force_adfs_login})

        monthly_traffic_limit = request.data.get('monthly_traffic_limit', None)
        if monthly_traffic_limit:
            try:
                monthly_traffic_limit = int(monthly_traffic_limit)
            except ValueError:
                error_msg = 'monthly_traffic_limit invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if monthly_traffic_limit < 0:
                error_msg = 'monthly_traffic_limit invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            monthly_traffic_limit = monthly_traffic_limit * get_file_size_unit('MB')
            OrgSettings.objects.add_or_update(org, monthly_traffic_limit=monthly_traffic_limit)

        org = ccnet_api.get_org_by_id(org_id)
        org_info = get_org_info(org)
        return Response(org_info)

    def delete(self, request, org_id):
        """ Delete an organization

        Permission checking:
        1. only admin can perform this action.
        """

        if not MULTI_TENANCY:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            # remove org users
            users = ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
            for u in users:
                ccnet_api.remove_org_user(org_id, u.email)
                User.objects.get(email=u.email).delete()

            # remove org groups
            groups = ccnet_api.get_org_groups(org_id, -1, -1)
            for g in groups:
                ccnet_api.remove_org_group(org_id, g.gid)

            # remove org repos
            seafile_api.remove_org_repo_by_org_id(org_id)

            # remove org
            ccnet_api.remove_org(org_id)

            # handle signal
            org_deleted.send(sender=None, org_id=org_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class AdminSearchOrganization(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Search organization by name.

        Permission checking:
        1. only admin can perform this action.
        """

        if not MULTI_TENANCY:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        query_str = request.GET.get('query', '').lower().strip()
        if not query_str:
            error_msg = 'query invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            orgs = ccnet_api.search_orgs(query_str)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = []
        for org in orgs:
            org_info = get_org_info(org)
            result.append(org_info)

        return Response({'organization_list': result})


class AdminOrganizationsBaseInfo(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        '''
        Get base info of organizations in bulk by ids
        '''
        if not MULTI_TENANCY:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        org_ids = request.GET.getlist('org_ids', [])
        include_org_staffs = to_python_boolean(request.GET.get('include_org_staffs', 'false'))
        orgs = []
        for org_id in org_ids:
            try:
                org = ccnet_api.get_org_by_id(int(org_id))
                if not org:
                    continue
            except Exception:
                continue
            base_info = {'org_id': org.org_id, 'org_name': org.org_name}
            staffs = []
            if include_org_staffs:
                try:
                    ccnet_db = CcnetDB()
                    staffs = ccnet_db.get_org_staffs(int(org_id))
                except Exception:
                    pass
                base_info['org_staffs'] = staffs
            orgs.append(base_info)
        return Response({'organization_list': orgs})


class TrafficExceededOrganizations(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get all organizations

        Permission checking:
        1. only admin can perform this action.
        """

        if not MULTI_TENANCY:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            page = 1
            per_page = 100

        start = (page - 1) * per_page
        seafile_db = SeafileDB()
        try:
            orgs, total_count = seafile_db.get_download_limit_org(start, per_page)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = []
        limit_data = {}
        if orgs:
            org_ids = []
            for org in orgs:
                org_id = org[1]
                org_ids.append(org_id)
                limit_data[f"{org_id}"] = org[2]
            orgs_last_activity = OrgLastActivityTime.objects.filter(org_id__in=org_ids)
            orgs_last_activity_dict = {org.org_id: org.timestamp for org in orgs_last_activity}

            for org_id in org_ids:
                org = ccnet_api.get_org_by_id(org_id)
                org_info = get_org_info(org)
                org_id = org_info['org_id']
                org_limit_data = limit_data.get(f"{org_id}")

                if org_id in orgs_last_activity_dict:
                    org_info['last_activity_time'] = datetime_to_isoformat_timestr(orgs_last_activity_dict[org_id])
                else:
                    org_info['last_activity_time'] = None

                org_info['download_limit'] = f"{org_limit_data}"
                result.append(org_info)
        return Response({'organizations': result, 'total_count': total_count})
