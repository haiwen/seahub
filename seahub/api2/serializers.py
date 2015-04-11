import re

from rest_framework import serializers

from seahub.auth import authenticate
from seahub.api2.models import Token, TokenV2, DESKTOP_PLATFORMS
from seahub.api2.utils import get_token_v1, get_token_v2
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
            token = get_token_v2(self.context['request'], username, platform, device_id, device_name,
                                 client_version, platform_version)
        else:
            token = get_token_v1(username)
        return token.key

class AccountSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    is_staff = serializers.BooleanField(default=False)
    is_active = serializers.BooleanField(default=True)
