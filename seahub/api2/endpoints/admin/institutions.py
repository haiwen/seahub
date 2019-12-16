import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import seafile_api, ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.profile.models import Profile
from seahub.utils.file_size import get_file_size_unit
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.institutions.models import Institution, InstitutionQuota, InstitutionAdmin
from seahub.institutions.utils import get_institution_space_usage
from seahub.signals import institution_deleted

logger = logging.getLogger(__name__)


class AdminInstitutions(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """List all Institutions
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        start = per_page * (current_page - 1)
        institutions = Institution.objects.all()[start:start + per_page]

        count = Institution.objects.count()

        institutions_info = []
        for institution in institutions:
            data = {}
            data['id'] = institution.id
            data['name'] = institution.name
            data['ctime'] = datetime_to_isoformat_timestr(institution.create_time)
            institutions_info.append(data)

        resp = {
            'institution_list': institutions_info,
            'total_count': count,
        }
        return Response(resp)

    def post(self, request):
        """Create an Institution
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        name = request.data.get('name', '').strip()
        if not name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            institution = Institution.objects.add_institution(name=name)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        info = {}
        info['id'] = institution.id
        info['name'] = institution.name
        info['ctime'] = datetime_to_isoformat_timestr(institution.create_time)

        return Response(info)


class AdminInstitution(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, institution_id):
        """Get an Institution's info
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            institution = Institution.objects.get(id=institution_id)
        except Exception as e:
            logger.error(e)
            error_msg = "institution %s not found." % institution_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        info = {}
        info['id'] = institution.id
        info['name'] = institution.name
        info['user_count'] = Profile.objects.filter(institution=institution.name).count()

        info['quota_total'] = InstitutionQuota.objects.get_or_none(institution=institution)
        info['quota_used'] = get_institution_space_usage(institution)

        return Response(info)

    def put(self, request, institution_id):
        """Update (quota) of institution
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            institution = Institution.objects.get(id=institution_id)
        except Exception as e:
            logger.error(e)
            error_msg = "institution %s not found." % institution_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        quota_mb = request.data.get('quota', '')
        try:
            quota_mb = int(quota_mb)
        except Exception as e:
            logger.error(e)
            error_msg = 'quota invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        quota = quota_mb * get_file_size_unit('MB')

        try:
            InstitutionQuota.objects.update_or_create(
                institution=institution,
                defaults={'quota': quota},
            )
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        info = {}
        info['id'] = institution.id
        info['name'] = institution.name
        info['user_count'] = Profile.objects.filter(institution=institution.name).count()

        info['quota_total'] = InstitutionQuota.objects.get_or_none(institution=institution)
        info['quota_used'] = get_institution_space_usage(institution)

        return Response(info)

    def delete(self, request, institution_id):
        """Delete an Institution
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            institution = Institution.objects.get(id=institution_id)
        except Exception as e:
            logger.error(e)
            error_msg = "institution %s not found." % institution_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            institution.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # delete user and admin in institution
        institution_deleted.send(sender=None, inst_name=institution.name)
        return Response({'success': True})
