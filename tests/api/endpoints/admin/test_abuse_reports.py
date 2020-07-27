# -*- coding: utf-8 -*-
import json

from mock import patch, MagicMock
from django.urls import reverse
from seahub.test_utils import BaseTestCase
from seahub.abuse_reports.models import AbuseReport


class AdminAbuseReportsTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.admin)
        self.url = reverse('api-v2.1-admin-abuse-reports')

    @patch('seahub.api2.endpoints.admin.abuse_reports.ENABLE_SHARE_LINK_REPORT_ABUSE', MagicMock(return_value=True))
    def test_can_get(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

    @patch('seahub.api2.endpoints.admin.abuse_reports.ENABLE_SHARE_LINK_REPORT_ABUSE', MagicMock(return_value=True))
    def test_no_permission(self):
        self.logout()
        self.login_as(self.admin_no_other_permission)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)


class AdminAbuseReportTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)
        self.repo = self.repo
        self.file_path = self.file
        self.url = reverse('api-v2.1-admin-abuse-reports')

    def _add_abuse_report(self):
        reporter = ''
        repo_id = self.repo.id
        repo_name = self.repo.name
        file_path = self.file_path
        abuse_type = 'copyright'
        description = ''

        report = AbuseReport.objects.add_abuse_report(
            reporter, repo_id, repo_name, file_path, abuse_type, description)
        return report

    def _remove_abuse_report(self, report_id):
        report = AbuseReport.objects.get(id=report_id)
        report.delete()

    @patch('seahub.api2.endpoints.admin.abuse_reports.ENABLE_SHARE_LINK_REPORT_ABUSE', MagicMock(return_value=True))
    def test_no_permission(self):
        self.logout()
        self.login_as(self.admin_no_other_permission)
        report = self._add_abuse_report()
        data = 'handled=' + str(not report.handled).lower()
        resp = self.client.put(self.url + str(report.id) + '/', data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.admin.abuse_reports.ENABLE_SHARE_LINK_REPORT_ABUSE', MagicMock(return_value=True))
    def test_can_put(self):
        report = self._add_abuse_report()
        data = 'handled=' + str(not report.handled).lower()
        resp = self.client.put(self.url + str(report.id) + '/', data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['file_name'] is not None
        assert json_resp['time'] is not None

        assert json_resp['handled'] == (not report.handled)
        assert json_resp['abuse_type'] == report.abuse_type
        assert json_resp['description'] == report.description
        assert json_resp['id'] == report.id
        assert json_resp['reporter'] == report.reporter
        assert json_resp['repo_id'] == report.repo_id
        assert json_resp['repo_name'] == report.repo_name
        assert json_resp['file_path'] == report.file_path

        self._remove_abuse_report(report.id)
