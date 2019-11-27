import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.translation import ugettext as _

from seaserv import seafile_api, ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.base.accounts import User
from seahub.base.models import UserLastLogin
from seahub.profile.models import Profile
from seahub.utils import is_valid_username
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, datetime_to_isoformat_timestr
from seahub.institutions.models import Institution, InstitutionAdmin
from seahub.api2.endpoints.utils import get_user_quota_usage_and_total
from seahub.institutions.utils import is_institution_admin

logger = logging.getLogger(__name__)


def get_institution_user_info(user_obj, institution):
    info = {}
    info['email'] = user_obj.email
    info['name'] = email2nickname(user_obj.email)
    info['contact_email'] = email2contact_email(user_obj.email)

    info['quota_usage'], info['quota_total'] = get_user_quota_usage_and_total(user_obj.email)

    info['create_time'] = timestamp_to_isoformat_timestr(user_obj.ctime)
    info['is_active'] = user_obj.is_active
    info['is_institution_admin'] = is_institution_admin(user_obj.email, institution)

    last_login_obj = UserLastLogin.objects.get_by_username(user_obj.email)
    info['last_login'] = datetime_to_isoformat_timestr(last_login_obj.last_login) if last_login_obj else ''

    return info


class AdminInstitutionUsers(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, institution_id):
        """List users of an Institution
        """
        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            error_msg = "institution %s not found." % institution_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        is_institution_admin = request.GET.get('is_institution_admin', '')
        # is_institution_admin = '', return all users, filter by page
        # is_institution_admin = true, return admin users
        # is_institution_admin = false, return none admin users
        if not is_institution_admin:
            try:
                current_page = int(request.GET.get('page', '1'))
                per_page = int(request.GET.get('per_page', '100'))
            except ValueError:
                current_page = 1
                per_page = 100

            start = (current_page - 1) * per_page
            profiles = Profile.objects.filter(institution=institution.name)[start:start + per_page]
            emails = [x.user for x in profiles]
        else:
            is_institution_admin = is_institution_admin.lower()
            if is_institution_admin not in ('true', 'false'):
                error_msg = 'is_institution_admin %s invalid' % is_institution_admin
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            admin_emails = [user.user for user in InstitutionAdmin.objects.filter(institution=institution)]
            if is_institution_admin == 'true':
                emails = admin_emails
            elif is_institution_admin == 'false':
                profiles = Profile.objects.filter(institution=institution.name)
                emails = [x.user for x in profiles if x.user not in admin_emails]

        user_objs = []
        for email in emails:
            try:
                user_obj = User.objects.get(email=email)
                user_objs.append(user_obj)
            except User.DoesNotExist:
                continue

        user_info = []
        for user in user_objs:
            user_info.append(get_institution_user_info(user, institution))

        resp = {
            'user_list': user_info,
            'total_count': len(user_objs),
        }
        return Response(resp)

    def post(self, request, institution_id):
        """Add users to Institution
        """

        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            error_msg = "institution %s not found." % institution_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # argument check
        emails = request.POST.getlist('email', None)
        if not emails:
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []
        for email in emails:
            if not is_valid_username(email):
                result['failed'].append({
                    'email': email,
                    'error_msg': 'email %s invalid.' % email
                })
                continue

            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                result['failed'].append({
                    'email': email,
                    'error_msg': 'email %s not found.' % email
                })
                continue

            profile = Profile.objects.get_profile_by_user(email)
            if not profile:
                profile = Profile.objects.add_or_update(username=email)

            if profile.institution:
                if profile.institution != institution.name:
                    result['failed'].append({
                        'email': email,
                        'error_msg': _("Failed to add %s to the institution: user already belongs to an institution") % email})
                    continue
                else:
                    result['failed'].append({
                        'email': email,
                        'error_msg': _("Failed to add %s to the institution: user already belongs to this institution") % email})
                    continue
            else:
                profile.institution = institution.name
            profile.save()

            result['success'].append(get_institution_user_info(user, institution))
        return Response(result)


class AdminInstitutionUser(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, institution_id, email):
        """ Update user of an institution
        """
        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            error_msg = "institution %s not found." % institution_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = "user %s not found." % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        profile = Profile.objects.get_profile_by_user(email)
        if not profile or profile.institution != institution.name:
            error_msg = 'email %s invalid' % email
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if user.is_staff:
            error_msg = "Can't assign system admin as institution admin"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_inst_admin = request.data.get('is_institution_admin')
        if is_inst_admin:
            is_inst_admin = is_inst_admin.lower()
            if is_inst_admin not in ('true', 'false'):
                error_msg = 'is_institution_admin %s invalid' % is_inst_admin
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            if is_inst_admin == 'true':
                # if user is already inst admin, cannot set to institution admin
                if is_institution_admin(email, institution):
                    error_msg = 'user %s is already admin' % email
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
                else:
                    InstitutionAdmin.objects.create(institution=institution, user=email)
            elif is_inst_admin == 'false':
                InstitutionAdmin.objects.filter(institution=institution, user=email).delete()
        except Exception as e:
            logging.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(get_institution_user_info(user, institution))

    def delete(self, request, institution_id, email):
        """ Delete user from an institution
        """
        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            error_msg = "institution %s not found." % institution_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = "user %s not found." % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        profile = Profile.objects.get_profile_by_user(email)
        if not profile or profile.institution != institution.name:
            error_msg = "email %s invalid." % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            Profile.objects.add_or_update(email, institution='')
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # if email is admin, delete from InstitutionAdmin table
        InstitutionAdmin.objects.filter(user=email).delete()

        return Response({'success': True})
