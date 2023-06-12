import os
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils.translation import gettext as _
from django.template.defaultfilters import filesizeformat

from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.avatar.settings import AVATAR_ALLOWED_FILE_EXTS, AVATAR_MAX_SIZE
from seahub.organizations.models import OrgAdminSettings
from seahub.organizations.settings import ORG_ENABLE_ADMIN_CUSTOM_LOGO

logger = logging.getLogger(__name__)


class OrgAdminLogo(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):

        if not ORG_ENABLE_ADMIN_CUSTOM_LOGO:
            error_msg = _('Feature is not enabled.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org_logo_url = OrgAdminSettings.objects.get_org_logo_url(org_id)
        return Response({'logo_path': org_logo_url})

    def post(self, request, org_id):

        if not ORG_ENABLE_ADMIN_CUSTOM_LOGO:
            error_msg = _('Feature is not enabled.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        image_file = request.FILES.get('file', None)
        if not image_file:
            error_msg = 'file invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        (root, ext) = os.path.splitext(image_file.name.lower())
        if AVATAR_ALLOWED_FILE_EXTS and ext not in AVATAR_ALLOWED_FILE_EXTS:
            error_msg_dict = {
                'ext': ext,
                'valid_exts_list': ", ".join(AVATAR_ALLOWED_FILE_EXTS)
            }
            error_msg = _("%(ext)s is an invalid file extension. Authorized extensions are : %(valid_exts_list)s") % error_msg_dict
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if image_file.size > AVATAR_MAX_SIZE:
            error_msg_dict = {
                'size': filesizeformat(image_file.size),
                'max_valid_size': filesizeformat(AVATAR_MAX_SIZE)
            }
            error_msg = _("Your file is too big (%(size)s), the maximum allowed size is %(max_valid_size)s") % error_msg_dict
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            OrgAdminSettings.objects.save_org_logo(org_id, image_file)
            org_logo_url = OrgAdminSettings.objects.get_org_logo_url(org_id)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'logo_path': org_logo_url})
