from rest_framework import serializers

from seahub.auth import authenticate

class AuthTokenSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if username and password:
            user = authenticate(username=username, password=password)

            if user:
                if not user.is_active:
                    raise serializers.ValidationError('User account is disabled.')
                attrs['user'] = user
                return attrs
            else:
                raise serializers.ValidationError('Unable to login with provided credentials.')
        else:
            raise serializers.ValidationError('Must include "username" and "password"')

class AccountSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    is_staff = serializers.BooleanField()
    is_active = serializers.BooleanField()

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        attrs['is_staff'] = attrs.get('is_staff', False)
        attrs['is_active'] = attrs.get('is_active', True)

        if not password:
            raise serializers.ValidationError('Password is required')

        return attrs
