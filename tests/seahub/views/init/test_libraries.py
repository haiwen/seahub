import json

from django.core.urlresolvers import reverse
import pytest
pytestmark = pytest.mark.django_db

from seahub.options.models import UserOptions
from seahub.test_utils import BaseTestCase

class LibrariesTest(BaseTestCase):
    def setUp(self):
        self.url = reverse('libraries')
        from constance import config
        self.config = config

    def test_user_guide(self):
        self.login_as(self.user)
        username = self.user.username
        assert UserOptions.objects.get_default_repo(username) is None
        assert UserOptions.objects.is_user_guide_enabled(username) is True

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'libraries.html')
        assert resp.context['guide_enabled'] is True

        resp = self.client.get(self.url)
        assert resp.context['guide_enabled'] is False

        assert UserOptions.objects.get_default_repo(username) is not None
        assert UserOptions.objects.is_user_guide_enabled(username) is False

    def test_pub_repo_creation_config(self):
        self.clear_cache()

        # user
        self.login_as(self.user)

        self.config.ENABLE_USER_CREATE_ORG_REPO = 1
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is True

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        assert resp.context['can_add_public_repo'] is True

        self.config.ENABLE_USER_CREATE_ORG_REPO = 0
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is False

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        assert resp.context['can_add_public_repo'] is False

        # logout
        self.logout()

        # admin
        self.login_as(self.admin)

        self.config.ENABLE_USER_CREATE_ORG_REPO = 1
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is True

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        assert resp.context['can_add_public_repo'] is True

        self.config.ENABLE_USER_CREATE_ORG_REPO = 0
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is False

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        assert resp.context['can_add_public_repo'] is True

    def test_get_user_joined_groups(self):
        self.login_as(self.user)

        resp = self.client.get(self.url)

        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'libraries.html')
        assert len(resp.context['joined_groups']) > 0
