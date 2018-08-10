from mock import patch

from seahub.test_utils import BaseTestCase
from seahub.api2.serializers import AuthTokenSerializer
from seahub.profile.models import Profile

class AuthTokenSerializerTest(BaseTestCase):

    def test_validate(self):
        d = {
            'username': self.user.username,
            'password': self.user_password,
            'platform': 'linux',
            'device_id': '701143c1238e6736b61c20e73de82fc95989c413',
            'device_name': 'test',
        }

        assert AuthTokenSerializer(
            data=d, context={'request': self.fake_request}).is_valid() is True

        Profile.objects.add_or_update(username=self.user.username, login_id='aaa')
        d1 = d.copy()
        d1.update({'username': 'aaa'})
        assert AuthTokenSerializer(
            data=d, context={'request': self.fake_request}).is_valid() is True
        assert AuthTokenSerializer(
            data=d1, context={'request': self.fake_request}).is_valid() is True

        Profile.objects.add_or_update(username=self.user.username,
                                      contact_email='a+1@a.com')
        d1 = d.copy()
        d1.update({'username': 'a+1@a.com'})
        assert AuthTokenSerializer(
            data=d, context={'request': self.fake_request}).is_valid() is True
        assert AuthTokenSerializer(
            data=d1, context={'request': self.fake_request}).is_valid() is True

    @patch('seahub.api2.serializers.has_two_factor_auth')
    def test_two_factor_auth(self, mock_has_two_factor_auth):
        mock_has_two_factor_auth.return_value = True

        s = AuthTokenSerializer(data={
            'username': self.user.username,
            'password': self.user_password,
            'platform': 'linux',
            'device_id': '701143c1238e6736b61c20e73de82fc95989c413',
            'device_name': 'test',
        }, context={'request': self.fake_request})
        assert s.is_valid() is True
