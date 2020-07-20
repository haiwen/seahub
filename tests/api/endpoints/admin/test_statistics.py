import json
import datetime
from datetime import date

from mock import patch

from django.urls import reverse
from seahub.test_utils import BaseTestCase
from seahub.utils.timeutils import datetime_to_isoformat_timestr


class FileOperationsInfoText(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    @patch("seahub.api2.endpoints.admin.statistics.EVENTS_ENABLED")
    @patch("seahub.api2.endpoints.admin.statistics.is_pro_version")
    @patch("seahub.api2.endpoints.admin.statistics.get_file_ops_stats_by_day")
    def test_admin_permission_denied(self, mock_get_file_audit_stats_by_day, mock_is_pro, mock_events_enabled):
        mock_get_file_audit_stats_by_day.return_value = [
            (datetime.datetime(2017, 6, 2, 4, 2), 'Added', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Deleted', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Visited', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Modified', 2),
        ]
        mock_is_pro.return_value = True
        mock_events_enabled = True
        url = reverse('api-v2.1-admin-statistics-file-operations')
        url += "?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00"
        self.logout()
        self.login_as(self.admin_cannot_view_statistic)
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

    @patch("seahub.api2.endpoints.admin.statistics.EVENTS_ENABLED")
    @patch("seahub.api2.endpoints.admin.statistics.is_pro_version")
    @patch("seahub.api2.endpoints.admin.statistics.get_file_ops_stats_by_day")
    def test_can_get_file_audit_stats(self, mock_get_file_audit_stats_by_day, mock_is_pro, mock_events_enabled):
        mock_get_file_audit_stats_by_day.return_value = [
            (datetime.datetime(2017, 6, 2, 4, 2), 'Added', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Deleted', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Visited', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Modified', 2),
        ]
        mock_is_pro.return_value = True
        mock_events_enabled = True
        url = reverse('api-v2.1-admin-statistics-file-operations')
        url += "?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00"
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        data = {'datetime': datetime_to_isoformat_timestr(datetime.datetime(2017, 6, 2, 4, 2)), 
                'added': 2, 'deleted': 2, 'visited': 2, 'modified': 2}
        assert data in json_resp

    @patch("seahub.api2.endpoints.admin.statistics.EVENTS_ENABLED")
    @patch("seahub.api2.endpoints.admin.statistics.is_pro_version")
    @patch("seahub.api2.endpoints.admin.statistics.get_user_activity_stats_by_day")
    def test_can_user_activity_stats(self, mock_stats_by_day, mock_is_pro,
                                     mock_events_enabled):
        mock_stats_by_day.return_value = [(datetime.datetime(2017, 6, 2, 4, 0), 3)]
        mock_is_pro.return_value = True
        mock_events_enabled = True
        url = reverse('api-v2.1-admin-statistics-active-users')

        url += "?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00"
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        data = {'datetime': datetime_to_isoformat_timestr(datetime.datetime(2017, 6, 2, 4, 0)), 'count': 3}
        assert data in json_resp

    @patch("seahub.api2.endpoints.admin.statistics.EVENTS_ENABLED")
    @patch("seahub.api2.endpoints.admin.statistics.is_pro_version")
    @patch("seahub.api2.endpoints.admin.statistics.get_total_storage_stats_by_day")
    def test_can_get_total_storage_stats(self, mock_stats_by_day, mock_is_pro,
                                         mock_events_enabled):
        mock_stats_by_day.return_value = [(datetime.datetime(2017, 6, 2, 3, 0), 13)]
        mock_is_pro.return_value = True
        mock_events_enabled = True
        url = reverse('api-v2.1-admin-statistics-total-storage')
        url += "?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00"
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        data = {'datetime': datetime_to_isoformat_timestr(datetime.datetime(2017, 6, 2, 3, 0)), 'total_storage': 13}
        assert data in json_resp

    @patch("seahub.api2.endpoints.admin.statistics.EVENTS_ENABLED")
    @patch("seahub.api2.endpoints.admin.statistics.is_pro_version")
    @patch("seahub.api2.endpoints.admin.statistics.get_system_traffic_by_day")
    def test_can_get_system_traffic(self, mock_get_system_traffic_by_day, mock_is_pro, mock_events_enabled):
        mock_get_system_traffic_by_day.return_value = [
            (datetime.datetime(2018, 8, 23, 0, 0), 'sync-file-download', 131793),
            (datetime.datetime(2018, 8, 23, 0, 0), 'web-file-download', 13),
        ]
        mock_is_pro.return_value = True
        mock_events_enabled = True

        url = reverse('api-v2.1-admin-statistics-system-traffic')
        url += "?start=2018-08-20 07:00:00&end=2018-08-23 23:00:00"
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        assert len(json_resp) == 4
        assert json_resp[0]['datetime'] == '2018-08-20T00:00:00+00:00'
        assert json_resp[0]['web-file-download'] == 0
        assert json_resp[0]['sync-file-download'] == 0

        assert json_resp[-1]['datetime'] == '2018-08-23T00:00:00+00:00'
        assert json_resp[-1]['web-file-download'] == 13
        assert json_resp[-1]['sync-file-download'] == 131793


class TotalStorageTest(BaseTestCase):

    @patch("seahub.api2.endpoints.admin.statistics.EVENTS_ENABLED")
    @patch("seahub.api2.endpoints.admin.statistics.is_pro_version")
    @patch("seahub.api2.endpoints.admin.statistics.get_file_ops_stats_by_day")
    def test_admin_permission_denied(self, mock_get_file_audit_stats_by_day, mock_is_pro, mock_events_enabled):
        mock_get_file_audit_stats_by_day.return_value = [
            (datetime.datetime(2017, 6, 2, 4, 2), 'Added', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Deleted', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Visited', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Modified', 2),
        ]
        mock_is_pro.return_value = True
        mock_events_enabled = True
        url = reverse('api-v2.1-admin-statistics-total-storage')
        url += "?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00"
        self.login_as(self.admin_cannot_view_statistic)
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)


class ActiveUsersTest(BaseTestCase):

    @patch("seahub.api2.endpoints.admin.statistics.EVENTS_ENABLED")
    @patch("seahub.api2.endpoints.admin.statistics.is_pro_version")
    @patch("seahub.api2.endpoints.admin.statistics.get_file_ops_stats_by_day")
    def test_admin_permission_denied(self, mock_get_file_audit_stats_by_day, mock_is_pro, mock_events_enabled):
        mock_get_file_audit_stats_by_day.return_value = [
            (datetime.datetime(2017, 6, 2, 4, 2), 'Added', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Deleted', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Visited', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Modified', 2),
        ]
        mock_is_pro.return_value = True
        mock_events_enabled = True
        url = reverse('api-v2.1-admin-statistics-active-users')
        url += "?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00"
        self.login_as(self.admin_cannot_view_statistic)
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)


class SystemTrafficTest(BaseTestCase):
    @patch("seahub.api2.endpoints.admin.statistics.EVENTS_ENABLED")
    @patch("seahub.api2.endpoints.admin.statistics.is_pro_version")
    @patch("seahub.api2.endpoints.admin.statistics.get_file_ops_stats_by_day")
    def test_admin_permission_denied(self, mock_get_file_audit_stats_by_day, mock_is_pro, mock_events_enabled):
        mock_get_file_audit_stats_by_day.return_value = [
            (datetime.datetime(2017, 6, 2, 4, 2), 'Added', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Deleted', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Visited', 2),
            (datetime.datetime(2017, 6, 2, 4, 2), 'Modified', 2),
        ]
        mock_is_pro.return_value = True
        mock_events_enabled = True
        url = reverse('api-v2.1-admin-statistics-system-traffic')
        url += "?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00"
        self.login_as(self.admin_cannot_view_statistic)
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)


class SystemUserTrafficTest(BaseTestCase):
    def test_admin_permission_denied(self):
        self.login_as(self.admin_cannot_view_statistic)
        url = reverse('api-v2.1-admin-statistics-system-user-traffic')
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)


class SystemOrgTrafficTest(BaseTestCase):
    def test_admin_permission_denied(self):
        self.login_as(self.admin_cannot_view_statistic)
        url = reverse('api-v2.1-admin-statistics-system-org-traffic')
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)


class SystemUserTrafficExcelTest(BaseTestCase):
    def test_admin_permission_denied(self):
        self.login_as(self.admin_cannot_view_statistic)
        url = reverse('api-v2.1-admin-statistics-system-user-traffic-excel')
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)


class SystemUserStorageExcelTest(BaseTestCase):
    def test_admin_permission_denied(self):
        self.login_as(self.admin_cannot_view_statistic)
        url = reverse('api-v2.1-admin-statistics-system-user-storage-excel')
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)
