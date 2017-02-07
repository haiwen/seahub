from seahub.test_utils import BaseTestCase
from seahub.views.modules import enable_mod_for_user, \
    get_enabled_mods_by_user, MOD_PERSONAL_WIKI

class UserEnabledModulesTest(BaseTestCase):
    def setUp(self):
        self.url = '/api/v2.1/user-enabled-modules/'
        self.username = self.user.username

    def test_can_enable_personal_wiki_module(self):
        enabled_mods = get_enabled_mods_by_user(self.username)
        assert 'personal wiki' not in enabled_mods

        self.login_as(self.user)
        resp = self.client.post(self.url, {})
        self.assertEqual(200, resp.status_code)

        enabled_mods = get_enabled_mods_by_user(self.username)
        assert 'personal wiki' in enabled_mods

    def test_enable_module_with_invalid_user_permission(self):

        resp = self.client.post(self.url, {})
        self.assertEqual(403, resp.status_code)

    def test_can_disable_personal_wiki_module(self):
        enable_mod_for_user(self.username, MOD_PERSONAL_WIKI)
        enabled_mods = get_enabled_mods_by_user(self.username)
        assert 'personal wiki' in enabled_mods

        self.login_as(self.user)
        resp = self.client.delete(self.url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        enabled_mods = get_enabled_mods_by_user(self.username)
        assert 'personal wiki' not in enabled_mods

    def test_disable_module_with_invalid_user_permission(self):

        resp = self.client.post(self.url, {})
        self.assertEqual(403, resp.status_code)
