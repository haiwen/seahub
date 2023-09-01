# -*- coding: utf-8 -*-
import os
import re
import uuid
import subprocess
import logging
from xml.etree import ElementTree
from urllib.parse import urlparse

import requests
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from django.utils.translation import gettext as _

from seaserv import ccnet_api

from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.organizations.utils import get_ccnet_db_name, update_org_url_prefix
from seahub.organizations.models import OrgSAMLConfig
from seahub import settings

logger = logging.getLogger(__name__)

CERTS_DIR = getattr(settings, 'SAML_CERTS_DIR', '/opt/seafile/seahub-data/certs')


class OrgUploadIdPCertificateView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def post(self, request, org_id):
        # argument check
        idp_certificate = request.FILES.get('idp_certificate', None)
        if not idp_certificate:
            error_msg = 'idp_certificate not found.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if idp_certificate.name != 'idp.crt':
            error_msg = 'idp_certificate invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not CERTS_DIR:
            error_msg = 'CERTS_DIR invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        if not ccnet_api.get_org_by_id(int(org_id)):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        org_certs_dir = os.path.join(CERTS_DIR, str(org_id))
        try:
            if not os.path.exists(org_certs_dir):
                os.makedirs(org_certs_dir)

            cert_file_path = os.path.join(org_certs_dir, 'idp.crt')
            with open(cert_file_path, 'wb') as fd:
                fd.write(idp_certificate.read())
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})


class OrgSAMLConfigView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # get config
        org_saml_config = OrgSAMLConfig.objects.get_config_by_org_id(org_id)
        if not org_saml_config:
            return Response({'saml_config': {}})

        return Response({'saml_config': org_saml_config.to_dict()})

    def post(self, request, org_id):
        # argument check
        metadata_url = request.data.get('metadata_url', None)
        if not metadata_url:
            return api_error(status.HTTP_400_BAD_REQUEST, 'metadata_url invalid.')

        try:
            res = requests.get(metadata_url)
            root = ElementTree.fromstring(res.text)
            entity_id = root.attrib.get('entityID', '')
        except Exception as e:
            logger.error(e)
            error_msg = 'The metadata URL is invalid, please re-enter a valid URL'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not entity_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Not found entityID in metadata.')

        netloc = urlparse(entity_id).netloc
        domain = '.'.join(netloc.split('.')[1:])
        if not domain:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid entityID in metadata.')

        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # add or update saml/adfs login config
        try:
            saml_config = OrgSAMLConfig.objects.add_or_update_saml_config(org_id, metadata_url, domain)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'saml_config': saml_config.to_dict()})

    def put(self, request, org_id):
        # argument check
        domain = request.data.get('domain', None)
        if not domain:
            return api_error(status.HTTP_400_BAD_REQUEST, 'domain invalid.')

        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        saml_config = OrgSAMLConfig.objects.get_config_by_org_id(org_id)
        if not saml_config:
            error_msg = 'Cannot find a SAML/ADFS config for the organization related to org_id %s.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # When the domain is updated, the domain ownership needs to be re-verified, so set dns_txt to ''
        try:
            saml_config.domain = domain
            saml_config.dns_txt = ''
            saml_config.domain_verified = False
            saml_config.save()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'saml_config': saml_config.to_dict()})

    def delete(self, request, org_id):
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # delete saml config
        try:
            OrgSAMLConfig.objects.filter(org_id=org_id).delete()
        except OrgSAMLConfig.DoesNotExist:
            return Response({'success': True})
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})


class OrgUrlPrefixView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):
        # resource check
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        org_url_prefix = org.url_prefix
        return Response({'org_url_prefix': org_url_prefix})

    def put(self, request, org_id):
        # argument check
        org_url_prefix = request.data.get('org_url_prefix', None)
        if not org_url_prefix:
            error_msg = 'org_url_prefix invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        reg = re.match(r'^[a-z0-9-]{6,20}$', org_url_prefix)
        if not reg:
            error_msg = _('org_url_prefix should be 6 to 20 characters, '
                          'and can only contain alphanumeric characters and hyphens.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if ccnet_api.get_org_by_url_prefix(org_url_prefix) is not None:
            error_msg = 'url_prefix %s is duplicated.' % org_url_prefix
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # get ccnet db_name
        db_name, error_msg = get_ccnet_db_name()
        if error_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            update_org_url_prefix(db_name, org_id, org_url_prefix)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'org_url_prefix': org_url_prefix})


class OrgVerifyDomain(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def post(self, request, org_id):
        # resource check
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        saml_config = OrgSAMLConfig.objects.get_config_by_org_id(org_id)
        if not saml_config:
            error_msg = 'Cannot find a SAML/ADFS config for the organization related to org_id %s.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if saml_config.dns_txt:
            return Response({'dns_txt': saml_config.dns_txt})

        try:
            dns_txt = 'seafile-site-verification=' + str(uuid.uuid4().hex)
            saml_config.dns_txt = dns_txt
            saml_config.save()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'dns_txt': saml_config.dns_txt})

    def put(self, request, org_id):
        # argument check
        domain = request.data.get('domain', None)
        if not domain:
            return api_error(status.HTTP_400_BAD_REQUEST, 'domain invalid.')

        # resource check
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        saml_config = OrgSAMLConfig.objects.get_config_by_org_id(org_id)
        if not saml_config:
            error_msg = 'Cannot find a SAML/ADFS config for the organization related to org_id %s.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not saml_config.dns_txt:
            error_msg = 'Cannot find dns_txt, please generate dns_txt first.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if saml_config.domain_verified:
            return Response({'domain_verified': saml_config.domain_verified})

        proc = subprocess.Popen(["nslookup", "-type=TXT", domain], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            stdout, stderr = proc.communicate(timeout=60)
        except subprocess.TimeoutExpired:
            proc.kill()
            stdout, stderr = proc.communicate()
            logger.error('Process execution timed out, stdout: %s, stderr: %s' % (stdout, stderr))
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if stderr:
            logger.error(stderr)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if saml_config.dns_txt in stdout.decode():
            saml_config.domain_verified = True
            saml_config.save()
            return Response({'domain_verified': saml_config.domain_verified})
        else:
            logger.error(stdout)
            error_msg = "Failed to verify domain ownership. Please make sure you have added " \
                        "the DNS TXT to your domain's DNS records and wait 5 minutes before trying again."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
