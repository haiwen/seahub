# -*- coding: utf-8 -*-
import uuid
import subprocess
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from seaserv import ccnet_api

from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.organizations.models import OrgSAMLConfig

logger = logging.getLogger(__name__)


class OrgUpdateIdPCertificateView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def post(self, request, org_id):
        # argument check
        idp_certificate = request.POST.get('idp_certificate', None)
        if not idp_certificate:
            error_msg = 'idp_certificate is empty.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not idp_certificate.startswith('-----BEGIN CERTIFICATE-----') or \
                not idp_certificate.endswith('-----END CERTIFICATE-----'):
            error_msg = 'idp_certificate invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        saml_config = OrgSAMLConfig.objects.get_config_by_org_id(org_id)
        if not saml_config:
            error_msg = 'Cannot find a SAML config for the organization %s.' % org.org_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            saml_config.idp_certificate = idp_certificate
            saml_config.save()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'saml_config': saml_config.to_dict()})


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

        # resource check
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # add or update saml/adfs login config
        try:
            saml_config = OrgSAMLConfig.objects.add_or_update_saml_config(org_id, metadata_url)
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
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        saml_config = OrgSAMLConfig.objects.get_config_by_org_id(org_id)
        if not saml_config:
            error_msg = 'Cannot find a SAML/ADFS config for the organization %s.' % org.org_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # When the domain is updated, the domain ownership needs to be re-verified, so set dns_txt to None
        try:
            saml_config.domain = domain
            saml_config.dns_txt = None
            saml_config.domain_verified = False
            saml_config.save()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'saml_config': saml_config.to_dict()})


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
            error_msg = 'Cannot find a SAML/ADFS config for the organization %s.' % org.org_name
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
            error_msg = 'Cannot find a SAML/ADFS config for the organization %s.' % org.org_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if saml_config.domain_verified:
            return Response({'domain_verified': saml_config.domain_verified})

        if not saml_config.dns_txt:
            error_msg = 'Cannot find dns_txt, please generate dns_txt first.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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
