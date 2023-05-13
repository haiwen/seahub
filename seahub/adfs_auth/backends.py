# Copyright (c) 2012-2016 Seafile Ltd.
# Copyright (C) 2010-2012 Yaco Sistemas (http://www.yaco.es)
# Copyright (C) 2009 Lorenzo Gil Sanchez <lorenzo.gil.sanchez@gmail.com>
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#            http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import logging
from fnmatch import fnmatch
from collections import OrderedDict

from django.conf import settings
from django.contrib.auth.backends import ModelBackend

from seaserv import ccnet_api, seafile_api

from seahub.base.accounts import User
from seahub.auth.models import SocialAuthUser
from seahub.profile.models import Profile, DetailedProfile
from seahub.utils.file_size import get_quota_from_string
from seahub.role_permissions.utils import get_enabled_role_permissions_by_role
from registration.models import notify_admins_on_activate_request, notify_admins_on_register_complete

logger = logging.getLogger(__name__)

SAML_PROVIDER_IDENTIFIER = getattr(settings, 'SAML_PROVIDER_IDENTIFIER', '')
SHIBBOLETH_AFFILIATION_ROLE_MAP = getattr(settings, 'SHIBBOLETH_AFFILIATION_ROLE_MAP', False)


class Saml2Backend(ModelBackend):

    def get_user(self, username):
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            user = None
        return user

    def authenticate(self, session_info=None, attribute_mapping=None, create_unknown_user=True, **kwargs):
        if session_info is None or attribute_mapping is None:
            logger.error('Session info or attribute mapping are None')
            return None

        if 'ava' not in session_info:
            logger.error('"ava" key not found in session_info')
            return None

        attributes = session_info['ava']
        if not attributes:
            logger.error('The attributes dictionary is empty')

        uid = attributes.get('uid', [''])[0]
        if not uid:
            logger.error('saml user uid not found.')
            logger.error('attributes: %s' % attributes)
            return None

        saml_user = SocialAuthUser.objects.get_by_provider_and_uid(SAML_PROVIDER_IDENTIFIER, uid)
        if saml_user:
            username = saml_user.username
            user = self.get_user(username)
            if not user:
                # Means found user in social_auth_usersocialauth but not found user in EmailUser,
                # delete it and recreate one.
                SocialAuthUser.objects.filter(provider=SAML_PROVIDER_IDENTIFIER, uid=uid).delete()
        else:
            user = None

        if not user and create_unknown_user:
            activate_after_creation = getattr(settings, 'SAML_ACTIVATE_USER_AFTER_CREATION', True)
            user = User.objects.create_saml_user(is_active=activate_after_creation)
            SocialAuthUser.objects.add(user.username, SAML_PROVIDER_IDENTIFIER, uid)
            # create org user
            url_prefix = kwargs.get('url_prefix', None)
            if url_prefix:
                org = ccnet_api.get_org_by_url_prefix(url_prefix)
                if org:
                    org_id = org.org_id
                    ccnet_api.add_org_user(org_id, user.username, 0)

            if not activate_after_creation:
                notify_admins_on_activate_request(user.username)
            elif settings.NOTIFY_ADMIN_AFTER_REGISTRATION:
                notify_admins_on_register_complete(user.username)

        if user:
            self.make_profile(user, attributes, attribute_mapping)

        return user

    def update_user_role(self, user, parse_result):
        role = parse_result.get('role', '')
        if role:
            User.objects.update_role(user.username, role)

            # update user role quota
            role_quota = get_enabled_role_permissions_by_role(role)['role_quota']
            if role_quota:
                quota = get_quota_from_string(role_quota)
                seafile_api.set_role_quota(role, quota)

            return

        if not SHIBBOLETH_AFFILIATION_ROLE_MAP:
            return

        if user.username in SHIBBOLETH_AFFILIATION_ROLE_MAP:
            role = SHIBBOLETH_AFFILIATION_ROLE_MAP[user.username]
        elif 'patterns' in SHIBBOLETH_AFFILIATION_ROLE_MAP:

            patterns = SHIBBOLETH_AFFILIATION_ROLE_MAP['patterns']

            try:
                ordered_patterns = OrderedDict(patterns)
            except Exception as e:
                logger.error(e)
                return

            for key in ordered_patterns:
                if fnmatch(user.username, key):
                    role = ordered_patterns[key]
                    break
        else:
            return

        if role:
            User.objects.update_role(user.email, role)

            # update user role quota
            role_quota = get_enabled_role_permissions_by_role(role)['role_quota']
            if role_quota:
                quota = get_quota_from_string(role_quota)
                seafile_api.set_role_quota(role, quota)

    def make_profile(self, user, attributes, attribute_mapping):
        parse_result = {}
        for saml_attr, django_attrs in list(attribute_mapping.items()):
            try:
                parse_result[django_attrs] = attributes.get(saml_attr, [''])[0]
            except KeyError:
                pass

        display_name = parse_result.get('display_name', '')
        contact_email = parse_result.get('contact_email', '')
        telephone = parse_result.get('telephone', '')
        department = parse_result.get('department', '')

        p = Profile.objects.get_profile_by_user(user.username)
        if not p:
            p = Profile.objects.add_or_update(user.username, '')

        if display_name:
            p.nickname = display_name
        if contact_email:
            p.contact_email = contact_email

        p.save()

        d_p = DetailedProfile.objects.get_detailed_profile_by_user(user.username)
        if not d_p:
            d_p = DetailedProfile.objects.add_detailed_profile(user.username, '', '')

        if department:
            d_p.department = department
        if telephone:
            d_p.telephone = telephone

        d_p.save()

        self.update_user_role(user, parse_result)
