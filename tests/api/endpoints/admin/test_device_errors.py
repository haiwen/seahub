from mock import patch
from django.core.urlresolvers import reverse
from seahub.test_utils import BaseTestCase

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class DevicesTest(BaseTestCase):

    @patch('seahub.views.file.is_pro_version')
    def test_can_get(self, mock_is_pro_version):

        if not LOCAL_PRO_DEV_ENV:
            return

        mock_is_pro_version.return_value = True
        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-devices')
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

    def test_can_not_get_if_not_admin(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)
        url = reverse('api-v2.1-admin-device-errors')
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)
