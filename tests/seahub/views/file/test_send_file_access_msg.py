from django.contrib.auth.models import AnonymousUser
from django.test.client import RequestFactory

from seahub.test_utils import BaseTestCase
from seahub.views.file import send_file_access_msg


class SendFileAccessMsgTest(BaseTestCase):
    def setUp(self):
        # Every test needs access to the request factory.
        self.factory = RequestFactory()

    @property
    def _request(self, session={}):
        request = self.factory.get('/rand')
        request.user = self.user
        request.session = session
        return request

    def _anon_request(self, session={}):
        request = self.factory.get('/rand')
        request.user = AnonymousUser()
        request.session = session
        request.cloud_mode = False
        return request

    def test_normal_request(self):
        send_file_access_msg(self._request, self.repo, '', '')

    def test_anonymous_request(self):
        send_file_access_msg(self._anon_request(), self.repo, '', '')
