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
from django.contrib import auth
from django.contrib.auth.backends import ModelBackend
from django.core.exceptions import ImproperlyConfigured

from djangosaml2.signals import pre_user_save

try:
    from django.contrib.auth.models import SiteProfileNotAvailable
except ImportError:
    class SiteProfileNotAvailable(Exception):
        pass

from seaserv import ccnet_api, seafile_api
from seahub.base.accounts import User
from seahub.profile.models import Profile, DetailedProfile
from seahub.utils.file_size import get_quota_from_string
from seahub.role_permissions.utils import get_enabled_role_permissions_by_role

from registration.models import (notify_admins_on_activate_request,
                                 notify_admins_on_register_complete)

logger = logging.getLogger(__name__)


def get_model(model_path):
    try:
        from django.apps import apps
        return apps.get_model(model_path)
    except ImportError:
        # Django < 1.7 (cannot use the new app loader)
        from django.db.models import get_model as django_get_model
        try:
            app_label, model_name = model_path.split('.')
        except ValueError:
            raise ImproperlyConfigured("SAML_USER_MODEL must be of the form "
                "'app_label.model_name'")
        user_model = django_get_model(app_label, model_name)
        if user_model is None:
            raise ImproperlyConfigured("SAML_USER_MODEL refers to model '%s' "
                "that has not been installed" % model_path)
        return user_model


def get_saml_user_model():
    try:
        # djangosaml2 custom user model
        return get_model(settings.SAML_USER_MODEL)
    except AttributeError:
        try:
            # Django 1.5 Custom user model
            return auth.get_user_model()
        except AttributeError:
            return auth.models.User


class Saml2Backend(ModelBackend):

    def get_user(self, username):
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            user = None
        return user

    def authenticate(self, session_info=None, attribute_mapping=None,
                     create_unknown_user=True, **kwargs):
        if session_info is None or attribute_mapping is None:
            logger.error('Session info or attribute mapping are None')
            return None

        if 'ava' not in session_info:
            logger.error('"ava" key not found in session_info')
            return None

        attributes = session_info['ava']
        if not attributes:
            logger.error('The attributes dictionary is empty')

        use_name_id_as_username = getattr(
            settings, 'SAML_USE_NAME_ID_AS_USERNAME', False)

        django_user_main_attribute = getattr(
            settings, 'SAML_DJANGO_USER_MAIN_ATTRIBUTE', 'username')
        django_user_main_attribute_lookup = getattr(
            settings, 'SAML_DJANGO_USER_MAIN_ATTRIBUTE_LOOKUP', '')

        logger.debug('attributes: %s', attributes)
        saml_user = None
        if use_name_id_as_username:
            if 'name_id' in session_info:
                logger.debug('name_id: %s', session_info['name_id'])
                saml_user = session_info['name_id'].text
            else:
                logger.error('The nameid is not available. Cannot find user without a nameid.')
        else:
            logger.debug('attribute_mapping: %s', attribute_mapping)
            for saml_attr, django_fields in list(attribute_mapping.items()):
                if (django_user_main_attribute in django_fields and saml_attr in attributes):
                    saml_user = attributes[saml_attr][0]

        if saml_user is None:
            logger.error('Could not find saml_user value')
            return None

        if not self.is_authorized(attributes, attribute_mapping):
            return None

        main_attribute = self.clean_user_main_attribute(saml_user)

        user_query_args = {
                django_user_main_attribute+django_user_main_attribute_lookup:
                main_attribute}
        user_create_defaults = {django_user_main_attribute: main_attribute}

        # Note that this could be accomplished in one try-except clause, but
        # instead we use get_or_create when creating unknown users since it has
        # built-in safeguards for multiple threads.

        # check if user exist in local ccnet db/ldapimport database
        username = main_attribute
        local_ccnet_users = ccnet_api.search_emailusers('DB', username, -1, -1)
        if not local_ccnet_users:
            local_ccnet_users = ccnet_api.search_emailusers('LDAP', username, -1, -1)

        if not local_ccnet_users:
            if create_unknown_user:
                activate_after_creation = getattr(settings, 'SAML_ACTIVATE_USER_AFTER_CREATION', True)
                user = User.objects.create_user(email=username, is_active=activate_after_creation)
                if not activate_after_creation:
                    notify_admins_on_activate_request(username)
                elif settings.NOTIFY_ADMIN_AFTER_REGISTRATION:
                    notify_admins_on_register_complete(username)

            else:
                user = None
        else:
            user = User.objects.get(email=username)

        if user:
            self.make_profile(user, attributes, attribute_mapping)

        return user

    def is_authorized(self, attributes, attribute_mapping):
        """Hook to allow custom authorization policies based on
        SAML attributes.
        """
        return True

    def clean_user_main_attribute(self, main_attribute):
        """Performs any cleaning on the user main attribute (which
        usually is "username") prior to using it to get or
        create the user object.  Returns the cleaned attribute.

        By default, returns the attribute unchanged.
        """
        return main_attribute

    def configure_user(self, user, attributes, attribute_mapping):
        """Configures a user after creation and returns the updated user.

        By default, returns the user with his attributes updated.
        """
        user.set_unusable_password()
        return self.update_user(user, attributes, attribute_mapping,
                                force_save=True)

    def update_user(self, user, attributes, attribute_mapping,
                    force_save=False):
        """Update a user with a set of attributes and returns the updated user.

        By default it uses a mapping defined in the settings constant
        SAML_ATTRIBUTE_MAPPING. For each attribute, if the user object has
        that field defined it will be set, otherwise it will try to set
        it in the profile object.
        """
        if not attribute_mapping:
            return user

        try:
            profile = user.get_profile()
        except Profile.DoesNotExist:
            profile = None
        except SiteProfileNotAvailable:
            profile = None
        # Django 1.5 custom model assumed
        except AttributeError:
            profile = user

        user_modified = False
        profile_modified = False
        for saml_attr, django_attrs in list(attribute_mapping.items()):
            try:
                for attr in django_attrs:
                    if hasattr(user, attr):
                        modified = self._set_attribute(
                            user, attr, attributes[saml_attr][0])
                        user_modified = user_modified or modified

                    elif profile is not None and hasattr(profile, attr):
                        modified = self._set_attribute(
                            profile, attr, attributes[saml_attr][0])
                        profile_modified = profile_modified or modified

            except KeyError:
                # the saml attribute is missing
                pass

        logger.debug('Sending the pre_save signal')
        signal_modified = any(
            [response for receiver, response
             in pre_user_save.send_robust(sender=user,
                                          attributes=attributes,
                                          user_modified=user_modified)]
            )

        if user_modified or signal_modified or force_save:
            user.save()

        if (profile is not None and (profile_modified or signal_modified or force_save)):
            profile.save()

        return user

    def _set_attribute(self, obj, attr, value):
        """Set an attribute of an object to a specific value.

        Return True if the attribute was changed and False otherwise.
        """
        field = obj._meta.get_field(attr)
        if len(value) > field.max_length:
            cleaned_value = value[:field.max_length]
            logger.warn('The attribute "%s" was trimmed from "%s" to "%s"',
                        attr, value, cleaned_value)
        else:
            cleaned_value = value

        old_value = getattr(obj, attr)
        if cleaned_value != old_value:
            setattr(obj, attr, cleaned_value)
            return True

        return False

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

        SHIBBOLETH_AFFILIATION_ROLE_MAP = getattr(
            settings, 'SHIBBOLETH_AFFILIATION_ROLE_MAP', False)
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
            d_p = DetailedProfile.objects.add_detailed_profile(user.username,
                                                               '', '')

        if department:
            d_p.department = department
        if telephone:
            d_p.telephone = telephone

        d_p.save()

        self.update_user_role(user, parse_result)
