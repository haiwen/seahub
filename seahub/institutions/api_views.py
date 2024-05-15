# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import BasePermission
from rest_framework.authentication import SessionAuthentication

from django.conf import settings
from django.utils.translation import gettext as _

from seaserv import ccnet_api, seafile_api

from seahub.api2.utils import api_error
from seahub.api2.permissions import IsProVersion
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication

from seahub.base.accounts import User
from seahub.base.models import UserLastLogin
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.profile.models import Profile
from seahub.institutions.models import InstitutionAdmin
from seahub.institutions.utils import get_institution_available_quota
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils.file_size import get_file_size_unit
from seahub.avatar.templatetags.avatar_tags import api_avatar_url


logger = logging.getLogger(__name__)


class IsInstAdmin(BasePermission):
    """
    Check whether is inst admin
    """

    def has_permission(self, request, *args, **kwargs):

        # permission check
        if not getattr(settings, 'MULTI_INSTITUTION', False):
            return False

        username = request.user.username

        try:
            inst_admin = InstitutionAdmin.objects.get(user=username)
        except InstitutionAdmin.DoesNotExist:
            inst_admin = False

        if not inst_admin:
            return False

        inst = inst_admin.institution
        profile = Profile.objects.get_profile_by_user(username)
        if profile and profile.institution != inst.name:
            return False

        return True


class InstAdminUsers(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsInstAdmin)

    def get(self, request):

        """List users in institution.
        """

        username = request.user.username
        inst_admin = InstitutionAdmin.objects.get(user=username)
        inst = inst_admin.institution

        # get user list
        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        offset = per_page * (current_page - 1)
        inst_users = Profile.objects.filter(institution=inst.name)[offset:offset + per_page]

        admin_users = InstitutionAdmin.objects.filter(institution=inst)
        admin_emails = [user.user for user in admin_users]

        last_logins = UserLastLogin.objects.filter(username__in=[x.user for x in inst_users])

        result = []
        for user in inst_users:

            email = user.user

            user_info = {}
            user_info['email'] = email
            user_info['name'] = email2nickname(email)
            user_info['contact_email'] = email2contact_email(email)
            user_info['is_admin'] = email in admin_emails
            user_info['avatar_url'], _, _ = api_avatar_url(email, 72)

            try:
                user_obj = User.objects.get(email=email)
                user_info['is_active'] = user_obj.is_active
            except User.DoesNotExist:
                user_info['is_active'] = ''

            user_info['last_login'] = ''
            for last_login in last_logins:
                if last_login.username == email:
                    last_login_time = last_login.last_login
                    user_info['last_login'] = datetime_to_isoformat_timestr(last_login_time)

            try:
                user_info['quota_total'] = seafile_api.get_user_quota(email)
                user_info['quota_usage'] = seafile_api.get_user_self_usage(email)
            except Exception as e:
                logger.error(e)
                user_info['quota_total'] = -1
                user_info['quota_usage'] = -1

            result.append(user_info)

        return Response({
            'user_list': result,
            'total_count': inst_users.count()
        })


class InstAdminUser(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsInstAdmin)

    def put(self, request, email):

        """ Set user info in institution.
        """

        username = request.user.username
        inst_admin = InstitutionAdmin.objects.get(user=username)
        inst = inst_admin.institution

        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = f'User {email} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        profile = Profile.objects.get_profile_by_user(email)
        if not profile or \
                profile.institution != inst.name:
            error_msg = f'User {email} not found in {inst.name}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # set user quota
        quota_total_mb = request.data.get("quota_total", None)
        if not quota_total_mb:
            error_msg = 'quota_total invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            quota_total_mb = int(quota_total_mb)
        except ValueError:
            error_msg = _("Must be an integer that is greater than or equal to 0.")
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if quota_total_mb < 0:
            error_msg = _("Space quota is too low (minimum value is 0).")
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        quota = quota_total_mb * get_file_size_unit('MB')
        available_quota = get_institution_available_quota(inst)
        if available_quota is not None:
            # None means has unlimit quota
            if available_quota == 0 or available_quota < quota:
                error_msg = _(f"Failed to set quota: maximum quota is {available_quota} MB")
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        seafile_api.set_user_quota(email, quota)

        return Response({'success': True})

    def get(self, request, email):

        """ Get user info in institution.
        """

        username = request.user.username
        inst_admin = InstitutionAdmin.objects.get(user=username)
        inst = inst_admin.institution

        # get user info
        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = f'User {email} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        profile = Profile.objects.get_profile_by_user(email)
        if not profile or \
                profile.institution != inst.name:
            error_msg = f'User {email} not found in {inst.name}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        user_info = {}
        user_info['email'] = email
        user_info['name'] = email2nickname(email)
        user_info['contact_email'] = email2contact_email(email)
        user_info['avatar_url'], _, _ = api_avatar_url(email, 72)
        try:
            user_info['quota_total'] = seafile_api.get_user_quota(email)
            user_info['quota_usage'] = seafile_api.get_user_self_usage(email)
        except Exception as e:
            logger.error(e)
            user_info['quota_total'] = -1
            user_info['quota_usage'] = -1

        return Response(user_info)

    def delete(self, request, email):

        """ Delete user in institution.
        """

        # delete user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = f'User {email} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if user.is_staff:
            error_msg = f'User {email} is system administrator.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        user.delete()
        return Response({'success': True})


class InstAdminSearchUser(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsInstAdmin)

    def get(self, request):

        """Search user in institution.
        """

        username = request.user.username
        inst_admin = InstitutionAdmin.objects.get(user=username)
        inst = inst_admin.institution

        # search user
        q = request.GET.get('q', '').lower()
        if not q:
            error_msg = 'q invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        inst_users = Profile.objects.filter(institution=inst.name)
        admin_users = InstitutionAdmin.objects.filter(institution=inst)
        admin_emails = [user.user for user in admin_users]
        last_logins = UserLastLogin.objects.filter(username__in=[x.user for x in inst_users])

        result = []
        for user in inst_users:

            email = user.user

            if q not in email and \
                    q not in email2nickname(email) and \
                    q not in email2contact_email(email):
                continue

            user_info = {}
            user_info['email'] = email
            user_info['name'] = email2nickname(email)
            user_info['contact_email'] = email2contact_email(email)
            user_info['is_admin'] = email in admin_emails
            user_info['avatar_url'], _, _ = api_avatar_url(email, 72)

            try:
                user_obj = User.objects.get(email=email)
                user_info['is_active'] = user_obj.is_active
            except User.DoesNotExist:
                user_info['is_active'] = ''

            user_info['last_login'] = ''
            for last_login in last_logins:
                if last_login.username == email:
                    last_login_time = last_login.last_login
                    user_info['last_login'] = datetime_to_isoformat_timestr(last_login_time)

            try:
                user_info['quota_total'] = seafile_api.get_user_quota(email)
                user_info['quota_usage'] = seafile_api.get_user_self_usage(email)
            except Exception as e:
                logger.error(e)
                user_info['quota_total'] = -1
                user_info['quota_usage'] = -1

            result.append(user_info)

        return Response({'user_list': result})


class InstAdminLibraries(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsInstAdmin)

    def get(self, request):

        """Get user repos.
        """

        owner = request.GET.get('owner', '')
        if not owner:
            error_msg = 'owner invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            User.objects.get(email=owner)
        except User.DoesNotExist:
            error_msg = f'User {owner} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        inst_admin = InstitutionAdmin.objects.get(user=username)
        inst = inst_admin.institution
        profile = Profile.objects.get_profile_by_user(owner)
        if not profile or \
                profile.institution != inst.name:
            error_msg = f'User {owner} not found in {inst.name}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_info_list = []
        owned_repos = seafile_api.get_owned_repo_list(owner)

        for repo in owned_repos:

            if repo.is_virtual:
                continue

            repo_info = {}
            repo_info['id'] = repo.repo_id
            repo_info['name'] = repo.repo_name
            repo_info['size'] = repo.size
            repo_info['last_modified'] = timestamp_to_isoformat_timestr(repo.last_modified)

            repo_info_list.append(repo_info)

        return Response({"repo_list": repo_info_list})


class InstAdminGroups(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsInstAdmin)

    def get(self, request):

        """Get user repos.
        """

        owner = request.GET.get('owner', '')
        if not owner:
            error_msg = 'owner invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            User.objects.get(email=owner)
        except User.DoesNotExist:
            error_msg = f'User {owner} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        inst_admin = InstitutionAdmin.objects.get(user=username)
        inst = inst_admin.institution
        profile = Profile.objects.get_profile_by_user(owner)
        if not profile or \
                profile.institution != inst.name:
            error_msg = f'User {owner} not found in {inst.name}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        group_info_list = []
        groups = ccnet_api.get_groups(owner)

        for group in groups:

            group_info = {}
            group_info['id'] = group.id
            group_info['name'] = group.group_name
            group_info['is_owner'] = group.creator_name == owner
            group_info['is_admin'] = ccnet_api.check_group_staff(group.id, owner)
            group_info['created_at'] = timestamp_to_isoformat_timestr(group.timestamp)

            group_info_list.append(group_info)

        return Response({"groups_list": group_info_list})
