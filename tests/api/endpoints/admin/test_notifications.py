import json

from seahub.test_utils import BaseTestCase
from seahub.notifications.models import UserNotification

from seahub.base.accounts import UserManager


class AdminNotificationsTest(BaseTestCase):
    def setUp(self):
        self.endpoint = '/api/v2.1/admin/notifications/'
        self.user_name = self.user.username
        self.admin_name = self.admin.username

    def test_get_all_nofitications_as_admin(self):
        self.login_as(self.admin)

        notice1 = UserNotification.objects.add_user_message(self.user_name, 'test1')
        notice2 = UserNotification.objects.add_user_message(self.admin_name, 'test2')

        resp = self.client.get(self.endpoint)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['count'] == 2

    def test_get_a_user_notification_by_name_as_admin(self):
        self.login_as(self.admin)

        new_user1 = UserManager().create_user(email='1@1.com', password='1')
        new_user2 = UserManager().create_user(email='2@2.com', password='2')

        notice1 = UserNotification.objects.add_user_message(new_user1.username, 'test for user1')
        notice2 = UserNotification.objects.add_user_message(new_user1.username, 'test for user1')
        notice3 = UserNotification.objects.add_user_message(new_user2.username, 'test for user2')
        notice4 = UserNotification.objects.add_user_message(new_user2.username, 'test for user2')
        notice5 = UserNotification.objects.add_user_message(new_user2.username, 'test for user2')

        resp_user1 = self.client.get(self.endpoint + '?username=' + new_user1.username)
        self.assertEqual(200, resp_user1.status_code)
        json_resp1 = json.loads(resp_user1.content)
        assert json_resp1['count'] == 2

        resp_user2 = self.client.get(self.endpoint + '?username=' + new_user2.username)
        self.assertEqual(200, resp_user2.status_code)
        json_resp2 = json.loads(resp_user2.content)
        assert json_resp2['count'] == 3

        new_user1.delete()
        new_user2.delete()

    def test_get_notifications_with_invalid_usre_permission(self):
        self.login_as(self.user)
        notice1 = UserNotification.objects.add_user_message(self.user_name, 'test1')
        resp = self.client.get(self.endpoint)
        self.assertEqual(403, resp.status_code)

    def test_get_notifications_with_no_notification(self):
        self.login_as(self.admin)
        resp = self.client.get(self.endpoint)
        obj_resp = json.loads(resp.content)
        assert len(obj_resp['notification_list']) == 0
        self.assertEqual(200, resp.status_code)
