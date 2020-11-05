import json

from django.urls import reverse

from seahub.options.models import UserOptions
from seahub.test_utils import BaseTestCase

class DefaultRepoTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = reverse('api2-defaultrepo')

    def test_default_repo_missing_on_get(self):
        resp = self.client.get(self.endpoint)
        json_resp = json.loads(resp.content)
        assert json_resp['exists'] is False

    def test_create_default_repo_on_post(self):
        username = self.user.username
        assert UserOptions.objects.get_default_repo(username) is None
        assert UserOptions.objects.is_user_guide_enabled(username) is True

        resp = self.client.post(self.endpoint)
        json_resp = json.loads(resp.content)
        assert json_resp['exists'] is True
        assert len(json_resp['repo_id']) == 36

        assert UserOptions.objects.get_default_repo(username) is not None

        # so that, default repo won't be created again during web login
        assert UserOptions.objects.is_user_guide_enabled(username) is False
