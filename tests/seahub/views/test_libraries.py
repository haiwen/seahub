from seahub.test_utils import BaseTestCase
from django.core.urlresolvers import reverse

from constance import config

class LibrariesTests(BaseTestCase):
    def setUp(self):
        self.url = reverse('libraries')

    def test_pub_repo_creation_config(self):
        # user
        self.login_as(self.user)

        config.ENABLE_ORGANIZATION_LIBRARY = 1
        assert bool(config.ENABLE_ORGANIZATION_LIBRARY) is True

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        assert resp.context['can_add_pub_repo'] is True

        config.ENABLE_ORGANIZATION_LIBRARY = 0
        assert bool(config.ENABLE_ORGANIZATION_LIBRARY) is False

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        assert resp.context['can_add_pub_repo'] is False

        # logout
        self.client.logout()

        # admin
        self.login_as(self.admin)

        config.ENABLE_ORGANIZATION_LIBRARY = 1
        assert bool(config.ENABLE_ORGANIZATION_LIBRARY) is True

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        assert resp.context['can_add_pub_repo'] is True

        config.ENABLE_ORGANIZATION_LIBRARY = 0
        assert bool(config.ENABLE_ORGANIZATION_LIBRARY) is False

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        assert resp.context['can_add_pub_repo'] is True
