from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase


class SysSettingsTest(BaseTestCase):
    def setUp(self):
        self.url = reverse('sys_settings')
        self.login_as(self.admin)

    def test_can_render(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

    def test_can_not_render_if_setting_disabled(self):
        with self.settings(ENABLE_SETTINGS_VIA_WEB=False):
            resp = self.client.get(self.url)
            self.assertEqual(404, resp.status_code)
