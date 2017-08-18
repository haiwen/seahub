import time

from tests.api.apitestbase import ApiTestBase
from tests.common.utils import apiurl


class GroupRepoTest(ApiTestBase):
    def create_group_repo(self, group_id, expected=None, *args, **kwargs):
        path = apiurl('/api2/groups/%s/repos/' % group_id)

        data = {"name": 'grepo-test'}
        data.update(kwargs)
        resp = self.post(path, data=data, expected=expected)

        return resp

    def test_can_add(self):
        with self.get_tmp_group() as group:
            resp = self.create_group_repo(group.group_id, permission='rw')

            assert resp.status_code == 200
            resp_json = resp.json()
            assert len(resp_json['id']) == 36
            assert resp_json['name'] == 'grepo-test'
            assert resp_json['size'] >= 0
            assert resp_json['mtime'] > 0
            assert resp_json['permission'] == 'rw'
            assert '</time>' in resp_json['mtime_relative']

    def test_can_add_read_only(self):
        with self.get_tmp_group() as group:
            resp = self.create_group_repo(group.group_id, permission='r')

            assert resp.status_code == 200
            resp_json = resp.json()
            assert resp_json['permission'] == 'r'

    def test_add_with_wrong_perm(self):
        with self.get_tmp_group() as group:
            resp = self.create_group_repo(group.group_id, permission='rr')

            assert resp.status_code == 400

    def test_can_list(self):
        with self.get_tmp_group() as group:
            self.create_group_repo(group.group_id)

            path = apiurl('/api2/groups/%s/repos/' % group.group_id)
            resp = self.get(path)

            assert resp.status_code == 200
            assert len(resp.json()) == 1

            resp_repo = resp.json()[0]
            assert len(resp_repo['id']) == 36
            assert resp_repo['name'] == 'grepo-test'
            assert resp_repo['size'] >= 0
            assert resp_repo['mtime'] > 0
            assert resp_repo['permission'] in ('r', 'rw')
            assert '</time>' in resp_repo['mtime_relative']
            assert len(resp_repo['owner_nickname']) > 0
            assert len(resp_repo['modifier_email']) > 0
            assert len(resp_repo['modifier_contact_email']) > 0
            assert len(resp_repo['modifier_name']) > 0

    def test_order_by_mtime(self):
        with self.get_tmp_group() as group:
            self.create_group_repo(group.group_id)
            time.sleep(1)
            self.create_group_repo(group.group_id)
            time.sleep(1)
            self.create_group_repo(group.group_id)

            path = apiurl('/api2/groups/%s/repos/' % group.group_id)
            resp = self.get(path)

            assert resp.status_code == 200
            assert len(resp.json()) == 3

            assert (resp.json()[0]['mtime'] > resp.json()[1]['mtime'] and
                    resp.json()[1]['mtime'] > resp.json()[2]['mtime'] )

    def test_can_delete(self):
        with self.get_tmp_group() as group:
            resp = self.create_group_repo(group.group_id)

            repo_id = resp.json()['id']
            path = apiurl('/api2/groups/%s/repos/%s/' % (group.group_id, repo_id))
            resp = self.delete(path)
            assert resp.status_code == 200
