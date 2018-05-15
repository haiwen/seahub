# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from dateutil.relativedelta import relativedelta

from django.utils import timezone
from django.utils.translation import ugettext as _
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.views import APIView
import seaserv
from seaserv import seafile_api, ccnet_threaded_rpc

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.serializers import AccountSerializer
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.profile.models import Profile, DetailedProfile
from seahub.institutions.models import Institution
from seahub.utils import is_valid_username, is_org_context
from seahub.utils.file_size import get_file_size_unit
from seahub.group.utils import is_group_member


logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'

def get_account_info(user):
    email = user.username
    d_profile = DetailedProfile.objects.get_detailed_profile_by_user(email)
    profile = Profile.objects.get_profile_by_user(email)

    info = {}
    info['email'] = email
    info['name'] = email2nickname(email)
    info['department'] = d_profile.department if d_profile else ''
    info['institution'] = profile.institution if profile else ''
    info['id'] = user.id
    info['is_staff'] = user.is_staff
    info['is_active'] = user.is_active
    info['create_time'] = user.ctime
    info['login_id'] = profile.login_id if profile else ''
    info['list_in_address_book'] = profile.list_in_address_book if profile else False
    info['total'] = seafile_api.get_user_quota(email)
    info['usage'] = seafile_api.get_user_self_usage(email)

    return info

class Account(APIView):
    """Query/Add/Delete a specific account.
    Administator permission is required.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, email, format=None):
        if not is_valid_username(email):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Email %s invalid.' % email)

        # query account info
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND, 'User %s not found.' % email)

        info = get_account_info(user)
        return Response(info)

    def post(self, request, email, format=None):
        # migrate an account's repos and groups to an exist account
        if not is_valid_username(email):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Email %s invalid.' % email)

        op = request.data.get('op', '').lower()
        if op == 'migrate':
            from_user = email
            to_user = request.data.get('to_user', '')
            if not is_valid_username(to_user):
                return api_error(status.HTTP_400_BAD_REQUEST, 'Email %s invalid.' % to_user)

            try:
                user2 = User.objects.get(email=to_user)
            except User.DoesNotExist:
                return api_error(status.HTTP_404_NOT_FOUND, 'User %s not found.' % to_user)

            # transfer owned repos to new user
            for r in seafile_api.get_owned_repo_list(from_user):
                seafile_api.set_repo_owner(r.id, user2.username)

            # transfer joined groups to new user
            for g in seaserv.get_personal_groups_by_user(from_user):
                if not is_group_member(g.id, user2.username):
                    # add new user to the group on behalf of the group creator
                    ccnet_threaded_rpc.group_add_member(g.id, g.creator_name,
                                                        to_user)

                if from_user == g.creator_name:
                    ccnet_threaded_rpc.set_group_creator(g.id, to_user)

            return Response({'success': True})
        else:
            return api_error(status.HTTP_400_BAD_REQUEST, 'op can only be migrate.')

    def _update_account_additional_info(self, request, email):

        # update account name
        name = request.data.get("name", None)
        if name is not None:
            profile = Profile.objects.get_profile_by_user(email)
            if profile is None:
                profile = Profile(user=email)
            profile.nickname = name
            profile.save()

        # update account list_in_address_book
        list_in_address_book = request.data.get("list_in_address_book", None)
        if list_in_address_book is not None:
            profile = Profile.objects.get_profile_by_user(email)
            if profile is None:
                profile = Profile(user=email)

            profile.list_in_address_book = list_in_address_book.lower() == 'true'
            profile.save()

        # update account loginid
        loginid = request.data.get("login_id", '').strip()
        if loginid != '':
            profile = Profile.objects.get_profile_by_user(email)
            if profile is None:
                profile = Profile(user=email)
            profile.login_id = loginid
            profile.save()

        # update account detailed profile
        department = request.data.get("department", None)
        if department is not None:
            d_profile = DetailedProfile.objects.get_detailed_profile_by_user(email)
            if d_profile is None:
                d_profile = DetailedProfile(user=email)

            d_profile.department = department
            d_profile.save()

        # update user quota
        space_quota_mb = request.data.get("storage", None)
        if space_quota_mb is not None:
            space_quota = int(space_quota_mb) * get_file_size_unit('MB')
            if is_org_context(request):
                org_id = request.user.org.org_id
                seaserv.seafserv_threaded_rpc.set_org_user_quota(org_id,
                        email, space_quota)
            else:
                seafile_api.set_user_quota(email, space_quota)

        # update user institution
        institution = request.data.get("institution", None)
        if institution is not None:
            profile = Profile.objects.get_profile_by_user(email)
            if profile is None:
                profile = Profile(user=email)
            profile.institution = institution
            profile.save()

        # update is_trial
        is_trial = request.data.get("is_trial", None)
        if is_trial is not None:
            try:
                from seahub_extra.trialaccount.models import TrialAccount
            except ImportError:
                pass
            else:
                if is_trial is True:
                    expire_date = timezone.now() + relativedelta(days=7)
                    TrialAccount.object.create_or_update(email, expire_date)
                else:
                    TrialAccount.objects.filter(user_or_org=email).delete()

    def put(self, request, email, format=None):

        # argument check for email
        if not is_valid_username(email):
            return api_error(status.HTTP_400_BAD_REQUEST,
                    'Email %s invalid.' % email)

        # argument check for name
        name = request.data.get("name", None)
        if name is not None:
            if len(name) > 64:
                return api_error(status.HTTP_400_BAD_REQUEST,
                        _(u'Name is too long (maximum is 64 characters)'))

            if "/" in name:
                return api_error(status.HTTP_400_BAD_REQUEST,
                        _(u"Name should not include '/'."))

        # argument check for list_in_address_book
        list_in_address_book = request.data.get("list_in_address_book", None)
        if list_in_address_book is not None:
            if list_in_address_book.lower() not in ('true', 'false'):
                return api_error(status.HTTP_400_BAD_REQUEST,
                        'list_in_address_book invalid')

        #argument check for loginid
        loginid = request.data.get("login_id", None)
        if loginid is not None:
            loginid = loginid.strip()
            if loginid == "":
                return api_error(status.HTTP_400_BAD_REQUEST,
                            _(u"Login id can't be empty"))
            usernamebyloginid = Profile.objects.get_username_by_login_id(loginid)
            if usernamebyloginid is not None:
                return api_error(status.HTTP_400_BAD_REQUEST,
                          _(u"Login id %s already exists." % loginid))

        # argument check for department
        department = request.data.get("department", None)
        if department is not None:
            if len(department) > 512:
                return api_error(status.HTTP_400_BAD_REQUEST,
                        _(u'Department is too long (maximum is 512 characters)'))

        # argument check for institution
        institution = request.data.get("institution", None)
        if institution is not None and institution != '':
            try:
                obj_insti = Institution.objects.get(name=institution)
            except Institution.DoesNotExist:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                "Institution %s does not exist" % institution)

        # argument check for storage
        space_quota_mb = request.data.get("storage", None)
        if space_quota_mb is not None:
            if space_quota_mb == '':
                return api_error(status.HTTP_400_BAD_REQUEST,
                        _('Space quota can\'t be empty'))

            try:
                space_quota_mb = int(space_quota_mb)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST,
                        _('Must be an integer that is greater than or equal to 0.'))

            if space_quota_mb < 0:
                return api_error(status.HTTP_400_BAD_REQUEST,
                        _('Space quota is too low (minimum value is 0)'))

            if is_org_context(request):
                org_id = request.user.org.org_id
                org_quota_mb = seaserv.seafserv_threaded_rpc.get_org_quota(org_id) / \
                        get_file_size_unit('MB')
                if space_quota_mb > org_quota_mb:
                    return api_error(status.HTTP_400_BAD_REQUEST, \
                            _(u'Failed to set quota: maximum quota is %d MB' % org_quota_mb))

        # argument check for is_trial
        is_trial = request.data.get("is_trial", None)
        if is_trial is not None:
            try:
                is_trial = to_python_boolean(is_trial)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST,
                        'is_trial invalid')

        try:
            # update account basic info
            user = User.objects.get(email=email)
            # argument check for is_staff
            is_staff = request.data.get("is_staff", None)
            if is_staff is not None:
                try:
                    is_staff = to_python_boolean(is_staff)
                except ValueError:
                    return api_error(status.HTTP_400_BAD_REQUEST,
                            'is_staff invalid.')

                user.is_staff = is_staff

            # argument check for is_active
            is_active = request.data.get("is_active", None)
            if is_active is not None:
                try:
                    is_active = to_python_boolean(is_active)
                except ValueError:
                    return api_error(status.HTTP_400_BAD_REQUEST,
                            'is_active invalid.')

                user.is_active = is_active

            # update password
            password = request.data.get("password", None)
            if password is not None:
                user.set_password(password)

            # save user
            result_code = user.save()
            if result_code == -1:
                return api_error(status.HTTP_520_OPERATION_FAILED,
                                 'Failed to update user.')

            try:
                # update account additional info
                self._update_account_additional_info(request, email)
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                        'Internal Server Error')

            # get account info and return
            info = get_account_info(user)
            return Response(info)

        except User.DoesNotExist:
            # create user account
            copy = request.data.copy()
            copy['email'] = email
            serializer = AccountSerializer(data=copy)
            if not serializer.is_valid():
                return api_error(status.HTTP_400_BAD_REQUEST, serializer.errors)

            try:
                user = User.objects.create_user(serializer.data['email'],
                                                serializer.data['password'],
                                                serializer.data['is_staff'],
                                                serializer.data['is_active'])
            except User.DoesNotExist as e:
                logger.error(e)
                return api_error(status.HTTP_520_OPERATION_FAILED,
                                 'Failed to add user.')

            try:
                # update account additional info
                self._update_account_additional_info(request, email)
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                        'Internal Server Error')

            # get account info and return
            info = get_account_info(user)
            resp = Response(info, status=status.HTTP_201_CREATED)
            resp['Location'] = reverse('api2-account', args=[email])
            return resp

    def delete(self, request, email, format=None):
        if not is_valid_username(email):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Email %s invalid.' % email)

        # delete account
        try:
            user = User.objects.get(email=email)
            user.delete()
            return Response({'success': True})
        except User.DoesNotExist:
            resp = Response({'success': True}, status=status.HTTP_202_ACCEPTED)
            return resp
