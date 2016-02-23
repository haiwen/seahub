import os
from mock import patch
import pytest

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

TRAVIS = 'TRAVIS' in os.environ

class VirusScanRecord(object):
    def __init__(self, repo_id):
        self.repo_id = repo_id


class SysVirusScanRecordsTest(BaseTestCase):

    # @patch('seahub.utils.EVENTS_ENABLED', True)
    # @patch('seahub.utils.get_virus_record')
    # def test_can_list_empty(self, mock_get_virus_record):
    #     mock_get_virus_record.return_value = []

    #     self.login_as(self.admin)

    #     resp = self.client.get(reverse('sys_virus_scan_records'))
    #     self.assertEqual(200, resp.status_code)
    #     self.assertTemplateUsed(resp, 'sysadmin/sys_virus_scan_records.html')

    def _get_virus_record(self, start, limit):
        records = []
        for i in range(11):
            record = VirusScanRecord(self.repo.id)
            record.vid = i + 1
            record.has_handle = False
            records.append(record)

        return records

    @pytest.mark.skipif(TRAVIS, reason="TODO: this test can only be run seperately due to the url module init in django, we may need to reload url conf: https://gist.github.com/anentropic/9ac47f6518c88fa8d2b0")
    @patch('seahub.utils.EVENTS_ENABLED')
    @patch('seahub.utils.get_virus_record')
    def test_can_list_records_num_more_than_10(self, mock_get_virus_record,
                                               mock_events_enabled):
        mock_events_enabled = True
        mock_get_virus_record.side_effect = self._get_virus_record

        self.login_as(self.admin)

        resp = self.client.get(reverse('sys_virus_scan_records'))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'sysadmin/sys_virus_scan_records.html')
        assert len(resp.context['records']) >= 10
