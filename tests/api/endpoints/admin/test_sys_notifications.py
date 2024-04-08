import json

from django.utils.crypto import get_random_string

from seahub.test_utils import BaseTestCase
from seahub.notifications.models import Notification


class AdminSysNotificationsTest(BaseTestCase):
    def setUp(self):
        self.url = '/api/v2.1/admin/sys-notifications/'
        self.notification = Notification.objects.create()

    def tearDown(self):
        try:
            self.notification.delete()
        except Exception as e:
            pass

    def test_get_notifications(self):
        self.login_as(self.admin)
        resp = self.client.get(self.url)

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'id' in json_resp['notifications'][0]
        assert 'msg' in json_resp['notifications'][0]
        assert 'is_current' in json_resp['notifications'][0]

    def test_no_permission(self):
        self.login_as(self.admin_no_other_permission)
        resp = self.client.get(self.url)

        self.assertEqual(403, resp.status_code)

    def test_get_with_invalid_user_permission(self):
        self.login_as(self.user)
        resp = self.client.get(self.url)

        self.assertEqual(403, resp.status_code)

    def test_create_notification(self):
        self.login_as(self.admin)

        data = {
            'msg': get_random_string(length=12),
        }
        resp = self.client.post(self.url, json.dumps(data),
                'application/json')

        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['notification']['msg'] == data['msg']

    def test_create_notification_with_invalid_user_permission(self):
        self.login_as(self.user)
        data = {
            'msg': get_random_string(length=12),
        }
        resp = self.client.post(self.url, json.dumps(data),
                'application/json')

        self.assertEqual(403, resp.status_code)


class AdminSysNotificationTest(BaseTestCase):
    def setUp(self):
        self.url = '/api/v2.1/admin/sys-notifications/'

        self.notification = Notification.objects.create()

    def tearDown(self):
        try:
            self.notification.delete()
        except Exception as e:
            pass

    def test_set_notification_primary(self):
        self.login_as(self.admin)

        resp = self.client.put(self.url + str(self.notification.id) + '/')
        self.assertEqual(200, resp.status_code)

    def delete_notification(self):
        self.login_as(self.admin)
        resp = self.client.delete(self.url + str(self.notification.id) + '/')
        self.assertEqual(200, resp.status_code)
