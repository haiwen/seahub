# -*- coding: utf-8 -*-
import uuid
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


def query_dns_txt_record(domain):
    import dns.resolver
    try:
        answers = dns.resolver.resolve(domain, 'TXT')
        return None, "".join([a.to_text() for a in answers])
    except dns.resolver.NoAnswer:
        return True, api_error(status.HTTP_404_NOT_FOUND, 'No TXT record found for %s' % domain)
    except dns.resolver.NXDOMAIN:
        return True, api_error(status.HTTP_404_NOT_FOUND, '%s does not exist' % domain)
    except Exception as e:
        logger.exception(e)
        return True, api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')


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

    def put(self, request, org_id):
        # argument check
        metadata_url = request.data.get('metadata_url', None)
        domain = request.data.get('domain', None)
        idp_certificate = request.data.get('idp_certificate', None)

        if not metadata_url and not domain and not idp_certificate:
            error_msg = 'metadata_url or domain or idp_certificate invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if idp_certificate and (not idp_certificate.startswith('-----BEGIN CERTIFICATE-----')
                                or not idp_certificate.endswith('-----END CERTIFICATE-----')):
            error_msg = 'idp_certificate invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # add or update saml config
        saml_config = OrgSAMLConfig.objects.get_config_by_org_id(org_id)
        if not saml_config:
            saml_config = OrgSAMLConfig(org_id=org_id, metadata_url='')

        if metadata_url:
            saml_config.metadata_url = metadata_url

        if idp_certificate:
            saml_config.idp_certificate = idp_certificate

        if domain:
            saml_config.domain = domain
            saml_config.dns_txt = 'seatable-site-verification=' + str(uuid.uuid4().hex)
            # When the domain is updated, the domain ownership needs to be re-verified, so set domain_verified to False
            saml_config.domain_verified = False

        try:
            saml_config.save()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'saml_config': saml_config.to_dict()})

    def delete(self, request, org_id):
        # resource check
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
    
        try:
            OrgSAMLConfig.objects.filter(org_id=org_id).delete()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
    
        return Response({'success': True})


class OrgVerifyDomain(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

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
            error_msg = 'Cannot find an ADFS/SAML config for the team %s.' % org.org_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if saml_config.domain != domain:
            error_msg = 'Domain %s not belong organization %s.' % (domain, org.org_name)
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if saml_config.domain_verified:
            return Response({'domain_verified': saml_config.domain_verified})

        if not saml_config.dns_txt:
            error_msg = 'Cannot find dns_txt, please generate dns_txt first.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        error, result = query_dns_txt_record(domain)
        if error:
            return result
        if saml_config.dns_txt in result:
            saml_config.domain_verified = True
            saml_config.save()
            return Response({'domain_verified': saml_config.domain_verified})
        else:
            logger.debug("DNS records: %s" % result)
            error_msg = "Failed to verify domain ownership. Please make sure you have added " \
                        "the DNS TXT to your domain's DNS records and wait 5 minutes before trying again."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
