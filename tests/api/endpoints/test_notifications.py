import json
from seahub.test_utils import BaseTestCase
from seahub.notifications.models import UserNotification

class InvitationsTest(BaseTestCase):
    def setUp(self):
        self.endpoint = '/api/v2.1/notifications/'
        self.username = self.user.username

    def test_can_get_unseen_count(self):

        self.login_as(self.user)

        UserNotification.objects.add_file_uploaded_msg(self.username, 'test')
        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['unseen_count'] == 1

    def test_get_with_invalid_user_permission(self):

        resp = self.client.get(self.endpoint)
        self.assertEqual(403, resp.status_code)
