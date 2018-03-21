from mock import patch

from django.conf.urls import url
from django.core.urlresolvers import reverse
from django.test import override_settings

import seahub
from seahub import urls
from seahub.test_utils import BaseTestCase
from seahub.views.sysadmin import sys_virus_scan_records, sys_delete_virus_scan_records

# http://stackoverflow.com/questions/4892210/django-urlresolver-adding-urls-at-runtime-for-testing
urlpatterns = seahub.urls.urlpatterns + [
    url(r'^sys/virus_scan_records/$', sys_virus_scan_records, name='sys_virus_scan_records'),
    url(r'^sys/virus_scan_records/delete/(?P<vid>\d+)/$', sys_delete_virus_scan_records, name='sys_delete_virus_scan_records'),
]


class VirusScanRecord(object):
    def __init__(self, repo_id):
        self.repo_id = repo_id


@override_settings(ROOT_URLCONF=__name__)
class SysVirusScanRecordsTest(BaseTestCase):
    @patch('seahub.views.sysadmin.get_virus_record')
    def test_can_list_empty(self, mock_get_virus_record):
        mock_get_virus_record.return_value = []

        self.login_as(self.admin)

        resp = self.client.get(reverse('sys_virus_scan_records'))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'sysadmin/sys_virus_scan_records.html')

    def _get_virus_record(self, start, limit):
        records = []
        for i in range(11):
            record = VirusScanRecord(self.repo.id)
            record.vid = i + 1
            record.has_handle = False
            records.append(record)

        return records

    @patch('seahub.views.sysadmin.get_virus_record')
    def test_can_list_records_num_more_than_10(self, mock_get_virus_record):
        mock_get_virus_record.side_effect = self._get_virus_record

        self.login_as(self.admin)

        resp = self.client.get(reverse('sys_virus_scan_records'))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'sysadmin/sys_virus_scan_records.html')
        assert len(resp.context['records']) >= 10
