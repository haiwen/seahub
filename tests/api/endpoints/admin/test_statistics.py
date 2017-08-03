import json
import datetime
from datetime import date

from mock import patch

from django.core.urlresolvers import reverse
from seahub.test_utils import BaseTestCase
from seahub.utils.timeutils import datetime_to_isoformat_timestr


class FileOperationsInfoText(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    @patch("seahub.api2.endpoints.admin.statistics.get_file_ops_stats")
    @patch("seahub.api2.endpoints.admin.statistics.get_file_ops_stats_by_day")
    def test_can_get_file_audit_stats(self, mock_get_file_audit_stats_by_day, mock_get_file_audit_stats):
        mock_get_file_audit_stats.return_value = [
            (datetime.datetime(2017, 6, 2, 7, 0), u'Added', 2L),
            (datetime.datetime(2017, 6, 2, 7, 0), u'Deleted', 2L),
            (datetime.datetime(2017, 6, 2, 7, 0), u'Visited', 2L),
            (datetime.datetime(2017, 6, 2, 8, 0), u'Added', 3L),
            (datetime.datetime(2017, 6, 2, 8, 0), u'Deleted', 4L),
            (datetime.datetime(2017, 6, 2, 8, 0), u'Visited', 5L)]
        mock_get_file_audit_stats_by_day.return_value = [
            (datetime.date(2017, 6, 2), u'Added', 2L),
            (datetime.date(2017, 6, 2), u'Deleted', 2L),
            (datetime.date(2017, 6, 2), u'Visited', 2L),
        ]
        url = reverse('api-v2.1-admin-statistics-file-operations')
        url += "?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00&group_by=hour"
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(json_resp[0]['datetime'], datetime_to_isoformat_timestr(datetime.datetime(2017, 6, 2, 7, 0)))
        self.assertEqual(json_resp[0]['added'], 2)
        self.assertEqual(json_resp[0]['deleted'], 2)
        self.assertEqual(json_resp[0]['visited'], 2)
        self.assertEqual(json_resp[1]['datetime'], datetime_to_isoformat_timestr(datetime.datetime(2017, 6, 2, 8, 0)))
        self.assertEqual(json_resp[1]['added'], 3)
        self.assertEqual(json_resp[1]['deleted'], 4)
        self.assertEqual(json_resp[1]['visited'], 5)
        url += "?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00&group_by=day"
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(json_resp[0]['datetime'], datetime_to_isoformat_timestr(datetime.datetime.strptime(str(datetime.date(2017, 6, 2)), '%Y-%m-%d')))
        self.assertEqual(json_resp[0]['added'], 2)
        self.assertEqual(json_resp[0]['deleted'], 2)
        self.assertEqual(json_resp[0]['visited'], 2)

    @patch("seahub.api2.endpoints.admin.statistics.get_user_activity_stats")
    @patch("seahub.api2.endpoints.admin.statistics.get_user_activity_stats_by_day")
    def test_can_user_activity_stats(self, mock_stats_by_day, mock_stats):
        mock_stats.return_value = [(datetime.datetime(2017, 6, 2, 7, 0), 2L),
                             (datetime.datetime(2017, 6, 2, 8, 0), 5L)]
        mock_stats_by_day.return_value = [(datetime.date(2017, 6, 2), 3L)]
        url = reverse('api-v2.1-admin-statistics-active-users')
        url += "?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00&group_by=hour"
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(json_resp[0]['datetime'], datetime_to_isoformat_timestr(datetime.datetime(2017, 6, 2, 7, 0)))
        self.assertEqual(json_resp[0]['count'], 2)
        self.assertEqual(json_resp[1]['datetime'], datetime_to_isoformat_timestr(datetime.datetime(2017, 6, 2, 8, 0)))
        self.assertEqual(json_resp[1]['count'], 5)
        url += "?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00&group_by=day"
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(json_resp[0]['datetime'], datetime_to_isoformat_timestr(datetime.datetime.strptime(str(datetime.date(2017, 6, 2)), '%Y-%m-%d')))
        self.assertEqual(json_resp[0]['count'], 3)

    @patch("seahub.api2.endpoints.admin.statistics.get_total_storage_stats")
    @patch("seahub.api2.endpoints.admin.statistics.get_total_storage_stats_by_day")
    def test_can_get_total_storage_stats(self, mock_stats_by_day, mock_stats):
        mock_stats.return_value = [(datetime.datetime(2017, 6, 2, 7, 0), 2L),
                             (datetime.datetime(2017, 6, 2, 8, 0), 5L)]
        mock_stats_by_day.return_value = [(datetime.date(2017, 6, 2), 13L)]
        url = reverse('api-v2.1-admin-statistics-total-storage')
        url += "?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00&group_by=hour"
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(json_resp[0]['datetime'], datetime_to_isoformat_timestr(datetime.datetime(2017, 6, 2, 7, 0)))
        self.assertEqual(json_resp[0]['total_storage'], 2)
        self.assertEqual(json_resp[1]['datetime'], datetime_to_isoformat_timestr(datetime.datetime(2017, 6, 2, 8, 0)))
        self.assertEqual(json_resp[1]['total_storage'], 5)
        url += "?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00&group_by=day"
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(json_resp[0]['datetime'], datetime_to_isoformat_timestr(datetime.datetime.strptime(str(datetime.date(2017, 6, 2)), '%Y-%m-%d')))
        self.assertEqual(json_resp[0]['total_storage'], 13)
