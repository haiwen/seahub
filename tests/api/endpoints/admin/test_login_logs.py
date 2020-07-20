import json
import time
import datetime

from django.urls import reverse
from seahub.test_utils import BaseTestCase

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class LoginLogsTest(BaseTestCase):

    def test_get_login_log(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin)

        end_timestamp = time.time()
        start_timestamp = end_timestamp - 7 * 24 * 60 * 60
        start_time_str = datetime.datetime.fromtimestamp(start_timestamp).strftime('%Y-%m-%d')
        end_time_str = datetime.datetime.fromtimestamp(end_timestamp).strftime('%Y-%m-%d')

        para_str = '?start=%s&end=%s' % (start_time_str, end_time_str)
        url = reverse('api-v2.1-admin-logs-login') + para_str
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)

        assert json_resp[0]['email'] == self.admin.email

    def test_can_not_get_if_start_time_invalid(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin)

        end_timestamp = time.time()
        start_timestamp = end_timestamp - 7 * 24 * 60 * 60
        start_time_str = datetime.datetime.fromtimestamp(start_timestamp).strftime('%Y-%m-%d')
        end_time_str = datetime.datetime.fromtimestamp(end_timestamp).strftime('%Y-%m-%d')

        para_str = '?star=%s&end=%s' % (start_time_str, end_time_str)
        url = reverse('api-v2.1-admin-logs-login') + para_str
        resp = self.client.get(url)
        self.assertEqual(400, resp.status_code)

    def test_can_not_get_if_end_time_invalid(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin)

        end_timestamp = time.time()
        start_timestamp = end_timestamp - 7 * 24 * 60 * 60
        start_time_str = datetime.datetime.fromtimestamp(start_timestamp).strftime('%Y-%m-%d')
        end_time_str = datetime.datetime.fromtimestamp(end_timestamp).strftime('%Y-%m-%d')

        para_str = '?start=%s&en=%s' % (start_time_str, end_time_str)
        url = reverse('api-v2.1-admin-logs-login') + para_str
        resp = self.client.get(url)
        self.assertEqual(400, resp.status_code)

    def test_can_not_get_if_not_admin(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        end_timestamp = time.time()
        start_timestamp = end_timestamp - 7 * 24 * 60 * 60
        start_time_str = datetime.datetime.fromtimestamp(start_timestamp).strftime('%Y-%m-%d')
        end_time_str = datetime.datetime.fromtimestamp(end_timestamp).strftime('%Y-%m-%d')

        para_str = '?start=%s&end=%s' % (start_time_str, end_time_str)
        url = reverse('api-v2.1-admin-logs-login') + para_str
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

class AdminLoginLogsTest(BaseTestCase):

    def test_get_logs(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-admin-login-logs')
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)

        assert json_resp['data'][0]['email'] == self.admin.email

    def test_can_not_get_if_not_admin(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        url = reverse('api-v2.1-admin-admin-login-logs')
        resp = self.client.get(url)

        self.assertEqual(403, resp.status_code)
