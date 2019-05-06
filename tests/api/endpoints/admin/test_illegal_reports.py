# -*- coding: utf-8 -*-
import json

from mock import patch, MagicMock
from django.core.urlresolvers import reverse
from seahub.test_utils import BaseTestCase
from seahub.illegal_reports.models import IllegalReport


class AdminIllegalReportsTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.admin)
        self.url = reverse('api-v2.1-admin-illegal-reports')

    @patch('seahub.api2.endpoints.admin.illegal_reports.ENABLE_SHARE_LINK_REPORT_ILLEGAL', MagicMock(return_value=True))
    def test_can_get(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)


class AdminIllegalReportTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)
        self.repo = self.repo
        self.file_path = self.file
        self.url = reverse('api-v2.1-admin-illegal-reports')

    def _add_illegal_report(self):
        reporter = ''
        repo_id = self.repo.id
        repo_name = self.repo.name
        file_path = self.file_path
        illegal_type = 'copyright'
        description = ''

        report = IllegalReport.objects.add_illegal_report(
            reporter, repo_id, repo_name, file_path, illegal_type, description)
        return report

    def _remove_illegal_report(self, report_id):
        report = IllegalReport.objects.get(id=report_id)
        report.delete()

    @patch('seahub.api2.endpoints.admin.illegal_reports.ENABLE_SHARE_LINK_REPORT_ILLEGAL', MagicMock(return_value=True))
    def test_can_put(self):
        report = self._add_illegal_report()
        data = 'handled=' + str(not report.handled).lower()
        resp = self.client.put(self.url + str(report.id) + '/', data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['file_name'] is not None
        assert json_resp['time'] is not None

        assert json_resp['handled'] == (not report.handled)
        assert json_resp['illegal_type'] == report.illegal_type
        assert json_resp['description'] == report.description
        assert json_resp['id'] == report.id
        assert json_resp['reporter'] == report.reporter
        assert json_resp['repo_id'] == report.repo_id
        assert json_resp['repo_name'] == report.repo_name
        assert json_resp['file_path'] == report.file_path

        self._remove_illegal_report(report.id)
