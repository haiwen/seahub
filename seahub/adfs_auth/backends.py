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

    def authenticate(self, session_info=None, attribute_mapping=None, create_unknown_user=True, **kwargs):
        if session_info is None or attribute_mapping is None:
            logger.error('Session info or attribute mapping are None')
            return None

        if 'ava' not in session_info:
            logger.error('"ava" key not found in session_info')
            return None

        attributes = session_info['ava']
        if not attributes:
            logger.warning('The attributes dictionary is empty')

        name_id = session_info.get('name_id', '')
        if not name_id:
            logger.error('The name_id is not available. Could not determine user identifier.')
            return None
        name_id = name_id.text

        saml_user = SocialAuthUser.objects.get_by_provider_and_uid(SAML_PROVIDER_IDENTIFIER, name_id)
        if saml_user:
            try:
                user = User.objects.get(email=saml_user.username)
            except User.DoesNotExist:
                user = None
            if not user:
                # Means found user in social_auth_usersocialauth but not found user in EmailUser,
                # delete it and recreate one.
                logger.warning('The DB data is invalid, delete it and recreate one.')
                SocialAuthUser.objects.filter(provider=SAML_PROVIDER_IDENTIFIER, uid=name_id).delete()
        else:
            # compatible with old users via name_id
            try:
                user = User.objects.get_old_user(name_id, SAML_PROVIDER_IDENTIFIER, name_id)
            except User.DoesNotExist:
                user = None

        if not user and create_unknown_user:
            activate_after_creation = getattr(settings, 'SAML_ACTIVATE_USER_AFTER_CREATION', True)
            try:
                user = User.objects.create_saml_user(is_active=activate_after_creation)
                SocialAuthUser.objects.add(user.username, SAML_PROVIDER_IDENTIFIER, name_id)
            except Exception as e:
                logger.error(f'create saml user failed. {e}')
                return None

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
            self.sync_saml_groups(user, attributes)

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
                for attr in django_attrs:
                    parse_result[attr] = attributes[saml_attr][0]
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

    def sync_saml_groups(self, user, attributes):
        seafile_groups = attributes.get('seafile_groups', [])
        if not isinstance(seafile_groups, list):
            logger.error('seafile_groups type invalid, it should be a list instance')
            return

        if not seafile_groups:
            return

        saml_group_ids = [int(group_id) for group_id in seafile_groups]

        joined_groups = ccnet_api.get_groups(user.username)
        joined_group_ids = [g.id for g in joined_groups]
        joined_group_map = {g.id: g.creator_name for g in joined_groups}

        need_join_groups = list(set(saml_group_ids) - set(joined_group_ids))
        for group_id in need_join_groups:
            group = ccnet_api.get_group(group_id)
            if group:
                ccnet_api.group_add_member(group_id, group.creator_name, user.username)

        need_quit_groups = list(set(joined_group_ids) - set(saml_group_ids))
        for group_id in need_quit_groups:
            ccnet_api.group_remove_member(group_id, joined_group_map[group_id], user.username)
