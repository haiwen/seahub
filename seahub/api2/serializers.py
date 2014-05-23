import re

from rest_framework import serializers

from seahub.auth import authenticate
from seahub.api2.models import Token, TokenV2, DESKTOP_PLATFORMS
from seahub.api2.utils import get_client_ip
from seahub.utils import is_valid_username

def all_none(values):
    for value in values:
        if value is not None:
            return False

    return True

def all_not_none(values):
    for value in values:
        if value is None:
            return False

    return True

_ANDROID_DEVICE_ID_PATTERN = re.compile('^[a-f0-9]{1,16}$')
class AuthTokenSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    # There fields are used by TokenV2
    platform = serializers.CharField(required=False)
    device_id = serializers.CharField(required=False)
    device_name = serializers.CharField(required=False)

    # These fields may be needed in the future
    client_version = serializers.CharField(required=False)
    platform_version = serializers.CharField(required=False)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        platform = attrs.get('platform', None)
        device_id = attrs.get('device_id', None)
        device_name = attrs.get('device_name', None)
        client_version = attrs.get('client_version', None)
        platform_version = attrs.get('platform_version', None)

        v2_fields = (platform, device_id, device_name, client_version, platform_version)

        # Decide the version of token we need
        if all_none(v2_fields):
            v2 = False
        elif all_not_none(v2_fields):
            v2 = True
        else:
            raise serializers.ValidationError('invalid params')

        # first check username and password
        if username:
            if not is_valid_username(username):
                raise serializers.ValidationError('username is not valid.')

        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError('User account is disabled.')
            else:
                raise serializers.ValidationError('Unable to login with provided credentials.')
        else:
            raise serializers.ValidationError('Must include "username" and "password"')

        # Now user is authenticated

        if v2:
            token = self.get_token_v2(username, platform, device_id, device_name,
                                      client_version, platform_version)
        else:
            token = self.get_token_v1(username)
        return token.key

    def get_token_v1(self, username):
        token, created = Token.objects.get_or_create(user=username)
        return token

    def get_token_v2(self, username, platform, device_id, device_name,
                     client_version, platform_version):

        if platform in DESKTOP_PLATFORMS:
            # desktop device id is the peer id, so it must be 40 chars
            if len(device_id) != 40:
                raise serializers.ValidationError('invalid device id')

        elif platform == 'android':
            # See http://developer.android.com/reference/android/provider/Settings.Secure.html#ANDROID_ID
            # android device id is the 64bit secure id, so it must be 16 chars in hex representation
            # but some user reports their device ids are 14 or 15 chars long. So we relax the validation.
            if not _ANDROID_DEVICE_ID_PATTERN.match(device_id.lower()):
                raise serializers.ValidationError('invalid device id')
        elif platform == 'ios':
            if len(device_id) != 36:
                raise serializers.ValidationError('invalid device id')
        else:
            raise serializers.ValidationError('invalid platform')

        request = self.context['request']
        last_login_ip = get_client_ip(request)

        return TokenV2.objects.get_or_create_token(username, platform, device_id, device_name,
                                                   client_version, platform_version, last_login_ip)

class AccountSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    is_staff = serializers.BooleanField(default=False)
    is_active = serializers.BooleanField(default=True)
