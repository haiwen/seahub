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
from django.core.cache import cache

from seaserv import ccnet_api, seafile_api

from seahub.base.accounts import User
from seahub.auth.models import SocialAuthUser
from seahub.profile.models import Profile, DetailedProfile
from seahub.utils.file_size import get_quota_from_string
from seahub.role_permissions.utils import get_enabled_role_permissions_by_role
from registration.models import notify_admins_on_activate_request, notify_admins_on_register_complete

logger = logging.getLogger(__name__)

SAML_PROVIDER_IDENTIFIER = getattr(settings, 'SAML_PROVIDER_IDENTIFIER', 'saml')
SHIBBOLETH_AFFILIATION_ROLE_MAP = getattr(settings, 'SHIBBOLETH_AFFILIATION_ROLE_MAP', {})
CACHE_KEY_GROUPS = "all_groups_cache"
LDAP_PROVIDER = getattr(settings, 'LDAP_PROVIDER', 'ldap')
SSO_LDAP_USE_SAME_UID = getattr(settings, 'SSO_LDAP_USE_SAME_UID', False)


def get_user_email_in_provider(session_info, attribute_mapping):
    # Use the same SAML attribute parsing logic as `make_profile(...)`, and
    # only return Seahub's `contact_email` field.
    attributes = session_info.get('ava', {})
    if not attributes:
        logger.info('ADFS user lookup: no assertion attributes found when resolving contact_email provider field.')
        return None

    parse_result = {}
    for saml_attr, django_attrs in list(attribute_mapping.items()):
        try:
            for attr in django_attrs:
                parse_result[attr] = attributes[saml_attr][0]
        except KeyError:
            continue

    contact_email = parse_result.get('contact_email')
    if contact_email:
        logger.info('ADFS user lookup: resolved contact_email %s from SAML attribute mapping.',
                    contact_email)
        return contact_email

    logger.info('ADFS user lookup: no contact_email was resolved from SAML attribute mapping.')
    return None


def get_old_user_by_email_or_contact_email(session_info, attribute_mapping, uid):
    # Resolution order for an unbound ADFS login:
    # 1. Find the provider-side email value from the field mapped to Seahub's
    #    `contact_email`.
    # 2. Use that same email value to look up an existing Seahub user in
    #    ccnet.EmailUser via `get_old_user(...)`.
    # 3. If that still does not match, use the same email value to find the
    #    owning account from seahub.profile_profile.
    # 3. If neither lookup matches, the caller may create a new SAML user.
    email = get_user_email_in_provider(session_info, attribute_mapping)
    if email:
        logger.info('ADFS user lookup: trying ccnet.EmailUser lookup by mapped email %s for uid %s.',
                    email, uid)
        try:
            user = User.objects.get_old_user(email, SAML_PROVIDER_IDENTIFIER, uid)
            logger.info('ADFS user lookup: matched existing user %s from ccnet.EmailUser by mapped email %s.',
                        user.username, email)
            return user
        except User.DoesNotExist:
            logger.info('ADFS user lookup: no existing ccnet.EmailUser matched mapped email %s.', email)

    if not email:
        logger.info('ADFS user lookup: no contact_email available, cannot continue profile lookup for uid %s.',
                    uid)
        return None

    # The same provider-side email value is then used to look up the owner in
    # seahub.profile_profile.contact_email.
    logger.info('ADFS user lookup: trying seahub.profile_profile lookup by contact_email %s for uid %s.',
                email, uid)
    username = Profile.objects.get_username_by_contact_email(email)
    if not username:
        logger.info('ADFS user lookup: no profile matched contact_email %s.', email)
        return None

    try:
        user = User.objects.get(email=username)
        logger.info('ADFS user lookup: matched user %s via seahub.profile_profile contact_email %s.',
                    user.username, email)
        return user
    except User.DoesNotExist:
        logger.warning('Found profile contact_email %s but user %s does not exist.',
                       email, username)
        return None


class Saml2Backend(ModelBackend):
    def get_user(self, username):
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            user = None
        return user

    def authenticate(self, session_info=None, attribute_mapping=None, create_unknown_user=True, org_id=None, **kwargs):
        if session_info is None or attribute_mapping is None:
            logger.error('Session info or attribute mapping are None')
            return None

        name_id = session_info.get('name_id', '')
        if not name_id:
            logger.error('The name_id is not available. Could not determine user identifier.')
            return None
        name_id = name_id.text
        logger.info('ADFS authentication: start resolving user for uid %s.', name_id)

        saml_user = SocialAuthUser.objects.get_by_provider_and_uid(SAML_PROVIDER_IDENTIFIER, name_id)
        if not saml_user and SSO_LDAP_USE_SAME_UID:
            saml_user = SocialAuthUser.objects.get_by_provider_and_uid(LDAP_PROVIDER, name_id)
            if saml_user:
                logger.info('ADFS authentication: matched LDAP social auth binding for uid %s, reusing user %s.',
                            name_id, saml_user.username)
                SocialAuthUser.objects.add(saml_user.username, SAML_PROVIDER_IDENTIFIER, name_id)
        if saml_user:
            logger.info('ADFS authentication: found existing SAML binding for uid %s to user %s.',
                        name_id, saml_user.username)
            user = self.get_user(saml_user.username)
            if not user:
                # Means found user in social_auth_usersocialauth but not found user in EmailUser,
                # delete it and recreate one.
                logger.warning('The DB data is invalid, delete it and recreate one.')
                SocialAuthUser.objects.filter(provider=SAML_PROVIDER_IDENTIFIER, uid=name_id).delete()
        else:
            # If there is no existing SAML binding yet, resolve the user in this
            # order:
            # 1. ccnet.EmailUser by the provider field mapped to Seahub's
            #    `contact_email`
            # 2. seahub.profile_profile by that same email value
            # 3. create a new SAML user below if still unmatched
            user = get_old_user_by_email_or_contact_email(session_info,
                                                          attribute_mapping,
                                                          name_id)
            if user:
                # Persist the ADFS <-> Seahub binding once we have identified an
                # existing account from either EmailUser or profile_profile.
                logger.info('ADFS authentication: binding uid %s to existing user %s.',
                            name_id, user.username)
                SocialAuthUser.objects.add_if_not_exists(user.username,
                                                         SAML_PROVIDER_IDENTIFIER,
                                                         name_id)

        if not user and create_unknown_user:
            logger.info('ADFS authentication: no existing user matched uid %s, creating new SAML user.',
                        name_id)
            activate_after_creation = getattr(settings, 'SAML_ACTIVATE_USER_AFTER_CREATION', True)
            try:
                user = User.objects.create_saml_user(is_active=activate_after_creation)
                SocialAuthUser.objects.add(user.username, SAML_PROVIDER_IDENTIFIER, name_id)
                logger.info('ADFS authentication: created new SAML user %s for uid %s.',
                            user.username, name_id)
            except Exception as e:
                logger.error('create saml user failed: %s' % e)
                return None

            # create org user
            if org_id and org_id > 0:
                logger.info('ADFS authentication: adding newly created user %s to org %s.',
                            user.username, org_id)
                ccnet_api.add_org_user(org_id, user.username, 0)

            if not activate_after_creation:
                notify_admins_on_activate_request(user.username)
            elif settings.NOTIFY_ADMIN_AFTER_REGISTRATION:
                notify_admins_on_register_complete(user.username)

        if user:
            if 'ava' not in session_info:
                logger.warning('"ava" key not found in session_info')
                return user

            attributes = session_info['ava']
            if not attributes:
                logger.warning('The attributes dictionary is empty')
                return user

            logger.info('ADFS authentication: resolved uid %s to user %s, updating profile and syncing groups.',
                        name_id, user.username)
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

        # support a list of comma-separated IDs as seafile_groups claim
        if len(seafile_groups) == 1 and ',' in seafile_groups[0]:
            seafile_groups = [group.strip() for group in seafile_groups[0].split(',')]

        if all(str(group_id).isdigit() for group_id in seafile_groups):
            # all groups are provided as numeric IDs
            saml_group_ids = [int(group_id) for group_id in seafile_groups]
        else:
            # groups are provided as names, try to get current group information from cache
            all_groups = cache.get(CACHE_KEY_GROUPS)
            if not all_groups or any(group not in all_groups for group in seafile_groups):
                # groups not yet cached or missing entry, reload groups from API
                all_groups = {group.group_name: group.id for group in ccnet_api.get_all_groups(-1, -1)}
                cache.set(CACHE_KEY_GROUPS, all_groups, 3600)  # cache for 1 hour
            # create groups which are not yet existing
            for group in [group_name for group_name in seafile_groups if group_name not in all_groups]:
                new_group = ccnet_api.create_group(group, 'system admin') # we are not operating in user context here
                if new_group < 0:
                    logger.error('failed to create group %s' % group)
                    return
                all_groups[group] = new_group
            # generate numeric IDs from group names
            saml_group_ids = [id for group, id in all_groups.items() if group in seafile_groups]

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
