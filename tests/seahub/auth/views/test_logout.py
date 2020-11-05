from django.urls import reverse

from seahub.test_utils import BaseTestCase


class LogoutTest(BaseTestCase):
    def test_can_logout(self):
        resp = self.client.get(reverse('auth_logout'))

        self.assertEqual(200, resp.status_code)
        self.assertContains(resp, 'Log in again')
