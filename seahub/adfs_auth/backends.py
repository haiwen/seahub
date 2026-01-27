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

from django.conf import settings
from django.contrib.auth.backends import ModelBackend

from seaserv import ccnet_api, seafile_api

from seahub.base.accounts import User
from registration.models import notify_admins_on_activate_request, notify_admins_on_register_complete

logger = logging.getLogger(__name__)

SAML_PROVIDER_IDENTIFIER = getattr(settings, 'SAML_PROVIDER_IDENTIFIER', 'saml')
SHIBBOLETH_AFFILIATION_ROLE_MAP = getattr(settings, 'SHIBBOLETH_AFFILIATION_ROLE_MAP', {})
CACHE_KEY_GROUPS = "all_groups_cache"
LDAP_PROVIDER = getattr(settings, 'LDAP_PROVIDER', 'ldap')
SSO_LDAP_USE_SAME_UID = getattr(settings, 'SSO_LDAP_USE_SAME_UID', False)


class Saml2Backend(object):

    create_unknown_user = getattr(settings, 'SAML_CREATE_UNKNOWN_USER', True)
    # Create active user by default.
    activate_after_creation = getattr(settings, 'SAML_ACTIVATE_USER_AFTER_CREATION', True)
    def get_user(self, username):
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            user = None
        return user
    
    
    def authenticate(self, saml_username=None, org_id=None):
        if not saml_username:
            user = None
        else:
            username = saml_username
            user = self.get_user(username)
        

        if not user and self.create_unknown_user:
            user = User.objects.create_saml_user(is_active=self.activate_after_creation)
            # add org user
            if org_id and org_id > 0:
                ccnet_api.add_org_user(org_id, user.username, 0)

            if not self.activate_after_creation:
                notify_admins_on_activate_request(user.username)
            elif settings.NOTIFY_ADMIN_AFTER_REGISTRATION:
                notify_admins_on_register_complete(user.username)

        return user
