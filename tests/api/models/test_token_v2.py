from seahub.test_utils import BaseTestCase
from seahub.api2.models import TokenV2, TokenV2Manager

class TokenV2ManagerTest(BaseTestCase):
    def setUp(self):
        assert len(TokenV2.objects.all()) == 0

        token = TokenV2(user=self.user.username,
                        platform='ios',
                        device_id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                        device_name='fake device name',
                        client_version='1.0.0',
                        platform_version='0.0.1',
                        last_login_ip=self.ip_v6)
        token.save()

        assert len(TokenV2.objects.all()) == 1
        self.token = TokenV2.objects.all()[0]

    def test_get_devices(self):
        d = TokenV2.objects.get_devices('', 0, 10)
        assert len(d) == 1

    def test_get_user_devices(self):
        d = TokenV2.objects.get_user_devices(self.user.username)
        assert len(d) == 1

    def test_get_or_create_token(self):
        # get exist token
        t = TokenV2.objects.get_or_create_token(
            self.token.user, self.token.platform, self.token.device_id,
            self.token.device_name, '1.1.1', '0.1.1', self.ip_v6)
        assert t.key == self.token.key

        # create new token
        t = TokenV2.objects.get_or_create_token(
            self.admin.username, self.token.platform, self.token.device_id,
            self.token.device_name, '1.1.1', '0.1.1', self.ip_v6)
        assert len(TokenV2.objects.all()) == 2
        assert TokenV2.objects.all()[1].user == self.admin.username

    def test_delete_device_token(self):
        TokenV2.objects.delete_device_token(
            self.token.user, self.token.platform, self.token.device_id)
        assert len(TokenV2.objects.all()) == 0

    def test_mark_device_to_be_remote_wipted(self):
        assert TokenV2.objects.all()[0].wiped_at is None

        TokenV2.objects.mark_device_to_be_remote_wiped(
            self.token.user, self.token.platform, self.token.device_id)
        assert TokenV2.objects.all()[0].wiped_at is not None


class TokenV2Test(BaseTestCase):
    def test_save(self):
        assert len(TokenV2.objects.all()) == 0

        token = TokenV2(user=self.user.username,
                        platform='ios',
                        device_id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                        device_name='fake device name',
                        client_version='1.0.0',
                        platform_version='0.0.1',
                        last_login_ip=self.ip_v6)
        token.save()

        assert len(TokenV2.objects.all()) == 1

        t = TokenV2.objects.all()[0]
        assert len(t.key) == 40
        assert t.user == self.user.username
        assert t.created_at is not None
        assert t.last_accessed is not None
        assert t.wiped_at is None

    def test_as_dict(self):
        token = TokenV2(user=self.user.username,
                        platform='ios',
                        device_id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                        device_name='fake device name',
                        client_version='1.0.0',
                        platform_version='0.0.1',
                        last_login_ip=self.ip_v6)
        token.save()
        t = TokenV2.objects.all()[0]
        assert len(t.as_dict()) == 10
