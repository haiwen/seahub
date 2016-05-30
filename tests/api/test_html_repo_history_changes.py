from django.test import RequestFactory

from seahub.test_utils import BaseTestCase

class RepoTest(BaseTestCase):
    def setUp(self):
        # Every test needs access to the request factory.
        self.factory = RequestFactory()

        # Create an instance of a GET request.
        self.request = self.factory.get('/foo/')

        self.request.user = self.user
        self.request.cloud_mode = False
