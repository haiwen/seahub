from django.test import RequestFactory

from seahub.api2.views import html_repo_history_changes
from seahub.test_utils import BaseTestCase

class RepoTest(BaseTestCase):
    def setUp(self):
        # Every test needs access to the request factory.
        self.factory = RequestFactory()

        # Create an instance of a GET request.
        self.request = self.factory.get('/foo/')

        self.request.user = self.user
        self.request.cloud_mode = False

    def test_can_not_get_without_commit_id(self):
        repo = self.repo
        resp = html_repo_history_changes(self.request, repo.id)
        self.assertEqual(400, resp.status_code)
