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

    def test_create_notification_at_max_length(self):
        self.login_as(self.admin)

        data = {
            'msg': 'a' * 512,
        }
        resp = self.client.post(self.url, json.dumps(data),
                'application/json')

        self.assertEqual(200, resp.status_code)

    def test_create_notification_with_too_long_msg(self):
        self.login_as(self.admin)

        data = {
            'msg': 'a' * 513,
        }
        resp = self.client.post(self.url, json.dumps(data),
                'application/json')

        self.assertEqual(400, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'too long' in json_resp['error_msg']
        self.assertEqual(1, Notification.objects.count())

    def test_create_notification_with_crlf_msg(self):
        self.login_as(self.admin)

        # browsers submit textarea line breaks as CRLF, normalize them
        # before counting the length
        msg = 'a' * 509 + '\r\n' + 'aa'
        self.assertEqual(513, len(msg))

        data = {'msg': msg}
        resp = self.client.post(self.url, json.dumps(data),
                'application/json')

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertEqual(
                'a' * 509 + '\n' + 'aa',
                json_resp['notification']['msg'])

    def test_create_notification_with_too_long_crlf_msg(self):
        self.login_as(self.admin)

        msg = 'a' * 510 + '\r\n' + 'aa'

        data = {'msg': msg}
        resp = self.client.post(self.url, json.dumps(data),
                'application/json')

        self.assertEqual(400, resp.status_code)
        self.assertEqual(1, Notification.objects.count())

    def test_create_notification_with_non_string_msg(self):
        self.login_as(self.admin)

        for value in (123, True, ['a'], {'key': 'value'}):
            data = {'msg': value}
            resp = self.client.post(self.url, json.dumps(data),
                    'application/json')
            self.assertEqual(400, resp.status_code)
        self.assertEqual(1, Notification.objects.count())

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
