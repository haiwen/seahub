import json
from seaserv import seafile_api

from seahub.test_utils import BaseTestCase
from seahub.notifications.models import MSG_TYPE_WOPI_MENTION, UserNotification

class NotificationsTest(BaseTestCase):
    def setUp(self):
        self.endpoint = '/api/v2.1/notifications/'
        self.username = self.user.username

    def test_can_get_unseen_count(self):

        UserNotification.objects.add_file_uploaded_msg(self.username, 'test')

        self.login_as(self.user)
        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['unseen_count'] == 1

    def test_get_with_invalid_user_permission(self):

        resp = self.client.get(self.endpoint)
        self.assertEqual(403, resp.status_code)

    def test_can_unseen_all_notifications(self):

        UserNotification.objects.add_file_uploaded_msg(self.username, 'test')
        assert UserNotification.objects.count_unseen_user_notifications(self.username) == 1

        self.login_as(self.user)
        resp = self.client.put(self.endpoint, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        assert UserNotification.objects.count_unseen_user_notifications(self.username) == 0

    def test_unseen_notifications_with_invalid_user_permission(self):

        UserNotification.objects.add_file_uploaded_msg(self.username, 'test')
        assert UserNotification.objects.count_unseen_user_notifications(self.username) == 1

        resp = self.client.put(self.endpoint, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

class NotificationTest(BaseTestCase):
    def setUp(self):
        self.endpoint = '/api/v2.1/notification/'
        self.username = self.user.username

    def test_can_unseen_notification_by_id(self):

        notice = UserNotification.objects.add_file_uploaded_msg(self.username, 'test')
        assert UserNotification.objects.count_unseen_user_notifications(self.username) == 1

        self.login_as(self.user)
        data = 'notice_id=%d' % notice.id
        resp = self.client.put(self.endpoint, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        assert UserNotification.objects.count_unseen_user_notifications(self.username) == 0

    def test_argument_check_notice_id_invalid(self):
        self.login_as(self.user)
        data = 'notice_id=%s' % 'a'

        resp = self.client.put(self.endpoint, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

    def test_resource_check_notification_not_found(self):
        self.login_as(self.user)
        notice1 = UserNotification.objects.add_user_message(self.username, 'test1')
        notice2 = UserNotification.objects.add_user_message(self.username, 'test2')
        data = 'notice_id=%s' % str(notice2.id + 1)

        resp = self.client.put(self.endpoint, data, 'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)

    def test_permission_check_permission_denied(self):
        self.login_as(self.user)
        new_user = self.create_user(email='new@new.com', password='root')
        notice_to_new_user = UserNotification.objects.add_user_message(new_user.name, 'test for new user')
        data = 'notice_id=%s' % notice_to_new_user.id

        resp = self.client.put(self.endpoint, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)


class WOPIMentionNotificationFormattingTest(BaseTestCase):
    def setUp(self):
        self.endpoint = '/api/v2.1/notifications/'
        self.file_name = 'mentioned.txt'
        self.file_path = '/' + self.file_name
        self.create_file(repo_id=self.repo.id, parent_dir='/', filename=self.file_name,
                         username=self.user.username)
        seafile_api.share_repo(self.repo.id, self.user.username, self.admin.username, 'rw')

    def test_wopi_mention_notification_is_returned(self):
        detail = json.dumps({
            'repo_id': self.repo.id,
            'file_path': self.file_path,
            'from_user': self.admin.username,
            'mentioned_user': self.user.username,
        })
        UserNotification.objects.add_wopi_mention_msg(self.user.username, detail)

        self.login_as(self.user)
        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)

        payload = json.loads(resp.content)
        notice = payload['notification_list'][0]
        self.assertEqual(MSG_TYPE_WOPI_MENTION, notice['type'])
        self.assertEqual(self.file_name, notice['detail']['file_name'])
        self.assertEqual(self.admin.username, notice['detail']['from_user_email'])
