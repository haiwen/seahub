# -*- coding: utf-8 -*-
import re
import copy
import logging
from os import path

from saml2 import BINDING_HTTP_POST, NAMEID_FORMAT_EMAILADDRESS
from saml2.config import SPConfig
from django.utils.translation import gettext as _

from seaserv import ccnet_api

from seahub.utils import render_error, get_service_url
from seahub.organizations.models import OrgSAMLConfig
from seahub import settings

logger = logging.getLogger(__name__)

ENABLE_ADFS_LOGIN = getattr(settings, 'ENABLE_ADFS_LOGIN', False)
ENABLE_MULTI_ADFS = getattr(settings, 'ENABLE_MULTI_ADFS', False)
if ENABLE_ADFS_LOGIN or ENABLE_MULTI_ADFS:
    REMOTE_METADATA_URL = getattr(settings, 'SAML_REMOTE_METADATA_URL', '')
    XMLSEC_BINARY_PATH = getattr(settings, 'SAML_XMLSEC_BINARY_PATH', '/usr/bin/xmlsec1')
    CERTS_DIR = getattr(settings, 'SAML_CERTS_DIR', '/opt/seafile/seahub-data/certs')
    SAML_ATTRIBUTE_MAPPING = getattr(settings, 'SAML_ATTRIBUTE_MAPPING', {})


def settings_check(func):
    def _decorated(request):
        error = False
        if not ENABLE_ADFS_LOGIN or not ENABLE_MULTI_ADFS:
            logger.error('Feature not enabled.')
            error = True
        else:
            if not XMLSEC_BINARY_PATH or not CERTS_DIR or not SAML_ATTRIBUTE_MAPPING:
                logger.error('ADFS login relevant settings invalid.')
                logger.error('SAML_XMLSEC_BINARY_PATH: %s' % XMLSEC_BINARY_PATH)
                logger.error('SAML_CERTS_DIR: %s' % CERTS_DIR)
                logger.error('SAML_ATTRIBUTE_MAPPING: %s' % SAML_ATTRIBUTE_MAPPING)
                error = True
            if ENABLE_ADFS_LOGIN and not REMOTE_METADATA_URL:
                logger.error('SAML relevant settings invalid.')
                logger.error('SAML_REMOTE_METADATA_URL: %s' % REMOTE_METADATA_URL)
                error = True
        if error:
            return render_error(request, _('Error, please contact administrator.'))
        return func(request)
    return _decorated


@settings_check
def config_settings_loader(request):
    # get url_prefix
    url_prefix = ''
    reg = re.search(r'org/custom/([a-z_0-9-]+)', request.path)
    if reg:
        url_prefix = reg.group(1)

    # get org_id
    org_id = -1
    org = ccnet_api.get_org_by_url_prefix(url_prefix)
    if not org:
        org_id = org.org_id

    if org_id != -1:
        org_saml_config = OrgSAMLConfig.objects.get_config_by_org_id(org_id)
        if not org_saml_config:
            return render_error(request, 'Failed to get org %s saml_config' % org_id)

        # get org remote_metadata_url
        remote_metadata_url = org_saml_config.metadata_url
        # get org sp_service_url
        sp_service_url = get_service_url().rstrip('/') + '/' + url_prefix
        # generate org certs dir
        certs_dir = path.join(CERTS_DIR, str(org_id))
    else:
        # get remote_metadata_url
        remote_metadata_url = REMOTE_METADATA_URL
        # get sp_service_url
        sp_service_url = get_service_url().rstrip('/')
        # generate certs dir
        certs_dir = CERTS_DIR

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
                'endpoints': {
                    'assertion_consumer_service': [
                        (sp_service_url + '/saml2/acs/', BINDING_HTTP_POST)
                    ],
                },
            },
        },
        'metadata': {
            'remote': [{'url': remote_metadata_url}],
        },
        'cert_file': path.join(certs_dir, 'idp.crt'),
        'encryption_keypairs': [{
            'key_file': path.join(certs_dir, 'sp.key'),
            'cert_file': path.join(certs_dir, 'sp.crt'),
        }],
    }

    conf = SPConfig()
    conf.load(copy.deepcopy(saml_config))
    return conf
