import json
from django.urls import reverse
from django.test import override_settings

from seahub.test_utils import BaseTestCase


class AdminWebSettingsTest(BaseTestCase):

    def setUp(self):
        self.url = reverse('api-v2.1-web-settings')
        self.login_as(self.admin)

    def test_get_admin_permission_denied(self):
        self.logout()
        self.login_as(self.admin_cannot_config_system)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_put_admin_permission_denied(self):
        self.logout()
        self.login_as(self.admin_cannot_config_system)
        resp = self.client.put(self.url)
        self.assertEqual(403, resp.status_code)

    def test_get_web_settings_info(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 29

    @override_settings(ENABLE_SETTINGS_VIA_WEB=False)
    def test_get_with_enable_settings(self):
        resp = self.client.get(self.url)
        self.assertEqual(404, resp.status_code)

    def test_update_web_settings_info(self):
        data = {
            "DISABLE_SYNC_WITH_ANY_FOLDER": False,
            "SHARE_LINK_TOKEN_LENGTH": 20,
            "REPO_PASSWORD_MIN_LENGTH": 10,
            "REGISTRATION_SEND_MAIL": False,
            "SHARE_LINK_PASSWORD_MIN_LENGTH": 8,
            "ENABLE_BRANDING_CSS": False,
            "ENABLE_REPO_HISTORY_SETTING": 0,
            "SERVICE_URL": "http://127.0.0.1:8000",
            "ACTIVATE_AFTER_REGISTRATION": True,
            "ENABLE_ENCRYPTED_LIBRARY": True,
            "CUSTOM_CSS": "test_style",
            "SITE_NAME": "Seafile",
            "LOGIN_REMEMBER_DAYS": 7,
            "ENABLE_TERMS_AND_CONDITIONS": False,
            "SITE_TITLE": "Private Seafile",
            "USER_STRONG_PASSWORD_REQUIRED": 0,
            "FORCE_PASSWORD_CHANGE": True,
            "ENABLE_SHARE_TO_ALL_GROUPS": False,
            "ENABLE_USER_CLEAN_TRASH": True,
            "FREEZE_USER_ON_LOGIN_FAILED": False,
            "ENABLE_TWO_FACTOR_AUTH": False,
            "USER_PASSWORD_MIN_LENGTH": 6,
            "TEXT_PREVIEW_EXT": "ac, am, bat, c, cc, cmake, cpp, cs, css, diff, el, h, html, htm, java, js, json, less, make, org, php, pl, properties, py, rb, scala, script, sh, sql, txt, text, tex, vi, vim, xhtml, xml, log, csv, groovy, rst, patch, go, yml",
            "ENABLE_SIGNUP": False,
            "USER_PASSWORD_STRENGTH_LEVEL": 3,
            "FILE_SERVER_ROOT": "http://127.0.0.1:8082",
            "LOGIN_ATTEMPT_LIMIT": 5
        }
        for key, value in data.items():
            if value in (True, False):
                value = '1' if value else '0'
            data_pair = key + '=' + str(value)

            resp = self.client.put(self.url, data_pair, 'application/x-www-form-urlencoded')
            json_resp = json.loads(resp.content)
            self.assertEqual(200, resp.status_code)
            assert str(json_resp[key]) == str(value)
