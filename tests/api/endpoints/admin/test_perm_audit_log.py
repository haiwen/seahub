import time
import datetime
from mock import patch

from django.urls import reverse
from seahub.test_utils import BaseTestCase

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class PermAuditTest(BaseTestCase):

    @patch('seahub.views.file.is_pro_version')
    def test_can_not_get_if_start_time_invalid(self, mock_is_pro_version):

        if not LOCAL_PRO_DEV_ENV:
            return

        mock_is_pro_version.return_value = True

        self.login_as(self.admin)

        start_timestamp = time.time() - 7 * 24 * 60 * 60
        end_timestamp = time.time()
        start_time_str = datetime.datetime.fromtimestamp(start_timestamp).strftime('%Y-%m-%d')
        end_time_str = datetime.datetime.fromtimestamp(end_timestamp).strftime('%Y-%m-%d')

        para_str = '?star=%s&end=%s' % (start_time_str, end_time_str)
        url = reverse('api-v2.1-admin-logs-perm-audit') + para_str
        resp = self.client.get(url)
        self.assertEqual(400, resp.status_code)

    @patch('seahub.views.file.is_pro_version')
    def test_can_not_get_if_end_time_invalid(self, mock_is_pro_version):

        if not LOCAL_PRO_DEV_ENV:
            return

        mock_is_pro_version.return_value = True

        self.login_as(self.admin)

        start_timestamp = time.time() - 7 * 24 * 60 * 60
        end_timestamp = time.time()
        start_time_str = datetime.datetime.fromtimestamp(start_timestamp).strftime('%Y-%m-%d')
        end_time_str = datetime.datetime.fromtimestamp(end_timestamp).strftime('%Y-%m-%d')

        para_str = '?start=%s&en=%s' % (start_time_str, end_time_str)
        url = reverse('api-v2.1-admin-logs-perm-audit') + para_str
        resp = self.client.get(url)
        self.assertEqual(400, resp.status_code)

    def test_can_not_get_if_not_admin(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        start_timestamp = time.time() - 7 * 24 * 60 * 60
        end_timestamp = time.time()
        start_time_str = datetime.datetime.fromtimestamp(start_timestamp).strftime('%Y-%m-%d')
        end_time_str = datetime.datetime.fromtimestamp(end_timestamp).strftime('%Y-%m-%d')

        para_str = '?start=%s&end=%s' % (start_time_str, end_time_str)
        url = reverse('api-v2.1-admin-logs-perm-audit') + para_str
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)
