from django.conf import settings
from django.test import override_settings

from seahub.base.accounts import User
from seahub.test_utils import BaseTestCase


class DemoTest(BaseTestCase):
    def setUp(self):
        self.url = '/demo/'

    def test_404_if_not_cloud_mode(self):
        resp = self.client.get(self.url)
        self.assertEqual(404, resp.status_code)

    @override_settings(CLOUD_MODE=True)
    def test_user_doesnot_exists(self):
        resp = self.client.get(self.url)
        self.assertEqual(404, resp.status_code)

    @override_settings(CLOUD_MODE=True)
    def test_demo_user(self):
        u = User.objects.create_user(email=settings.CLOUD_DEMO_USER)

        resp = self.client.get(self.url)
        self.assertEqual(302, resp.status_code)

        self.remove_user(u.username)
