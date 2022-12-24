# -*- coding: utf-8 -*-
import os
import re
import logging

import saml2
from saml2 import saml
from saml2.config import SPConfig
from django.utils.translation import gettext as _

from seaserv import ccnet_api

from seahub.utils import render_error
from seahub.organizations.models import OrgSAMLConfig
try:
    from seahub.settings import ENABLE_MULTI_ADFS, SP_SERVICE_URL, ATTRIBUTE_MAP_DIR, CERTS_DIR, XMLSEC_BINARY
except ImportError:
    ENABLE_MULTI_ADFS = False
    SP_SERVICE_URL = ''
    ATTRIBUTE_MAP_DIR = ''
    CERTS_DIR = ''
    XMLSEC_BINARY = ''

logger = logging.getLogger(__name__)


def settings_check(func):
    def _decorated(request):
        error = False
        if not ENABLE_MULTI_ADFS:
            logger.error('Feature not enabled.')
            error = True
        else:
            if not SP_SERVICE_URL or not ATTRIBUTE_MAP_DIR or not CERTS_DIR or not XMLSEC_BINARY:
                logger.error('ADFS login relevant settings invalid.')
                error = True
        if error:
            return render_error(request, _('Error, please contact administrator.'))
        return func(request)
    return _decorated


@settings_check
def config_settings_loader(request):
    # get url_prefix
    url_prefix = None
    reg = re.search(r'^org/custom/([a-z_0-9]+)$', request.path.strip('/'))
    if reg:
        url_prefix = reg.group(1)

    # get org_id
    org = ccnet_api.get_org_by_url_prefix(url_prefix)
    if not org:
        return render_error(request, 'Failed to get org %s ' % url_prefix)
    org_id = org.org_id

    # get org saml_config
    org_saml_config = OrgSAMLConfig.objects.get_config_by_org_id(org_id)
    if not org_saml_config:
        return render_error(request, 'Failed to get org %s saml_config' % org_id)
    metadata_url = org_saml_config.metadata_url
    single_sign_on_service = org_saml_config.single_sign_on_service
    single_logout_service = org_saml_config.single_logout_service
    valid_days = int(org_saml_config.valid_days)

    # get org_sp_service_url
    org_sp_service_url = SP_SERVICE_URL + '/' + url_prefix

    # generate org certs dir
    org_certs_dir = os.path.join(CERTS_DIR, str(org_id))

    # generate org saml_config
    saml_config = {
        'entityid': org_sp_service_url + '/saml2/metadata/',
        'attribute_map_dir': ATTRIBUTE_MAP_DIR,
        'xmlsec_binary': XMLSEC_BINARY,
        'allow_unknown_attributes': True,
        'service': {
            'sp': {
                'allow_unsolicited': True,
                'want_response_signed': False,
                'name_id_format': saml.NAMEID_FORMAT_EMAILADDRESS,
                'endpoints': {
                    'assertion_consumer_service': [(org_sp_service_url + '/saml2/acs/', saml2.BINDING_HTTP_POST)],
                    'single_logout_service': [
                        (org_sp_service_url + '/saml2/ls/', saml2.BINDING_HTTP_REDIRECT),
                        (org_sp_service_url + '/saml2/ls/post', saml2.BINDING_HTTP_POST),
                    ],
                },
                'required_attributes': ["uid"],
                'idp': {
                    metadata_url: {
                        'single_sign_on_service': {
                            saml2.BINDING_HTTP_REDIRECT: single_sign_on_service,
                        },
                        'single_logout_service': {
                            saml2.BINDING_HTTP_REDIRECT: single_logout_service,
                        },
                    },
                },
            },
        },
        'metadata': {
            'local': [os.path.join(org_certs_dir, 'idp_federation_metadata.xml')],
        },
        'debug': 1,
        'key_file': '',
        'cert_file': os.path.join(org_certs_dir, 'idp.crt'),
        'encryption_keypairs': [{
            'key_file': os.path.join(org_certs_dir, 'sp.key'),
            'cert_file': os.path.join(org_certs_dir, 'sp.crt'),
        }],
        'valid_for': valid_days * 24,  # how long is our metadata valid, unit is hour
    }

    conf = SPConfig()
    conf.load(saml_config)
    return conf
