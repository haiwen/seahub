# Copyright (c) 2012-2019 Seafile Ltd.

# encoding: utf-8

import logging
import requests

from django.core.files.base import ContentFile

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.permissions import IsProVersion

from seahub.base.accounts import User
from seahub.auth.models import SocialAuthUser
from seahub.profile.models import Profile
from seahub.avatar.models import Avatar
from seahub.group.utils import validate_group_name
from seahub.auth.models import ExternalDepartment

from seahub.dingtalk.settings import ENABLE_DINGTALK, \
        DINGTALK_DEPARTMENT_LIST_DEPARTMENT_URL, \
        DINGTALK_DEPARTMENT_GET_DEPARTMENT_URL, \
        DINGTALK_DEPARTMENT_GET_DEPARTMENT_USER_LIST_URL, \
        DINGTALK_DEPARTMENT_USER_SIZE, DINGTALK_PROVIDER


# for 10.0 or later
from seahub.dingtalk.settings import DINGTALK_APP_KEY, \
        DINGTALK_APP_SECRET

if DINGTALK_APP_KEY and DINGTALK_APP_SECRET:
    from seahub.dingtalk.utils import \
            dingtalk_get_orgapp_token as dingtalk_get_access_token
else:
    from seahub.dingtalk.utils import dingtalk_get_access_token


DEPARTMENT_OWNER = 'system admin'

logger = logging.getLogger(__name__)


def update_dingtalk_user_info(email, name, contact_email, avatar_url):

    # make sure the contact_email is unique
    if contact_email and Profile.objects.get_profile_by_contact_email(contact_email):
        logger.warning('contact email %s already exists' % contact_email)
        contact_email = ''

    profile_kwargs = {}
    if name:
        profile_kwargs['nickname'] = name
    if contact_email:
        profile_kwargs['contact_email'] = contact_email

    if profile_kwargs:
        try:
            Profile.objects.add_or_update(email, **profile_kwargs)
        except Exception as e:
            logger.error(e)

    if avatar_url:
        try:
            image_name = 'dingtalk_avatar'
            image_file = requests.get(avatar_url).content
            avatar = Avatar.objects.filter(emailuser=email, primary=True).first()
            avatar = avatar or Avatar(emailuser=email, primary=True)
            avatar_file = ContentFile(image_file)
            avatar_file.name = image_name
            avatar.avatar = avatar_file
            avatar.save()
        except Exception as e:
            logger.error(e)


class AdminDingtalkDepartments(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request):

        if not ENABLE_DINGTALK:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        access_token = dingtalk_get_access_token()
        if not access_token:
            error_msg = '获取钉钉组织架构失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        data = {
            'access_token': access_token,
        }
        department_id = request.GET.get('department_id', '')
        if department_id:
            data['id'] = department_id
            current_department_resp_json = requests.get(DINGTALK_DEPARTMENT_GET_DEPARTMENT_URL, params=data).json()
            current_department_list = [current_department_resp_json]
            sub_department_resp_json = requests.get(DINGTALK_DEPARTMENT_LIST_DEPARTMENT_URL, params=data).json()
            sub_department_list = sub_department_resp_json.get('department', [])
            department_list = current_department_list + sub_department_list
            return Response({'department': department_list})
        else:
            resp_json = requests.get(DINGTALK_DEPARTMENT_LIST_DEPARTMENT_URL, params=data).json()
            return Response(resp_json)


class AdminDingtalkDepartmentMembers(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, department_id):

        if not ENABLE_DINGTALK:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        access_token = dingtalk_get_access_token()
        if not access_token:
            error_msg = '获取钉钉组织架构成员失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        data = {
            'access_token': access_token,
            'department_id': department_id,
            'offset': 0,
            'size': DINGTALK_DEPARTMENT_USER_SIZE,
        }
        resp_json = requests.get(DINGTALK_DEPARTMENT_GET_DEPARTMENT_USER_LIST_URL, params=data).json()

        user_id_name_dict = {}
        auth_users = SocialAuthUser.objects.filter(provider='dingtalk')
        for user in auth_users:
            user_id_name_dict[user.uid] = user.username

        for user in resp_json['userlist']:
            uid = user.get('unionid', '')
            user['contact_email'] = user.get('email', '')
            user['userid'] = uid

            # #  determine the user exists
            if uid in user_id_name_dict.keys():
                user['email'] = user_id_name_dict[uid]
            else:
                user['email'] = ''

        return Response(resp_json)


class AdminDingtalkUsersBatch(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):

        # parameter check
        user_list = request.data.get('userlist', [])
        if not user_list:
            error_msg = 'userlist invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        if not ENABLE_DINGTALK:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        user_ids_in_db = []
        auth_users = SocialAuthUser.objects.filter(provider='dingtalk')
        for user in auth_users:
            user_ids_in_db.append(user.uid)

        success = []
        failed = []

        for user in user_list:

            user_id = user.get('userid')

            if user_id in user_ids_in_db:
                failed.append({
                    'userid': user_id,
                    'name': user.get('name'),
                    'error_msg': '用户已存在',
                })
                continue

            try:
                oauth_user = User.objects.create_oauth_user()
                email = oauth_user.username
                SocialAuthUser.objects.add(email, 'dingtalk', user_id)
                success.append({
                    'userid': user_id,
                    'name': user.get('name'),
                    'email': email,
                })
            except Exception as e:
                logger.error(e)
                failed.append({
                    'userid': user_id,
                    'name': user.get('name'),
                    'error_msg': '导入失败'
                })
                continue

            try:
                update_dingtalk_user_info(email,
                                          user.get('name'),
                                          user.get('contact_email'),
                                          user.get('avatar'))
            except Exception as e:
                logger.error(e)

        return Response({'success': success, 'failed': failed})


class AdminDingtalkDepartmentsImport(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, IsProVersion)

    def _api_department_success_msg(self, department_obj_id, department_obj_name, group_id):
        return {
            'type': 'department',
            'department_id': department_obj_id,
            'department_name': department_obj_name,
            'group_id': group_id,
        }

    def _api_department_failed_msg(self, department_obj_id, department_obj_name, msg):
        return {
            'type': 'department',
            'department_id': department_obj_id,
            'department_name': department_obj_name,
            'msg': msg,
        }

    def _api_user_success_msg(self, email, api_user_name, department_obj_id, group_id):
        return {
            'type': 'user',
            'email': email,
            'api_user_name': api_user_name,
            'department_id': department_obj_id,
            'group_id': group_id,
        }

    def _api_user_failed_msg(self, email, api_user_name, department_obj_id, msg):
        return {
            'type': 'user',
            'email': email,
            'api_user_name': api_user_name,
            'department_id': department_obj_id,
            'msg': msg,
        }

    def post(self, request):
        """import department from dingtalk
        """

        if not ENABLE_DINGTALK:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        department_id = request.data.get('department_id')
        try:
            department_id = int(department_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'department_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        access_token = dingtalk_get_access_token()
        if not access_token:
            error_msg = '获取钉钉组织架构失败'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # get department list
        # https://developers.dingtalk.com/document/app/obtain-the-department-list
        data = {'access_token': access_token, 'id': department_id}
        current_department_resp_json = requests.get(DINGTALK_DEPARTMENT_GET_DEPARTMENT_URL, params=data).json()
        current_department_list = [current_department_resp_json]
        sub_department_resp_json = requests.get(DINGTALK_DEPARTMENT_LIST_DEPARTMENT_URL, params=data).json()
        sub_department_list = sub_department_resp_json.get('department', [])
        department_list = current_department_list + sub_department_list
        department_list = sorted(department_list, key=lambda x: x['id'])

        # get department user list
        data = {
            'access_token': access_token,
            'department_id': department_id,
            'offset': 0,
            'size': DINGTALK_DEPARTMENT_USER_SIZE,
        }
        user_resp_json = requests.get(DINGTALK_DEPARTMENT_GET_DEPARTMENT_USER_LIST_URL, params=data).json()
        api_user_list = user_resp_json.get('userlist', [])

        # main
        success = list()
        failed = list()
        department_map_to_group_dict = dict()

        for index, department_obj in enumerate(department_list):
            # check department argument
            new_group_name = department_obj.get('name')
            department_obj_id = department_obj.get('id')
            parent_department_id = department_obj.get('parentid', 0)
            if department_obj_id is None or not new_group_name or not validate_group_name(new_group_name):
                failed_msg = self._api_department_failed_msg(
                    department_obj_id, new_group_name, '部门参数错误')
                failed.append(failed_msg)
                continue

            # check parent group
            if index == 0:
                parent_group_id = -1
            else:
                parent_group_id = department_map_to_group_dict.get(parent_department_id)

            if parent_group_id is None:
                failed_msg = self._api_department_failed_msg(
                    department_obj_id, new_group_name, '父级部门不存在')
                failed.append(failed_msg)
                continue

            # check department exist
            exist_department = ExternalDepartment.objects.get_by_provider_and_outer_id(
                DINGTALK_PROVIDER, department_obj_id)
            if exist_department:
                department_map_to_group_dict[department_obj_id] = exist_department.group_id
                failed_msg = self._api_department_failed_msg(
                    department_obj_id, new_group_name, '部门已存在')
                failed.append(failed_msg)
                continue

            # import department
            try:
                group_id = ccnet_api.create_group(
                    new_group_name, DEPARTMENT_OWNER, parent_group_id=parent_group_id)

                seafile_api.set_group_quota(group_id, -2)

                ExternalDepartment.objects.create(
                    group_id=group_id,
                    provider=DINGTALK_PROVIDER,
                    outer_id=department_obj_id,
                )

                department_map_to_group_dict[department_obj_id] = group_id
                success_msg = self._api_department_success_msg(
                    department_obj_id, new_group_name, group_id)
                success.append(success_msg)
            except Exception as e:
                logger.error(e)
                failed_msg = self._api_department_failed_msg(
                    department_obj_id, new_group_name, '部门导入失败')
                failed.append(failed_msg)

        # todo filter ccnet User database
        social_auth_queryset = SocialAuthUser.objects.filter(provider='dingtalk')

        # import api_user
        for api_user in api_user_list:
            uid = api_user.get('unionid', '')
            api_user['contact_email'] = api_user.get('email', '')
            api_user_name = api_user.get('name')

            #  determine the user exists
            if social_auth_queryset.filter(uid=uid).exists():
                email = social_auth_queryset.get(uid=uid).username
            else:
                # create user
                try:
                    oauth_user = User.objects.create_oauth_user()
                    email = oauth_user.username
                    SocialAuthUser.objects.add(email, 'dingtalk', uid)
                except Exception as e:
                    logger.error(e)
                    failed_msg = self._api_user_failed_msg(
                        '', api_user_name, department_id, '导入用户失败')
                    failed.append(failed_msg)
                    continue

            # bind user to department
            api_user_department_list = api_user.get('department')
            for department_obj_id in api_user_department_list:
                group_id = department_map_to_group_dict.get(department_obj_id)
                if group_id is None:
                    # the api_user also exist in the brother department which not import
                    continue

                if ccnet_api.is_group_user(group_id, email, in_structure=False):
                    failed_msg = self._api_user_failed_msg(
                        email, api_user_name, department_obj_id, '部门成员已存在')
                    failed.append(failed_msg)
                    continue

                try:
                    ccnet_api.group_add_member(group_id, DEPARTMENT_OWNER, email)
                    success_msg = self._api_user_success_msg(
                        email, api_user_name, department_obj_id, group_id)
                    success.append(success_msg)
                except Exception as e:
                    logger.error(e)
                    failed_msg = self._api_user_failed_msg(
                        email, api_user_name, department_id, '导入部门成员失败')
                    failed.append(failed_msg)

                try:
                    update_dingtalk_user_info(email,
                                              api_user.get('name'),
                                              api_user.get('contact_email'),
                                              api_user.get('avatar'))
                except Exception as e:
                    logger.error(e)

        return Response({
            'success': success,
            'failed': failed,
        })
