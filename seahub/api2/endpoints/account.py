import logging
from dateutil.relativedelta import relativedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.views import APIView
import seaserv
from seaserv import seafile_api, ccnet_threaded_rpc
from pysearpc import SearpcError

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.serializers import AccountSerializer
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean
from seahub.api2.status import HTTP_520_OPERATION_FAILED
from seahub.base.accounts import User
from seahub.profile.models import Profile
from seahub.profile.utils import refresh_cache as refresh_profile_cache
from seahub.utils import is_valid_username


logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'


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

        info = {}
        info['email'] = user.email
        info['id'] = user.id
        info['is_staff'] = user.is_staff
        info['is_active'] = user.is_active
        info['create_time'] = user.ctime
        info['total'] = seafile_api.get_user_quota(email)
        info['usage'] = seafile_api.get_user_self_usage(email)

        return Response(info)

    def _update_account_profile(self, request, email):
        name = request.data.get("name", None)
        note = request.data.get("note", None)

        if name is None and note is None:
            return

        profile = Profile.objects.get_profile_by_user(email)
        if profile is None:
            profile = Profile(user=email)

        if name is not None:
            # if '/' in name:
            #     return api_error(status.HTTP_400_BAD_REQUEST, "Nickname should not include '/'")
            profile.nickname = name

        if note is not None:
            profile.intro = note

        profile.save()

    def _update_account_quota(self, request, email):
        storage = request.data.get("storage", None)
        sharing = request.data.get("sharing", None)

        if storage is None and sharing is None:
            return

        if storage is not None:
            seafile_api.set_user_quota(email, int(storage))

        # if sharing is not None:
        #     seafile_api.set_user_share_quota(email, int(sharing))

    def _create_account(self, request, email):
        copy = request.data.copy()
        copy['email'] = email
        serializer = AccountSerializer(data=copy)
        if serializer.is_valid():
            try:
                user = User.objects.create_user(serializer.data['email'],
                                                serializer.data['password'],
                                                serializer.data['is_staff'],
                                                serializer.data['is_active'])
            except User.DoesNotExist as e:
                logger.error(e)
                return api_error(status.HTTP_520_OPERATION_FAILED,
                                 'Failed to add user.')

            self._update_account_profile(request, user.username)

            resp = Response('success', status=status.HTTP_201_CREATED)
            resp['Location'] = reverse('api2-account', args=[email])
            return resp
        else:
            return api_error(status.HTTP_400_BAD_REQUEST, serializer.errors)

    def _update_account(self, request, user):
        password = request.data.get("password", None)
        is_staff = request.data.get("is_staff", None)
        if is_staff is not None:
            try:
                is_staff = to_python_boolean(is_staff)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'is_staff invalid.')

        is_active = request.data.get("is_active", None)
        if is_active is not None:
            try:
                is_active = to_python_boolean(is_active)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'is_active invalid.')

        if password is not None:
            user.set_password(password)

        if is_staff is not None:
            user.is_staff = is_staff

        if is_active is not None:
            user.is_active = is_active

        result_code = user.save()
        if result_code == -1:
            return api_error(status.HTTP_520_OPERATION_FAILED,
                             'Failed to update user.')

        self._update_account_profile(request, user.username)

        try:
            self._update_account_quota(request, user.username)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED, 'Failed to set user quota.')

        is_trial = request.data.get("is_trial", None)
        if is_trial is not None:
            try:
                from seahub_extra.trialaccount.models import TrialAccount
            except ImportError:
                pass
            else:
                try:
                    is_trial = to_python_boolean(is_trial)
                except ValueError:
                    return api_error(status.HTTP_400_BAD_REQUEST,
                                     'is_trial invalid')

                if is_trial is True:
                    expire_date = timezone.now() + relativedelta(days=7)
                    TrialAccount.object.create_or_update(user.username,
                                                         expire_date)
                else:
                    TrialAccount.objects.filter(user_or_org=user.username).delete()

        return Response('success')

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
                if not seaserv.is_group_user(g.id, user2.username):
                    # add new user to the group on behalf of the group creator
                    ccnet_threaded_rpc.group_add_member(g.id, g.creator_name,
                                                        to_user)

                if from_user == g.creator_name:
                    ccnet_threaded_rpc.set_group_creator(g.id, to_user)

            return Response("success")
        else:
            return api_error(status.HTTP_400_BAD_REQUEST, 'op can only be migrate.')

    def put(self, request, email, format=None):
        if not is_valid_username(email):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Email %s invalid.' % email)

        try:
            user = User.objects.get(email=email)
            return self._update_account(request, user)
        except User.DoesNotExist:
            return self._create_account(request, email)

    def delete(self, request, email, format=None):
        if not is_valid_username(email):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Email %s invalid.' % email)

        # delete account
        try:
            user = User.objects.get(email=email)
            user.delete()
            return Response("success")
        except User.DoesNotExist:
            resp = Response("success", status=status.HTTP_202_ACCEPTED)
            return resp
