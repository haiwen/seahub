# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.translation import gettext as _
from django.conf import settings

from seahub.auth.models import SocialAuthUser
from seahub.base.accounts import UNUSABLE_PASSWORD, LDAP_PROVIDER
from seahub.constants import DEFAULT_ORG
from seahub.organizations.models import OrgSettings
from seahub.organizations.settings import ORG_AUTO_URL_PREFIX
from seahub.organizations.views import gen_org_url_prefix
from seahub.password_session import update_session_auth_hash
from seahub.utils import is_valid_email, send_html_email, get_site_name, IS_EMAIL_CONFIGURED
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.profile.models import Profile, DetailedProfile
from seahub.settings import ENABLE_UPDATE_USER_INFO, ENABLE_USER_SET_CONTACT_EMAIL, ENABLE_CONVERT_TO_TEAM_ACCOUNT, \
    ENABLE_USER_SET_NAME
from seahub.options.models import UserOptions


import seaserv
from seaserv import ccnet_api, seafile_api

from seahub.utils.db_api import SeafileDB
from seahub.utils.password import is_password_strength_valid

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'

class User(APIView):
    """ Query/update user info of myself.
    """

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def _get_user_info(self, email):
        profile = Profile.objects.get_profile_by_user(email)
        d_profile = DetailedProfile.objects.get_detailed_profile_by_user(email)

        info = {}
        info['email'] = email
        info['name'] = profile.nickname if profile and profile.nickname else ''
        info['contact_email'] = profile.contact_email if profile and profile.contact_email else ''
        info['telephone'] = d_profile.telephone if d_profile else ''
        info['login_id'] = profile.login_id if profile else ''
        info['list_in_address_book'] = profile.list_in_address_book if profile else False

        return info

    def _update_user_info(self, info_dict, email):

        # update nickname
        if info_dict['name']:
            Profile.objects.add_or_update(email, nickname=info_dict['name'])

        # update account contact email
        if info_dict['contact_email']:
            Profile.objects.add_or_update(email, contact_email=info_dict['contact_email'])
            Profile.objects.filter(user=email).update(is_manually_set_contact_email=True)

        # update account telephone
        if info_dict['telephone']:
            DetailedProfile.objects.add_or_update(email, department=None, telephone=info_dict['telephone'])

        # update user list_in_address_book
        if info_dict['list_in_address_book']:
            Profile.objects.add_or_update(email, list_in_address_book=info_dict['list_in_address_book'])

    def get(self, request):
        email = request.user.username
        info = self._get_user_info(email)
        return Response(info)

    def put(self, request):

        email = request.user.username

        if not ENABLE_UPDATE_USER_INFO:
            error_msg = _('Feature disabled.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # argument check for name
        name = request.data.get("name", None)
        if name:
            if not ENABLE_USER_SET_NAME:
                error_msg = _('Feature disabled.')
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
            name = name.strip()
            if len(name) > 64:
                error_msg = _('Name is too long (maximum is 64 characters)')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if "/" in name:
                error_msg = _("Name should not include '/'.")
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # argument check for contact_email
        contact_email = request.data.get("contact_email", None)
        if contact_email:
            
            if not ENABLE_USER_SET_CONTACT_EMAIL:
                error_msg = _('Feature disabled.')
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            profile = Profile.objects.get_profile_by_contact_email(contact_email)
            if profile and profile.user != email:
                # if contact email is used by others, return 403
                error_msg = _('Contact email %s already exists.' % contact_email)
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # update contact email
            contact_email = contact_email.strip()
            if not is_valid_email(contact_email):
                error_msg = 'contact_email invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # agrument check for telephone
        telephone = request.data.get('telephone', None)
        if telephone:
            telephone = telephone.strip()
            if len(telephone) > 100:
                error_msg = _('telephone is too long (maximum is 100 characters).')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # argument check for list_in_address_book
        list_in_address_book = request.data.get("list_in_address_book", None)
        if list_in_address_book is not None:
            if list_in_address_book.lower() not in ('true', 'false'):
                error_msg = 'list_in_address_book invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        info_dict = {
            'name': name,
            'contact_email': contact_email,
            'telephone': telephone,
            'list_in_address_book': list_in_address_book,
        }

        # update user profile and user additionnal info
        try:
            self._update_user_info(info_dict, email)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # get user info and return
        info = self._get_user_info(email)
        return Response(info)

class UserConvertToTeamView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)
    
    def post(self, request):
        if not ENABLE_CONVERT_TO_TEAM_ACCOUNT:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        org_role = DEFAULT_ORG
        
        if request.user.org:
            error_msg = 'User is already in team.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        url_prefix = gen_org_url_prefix(3)
        if url_prefix is None:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        username = request.user.username
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
            # 1. Create a new org, and add the current to org as a team admin
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

class ResetPasswordView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        if not isinstance(request.data, dict):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Bad request')
        old_password = request.data.get('old_password')
        if old_password and (not isinstance(old_password, str) or len(old_password) > 4096):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Old password invalid')
        new_password = request.data.get('new_password')
        if not new_password or (not isinstance(new_password, str)) or len(new_password) > 4096:
            return api_error(status.HTTP_400_BAD_REQUEST, 'New password invalid')

        if old_password == new_password:
            return api_error(status.HTTP_400_BAD_REQUEST, 'New password cannot be the same as old password')

        if not is_password_strength_valid(new_password):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Password strength should be strong or very strong')

        user = request.user
        if user.enc_password != UNUSABLE_PASSWORD and not old_password:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Old password invalid')

        has_bind_social_auth = False
        if SocialAuthUser.objects.filter(username=request.user.username).exists():
            has_bind_social_auth = True

        can_update_password = True
        if (not settings.ENABLE_SSO_USER_CHANGE_PASSWORD) and has_bind_social_auth:
            can_update_password = False

        if not can_update_password:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied')

        if old_password and not user.check_password(old_password):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Old password incorrect')

        user.set_password(new_password)
        user.save()
        enable_pwd_email = bool(UserOptions.objects.get_password_update_email_enable_status(user.username))
        
        if IS_EMAIL_CONFIGURED and enable_pwd_email:
            email_template_name = 'registration/password_change_email.html'
            send_to = email2contact_email(request.user.username)
            site_name = get_site_name()
            c = {
                'email': send_to,
                'name': email2nickname(user.username)
            }
            try:
                send_html_email(_("[%s]Your Password Has Been Successfully Updated") % site_name,
                                email_template_name, c, None,
                                [send_to])
            except Exception as e:
                logger.error('Failed to send notification to %s' % send_to)

        if not request.session.is_empty():
            # invalidate all active sessions after change password.
            update_session_auth_hash(request, request.user)

        return Response({'success': True})
