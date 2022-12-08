# -*- coding: utf-8 -*-
import os
import subprocess
import logging

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
from seahub.organizations.models import OrgSAMLConfig
try:
    from seahub.settings import CERTS_DIR
except ImportError:
    CERTS_DIR = ''

logger = logging.getLogger(__name__)


class OrgGenerateSPCertificate(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def post(self, request, org_id):
        # argument check
        country_name = request.data.get('country_name', 'AU')
        province_name = request.data.get('province_name', 'Some-State')
        locality_name = request.data.get('locality_name', '')
        organization_name = request.data.get('organization_name', 'Internet Widgits Pty Ltd')
        uint_name = request.data.get('uint_name', '')
        common_name = request.data.get('common_name', '')
        email_address = request.data.get('email_address', '')
        days = request.data.get('days', 365)

        if len(country_name) > 2:
            error_msg = _('string is too long, it needs to be no more than 2 bytes long')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if len(country_name) < 2:
            error_msg = _('string is too short, it needs to be at least 2 bytes long')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if type(days) not in (str, int):
            error_msg = 'days invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not CERTS_DIR:
            error_msg = 'CERTS_DIR invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org_certs_dir = os.path.join(CERTS_DIR, org_id)
        if not os.path.exists(org_certs_dir):
            os.makedirs(org_certs_dir)

        # resource check
        if not ccnet_api.get_org_by_id(int(org_id)):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        sp_key = os.path.join(org_certs_dir, 'sp.key')
        sp_crt = os.path.join(org_certs_dir, 'sp.crt')

        cmd = "openssl req -x509 -nodes -subj '/C=%s/ST=%s/L=%s/O=%s/OU=%s/CN=%s/emailAddress=%s' " \
              "-days %s -newkey rsa:2048 -keyout %s -out %s" % \
              (country_name, province_name, locality_name, organization_name,
               uint_name, common_name, email_address, days, sp_key, sp_crt)

        # generate sp certificate
        try:
            res_code = subprocess.run(cmd, shell=True).returncode
            if res_code != 0:
                logger.error('Failed to run openssl command, return code: %s' % res_code)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class OrgUploadIdPCertificate(APIView):

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

        org_certs_dir = os.path.join(CERTS_DIR, org_id)
        try:
            if not os.path.exists(org_certs_dir):
                os.makedirs(org_certs_dir)

            cert_file_path = os.path.join(org_certs_dir, 'idp.crt')
            with open(cert_file_path, 'wb') as fd:
                fd.write(idp_certificate.read())
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class OrgUploadIdPMetadataXMLView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def post(self, request, org_id):
        # argument check
        idp_metadata_xml = request.FILES.get('idp_metadata_xml', None)
        if not idp_metadata_xml:
            error_msg = 'idp_metadata_xml not found.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if idp_metadata_xml.name != 'idp_federation_metadata.xml':
            error_msg = 'idp_metadata_xml invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not CERTS_DIR:
            error_msg = 'CERTS_DIR invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        if not ccnet_api.get_org_by_id(int(org_id)):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        org_certs_dir = os.path.join(CERTS_DIR, org_id)
        try:
            if not os.path.exists(org_certs_dir):
                os.makedirs(org_certs_dir)

            cert_file_path = os.path.join(org_certs_dir, 'idp_federation_metadata.xml')
            with open(cert_file_path, 'wb') as fd:
                fd.write(idp_metadata_xml.read())
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

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
        single_sign_on_service = request.data.get('single_sign_on_service', None)
        single_logout_service = request.data.get('single_logout_service', None)
        valid_days = request.data.get('valid_days', None)
        if not metadata_url or not single_sign_on_service or not single_logout_service or not valid_days:
            return api_error(status.HTTP_400_BAD_REQUEST, 'argument invalid.')

        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # add an org saml config
        try:
            saml_comfig = OrgSAMLConfig.objects.add_or_update_saml_config(
                org_id, metadata_url, single_sign_on_service, single_logout_service, valid_days
            )
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'saml_config': saml_comfig.to_dict()})

    def put(self, request, org_id):
        # argument check
        metadata_url = request.data.get('metadata_url', None)
        single_sign_on_service = request.data.get('single_sign_on_service', None)
        single_logout_service = request.data.get('single_logout_service', None)
        valid_days = request.data.get('valid_days', None)
        if not metadata_url and not single_sign_on_service and not single_logout_service and not valid_days:
            return api_error(status.HTTP_400_BAD_REQUEST, 'argument invalid.')

        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # update config
        try:
            saml_comfig = OrgSAMLConfig.objects.add_or_update_saml_config(
                org_id, metadata_url, single_sign_on_service, single_logout_service, valid_days
            )
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'saml_config': saml_comfig.to_dict()})

    def delete(self, request, org_id):
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            OrgSAMLConfig.objects.filter(org_id=org_id).delete()
        except OrgSAMLConfig.DoesNotExist:
            return Response({'success': True})
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
