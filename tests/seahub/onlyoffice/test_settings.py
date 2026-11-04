import importlib
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

import seahub.onlyoffice.settings as onlyoffice_settings

SECRET = 'test-onlyoffice-secret-0123456789abcdef'
APIJS_URL = 'http://docserver/web-apps/apps/api/documents/api.js'


class OnlyofficeEnabledTest(SimpleTestCase):
    """OnlyOffice counts as enabled only when the JWT secret is configured.

    Without the secret the document server can not sign a callback, so the
    callback can not be authenticated and the editor must not be offered.
    """

    def setUp(self):
        self.addCleanup(importlib.reload, onlyoffice_settings)

    def _reload(self):
        importlib.reload(onlyoffice_settings)
        return onlyoffice_settings.ENABLE_ONLYOFFICE

    @override_settings(ENABLE_MULTIPLE_OFFICE_SUITE=False,
                       ENABLE_ONLYOFFICE=True,
                       ONLYOFFICE_JWT_SECRET='')
    def test_disabled_when_jwt_secret_is_missing(self):
        self.assertFalse(self._reload())

    @override_settings(ENABLE_MULTIPLE_OFFICE_SUITE=False,
                       ENABLE_ONLYOFFICE=True,
                       ONLYOFFICE_JWT_SECRET=SECRET)
    def test_enabled_when_jwt_secret_is_configured(self):
        self.assertTrue(self._reload())

    @override_settings(ENABLE_MULTIPLE_OFFICE_SUITE=False,
                       ENABLE_ONLYOFFICE=False,
                       ONLYOFFICE_JWT_SECRET=SECRET)
    def test_disabled_when_onlyoffice_is_not_configured(self):
        self.assertFalse(self._reload())

    def test_disabled_in_office_suite_mode_when_jwt_secret_is_missing(self):
        with patch('seahub.settings.ENABLE_MULTIPLE_OFFICE_SUITE', True), \
                patch('seahub.settings.OFFICE_SUITE_LIST', [{
                    'id': 'onlyoffice',
                    'ONLYOFFICE_APIJS_URL': APIJS_URL,
                    'ONLYOFFICE_JWT_SECRET': '',
                }]):
            self.assertFalse(self._reload())

    def test_enabled_in_office_suite_mode_when_jwt_secret_is_configured(self):
        with patch('seahub.settings.ENABLE_MULTIPLE_OFFICE_SUITE', True), \
                patch('seahub.settings.OFFICE_SUITE_LIST', [{
                    'id': 'onlyoffice',
                    'ONLYOFFICE_APIJS_URL': APIJS_URL,
                    'ONLYOFFICE_JWT_SECRET': SECRET,
                }]):
            self.assertTrue(self._reload())
