import logging
import json

import requests
from rest_framework import serializers

from seahub.api2.serializers import all_none, all_not_none
from seahub.api2.utils import get_token_v1, get_token_v2
from seahub.base.accounts import User
from seahub.profile.models import Profile
from seahub.organizations.views import (
    create_org, get_org_by_url_prefix, set_org_user)
from .settings import (
    ALPHALAWYER_WX_LOGIN_CALLBACK_URL, ALPHALAWYER_WX_LOGIN_CALLBACK_URL_HEADERS)

# Get an instance of a logger
logger = logging.getLogger(__name__)


class AuthTokenSerializer(serializers.Serializer):
    state = serializers.CharField()
    code = serializers.CharField()

    # There fields are used by TokenV2
    platform = serializers.CharField(required=False)
    device_id = serializers.CharField(required=False)
    device_name = serializers.CharField(required=False)

    # These fields may be needed in the future
    client_version = serializers.CharField(required=False, default='')
    platform_version = serializers.CharField(required=False, default='')

    def __init__(self, *a, **kw):
        super(AuthTokenSerializer, self).__init__(*a, **kw)
        self.two_factor_auth_failed = False

    def icourt_weixin_login_callback(self, state, code):
        values = {
            'code': code,
            'state': state,
        }
        the_page = requests.post(ALPHALAWYER_WX_LOGIN_CALLBACK_URL, data=values,
                                 headers=ALPHALAWYER_WX_LOGIN_CALLBACK_URL_HEADERS).text

        try:
            json_res = json.loads(the_page)
        except Exception as e:
            logger.error(e)
            return (False, {'json_err': 'Failed to decode json.'})

        succeed = json_res['succeed']
        if succeed is not True:
            # login failed
            return (False, {'login_err': 'Login failed.'})

        result = json_res['result']
        first = result['first']
        if first is True:
            return (False, {'account_inactive_err':
                            'Please activate account at alpha: https://www.alphalawyer.cn'})

        else:
            auth_resp_dto = result['authResponseDto']
            res_code = auth_resp_dto.get('resultCode')
            pic = auth_resp_dto.get('pic')
            mail = auth_resp_dto.get('mail')
            name = auth_resp_dto.get('name', '')
            user_id = auth_resp_dto.get('userId')  # unique
            office_id = auth_resp_dto.get('officeId')
            office_name = auth_resp_dto.get('officename')

            # create new account if possible
            logger.info('user id: %s' % user_id)
            if user_id is None:
                logger.error('userId is empty!')
                return (False, {'user_id_err': 'userId is empty.'})

            username = user_id + '@ifile.com'
            username = username.lower()
            try:
                user = User.objects.get(email=username)
            except User.DoesNotExist:
                user = None

            if user is None:
                user = User.objects.create_user(email=username, is_active=True)
                user.set_unusable_password()

            u_p = Profile.objects.add_or_update(username, name)

            if mail:
                u_p.contact_email = mail

            u_p.save()

            # create org if possible
            if office_id is not None:
                org_url_prefix = 'org_' + office_id[:10]
                org = get_org_by_url_prefix(org_url_prefix)
                if org is None:
                    create_org(office_name, org_url_prefix, 'org_admin@icourt.com')
                    org = get_org_by_url_prefix(org_url_prefix)

                set_org_user(org.org_id, user.username)

                # update user avatar
                # try:
                #     _update_user_avatar(user, pic)
                # except Exception as e:
                #     logger.error(e)
            return (True, user)

    def validate(self, attrs):
        state = attrs.get('state')
        code = attrs.get('code')

        platform = attrs.get('platform', None)
        device_id = attrs.get('device_id', None)
        device_name = attrs.get('device_name', None)
        client_version = attrs.get('client_version', None)
        platform_version = attrs.get('platform_version', None)

        v2_fields = (platform, device_id, device_name)

        flag, result = self.icourt_weixin_login_callback(state, code)
        if flag is False:
            raise serializers.ValidationError(json.loads(result))

        user = result
        username = user.username

        # Decide the version of token we need
        if all_none(v2_fields):
            v2 = False
        elif all_not_none(v2_fields):
            v2 = True
        else:
            raise serializers.ValidationError('invalid params')

        if platform == 'android':
            if not user.permissions.can_connect_with_android_clients():
                raise serializers.ValidationError('Not allowed to connect to android client.')
        elif platform == 'ios':
            if not user.permissions.can_connect_with_ios_clients():
                raise serializers.ValidationError('Not allowed to connect to ios client.')
        else:
            logger.info('%s: unrecognized device' % username)

        # Now user is authenticated
        if v2:
            token = get_token_v2(self.context['request'], username, platform,
                                 device_id, device_name,
                                 client_version, platform_version)
        else:
            token = get_token_v1(username)
        return (token.key, username)
