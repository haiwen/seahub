from django.test import RequestFactory

from seahub.auth.models import AnonymousUser
from seahub.views import get_unencry_rw_repos_by_user
from seahub.test_utils import BaseTestCase

class GetUnencRWReposByUserTest(BaseTestCase):
    def setUp(self):
        # Every test needs access to the request factory.
        self.factory = RequestFactory()

        # Create an instance of a GET request.
        self.request = self.factory.get('/foo/')

        self.request.user = self.user
        self.request.cloud_mode = False

    def test_can_get(self):
        repo = self.repo

        unenc_repos = get_unencry_rw_repos_by_user(self.request)
        assert len(unenc_repos) > 0

    def test_anonymous_user(self):
        self.request.user = AnonymousUser()

        unenc_repos = get_unencry_rw_repos_by_user(self.request)
        assert len(unenc_repos) == 0
