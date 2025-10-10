# -*- coding: utf-8 -*-
import re
import copy
import logging
from collections import OrderedDict
from fnmatch import fnmatch
from os import path

import saml2.xmldsig
from saml2 import BINDING_HTTP_REDIRECT, BINDING_HTTP_POST, NAMEID_FORMAT_EMAILADDRESS
from saml2.config import SPConfig
from django.utils.translation import gettext as _

from seaserv import ccnet_api, seafile_api

from seahub.adfs_auth.backends import SHIBBOLETH_AFFILIATION_ROLE_MAP, CACHE_KEY_GROUPS
from seahub.base.accounts import User
from seahub.role_permissions.utils import get_enabled_role_permissions_by_role
from seahub.utils import get_service_url
from seahub.organizations.models import OrgSAMLConfig
from seahub import settings
from django.core.cache import cache
from seahub.utils.file_size import get_quota_from_string

logger = logging.getLogger(__name__)

ENABLE_ADFS_LOGIN = getattr(settings, 'ENABLE_ADFS_LOGIN', False)
ENABLE_MULTI_ADFS = getattr(settings, 'ENABLE_MULTI_ADFS', False)
if ENABLE_ADFS_LOGIN or ENABLE_MULTI_ADFS:
    REMOTE_METADATA_URL = getattr(settings, 'SAML_REMOTE_METADATA_URL', '')
    XMLSEC_BINARY_PATH = getattr(settings, 'SAML_XMLSEC_BINARY_PATH', '/usr/bin/xmlsec1')
    CERTS_DIR = getattr(settings, 'SAML_CERTS_DIR', '/opt/seafile/seahub-data/certs')
    SAML_ATTRIBUTE_MAPPING = getattr(settings, 'SAML_ATTRIBUTE_MAPPING', {})
    SAML_PROVIDER_IDENTIFIER = getattr(settings, 'SAML_PROVIDER_IDENTIFIER', 'saml')


def settings_check(func):
    def _decorated(request):
        error = False
        if not ENABLE_ADFS_LOGIN and not ENABLE_MULTI_ADFS:
            logger.error('Feature not enabled.')
            error = True
        else:
            if not XMLSEC_BINARY_PATH or not CERTS_DIR or not SAML_ATTRIBUTE_MAPPING or not SAML_PROVIDER_IDENTIFIER:
                logger.error('ADFS/SAML login relevant settings invalid.')
                logger.error('SAML_XMLSEC_BINARY_PATH: %s' % XMLSEC_BINARY_PATH)
                logger.error('SAML_CERTS_DIR: %s' % CERTS_DIR)
                logger.error('SAML_ATTRIBUTE_MAPPING: %s' % SAML_ATTRIBUTE_MAPPING)
                logger.error('SAML_PROVIDER_IDENTIFIER: %s' % SAML_PROVIDER_IDENTIFIER)
                error = True
            if ENABLE_ADFS_LOGIN and not REMOTE_METADATA_URL:
                logger.error('ADFS/SAML login relevant settings invalid.')
                logger.error('SAML_REMOTE_METADATA_URL: %s' % REMOTE_METADATA_URL)
                error = True
        if error:
            raise Exception(_('ADFS/SAML login relevant settings invalid.'))
        return func(request)
    return _decorated


@settings_check
def config_settings_loader(request):
    # get org_id
    org_id = None
    reg = re.search(r'org/custom/(\d+)/saml2/', request.path)
    if reg:
        org_id = int(reg.group(1))

    if org_id and org_id > 0:
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            raise Exception('Cannot find an organization related to org_id %s.' % org_id)

        org_saml_config = OrgSAMLConfig.objects.get_config_by_org_id(org_id)
        if not org_saml_config:
            raise Exception('Cannot find an ADFS/SAML config for the organization related to org_id %s.' % org_id)

        # get org remote_metadata_url
        remote_metadata_url = org_saml_config.metadata_url
        # get org sp_service_url
        sp_service_url = get_service_url().rstrip('/') + '/org/custom/' + str(org_id)
    else:
        # get remote_metadata_url
        remote_metadata_url = REMOTE_METADATA_URL
        # get sp_service_url
        sp_service_url = get_service_url().rstrip('/')

    # generate org saml_config
    saml_config = {
        'entityid': sp_service_url + '/saml2/metadata/',
        'xmlsec_binary': XMLSEC_BINARY_PATH,
        'attribute_map_dir': path.join(path.dirname(path.abspath(__file__)), 'attribute-maps'),
        'allow_unknown_attributes': True,
        'service': {
            'sp': {
                'name_id_format': NAMEID_FORMAT_EMAILADDRESS,
                'required_attributes': ['uid'],
                'allow_unsolicited': True,
                # https://github.com/IdentityPython/pysaml2/blob/master/docs/howto/config.rst#want-assertions-or-response-signed
                'want_response_signed': False,
                'want_assertions_signed': False,
                'want_assertions_or_response_signed': True,

                # ADFS single logout must be signed
                'logout_requests_signed': True,

                # The sha1 algorithm is used by default, but sha256 is recommended
                # https://github.com/IdentityPython/pysaml2/blob/master/src/saml2/xmldsig/__init__.py#L49
                # https://djangosaml2.readthedocs.io/contents/setup.html#pysaml2-specific-files-and-configuration
                'signing_algorithm': saml2.xmldsig.SIG_RSA_SHA256,
                'digest_algorithm': saml2.xmldsig.DIGEST_SHA256,

                'endpoints': {
                    'assertion_consumer_service': [
                        (sp_service_url + '/saml2/acs/', BINDING_HTTP_POST)
                    ],
                    'single_logout_service': [
                        (sp_service_url + '/saml2/ls/', BINDING_HTTP_REDIRECT),
                        (sp_service_url + '/saml2/ls/post/', BINDING_HTTP_POST),
                    ],
                },
            },
        },
        'metadata': {
            'remote': [{'url': remote_metadata_url}],
        },

        # https://djangosaml2.readthedocs.io/contents/setup.html#certificates
        'key_file': path.join(CERTS_DIR, 'sp.key'),
        'cert_file': path.join(CERTS_DIR, 'sp.crt'),
        'encryption_keypairs': [{
            'key_file': path.join(CERTS_DIR, 'sp.key'),
            'cert_file': path.join(CERTS_DIR, 'sp.crt'),
        }],
    }

    try:
        conf = SPConfig()
        conf.load(copy.deepcopy(saml_config))
    except Exception as e:
        logger.exception('Failed to load adfs/saml config, error: %s' % e)
        raise RuntimeError('Failed to load adfs/saml config, error: %s' % e)
    return conf


def parse_user_attributes(attribute_mapping, attributes):
    parse_result = {}
    for saml_attr, django_attrs in list(attribute_mapping.items()):
        try:
            for attr in django_attrs:
                parse_result[attr] = attributes[saml_attr][0]
        except KeyError:
            pass

    return parse_result


def update_user_role(user, role):
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
            
            
def sync_saml_groups(user, seafile_groups):
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