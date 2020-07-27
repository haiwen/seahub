import json

from django.urls import reverse

from seahub.notifications.models import UserNotification
from seahub.test_utils import BaseTestCase

class GroupMembersTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = reverse('api-v2.1-group-members', args=[self.group.id])
        self.username = self.user.username

    def tearDown(self):
        self.remove_group()

    def test_can_add(self):
        # add admin to group
        resp = self.client.post(self.endpoint, {
            'email': self.admin.email
        })
        self.assertEqual(201, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['contact_email'] == self.admin.email

    def test_can_notify_user_after_add(self):
        assert len(UserNotification.objects.all()) == 0

        # add admin to group
        resp = self.client.post(self.endpoint, {
            'email': self.admin.email
        })
        self.assertEqual(201, resp.status_code)

        assert len(UserNotification.objects.all()) == 1
        assert UserNotification.objects.all()[0].to_user == self.admin.username
