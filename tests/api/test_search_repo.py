import json

from django.core.urlresolvers import reverse
from django.template.defaultfilters import filesizeformat

from seahub.test_utils import BaseTestCase
from seahub.utils.timeutils import timestamp_to_isoformat_timestr


class SearchRepoTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()
        self.login_as(self.user)
        self.url = reverse('api2-repos')
        self.repo_id = self.repo

    def test_can_search(self):
        resp = self.client.get(self.url + "?type=own&nameContains=t")
        resp_json = json.loads(resp.content)
        assert self.repo.id in [e['id'] for e in resp_json]
        res_repo = [e for e in resp_json if e['id'] == self.repo.id][0]
        assert res_repo['type'] ==  'repo'
        assert res_repo['id'] == self.repo.id
        assert res_repo['owner'] == self.user.email
        assert res_repo['name'] == self.repo.name
        assert res_repo['mtime'] == self.repo.last_modify
        assert res_repo['mtime_relative'] == timestamp_to_isoformat_timestr(self.repo.last_modify)
        assert res_repo['size'] == self.repo.size
        assert res_repo['size_formatted'] == filesizeformat(self.repo.size)
        assert res_repo['encrypted'] == self.repo.encrypted
        assert res_repo['permission'] == 'rw'
        assert res_repo['virtual'] == False
        assert res_repo['root'] == ''
        assert res_repo['head_commit_id'] == self.repo.head_cmmt_id
        assert res_repo['version'] == self.repo.version

    def test_can_not_case_sensitive(self):
        resp = self.client.get(self.url + "?type=own&nameContains=T")
        resp_json = json.loads(resp.content)
        assert self.repo.id in [e['id'] for e in resp_json]
        res_repo = [e for e in resp_json if e['id'] == self.repo.id][0]
        assert res_repo['type'] ==  'repo'
        assert res_repo['id'] == self.repo.id
        assert res_repo['owner'] == self.user.email
        assert res_repo['name'] == self.repo.name
        assert res_repo['mtime'] == self.repo.last_modify
        assert res_repo['mtime_relative'] == timestamp_to_isoformat_timestr(self.repo.last_modify)
        assert res_repo['size'] == self.repo.size
        assert res_repo['size_formatted'] == filesizeformat(self.repo.size)
        assert res_repo['encrypted'] == self.repo.encrypted
        assert res_repo['permission'] == 'rw'
        assert res_repo['virtual'] == False
        assert res_repo['root'] == ''
        assert res_repo['head_commit_id'] == self.repo.head_cmmt_id
        assert res_repo['version'] == self.repo.version

    def test_can_get_all_own_repo_with_no_parameter(self):
        resp = self.client.get(self.url + "?type=own")
        resp_json = json.loads(resp.content)
        assert self.repo.id in [e['id'] for e in resp_json]
        res_repo = [e for e in resp_json if e['id'] == self.repo.id][0]
        assert res_repo['type'] ==  'repo'
        assert res_repo['id'] == self.repo.id
        assert res_repo['owner'] == self.user.email
        assert res_repo['name'] == self.repo.name
        assert res_repo['mtime'] == self.repo.last_modify
        assert res_repo['mtime_relative'] == timestamp_to_isoformat_timestr(self.repo.last_modify)
        assert res_repo['size'] == self.repo.size
        assert res_repo['size_formatted'] == filesizeformat(self.repo.size)
        assert res_repo['encrypted'] == self.repo.encrypted
        assert res_repo['permission'] == 'rw'
        assert res_repo['virtual'] == False
        assert res_repo['root'] == ''
        assert res_repo['head_commit_id'] == self.repo.head_cmmt_id
