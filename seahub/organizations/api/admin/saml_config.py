# -*- coding: utf-8 -*-
import os
import re
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
from seahub.organizations.utils import get_ccnet_db_name, update_org_url_prefix
from seahub.organizations.models import OrgSAMLConfig
try:
    from seahub.settings import CERTS_DIR
except ImportError:
    CERTS_DIR = ''

logger = logging.getLogger(__name__)


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

        org_certs_dir = os.path.join(CERTS_DIR, str(org_id))
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

        # delete saml config
        try:
            OrgSAMLConfig.objects.filter(org_id=org_id).delete()
        except OrgSAMLConfig.DoesNotExist:
            return Response({'success': True})
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

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

        reg = re.match(r'^[a-z_0-9]{6,20}$', org_url_prefix)
        if not reg:
            error_msg = 'url_prefix consists of 6-20 characters and can only contain lowercase letters, numbers and underscores.'
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
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'org_url_prefix': org_url_prefix})
